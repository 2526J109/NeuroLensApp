import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status
from .config import settings
import os


# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        firebase_admin.get_app()
    except ValueError:
        # Not initialized, so initialize it
        cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), settings.FIREBASE_ADMIN_SDK_PATH)
        
        if not os.path.exists(cred_path):
            print(f"Warning: Firebase credentials file not found at {cred_path}")
            print("Firebase authentication will not work until you add the credentials file.")
            return
        
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully")


async def verify_firebase_token(token: str) -> dict:
    """
    Verify Firebase ID token and return user info
    
    Args:
        token: Firebase ID token
        
    Returns:
        dict: User information from Firebase
        
    Raises:
        HTTPException: If token is invalid
    """
    try:
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
