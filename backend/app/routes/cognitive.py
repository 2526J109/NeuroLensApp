from fastapi import APIRouter, HTTPException
from app.schemas.cognitive import CognitiveTestCreate

# Create a router specifically for cognitive tests
router = APIRouter()

@router.post("/submit", response_model=dict)
async def submit_cognitive_result(data: CognitiveTestCreate):
    try:
        # ---------------------------------------------------------
        # TODO: Later, you will save 'data' to your database here.
        # For now, we just print it to prove the connection works.
        # ---------------------------------------------------------
        print(f"\n🧠 COGNITIVE DATA RECEIVED:")
        print(f"   • Type: {data.test_type}")
        print(f"   • Score: {data.score}")
        print(f"   • Level: {data.level}")
        print(f"   • Time: {data.timestamp}\n")
        
        return {"status": "success", "message": "Cognitive result saved"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))