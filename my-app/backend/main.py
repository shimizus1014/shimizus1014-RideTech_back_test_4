import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv

import models
import schemas
import auth
from database import engine, get_db, Base, SessionLocal

load_dotenv()

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.is_admin == True).first():
            admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
            admin_password = os.environ.get("ADMIN_PASSWORD", "admin1234")
            admin = models.User(
                username="admin",
                email=admin_email,
                hashed_password=auth.hash_password(admin_password),
                is_admin=True,
            )
            db.add(admin)
            db.commit()
        # 旧設定「members」を「public」に移行
        db.query(models.UserPrivacySettings).filter(
            models.UserPrivacySettings.profile_visibility == "members"
        ).update({"profile_visibility": "public"})
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

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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


@app.put("/me", response_model=schemas.UserOut)
def update_me(
    me_in: schemas.MeUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if me_in.username is not None:
        if (
            db.query(models.User)
            .filter(models.User.username == me_in.username, models.User.id != current_user.id)
            .first()
        ):
            raise HTTPException(status_code=400, detail="このユーザー名は既に使用されています")
        current_user.username = me_in.username
    if me_in.bio is not None:
        current_user.bio = me_in.bio
    if me_in.icon_url is not None:
        current_user.icon_url = me_in.icon_url
    db.commit()
    db.refresh(current_user)
    return current_user


def _get_or_create_privacy(user_id: int, db: Session) -> models.UserPrivacySettings:
    ps = db.query(models.UserPrivacySettings).filter(
        models.UserPrivacySettings.user_id == user_id
    ).first()
    if not ps:
        ps = models.UserPrivacySettings(user_id=user_id)
        db.add(ps)
        db.commit()
        db.refresh(ps)
    return ps


@app.get("/me/privacy", response_model=schemas.PrivacySettingsOut)
def get_my_privacy(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return _get_or_create_privacy(current_user.id, db)


@app.put("/me/privacy", response_model=schemas.PrivacySettingsOut)
def update_my_privacy(
    req: schemas.PrivacySettingsUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    ps = _get_or_create_privacy(current_user.id, db)
    if req.profile_visibility is not None:
        if req.profile_visibility not in ("public", "private"):
            raise HTTPException(status_code=400, detail="profile_visibility は public または private です")
        ps.profile_visibility = req.profile_visibility
    if req.show_in_search is not None:
        ps.show_in_search = req.show_in_search
    if req.show_stats is not None:
        ps.show_stats = req.show_stats
    if req.default_plan_public is not None:
        ps.default_plan_public = req.default_plan_public
    db.commit()
    db.refresh(ps)
    return ps


@app.post("/me/avatar", response_model=schemas.UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="対応形式: JPEG, PNG, GIF, WebP")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ファイルサイズは2MB以下にしてください")

    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}
    ext = ext_map[file.content_type]
    filename = f"{current_user.id}_{uuid.uuid4().hex}.{ext}"

    if current_user.icon_url and current_user.icon_url.startswith("/uploads/"):
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(current_user.icon_url))
        if os.path.exists(old_path):
            os.remove(old_path)

    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    current_user.icon_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@app.put("/me/password")
def change_password(
    req: schemas.PasswordChangeRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="現在のパスワードが正しくありません")
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="新しいパスワードは8文字以上で入力してください")
    current_user.hashed_password = auth.hash_password(req.new_password)
    db.commit()
    return {"message": "パスワードを変更しました"}


@app.delete("/me")
def delete_me(
    req: schemas.AccountDeleteRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(req.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="パスワードが正しくありません")

    now = datetime.utcnow()

    # 関連データを論理削除（学習計画 → タスク → ナレッジ）
    plans = db.query(models.LearningPlan).filter(
        models.LearningPlan.user_id == current_user.id,
        models.LearningPlan.deleted_at.is_(None),
    ).all()
    for plan in plans:
        tasks = db.query(models.Task).filter(
            models.Task.learning_plan_id == plan.id,
            models.Task.deleted_at.is_(None),
        ).all()
        for task in tasks:
            db.query(models.Knowledge).filter(
                models.Knowledge.task_id == task.id,
                models.Knowledge.deleted_at.is_(None),
            ).update({"deleted_at": now})
            task.deleted_at = now
        plan.deleted_at = now

    db.query(models.Comment).filter(
        models.Comment.user_id == current_user.id,
        models.Comment.deleted_at.is_(None),
    ).update({"deleted_at": now})

    db.query(models.Knowledge).filter(
        models.Knowledge.user_id == current_user.id,
        models.Knowledge.deleted_at.is_(None),
    ).update({"deleted_at": now})

    current_user.deleted_at = now
    db.commit()
    return {"message": "アカウントを削除しました"}


# ─── ユーザー管理 ──────────────────────────────────────

@app.get("/users/search", response_model=List[schemas.UserOut])
def search_users(
    q: str = Query(default=""),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.User).filter(models.User.deleted_at.is_(None))
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.User.username.like(like) | models.User.email.like(like)
        )
    users = query.limit(50).all()

    # show_in_search = False または profile_visibility = "private" のユーザーを除外（管理者は除外しない）
    if not current_user.is_admin:
        result = []
        for u in users:
            ps = db.query(models.UserPrivacySettings).filter(
                models.UserPrivacySettings.user_id == u.id
            ).first()
            # デフォルト（設定なし）は公開扱い
            show = (ps is None) or (ps.show_in_search and ps.profile_visibility != "private")
            if show:
                result.append(u)
        return result[:20]
    return users[:20]


