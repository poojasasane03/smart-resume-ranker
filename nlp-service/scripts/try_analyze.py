"""Part 3: runs the real analysis (with the real model) on sample data.
Run from the nlp-service folder:  python scripts/try_analyze.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.analysis import analyze
from app.embedder import Embedder
from app.schemas import ResumeIn
from app.text_utils import redact_text, split_chunks

JOB = """Machine Learning Engineer
We are looking for an engineer to train and deploy machine learning models.
You will build REST APIs that serve predictions and deploy them with Docker on AWS.
Experience with Java is a plus."""

RESUME_A = """PRIYA SHARMA
priya.sharma@example.com | +91 98765 43210 | github.com/priya-sharma

Experience
Trained ML models to predict customer churn using Python
Built web services that return JSON predictions for the mobile app
Deployed containers to AWS
Built interactive dashboards with JavaScript and React
"""

RESUME_B = """RAHUL VERMA
rahul.verma@example.com

Experience
Experienced pastry chef who designs seasonal dessert menus
Managed a kitchen team of twelve cooks
Reduced food waste by twenty percent every quarter
"""

resumes = [
    ResumeIn(
        id="A",
        text=RESUME_A,
        redact=["Priya Sharma", "priya.sharma@example.com"],
        missing_skills=["Machine Learning", "REST API", "Docker", "Java"],
    ),
    ResumeIn(
        id="B",
        text=RESUME_B,
        redact=["Rahul Verma", "rahul.verma@example.com"],
        missing_skills=["Machine Learning", "REST API", "Docker", "Java"],
    ),
]

print("Loading the model...")
embedder = Embedder("all-MiniLM-L6-v2")

print("\nWhat the model receives for resume A (personal details removed):")
for chunk in split_chunks(redact_text(RESUME_A, resumes[0].redact), 50):
    print(f"   - {chunk}")

results = analyze(embedder, JOB, resumes)

for result in results:
    print(f"\n=== Resume {result['id']} ===")
    print(f"Pieces of text analysed : {result['chunks']}")
    print(f"Semantic similarity     : {result['semantic_similarity']}")
    print("Closest line for each skill that exact matching missed:")
    for match in result["skill_matches"]:
        print(
            f"   {match['skill']:<17} similarity {match['similarity']:5.2f}  "
            f"margin {match['margin']:5.2f}  -> {match['line']}"
        )