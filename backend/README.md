# NeuroLens Backend

FastAPI backend for NeuroLens application.

## Quick Start

```powershell
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies (using uv - faster)
uv pip install -r requirements.txt

# Run development server
uvicorn main:app --reload
```

Server runs at: `http://localhost:8000`

