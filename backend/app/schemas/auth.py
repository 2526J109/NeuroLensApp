from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    """Schema for user registration request"""
    email: EmailStr
    full_name: Optional[str] = None


class LoginResponse(BaseModel):
    """Schema for login response"""
    message: str
    user: dict
