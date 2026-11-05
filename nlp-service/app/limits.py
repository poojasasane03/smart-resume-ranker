# Limits that protect the service from huge or malicious requests
MAX_RESUMES = 200
MAX_RESUME_CHARS = 100_000
MAX_JOB_CHARS = 10_000
MAX_SKILLS_PER_RESUME = 60
MAX_SKILL_CHARS = 80
MAX_REDACT_TERMS = 10

# How texts are cut into pieces before they are embedded
MIN_CHUNK_CHARS = 15
MAX_CHUNK_CHARS = 300
MAX_RESUME_CHUNKS = 150
MAX_JOB_CHUNKS = 40