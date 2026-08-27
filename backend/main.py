
import io
import re

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str


SKILL_ALIASES = {
    "python": ["python"],
    "java": ["java"],
    "javascript": ["javascript"],
    "typescript": ["typescript"],
    "react": ["react", "react.js", "reactjs"],
    "node.js": ["node.js", "nodejs", "node"],
    "fastapi": ["fastapi"],
    "sql": ["sql"],
    "postgresql": ["postgresql", "postgres"],
    "aws": ["aws", "amazon web services"],
    "azure": ["azure", "microsoft azure"],
    "docker": ["docker", "containerization"],
    "kubernetes": ["kubernetes", "k8s"],
    "git": ["git"],
    "github": ["github"],
    "rest api": [
        "rest api",
        "rest APIs",
        "restful api",
        "restful APIs",
    ],
    "machine learning": [
        "machine learning",
        "ml",
    ],
    "generative ai": [
        "generative ai",
        "genai",
        "gen ai",
    ],
    "llm": [
        "llm",
        "llms",
        "large language model",
        "large language models",
    ],
    "rag": [
        "rag",
        "retrieval-augmented generation",
        "retrieval augmented generation",
    ],
    "html": ["html"],
    "css": ["css"],
}


def contains_skill(text, aliases):
    text = text.lower()

    for alias in aliases:
        alias = alias.lower()
        pattern = r"(?<!\w)" + re.escape(alias) + r"(?!\w)"

        if re.search(pattern, text):
            return True

    return False


@app.get("/")
def home():
    return {
        "message": "ApplyIQ backend is running"
    }


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    try:
        contents = await file.read()

        pdf_stream = io.BytesIO(contents)
        reader = PdfReader(pdf_stream)

        extracted_text = ""

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                extracted_text += page_text + "\n"

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text was found in the PDF."
            )

        return {
            "filename": file.filename,
            "resume_text": extracted_text.strip()
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not process the PDF."
        )


@app.post("/analyze")
def analyze_job(data: JobAnalysisRequest):
    resume = data.resume_text.lower()
    job = data.job_description.lower()

    required_skills = []

    for skill, aliases in SKILL_ALIASES.items():
        if contains_skill(job, aliases):
            required_skills.append(skill)

    matched_skills = []

    for skill in required_skills:
        aliases = SKILL_ALIASES[skill]

        if contains_skill(resume, aliases):
            matched_skills.append(skill)

    missing_skills = []

    for skill in required_skills:
        if skill not in matched_skills:
            missing_skills.append(skill)

    if len(required_skills) > 0:
        match_percentage = round(
            len(matched_skills)
            / len(required_skills)
            * 100,
            2
        )
    else:
        match_percentage = 0

    return {
        "match_percentage": match_percentage,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "required_skills": required_skills
    }