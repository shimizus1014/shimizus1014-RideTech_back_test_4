from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

import models
import schemas
import auth
from database import engine, get_db, Base, SessionLocal

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.is_admin == True).first():
            admin = models.User(
                username="admin",
                email="admin@example.com",
                hashed_password=auth.hash_password("admin1234"),
                is_admin=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="学習管理システム API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "学習管理システム API"}


# ─── 認証 ─────────────────────────────────────────────

@app.post("/auth/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="このユーザー名は既に使用されています")

    user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=auth.hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _seed_demo_data(user.id, db)

    token = auth.create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

    token = auth.create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/forgot-password")
def forgot_password(req: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    return {"message": "パスワード再発行メールを送信しました（登録済みの場合）"}


# ─── 自分の情報 ────────────────────────────────────────

@app.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ─── ユーザー管理 ──────────────────────────────────────

@app.get("/users/search", response_model=List[schemas.UserOut])
def search_users(
    q: str = Query(default=""),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.User.username.like(like) | models.User.email.like(like)
        )
    return query.limit(20).all()


@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    if user_in.username is not None:
        if (
            db.query(models.User)
            .filter(models.User.username == user_in.username, models.User.id != user_id)
            .first()
        ):
            raise HTTPException(status_code=400, detail="このユーザー名は既に使用されています")
        user.username = user_in.username

    if user_in.email is not None:
        if (
            db.query(models.User)
            .filter(models.User.email == user_in.email, models.User.id != user_id)
            .first()
        ):
            raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
        user.email = str(user_in.email)

    db.commit()
    db.refresh(user)
    return user


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="自分自身は削除できません")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    db.delete(user)
    db.commit()
    return {"message": "削除しました"}


# ─── ダッシュボード ────────────────────────────────────

@app.get("/dashboard", response_model=schemas.DashboardOut)
def get_dashboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    active_plans = (
        db.query(models.LearningPlan)
        .filter(
            models.LearningPlan.user_id == current_user.id,
            models.LearningPlan.status == "active",
        )
        .limit(3)
        .all()
    )

    completed_task_count = (
        db.query(models.Task)
        .join(models.LearningPlan)
        .filter(
            models.LearningPlan.user_id == current_user.id,
            models.Task.status == "completed",
        )
        .count()
    )

    upcoming_tasks = (
        db.query(models.Task)
        .join(models.LearningPlan)
        .filter(
            models.LearningPlan.user_id == current_user.id,
            models.Task.status != "completed",
            models.Task.deadline.isnot(None),
        )
        .order_by(models.Task.deadline)
        .limit(5)
        .all()
    )

    return schemas.DashboardOut(
        active_plan_count=len(active_plans),
        completed_task_count=completed_task_count,
        study_days=5,
        learning_plans=[schemas.LearningPlanOut.model_validate(p) for p in active_plans],
        upcoming_tasks=[schemas.TaskOut.model_validate(t) for t in upcoming_tasks],
    )


# ─── 内部ユーティリティ ────────────────────────────────

def _seed_demo_data(user_id: int, db: Session) -> None:
    now = datetime.utcnow()
    plans = [
        models.LearningPlan(user_id=user_id, title="JavaScript基礎マスター", progress=65.0, status="active", deadline=now + timedelta(days=2)),
        models.LearningPlan(user_id=user_id, title="React & TypeScript入門", progress=30.0, status="active", deadline=now + timedelta(days=14)),
        models.LearningPlan(user_id=user_id, title="データベース設計", progress=80.0, status="active", deadline=now + timedelta(days=5)),
    ]
    for plan in plans:
        db.add(plan)
    db.flush()

    tasks = [
        models.Task(learning_plan_id=plans[0].id, title="関数とデータ型の演習", status="in_progress", deadline=now + timedelta(days=1)),
        models.Task(learning_plan_id=plans[1].id, title="Reactコンポーネント作成", status="not_started", deadline=now + timedelta(days=2)),
        models.Task(learning_plan_id=plans[2].id, title="ER図の作成", status="in_progress", deadline=now),
        models.Task(learning_plan_id=plans[0].id, title="変数とスコープの理解", status="completed", deadline=now - timedelta(days=3)),
    ]
    for task in tasks:
        db.add(task)
    db.commit()
