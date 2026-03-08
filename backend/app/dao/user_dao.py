from typing import Optional, Dict, Any
from datetime import datetime
from ..core.firestore import get_firestore_service
from ..schemas.user import UserCreate, UserUpdate


class UserDAO:
    """Data Access Object for User operations using Firestore"""
    
    def __init__(self):
        self.db = get_firestore_service()
    
    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.db.get_user_by_id(user_id)
    
    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        return self.db.get_user_by_email(email)
    
    def get_by_firebase_uid(self, firebase_uid: str) -> Optional[Dict[str, Any]]:
        """Get user by Firebase UID"""
        return self.db.get_user_by_firebase_uid(firebase_uid)
    
    def create(self, user_data: UserCreate) -> Dict[str, Any]:
        """Create a new user"""
        user_dict = {
            'firebase_uid': user_data.firebase_uid,
            'email': user_data.email,
            'full_name': user_data.full_name,
            'gender': user_data.gender,
            'birthday': user_data.birthday,
            'handedness': user_data.handedness,
            'family_history': user_data.family_history,
            'rem_sleep': user_data.rem_sleep,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        return self.db.create_user(user_dict)
    
    def update(self, user_id: str, user_data: UserUpdate) -> Dict[str, Any]:
        update_dict = user_data.dict(exclude_unset=True)
        update_dict['updated_at'] = datetime.utcnow().isoformat()
        return self.db.update_user(user_id, update_dict)
    
    def delete(self, user_id: str) -> bool:
        return self.db.delete_user(user_id)

