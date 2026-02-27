from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from ..core.database import get_db
from ..core.deps import get_current_user, security
from ..core.firebase import verify_firebase_token
from ..dao.user_dao import UserDAO
from ..schemas.auth import RegisterRequest
from ..schemas.user import UserCreate, UserUpdate, UserResponse
from ..models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    request: RegisterRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Register a new user after Firebase authentication
    
    This endpoint is called after the user has successfully signed up with Firebase.
    It creates a user record in the database linked to their Firebase UID.
    """
    # Extract and verify Firebase token
    token = credentials.credentials
    firebase_user = await verify_firebase_token(token)
    
    print(f"🔵 Registration request received for: {request.email}")
    print(f"   Firebase UID: {firebase_user['uid']}")
    
    user_dao = UserDAO(db)
    
    # Check if user already exists
    existing_user = user_dao.get_by_firebase_uid(firebase_user['uid'])
    if existing_user:
        print(f"✅ User already exists, returning existing profile")
        return existing_user
    
    # Check if email is already registered
    existing_email = user_dao.get_by_email(request.email)
    if existing_email:
        print(f"❌ Email already registered")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_data = UserCreate(
        firebase_uid=firebase_user['uid'],
        email=request.email,
        full_name=request.full_name
    )
    
    print(f"🔵 Creating new user in database...")
    user = user_dao.create(user_data)
    print(f"✅ User created successfully! ID: {user.id}")
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information
    
    This endpoint returns the profile information of the currently authenticated user.
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile
    
    This endpoint allows users to update their profile information.
    """
    user_dao = UserDAO(db)
    updated_user = user_dao.update(current_user, update_data)
    return updated_user
