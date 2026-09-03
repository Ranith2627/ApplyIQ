import csv
import io
import json
import os
import re

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
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


# ---------------------------------------------------
# ENVIRONMENT / OPENAI
# ---------------------------------------------------

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = None

if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)


# ---------------------------------------------------
# FASTAPI
# ---------------------------------------------------

app = FastAPI(
    title="ApplyIQ API",
    description="AI-powered job analysis and application tracking API",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------

class JobAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str


class AIAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str


# ---------------------------------------------------
# SKILL MATCHING
# ---------------------------------------------------

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

        pattern = (
            r"(?<!\w)"
            + re.escape(alias)
            + r"(?!\w)"
        )

        if re.search(pattern, text):
            return True

    return False


# ---------------------------------------------------
# HOME
# ---------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "ApplyIQ backend is running"
    }


# ---------------------------------------------------
# PDF RESUME UPLOAD
# ---------------------------------------------------

@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...)
):
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
                extracted_text += (
                    page_text + "\n"
                )

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text was found "
                    "in the PDF."
                )
            )

        return {
            "filename": file.filename,
            "resume_text":
                extracted_text.strip()
        }

    except HTTPException:
        raise

    except Exception as error:
        print("PDF ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail="Could not process the PDF."
        )


# ---------------------------------------------------
# RULE-BASED JOB ANALYSIS
# ---------------------------------------------------

@app.post("/analyze")
def analyze_job(
    data: JobAnalysisRequest
):
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

    if required_skills:
        match_percentage = round(
            len(matched_skills)
            / len(required_skills)
            * 100,
            2
        )
    else:
        match_percentage = 0

    return {
        "match_percentage":
            match_percentage,
        "matched_skills":
            matched_skills,
        "missing_skills":
            missing_skills,
        "required_skills":
            required_skills,
    }


# ---------------------------------------------------
# AI JOB ANALYSIS
# ---------------------------------------------------

@app.post("/ai-analyze")
def ai_analyze(
    data: AIAnalysisRequest
):
    if client is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "OPENAI_API_KEY is not configured."
            )
        )

    if not data.resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Resume text is required."
        )

    if not data.job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description is required."
        )

    prompt = f"""
You are the AI analysis engine for a job application
assistant called ApplyIQ.

Compare the candidate's resume against the job description.

IMPORTANT RULES:

1. Never invent candidate experience.
2. Never claim the candidate has a skill unless the resume supports it.
3. Distinguish required qualifications from preferred qualifications.
4. Identify work authorization restrictions such as:
   - U.S. citizenship
   - security clearance
   - permanent residency
   - sponsorship restrictions
   - OPT/CPT restrictions
   - no sponsorship now or in the future
5. Resume suggestions must be truthful.
6. Do not tell the candidate to claim skills they have never used.
7. Keep the response useful for an entry-level applicant.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "job_summary": "2-4 sentence summary of the role",

    "match_explanation":
        "Short explanation of why the candidate is or is not a strong match",

    "strengths": [
        "strength 1",
        "strength 2"
    ],

    "gaps": [
        "gap 1",
        "gap 2"
    ],

    "resume_suggestions": [
        "suggestion 1",
        "suggestion 2",
        "suggestion 3"
    ],

    "important_requirements": [
        "requirement 1",
        "requirement 2"
    ],

    "eligibility_warning":
        "Work authorization or eligibility warning. Use an empty string if none is found.",

    "recommended_action":
        "Apply, Maybe Apply, or Skip",

    "recommended_action_reason":
        "Short reason for the recommendation"
}}

RESUME:

{data.resume_text}


JOB DESCRIPTION:

{data.job_description}
"""

    try:
        response = client.responses.create(
            model="gpt-5.6-sol",
            input=prompt
        )

        text = response.output_text.strip()

        if text.startswith("```"):
            text = re.sub(
                r"^```(?:json)?",
                "",
                text
            )

            text = re.sub(
                r"```$",
                "",
                text
            )

            text = text.strip()

        try:
            result = json.loads(text)

        except json.JSONDecodeError:
            return {
                "job_summary": "",
                "match_explanation": text,
                "strengths": [],
                "gaps": [],
                "resume_suggestions": [],
                "important_requirements": [],
                "eligibility_warning": "",
                "recommended_action": "Review",
                "recommended_action_reason":
                    "The AI response could not be parsed as JSON.",
            }

        return result

    except Exception as error:
        print("AI ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail=(
                "AI analysis failed: "
                + str(error)
            )
        )


