from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from ..core.deps import get_current_user, security
from ..core.firebase import verify_firebase_token
from ..dao.user_dao import UserDAO
from ..schemas.auth import RegisterRequest
from ..schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    request: RegisterRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    firebase_user = await verify_firebase_token(token)
    
    user_dao = UserDAO()
    
    existing_user = user_dao.get_by_firebase_uid(firebase_user['uid'])
    if existing_user:
        return existing_user
    
    existing_email = user_dao.get_by_email(request.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_data = UserCreate(
        firebase_uid=firebase_user['uid'],
        email=request.email,
        full_name=request.full_name
    )
    
    user = user_dao.create(user_data)
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current authenticated user information
    
    This endpoint returns the profile information of the currently authenticated user.
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's profile
    
    This endpoint allows users to update their profile information.
    """
    user_dao = UserDAO()
    updated_user = user_dao.update(current_user['id'], update_data)
    return updated_user
