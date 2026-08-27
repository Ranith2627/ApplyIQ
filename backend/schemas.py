from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    company: str
    job_title: str
    location: Optional[str] = None
    job_url: Optional[str] = None
    status: str = "Saved"
    match_score: Optional[float] = None
    resume_version: Optional[str] = None
    work_authorization_notes: Optional[str] = None
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    job_url: Optional[str] = None
    status: Optional[str] = None
    match_score: Optional[float] = None
    resume_version: Optional[str] = None
    work_authorization_notes: Optional[str] = None
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    company: str
    job_title: str
    location: Optional[str]
    job_url: Optional[str]
    status: str
    match_score: Optional[float]
    resume_version: Optional[str]
    work_authorization_notes: Optional[str]
    notes: Optional[str]
    date_added: datetime

    class Config:
        from_attributes = True