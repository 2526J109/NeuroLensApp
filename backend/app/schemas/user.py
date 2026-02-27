from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    firebase_uid: str


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    full_name: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: int
    firebase_uid: str
    created_at: datetime
    
    class Config:
        from_attributes = True
