from fastapi import FastAPI
from app.routes import cognitive

# --- REGISTER ROUTES ---
# This makes the URL: http://YOUR_IP:8000/api/cognitive/submit
app.include_router(cognitive.router, prefix="/api/cognitive", tags=["Cognitive"])
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware
from app.routes import voice_analysis

app = FastAPI(title="NeuroLens API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(voice_analysis.router)


@app.get("/")
async def root():
    return {"message": "Welcome to NeuroLens API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
