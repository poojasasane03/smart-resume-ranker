import os
from pathlib import Path

from dotenv import load_dotenv

# Read nlp-service/.env (one folder above this file)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

NLP_SECRET = os.getenv("NLP_SECRET", "")

if len(NLP_SECRET) < 16:
    raise RuntimeError(
        "NLP_SECRET is missing or too short. Add a random value of at least 16 characters to nlp-service/.env"
    )