from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)

from database import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)

    company = Column(String(150), nullable=False)
    job_title = Column(String(150), nullable=False)

    location = Column(String(150), nullable=True)
    job_url = Column(Text, nullable=True)

    status = Column(
        String(50),
        nullable=False,
        default="Saved"
    )

    match_score = Column(Float, nullable=True)

    resume_version = Column(
        String(100),
        nullable=True
    )

    work_authorization_notes = Column(
        Text,
        nullable=True
    )

    notes = Column(Text, nullable=True)

    date_applied = Column(
        Date,
        nullable=True
    )

    follow_up_date = Column(
        Date,
        nullable=True
    )

    ai_recommendation = Column(
        String(50),
        nullable=True
    )

    ai_reason = Column(
        Text,
        nullable=True
    )

    eligibility_warning = Column(
        Text,
        nullable=True
    )

    ai_job_summary = Column(
        Text,
        nullable=True
    )

    ai_match_explanation = Column(
        Text,
        nullable=True
    )

    date_added = Column(
        DateTime,
        default=datetime.utcnow
    )