# ---------------------------------------------------
# CREATE APPLICATION
# ---------------------------------------------------

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
        work_authorization_notes=
            application.work_authorization_notes,
        notes=application.notes,
        date_applied=application.date_applied,
        follow_up_date=application.follow_up_date,
        ai_recommendation=
            application.ai_recommendation,
        ai_reason=
            application.ai_reason,
        eligibility_warning=
            application.eligibility_warning,
        ai_job_summary=
            application.ai_job_summary,
        ai_match_explanation=
            application.ai_match_explanation,
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return new_application


# ---------------------------------------------------
# GET APPLICATIONS
# ---------------------------------------------------

@app.get(
    "/applications",
    response_model=list[ApplicationResponse]
)
def get_applications(
    db: Session = Depends(get_db)
):
    return (
        db.query(JobApplication)
        .order_by(
            JobApplication.date_added.desc()
        )
        .all()
    )


# ---------------------------------------------------
# UPDATE APPLICATION
# ---------------------------------------------------

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
        .filter(
            JobApplication.id
            == application_id
        )
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


# ---------------------------------------------------
# DELETE APPLICATION
# ---------------------------------------------------

@app.delete(
    "/applications/{application_id}"
)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    application = (
        db.query(JobApplication)
        .filter(
            JobApplication.id
            == application_id
        )
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
        "message":
            "Application deleted successfully."
    }


# ---------------------------------------------------
# DASHBOARD
# ---------------------------------------------------

@app.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db)
):
    applications = (
        db.query(JobApplication)
        .all()
    )

    total = len(applications)

    saved = sum(
        1
        for application in applications
        if application.status.lower() == "saved"
    )

    applied = sum(
        1
        for application in applications
        if application.status.lower() == "applied"
    )

    interview = sum(
        1
        for application in applications
        if application.status.lower() == "interview"
    )

    rejected = sum(
        1
        for application in applications
        if application.status.lower() == "rejected"
    )

    offer = sum(
        1
        for application in applications
        if application.status.lower() == "offer"
    )

    submitted_count = (
        applied
        + interview
        + rejected
        + offer
    )

    if submitted_count > 0:
        interview_rate = round(
            (
                interview
                + offer
            )
            / submitted_count
            * 100,
            2
        )

        offer_rate = round(
            offer
            / submitted_count
            * 100,
            2
        )

    else:
        interview_rate = 0
        offer_rate = 0

    return {
        "total": total,
        "saved": saved,
        "applied": applied,
        "interview": interview,
        "rejected": rejected,
        "offer": offer,
        "interview_rate":
            interview_rate,
        "offer_rate":
            offer_rate,
    }


# ---------------------------------------------------
# CSV EXPORT
# ---------------------------------------------------

@app.get("/applications-export")
def export_applications(
    db: Session = Depends(get_db)
):
    applications = (
        db.query(JobApplication)
        .order_by(
            JobApplication.date_added.desc()
        )
        .all()
    )

    output = io.StringIO()

    writer = csv.writer(output)

    writer.writerow([
        "Company",
        "Job Title",
        "Location",
        "Status",
        "Match Score",
        "Date Applied",
        "Follow Up Date",
        "Resume Version",
        "Work Authorization",
        "AI Recommendation",
        "AI Reason",
        "Eligibility Warning",
        "AI Job Summary",
        "AI Match Explanation",
        "Notes",
        "Job URL",
    ])

    for application in applications:
        writer.writerow([
            application.company,
            application.job_title,
            application.location or "",
            application.status,
            application.match_score or "",
            application.date_applied or "",
            application.follow_up_date or "",
            application.resume_version or "",
            application.work_authorization_notes or "",
            application.ai_recommendation or "",
            application.ai_reason or "",
            application.eligibility_warning or "",
            application.ai_job_summary or "",
            application.ai_match_explanation or "",
            application.notes or "",
            application.job_url or "",
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                "attachment; filename=applyiq_applications.csv"
        }
    )