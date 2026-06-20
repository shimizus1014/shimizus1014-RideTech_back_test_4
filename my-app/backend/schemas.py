from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    bio: Optional[str] = None
    icon_url: Optional[str] = None
    is_admin: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None


class MeUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    icon_url: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class AccountDeleteRequest(BaseModel):
    password: str


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
    learning_plan_id: int
    title: str
    description: Optional[str] = None
    status: str
    understanding_level: Optional[int] = None
    order_index: Optional[int] = None
    deadline: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "not_started"
    understanding_level: Optional[int] = None
    order_index: Optional[int] = None
    deadline: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    understanding_level: Optional[int] = None
    order_index: Optional[int] = None
    deadline: Optional[datetime] = None


class LearningPlanOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    is_public: bool = False
    progress: float
    status: str
    deadline: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LearningPlanCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "active"
    deadline: Optional[datetime] = None


class LearningPlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    is_public: Optional[bool] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None


class UserPublicOut(BaseModel):
    id: int
    username: str
    bio: Optional[str] = None
    icon_url: Optional[str] = None
    show_stats: bool = True

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: int
    user_id: int
    username: str = ""
    target_type: str
    target_id: int
    content: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    target_type: str  # "plan" or "task"
    target_id: int
    content: str


class KnowledgeOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    username: str = ""
    type: str
    title: Optional[str] = None
    content: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class KnowledgeCreate(BaseModel):
    type: str  # "note" / "url" / "code" / "file"
    title: Optional[str] = None
    content: Optional[str] = None


class KnowledgeUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None


class DashboardOut(BaseModel):
    active_plan_count: int
    completed_task_count: int
    study_days: int
    learning_plans: List[LearningPlanOut]
    upcoming_tasks: List[TaskOut]


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PrivacySettingsOut(BaseModel):
    profile_visibility: str = "public"
    show_in_search: bool = True
    show_stats: bool = True
    default_plan_public: bool = False

    model_config = {"from_attributes": True}


class PrivacySettingsUpdate(BaseModel):
    profile_visibility: Optional[str] = None  # public / private
    show_in_search: Optional[bool] = None
    show_stats: Optional[bool] = None
    default_plan_public: Optional[bool] = None
