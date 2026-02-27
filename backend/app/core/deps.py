from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any

from .firebase import verify_firebase_token
from ..dao.user_dao import UserDAO

# Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Get current authenticated user from Firebase token
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        dict: Current authenticated user data
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    
    # Verify Firebase token
    firebase_user = await verify_firebase_token(token)
    
    # Get user from Firestore
    user_dao = UserDAO()
    user = user_dao.get_by_firebase_uid(firebase_user['uid'])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database"
        )
    
    return user


async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current active user
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        dict: Current active user data
    """
    # You can add additional checks here (e.g., is_active flag)
    return current_user
