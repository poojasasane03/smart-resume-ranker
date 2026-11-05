from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from .limits import (
    MAX_JOB_CHARS,
    MAX_REDACT_TERMS,
    MAX_RESUME_CHARS,
    MAX_RESUMES,
    MAX_SKILL_CHARS,
    MAX_SKILLS_PER_RESUME,
)

SkillName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_SKILL_CHARS)]
RedactTerm = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]


class ResumeIn(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    text: str = Field(max_length=MAX_RESUME_CHARS)
    # Candidate name and email: removed from the text before the model sees it
    redact: list[RedactTerm] = Field(default_factory=list, max_length=MAX_REDACT_TERMS)
    # Skills the exact matching did not find in this resume
    missing_skills: list[SkillName] = Field(default_factory=list, max_length=MAX_SKILLS_PER_RESUME)


class AnalyzeRequest(BaseModel):
    job_text: str = Field(min_length=10, max_length=MAX_JOB_CHARS)
    resumes: list[ResumeIn] = Field(min_length=1, max_length=MAX_RESUMES)


class SkillMatch(BaseModel):
    skill: str
    line: str
    similarity: float
    margin: float


class ResumeOut(BaseModel):
    id: str
    semantic_similarity: float | None
    chunks: int
    skill_matches: list[SkillMatch]


class AnalyzeResponse(BaseModel):
    model: str
    results: list[ResumeOut]