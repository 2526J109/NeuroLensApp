from fastapi import FastAPI
from app.routes import cognitive

# --- REGISTER ROUTES ---
# This makes the URL: http://YOUR_IP:8000/api/cognitive/submit
app.include_router(cognitive.router, prefix="/api/cognitive", tags=["Cognitive"])
app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Welcome to NeuroLens"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
