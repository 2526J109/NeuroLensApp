"""
Firestore Database Service
Provides Firestore database connection and utilities
"""
from firebase_admin import firestore
from typing import Optional, Dict, Any, List


def get_firestore_db():
    """
    Get Firestore database instance
    
    Returns:
        firestore.Client: Firestore database client
    """
    return firestore.client()


class FirestoreService:
    """Firestore database service"""
    _instance = None
    _db = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirestoreService, cls).__new__(cls)
        return cls._instance

    # Drawing prediction operations
    def save_drawing_prediction(self, user_id: str, prediction_record: Dict[str, Any]) -> Dict[str, Any]:
        """Save a drawing prediction for a user"""
        predictions_ref = self.db.collection('drawing_predictions')
        doc_ref = predictions_ref.document()
        prediction_record['id'] = doc_ref.id
        prediction_record['user_id'] = user_id
        if 'created_at' not in prediction_record:
            from datetime import datetime
            prediction_record['created_at'] = datetime.utcnow().isoformat()
        doc_ref.set(prediction_record)
        return prediction_record
        return cls._instance
    
    @property
    def db(self):
        """Lazy initialization of Firestore client"""
        if self._db is None:
            self._db = get_firestore_db()
        return self._db
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user document"""
        user_ref = self.db.collection('users').document()
        user_data['id'] = user_ref.id
        user_ref.set(user_data)
        return user_data
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by document ID"""
        user_ref = self.db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            data = user_doc.to_dict()
            data['id'] = user_doc.id
            return data
        return None
    
    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[Dict[str, Any]]:
        """Get user by Firebase UID"""
        users_ref = self.db.collection('users')
        query = users_ref.where(filter=firestore.FieldFilter('firebase_uid', '==', firebase_uid)).limit(1)
        docs = query.get()
        
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        users_ref = self.db.collection('users')
        query = users_ref.where(filter=firestore.FieldFilter('email', '==', email)).limit(1)
        docs = query.get()
        
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    
    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user document"""
        user_ref = self.db.collection('users').document(user_id)
        user_ref.update(update_data)
        
        # Get updated document
        updated_doc = user_ref.get()
        data = updated_doc.to_dict()
        data['id'] = updated_doc.id
        return data
    
    def delete_user(self, user_id: str) -> bool:
        user_ref = self.db.collection('users').document(user_id)
        user_ref.delete()
        return True
    
    # Test results operations
    def create_test_result(self, test_data: Dict[str, Any]) -> Dict[str, Any]:
        test_ref = self.db.collection('test_results').document()
        test_data['id'] = test_ref.id
        test_ref.set(test_data)
        return test_data
    
    def get_user_test_results(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all test results for a user"""
        results_ref = self.db.collection('test_results')
        query = results_ref.where(filter=firestore.FieldFilter('user_id', '==', user_id)).order_by('created_at', direction=firestore.Query.DESCENDING)
        docs = query.get()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(data)
        return results
    
    # Voice analysis operations
    def create_voice_analysis(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new voice analysis document"""
        analysis_ref = self.db.collection('voice_analyses').document()
        analysis_data['id'] = analysis_ref.id
        analysis_ref.set(analysis_data)
        return analysis_data
    
    def get_user_voice_analyses(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all voice analyses for a user"""
        analyses_ref = self.db.collection('voice_analyses')
        query = analyses_ref.where(filter=firestore.FieldFilter('user_id', '==', user_id)).order_by('created_at', direction=firestore.Query.DESCENDING)
        docs = query.get()
        
        analyses = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            analyses.append(data)
        return analyses


# Get Firestore service instance (lazy singleton)
def get_firestore_service() -> FirestoreService:
    """Get or create the Firestore service singleton instance"""
    return FirestoreService()