@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")

    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.deleted_at.is_(None),
    ).first()
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

    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.deleted_at.is_(None),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    now = datetime.utcnow()
    plans = db.query(models.LearningPlan).filter(
        models.LearningPlan.user_id == user_id,
        models.LearningPlan.deleted_at.is_(None),
    ).all()
    for plan in plans:
        tasks = db.query(models.Task).filter(
            models.Task.learning_plan_id == plan.id,
            models.Task.deleted_at.is_(None),
        ).all()
        for task in tasks:
            db.query(models.Knowledge).filter(
                models.Knowledge.task_id == task.id,
                models.Knowledge.deleted_at.is_(None),
            ).update({"deleted_at": now})
            task.deleted_at = now
        plan.deleted_at = now
    db.query(models.Comment).filter(
        models.Comment.user_id == user_id,
        models.Comment.deleted_at.is_(None),
    ).update({"deleted_at": now})
    db.query(models.Knowledge).filter(
        models.Knowledge.user_id == user_id,
        models.Knowledge.deleted_at.is_(None),
    ).update({"deleted_at": now})
    user.deleted_at = now
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
            models.Task.status == "done",
        )
        .count()
    )

    upcoming_tasks = (
        db.query(models.Task)
        .join(models.LearningPlan)
        .filter(
            models.LearningPlan.user_id == current_user.id,
            models.Task.status != "done",
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


# ─── 学習計画 ─────────────────────────────────────────

@app.get("/learning-plans", response_model=List[schemas.LearningPlanOut])
def get_learning_plans(
    status: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.LearningPlan).filter(
        models.LearningPlan.user_id == current_user.id,
        models.LearningPlan.deleted_at.is_(None),
    )
    if status:
        query = query.filter(models.LearningPlan.status == status)
    return query.order_by(models.LearningPlan.created_at.desc()).all()


@app.post("/learning-plans", response_model=schemas.LearningPlanOut)
def create_learning_plan(
    plan_in: schemas.LearningPlanCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = models.LearningPlan(user_id=current_user.id, **plan_in.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@app.get("/learning-plans/{plan_id}", response_model=schemas.LearningPlanOut)
def get_learning_plan(
    plan_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.deleted_at.is_(None),
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    return plan


@app.put("/learning-plans/{plan_id}", response_model=schemas.LearningPlanOut)
def update_learning_plan(
    plan_id: int,
    plan_in: schemas.LearningPlanUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.deleted_at.is_(None),
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    for field, value in plan_in.model_dump(exclude_none=True).items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan


@app.delete("/learning-plans/{plan_id}")
def delete_learning_plan(
    plan_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.deleted_at.is_(None),
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    now = datetime.utcnow()
    tasks = db.query(models.Task).filter(
        models.Task.learning_plan_id == plan_id,
        models.Task.deleted_at.is_(None),
    ).all()
    for task in tasks:
        db.query(models.Knowledge).filter(
            models.Knowledge.task_id == task.id,
            models.Knowledge.deleted_at.is_(None),
        ).update({"deleted_at": now})
        task.deleted_at = now
    plan.deleted_at = now
    db.commit()
    return {"message": "削除しました"}


# ─── タスク ───────────────────────────────────────────

def _recalculate_progress(plan_id: int, db: Session) -> None:
    tasks = db.query(models.Task).filter(models.Task.learning_plan_id == plan_id).all()
    if not tasks:
        progress = 0.0
    else:
        done = sum(1 for t in tasks if t.status == "done")
        progress = round(done / len(tasks) * 100, 1)
    db.query(models.LearningPlan).filter(models.LearningPlan.id == plan_id).update({"progress": progress})
    db.commit()


@app.get("/learning-plans/{plan_id}/tasks", response_model=List[schemas.TaskOut])
def get_tasks(
    plan_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.deleted_at.is_(None),
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    return (
        db.query(models.Task)
        .filter(models.Task.learning_plan_id == plan_id, models.Task.deleted_at.is_(None))
        .order_by(models.Task.order_index.is_(None), models.Task.order_index.asc(), models.Task.created_at.asc())
        .all()
    )


@app.post("/learning-plans/{plan_id}/tasks", response_model=schemas.TaskOut)
def create_task(
    plan_id: int,
    task_in: schemas.TaskCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.deleted_at.is_(None),
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    task = models.Task(learning_plan_id=plan_id, **task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    _recalculate_progress(plan_id, db)
    return task


@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.deleted_at.is_(None),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == task.learning_plan_id).first()
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    return task


@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task_in: schemas.TaskUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.deleted_at.is_(None),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == task.learning_plan_id).first()
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    for field, value in task_in.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    _recalculate_progress(task.learning_plan_id, db)
    return task


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.deleted_at.is_(None),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == task.learning_plan_id).first()
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    now = datetime.utcnow()
    db.query(models.Knowledge).filter(
        models.Knowledge.task_id == task.id,
        models.Knowledge.deleted_at.is_(None),
    ).update({"deleted_at": now})
    task.deleted_at = now
    db.commit()
    _recalculate_progress(task.learning_plan_id, db)
    return {"message": "削除しました"}


# ─── ナレッジ ─────────────────────────────────────────

def _knowledge_out(k: models.Knowledge) -> schemas.KnowledgeOut:
    out = schemas.KnowledgeOut.model_validate(k)
    out.username = k.user.username if k.user else ""
    return out


@app.get("/tasks/{task_id}/knowledges", response_model=List[schemas.KnowledgeOut])
def get_knowledges(
    task_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == task.learning_plan_id).first()
    if plan.user_id != current_user.id and not current_user.is_admin and not plan.is_public:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    knowledges = (
        db.query(models.Knowledge)
        .filter(models.Knowledge.task_id == task_id, models.Knowledge.deleted_at.is_(None))
        .order_by(models.Knowledge.created_at.desc())
        .all()
    )
    return [_knowledge_out(k) for k in knowledges]


@app.post("/tasks/{task_id}/knowledges", response_model=schemas.KnowledgeOut)
def create_knowledge(
    task_id: int,
    k_in: schemas.KnowledgeCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == task.learning_plan_id).first()
    if plan.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    k = models.Knowledge(task_id=task_id, user_id=current_user.id, **k_in.model_dump())
    db.add(k)
    db.commit()
    db.refresh(k)
    return _knowledge_out(k)


@app.put("/knowledges/{knowledge_id}", response_model=schemas.KnowledgeOut)
def update_knowledge(
    knowledge_id: int,
    k_in: schemas.KnowledgeUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    k = db.query(models.Knowledge).filter(
        models.Knowledge.id == knowledge_id,
        models.Knowledge.deleted_at.is_(None),
    ).first()
    if not k:
        raise HTTPException(status_code=404, detail="ナレッジが見つかりません")
    if k.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    for field, value in k_in.model_dump(exclude_none=True).items():
        setattr(k, field, value)
    db.commit()
    db.refresh(k)
    return _knowledge_out(k)


@app.delete("/knowledges/{knowledge_id}")
def delete_knowledge(
    knowledge_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    k = db.query(models.Knowledge).filter(
        models.Knowledge.id == knowledge_id,
        models.Knowledge.deleted_at.is_(None),
    ).first()
    if not k:
        raise HTTPException(status_code=404, detail="ナレッジが見つかりません")
    if k.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    k.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "削除しました"}


# ─── コメント ─────────────────────────────────────────

def _comment_out(c: models.Comment) -> schemas.CommentOut:
    out = schemas.CommentOut.model_validate(c)
    out.username = c.user.username if c.user else ""
    return out


@app.get("/comments", response_model=List[schemas.CommentOut])
def get_comments(
    target_type: str = Query(...),
    target_id: int = Query(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    comments = (
        db.query(models.Comment)
        .filter(
            models.Comment.target_type == target_type,
            models.Comment.target_id == target_id,
            models.Comment.deleted_at.is_(None),
        )
        .order_by(models.Comment.created_at.asc())
        .all()
    )
    return [_comment_out(c) for c in comments]


@app.post("/comments", response_model=schemas.CommentOut)
def create_comment(
    c_in: schemas.CommentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    comment = models.Comment(user_id=current_user.id, **c_in.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # 通知作成：コメント対象の所有者（自分以外）に通知
    try:
        if c_in.target_type == "plan":
            plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == c_in.target_id).first()
            if plan and plan.user_id != current_user.id:
                notif = models.Notification(
                    user_id=plan.user_id,
                    type="comment",
                    message=f"{current_user.username} さんが「{plan.title}」にコメントしました",
                    link=f"/dashboard/plans/{plan.id}",
                )
                db.add(notif)
                db.commit()
        elif c_in.target_type == "task":
            task = db.query(models.Task).filter(models.Task.id == c_in.target_id).first()
            if task:
                plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == task.learning_plan_id).first()
                if plan and plan.user_id != current_user.id:
                    notif = models.Notification(
                        user_id=plan.user_id,
                        type="comment",
                        message=f"{current_user.username} さんが「{task.title}」にコメントしました",
                        link=f"/dashboard/plans/{plan.id}/tasks/{task.id}",
                    )
                    db.add(notif)
                    db.commit()
    except Exception:
        pass  # 通知失敗はサイレントに無視

    return _comment_out(comment)


@app.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.deleted_at.is_(None),
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="コメントが見つかりません")
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    comment.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "削除しました"}


# ─── 通知 ─────────────────────────────────────────────

@app.get("/notifications", response_model=List[schemas.NotificationOut])
def get_notifications(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(30)
        .all()
    )


@app.get("/notifications/unread-count")
def get_unread_count(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False,
        )
        .count()
    )
    return {"count": count}


@app.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="通知が見つかりません")
    notif.is_read = True
    db.commit()
    return {"message": "既読にしました"}


@app.put("/notifications/read-all")
def mark_all_notifications_read(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "すべて既読にしました"}


# ─── 公開プロフィール・公開プラン ──────────────────────

@app.get("/users/{user_id}/profile", response_model=schemas.UserPublicOut)
def get_user_profile(
    user_id: int,
    requesting_user: Optional[models.User] = Depends(auth.get_optional_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.deleted_at.is_(None),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # プライバシー設定チェック（本人・管理者は常に閲覧可）
    is_self = requesting_user and requesting_user.id == user_id
    is_admin = requesting_user and requesting_user.is_admin
    if not is_self and not is_admin:
        ps = db.query(models.UserPrivacySettings).filter(
            models.UserPrivacySettings.user_id == user_id
        ).first()
        visibility = ps.profile_visibility if ps else "public"
        if visibility == "private":
            raise HTTPException(status_code=403, detail="このプロフィールは非公開です")

    # show_stats を UserPublicOut に反映
    ps = db.query(models.UserPrivacySettings).filter(
        models.UserPrivacySettings.user_id == user_id
    ).first()
    out = schemas.UserPublicOut.model_validate(user)
    out.show_stats = ps.show_stats if ps else True
    return out


def _profile_is_private(user_id: int, db: Session) -> bool:
    """プロフィール非公開設定の場合 True を返す（学習計画にも適用される上位権限）"""
    privacy = db.query(models.UserPrivacySettings).filter(
        models.UserPrivacySettings.user_id == user_id
    ).first()
    return privacy is not None and privacy.profile_visibility == "private"


def _is_admin(user: Optional[models.User]) -> bool:
    return user is not None and user.is_admin


@app.get("/users/{user_id}/public-plans", response_model=List[schemas.LearningPlanOut])
def get_user_public_plans(
    user_id: int,
    requesting_user: Optional[models.User] = Depends(auth.get_optional_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.deleted_at.is_(None),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    if not _is_admin(requesting_user) and _profile_is_private(user_id, db):
        return []
    query = db.query(models.LearningPlan).filter(
        models.LearningPlan.user_id == user_id,
        models.LearningPlan.deleted_at.is_(None),
    )
    if not _is_admin(requesting_user):
        query = query.filter(models.LearningPlan.is_public == True)
    return query.order_by(models.LearningPlan.created_at.desc()).all()


@app.get("/users/{user_id}/public-plans/{plan_id}", response_model=schemas.LearningPlanOut)
def get_user_public_plan(
    user_id: int,
    plan_id: int,
    requesting_user: Optional[models.User] = Depends(auth.get_optional_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin(requesting_user) and _profile_is_private(user_id, db):
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    query = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.user_id == user_id,
        models.LearningPlan.deleted_at.is_(None),
    )
    if not _is_admin(requesting_user):
        query = query.filter(models.LearningPlan.is_public == True)
    plan = query.first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    return plan


@app.get("/users/{user_id}/public-plans/{plan_id}/tasks", response_model=List[schemas.TaskOut])
def get_user_public_plan_tasks(
    user_id: int,
    plan_id: int,
    requesting_user: Optional[models.User] = Depends(auth.get_optional_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin(requesting_user) and _profile_is_private(user_id, db):
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    plan_query = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.user_id == user_id,
        models.LearningPlan.deleted_at.is_(None),
    )
    if not _is_admin(requesting_user):
        plan_query = plan_query.filter(models.LearningPlan.is_public == True)
    plan = plan_query.first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    return (
        db.query(models.Task)
        .filter(models.Task.learning_plan_id == plan_id, models.Task.deleted_at.is_(None))
        .order_by(models.Task.order_index.is_(None), models.Task.order_index.asc(), models.Task.created_at.asc())
        .all()
    )


@app.get("/users/{user_id}/public-plans/{plan_id}/tasks/{task_id}", response_model=schemas.TaskOut)
def get_user_public_plan_task(
    user_id: int,
    plan_id: int,
    task_id: int,
    requesting_user: Optional[models.User] = Depends(auth.get_optional_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin(requesting_user) and _profile_is_private(user_id, db):
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    plan_query = db.query(models.LearningPlan).filter(
        models.LearningPlan.id == plan_id,
        models.LearningPlan.user_id == user_id,
        models.LearningPlan.deleted_at.is_(None),
    )
    if not _is_admin(requesting_user):
        plan_query = plan_query.filter(models.LearningPlan.is_public == True)
    plan = plan_query.first()
    if not plan:
        raise HTTPException(status_code=404, detail="学習計画が見つかりません")
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.learning_plan_id == plan_id,
        models.Task.deleted_at.is_(None),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    return task


# ─── 管理者コメント管理 ────────────────────────────────

@app.get("/admin/comments", response_model=List[schemas.CommentOut])
def get_all_comments(
    target_type: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    query = db.query(models.Comment).filter(models.Comment.deleted_at.is_(None))
    if target_type:
        query = query.filter(models.Comment.target_type == target_type)
    comments = query.order_by(models.Comment.created_at.desc()).all()
    return [_comment_out(c) for c in comments]


# ─── 検索 ─────────────────────────────────────────────

@app.get("/search")
def search(
    q: str = Query(default=""),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not q.strip():
        return {"plans": [], "tasks": []}
    like = f"%{q.strip()}%"

    from sqlalchemy import or_, and_

    if current_user.is_admin:
        # 管理者は公開設定・プロフィール非公開を問わずすべて閲覧可
        plan_rows = (
            db.query(models.LearningPlan, models.User)
            .join(models.User, models.LearningPlan.user_id == models.User.id)
            .filter(
                models.LearningPlan.deleted_at.is_(None),
                models.LearningPlan.title.like(like),
            )
            .order_by(models.LearningPlan.created_at.desc())
            .limit(20)
            .all()
        )
        task_rows = (
            db.query(models.Task, models.LearningPlan, models.User)
            .join(models.LearningPlan, models.Task.learning_plan_id == models.LearningPlan.id)
            .join(models.User, models.LearningPlan.user_id == models.User.id)
            .filter(
                models.Task.deleted_at.is_(None),
                models.Task.title.like(like),
            )
            .order_by(models.Task.created_at.desc())
            .limit(20)
            .all()
        )
    else:
        # 自分の計画（公開・非公開）＋ 他ユーザーの公開計画
        # ※ プロフィール非公開ユーザーの計画は is_public に関わらず除外（上位権限）
        plan_rows = (
            db.query(models.LearningPlan, models.User)
            .join(models.User, models.LearningPlan.user_id == models.User.id)
            .outerjoin(
                models.UserPrivacySettings,
                models.UserPrivacySettings.user_id == models.LearningPlan.user_id,
            )
            .filter(
                models.LearningPlan.deleted_at.is_(None),
                models.LearningPlan.title.like(like),
                or_(
                    models.LearningPlan.user_id == current_user.id,
                    and_(
                        models.LearningPlan.is_public == True,
                        or_(
                            models.UserPrivacySettings.user_id.is_(None),
                            models.UserPrivacySettings.profile_visibility != "private",
                        ),
                    ),
                ),
            )
            .order_by(models.LearningPlan.created_at.desc())
            .limit(20)
            .all()
        )

        task_rows = (
            db.query(models.Task, models.LearningPlan, models.User)
            .join(models.LearningPlan, models.Task.learning_plan_id == models.LearningPlan.id)
            .join(models.User, models.LearningPlan.user_id == models.User.id)
            .outerjoin(
                models.UserPrivacySettings,
                models.UserPrivacySettings.user_id == models.LearningPlan.user_id,
            )
            .filter(
                models.Task.deleted_at.is_(None),
                models.Task.title.like(like),
                or_(
                    models.LearningPlan.user_id == current_user.id,
                    and_(
                        models.LearningPlan.is_public == True,
                        or_(
                            models.UserPrivacySettings.user_id.is_(None),
                            models.UserPrivacySettings.profile_visibility != "private",
                        ),
                    ),
                ),
            )
            .order_by(models.Task.created_at.desc())
            .limit(20)
            .all()
        )

    return {
        "plans": [
            {
                "id": p.id,
                "title": p.title,
                "status": p.status,
                "progress": p.progress,
                "deadline": p.deadline,
                "is_public": p.is_public,
                "user_id": u.id,
                "username": u.username,
                "icon_url": u.icon_url,
                "is_own": p.user_id == current_user.id,
            }
            for p, u in plan_rows
        ],
        "tasks": [
            {
                "id": t.id,
                "learning_plan_id": t.learning_plan_id,
                "title": t.title,
                "status": t.status,
                "deadline": t.deadline,
                "user_id": u.id,
                "username": u.username,
                "icon_url": u.icon_url,
                "is_own": p.user_id == current_user.id,
            }
            for t, p, u in task_rows
        ],
    }


# ─── 管理者：統計・プラン一覧 ──────────────────────────

@app.get("/admin/stats")
def get_admin_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    total_users = db.query(models.User).filter(models.User.deleted_at.is_(None)).count()
    total_plans = db.query(models.LearningPlan).filter(models.LearningPlan.deleted_at.is_(None)).count()
    total_tasks = db.query(models.Task).filter(models.Task.deleted_at.is_(None)).count()
    total_comments = db.query(models.Comment).filter(models.Comment.deleted_at.is_(None)).count()
    total_knowledges = db.query(models.Knowledge).filter(models.Knowledge.deleted_at.is_(None)).count()
    active_plans = db.query(models.LearningPlan).filter(models.LearningPlan.status == "active", models.LearningPlan.deleted_at.is_(None)).count()
    completed_tasks = db.query(models.Task).filter(models.Task.status == "done", models.Task.deleted_at.is_(None)).count()
    return {
        "total_users": total_users,
        "total_plans": total_plans,
        "total_tasks": total_tasks,
        "total_comments": total_comments,
        "total_knowledges": total_knowledges,
        "active_plans": active_plans,
        "completed_tasks": completed_tasks,
    }


@app.get("/admin/plans")
def get_admin_plans(
    status: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    query = db.query(models.LearningPlan).filter(models.LearningPlan.deleted_at.is_(None))
    if status:
        query = query.filter(models.LearningPlan.status == status)
    plans = query.order_by(models.LearningPlan.created_at.desc()).limit(200).all()
    result = []
    for p in plans:
        user = db.query(models.User).filter(models.User.id == p.user_id).first()
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "username": user.username if user else "",
            "title": p.title,
            "status": p.status,
            "progress": p.progress,
            "is_public": p.is_public,
            "created_at": p.created_at,
        })
    return result


@app.get("/admin/users", response_model=List[schemas.UserOut])
def get_admin_users(
    q: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    query = db.query(models.User).filter(models.User.deleted_at.is_(None))
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.User.username.like(like) | models.User.email.like(like)
        )
    return query.order_by(models.User.id).limit(200).all()


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
        models.Task(learning_plan_id=plans[0].id, title="関数とデータ型の演習", status="learning", deadline=now + timedelta(days=1)),
        models.Task(learning_plan_id=plans[1].id, title="Reactコンポーネント作成", status="not_started", deadline=now + timedelta(days=2)),
        models.Task(learning_plan_id=plans[2].id, title="ER図の作成", status="learning", deadline=now),
        models.Task(learning_plan_id=plans[0].id, title="変数とスコープの理解", status="done", deadline=now - timedelta(days=3)),
    ]
    for task in tasks:
        db.add(task)
    db.commit()


app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
