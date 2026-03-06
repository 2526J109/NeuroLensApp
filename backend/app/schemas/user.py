from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: Optional[str] = None
    gender: Optional[str] = None
    birthday: Optional[str] = None
    handedness: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    firebase_uid: str


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    full_name: Optional[str] = None
    gender: Optional[str] = None
    birthday: Optional[str] = None
    handedness: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: str  # Firestore uses string document IDs
    firebase_uid: str
    created_at: str  # ISO format datetime string
    
    class Config:
        from_attributes = True
