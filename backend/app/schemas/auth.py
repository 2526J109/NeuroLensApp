from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    """Schema for user registration request"""
    email: EmailStr
    full_name: Optional[str] = None
    gender: Optional[str] = None
    birthday: Optional[str] = None
    handedness: Optional[str] = None
    family_history: Optional[int] = None
    rem_sleep: Optional[int] = None


class LoginResponse(BaseModel):
    """Schema for login response"""
    message: str
    user: dict
