from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class TaskOut(BaseModel):
    id: int
    title: str
    status: str
    deadline: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LearningPlanOut(BaseModel):
    id: int
    title: str
    progress: float
    status: str
    deadline: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DashboardOut(BaseModel):
    active_plan_count: int
    completed_task_count: int
    study_days: int
    learning_plans: List[LearningPlanOut]
    upcoming_tasks: List[TaskOut]
