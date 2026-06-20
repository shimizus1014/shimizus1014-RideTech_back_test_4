from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    icon_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    learning_plans = relationship("LearningPlan", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    knowledges = relationship("Knowledge", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    privacy_settings = relationship("UserPrivacySettings", back_populates="user", uselist=False)


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False)
    progress = Column(Float, default=0.0)
    status = Column(String(20), default="active")
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="learning_plans")
    tasks = relationship("Task", back_populates="learning_plan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    learning_plan_id = Column(Integer, ForeignKey("learning_plans.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="not_started")
    understanding_level = Column(Integer, nullable=True)
    order_index = Column(Integer, nullable=True)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    learning_plan = relationship("LearningPlan", back_populates="tasks")
    knowledges = relationship("Knowledge", back_populates="task")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String(20), nullable=False)  # "plan" or "task"
    target_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="comments")


class Knowledge(Base):
    __tablename__ = "knowledges"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(20), nullable=False)  # "note" / "url" / "code" / "file"
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    task = relationship("Task", back_populates="knowledges")
    user = relationship("User", back_populates="knowledges")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # "comment"
    message = Column(String(255), nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class UserPrivacySettings(Base):
    __tablename__ = "user_privacy_settings"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    # public / private
    profile_visibility = Column(String(20), default="public", nullable=False)
    show_in_search = Column(Boolean, default=True, nullable=False)
    show_stats = Column(Boolean, default=True, nullable=False)
    default_plan_public = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="privacy_settings")
