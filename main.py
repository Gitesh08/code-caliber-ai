from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
from dotenv import load_dotenv
from services.service import analyze_code_files, analyze_github_repository
from schema.models import ALLOWED_EXTENSIONS

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Code Documentation Generator")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure static files and templates
static_dir = Path("static")
templates_dir = Path("templates")
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
templates = Jinja2Templates(directory=str(templates_dir))

# Constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload-and-analyze")
async def upload_and_analyze(
    file: UploadFile = File(...),
    gemini_api_key: str = Form(...),
    custom_instructions: str = Form("")
):
    try:
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="Only ZIP files are allowed")
        
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds maximum limit")
        
        documentation = await analyze_code_files(content, gemini_api_key, custom_instructions, ALLOWED_EXTENSIONS)
        return JSONResponse(content={"documentation": documentation})
    except Exception as e:
        import traceback
        error_detail = f"An error occurred: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)
      
@app.post("/analyze-github")
async def analyze_github(request_data: dict):
    try:
        if not request_data.get('github_url'):
            raise HTTPException(status_code=400, detail="GitHub repository URL is required")
        
        if not request_data.get('gemini_api_key'):
            raise HTTPException(status_code=400, detail="Gemini API key is required")
        
        documentation = await analyze_github_repository(
            repo_url=request_data['github_url'],
            api_key=request_data['gemini_api_key'],
            custom_instructions=request_data.get('custom_instructions', '')
        )
        
        return JSONResponse(content={"documentation": documentation})
    except Exception as e:
        import traceback
        error_detail = f"An error occurred: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

@app.get("/validate-github-repo/{owner}/{repo}")
async def validate_github_repo(owner: str, repo: str):
    try:
        from services.githubService import check_repository_exists
        exists = await check_repository_exists(owner, repo)
        return JSONResponse(content={"exists": exists})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))