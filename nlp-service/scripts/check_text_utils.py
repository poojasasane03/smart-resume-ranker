"""Part 3: checks the text cleaning code. It does not need the model.
Run from the nlp-service folder:  python scripts/check_text_utils.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.text_utils import redact_text, split_chunks

failed = 0


def check(label, ok):
    global failed
    if not ok:
        failed += 1
    print(f"  {'PASS' if ok else 'FAIL'}  {label}")


print("Removing personal details")
resume = (
    "Priya Sharma\n"
    "priya.sharma@example.com | +91 98765 43210 | linkedin.com/in/priya-sharma\n"
    "Built REST APIs for a payments platform\n"
)
clean = redact_text(resume, ["Priya Sharma", "priya.sharma@example.com"])
check("the name is removed", "priya" not in clean.lower() and "sharma" not in clean.lower())
check("the email is removed", "@" not in clean)
check("the phone number is removed", "98765" not in clean)
check("the profile link is removed", "linkedin" not in clean.lower())
check("the real content stays", "Built REST APIs for a payments platform" in clean)

other_email = redact_text("Contact: someone.else@mail.org for details about the role", [])
check("an email is removed even if it was not in the list", "@" not in other_email)

print("\nCutting text into pieces")
check(
    "a line broken in the middle of a sentence is joined",
    split_chunks("Developed backend services using\nexpress and mongodb for the platform", 50)
    == ["Developed backend services using express and mongodb for the platform"],
)
check(
    "bullets are removed",
    split_chunks("• Trained ML models to predict customer churn", 50)
    == ["Trained ML models to predict customer churn"],
)
check(
    "a text with two sentences gives two pieces",
    len(split_chunks("Built REST APIs for payments. Deployed services on AWS using Docker.", 50)) == 2,
)
check("very short lines are dropped", split_chunks("Skills\nPython", 50) == [])
check("lines that are mostly numbers are dropped", split_chunks("2018 - 2022      9.1 CGPA   8.5 / 10", 50) == [])
check(
    "repeated lines are kept once",
    len(split_chunks("Built dashboards for the sales team\nBuilt dashboards for the sales team", 50)) == 1,
)
many = "\n".join(f"Worked on project number {'x' * i} for a client" for i in range(1, 20))
check("the number of pieces is capped", len(split_chunks(many, 5)) == 5)
check("a new line after a finished sentence starts a new piece",
      len(split_chunks("Led a team of five engineers.\nImproved API speed by thirty percent.", 50)) == 2)

print("All checks passed" if failed == 0 else f"\n{failed} check(s) failed")
sys.exit(1 if failed else 0)