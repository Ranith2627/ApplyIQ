import io
import re

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import JobApplication
from schemas import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationUpdate,
)


app = FastAPI()

Base.metadata.create_all(bind=engine)

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


@app.post(
    "/applications",
    response_model=ApplicationResponse
)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db)
):
    new_application = JobApplication(
        company=application.company,
        job_title=application.job_title,
        location=application.location,
        job_url=application.job_url,
        status=application.status,
        match_score=application.match_score,
        resume_version=application.resume_version,
        work_authorization_notes=application.work_authorization_notes,
        notes=application.notes,
        date_applied=application.date_applied,
        follow_up_date=application.follow_up_date
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return new_application


@app.get(
    "/applications",
    response_model=list[ApplicationResponse]
)
def get_applications(
    db: Session = Depends(get_db)
):
    return (
        db.query(JobApplication)
        .order_by(JobApplication.date_added.desc())
        .all()
    )


@app.put(
    "/applications/{application_id}",
    response_model=ApplicationResponse
)
def update_application(
    application_id: int,
    application: ApplicationUpdate,
    db: Session = Depends(get_db)
):
    existing_application = (
        db.query(JobApplication)
        .filter(JobApplication.id == application_id)
        .first()
    )

    if not existing_application:
        raise HTTPException(
            status_code=404,
            detail="Application not found."
        )

    update_data = application.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(
            existing_application,
            field,
            value
        )

    db.commit()
    db.refresh(existing_application)

    return existing_application


@app.delete("/applications/{application_id}")
def delete_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    application = (
        db.query(JobApplication)
        .filter(JobApplication.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found."
        )

    db.delete(application)
    db.commit()

    return {
        "message": "Application deleted successfully."
    }


@app.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db)
):
    applications = db.query(JobApplication).all()

    total = len(applications)

    saved = sum(
        1 for app in applications
        if app.status.lower() == "saved"
    )

    applied = sum(
        1 for app in applications
        if app.status.lower() == "applied"
    )

    interview = sum(
        1 for app in applications
        if app.status.lower() == "interview"
    )

    rejected = sum(
        1 for app in applications
        if app.status.lower() == "rejected"
    )

    offer = sum(
        1 for app in applications
        if app.status.lower() == "offer"
    )

    return {
        "total": total,
        "saved": saved,
        "applied": applied,
        "interview": interview,
        "rejected": rejected,
        "offer": offer
    }