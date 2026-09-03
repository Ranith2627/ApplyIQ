import json
import os

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def analyze_with_ai(resume_text, job_description):
    prompt = f"""
You are an AI assistant inside a job application tool called ApplyIQ.

Analyze the candidate's resume against the job description.

Important rules:
- Do not invent experience.
- Do not claim the candidate has a skill unless the resume supports it.
- Clearly distinguish required skills from preferred skills.
- If the job contains citizenship, permanent residence, security clearance,
  sponsorship, OPT, CPT, or work authorization restrictions, identify them.
- Keep the response concise and useful for an entry-level candidate.

Return ONLY valid JSON with this structure:

{{
  "job_summary": "short summary",
  "match_explanation": "short explanation",
  "resume_suggestions": [
    "suggestion 1",
    "suggestion 2",
    "suggestion 3"
  ],
  "eligibility_warning": "warning or empty string",
  "important_requirements": [
    "requirement 1",
    "requirement 2"
  ]
}}

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""

    response = client.responses.create(
        model="gpt-5.6-sol",
        input=prompt
    )

    text = response.output_text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "job_summary": "",
            "match_explanation": text,
            "resume_suggestions": [],
            "eligibility_warning": "",
            "important_requirements": []
        }