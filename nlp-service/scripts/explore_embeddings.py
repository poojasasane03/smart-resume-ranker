"""Part 2: see how embeddings work.  Run from the nlp-service folder:  python scripts/explore_embeddings.py"""
import time

start = time.time()
from sentence_transformers import SentenceTransformer

print("Loading the model (the first run downloads about 90 MB, so it can take a few minutes)...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print(f"Model ready in {time.time() - start:.1f} seconds")
print(f"Longest text the model reads: {model.max_seq_length} tokens (anything longer is ignored)\n")

# ---------- 1. What an embedding looks like ----------
vector = model.encode("machine learning", normalize_embeddings=True)
print("1) A text becomes a list of numbers")
print("   Text           : machine learning")
print(f"   Vector length  : {len(vector)}")
print(f"   First 5 numbers: {[round(float(x), 3) for x in vector[:5]]}\n")


# ---------- 2. How close are two texts in meaning? ----------
def similarity(a, b):
    """Cosine similarity. The vectors are normalised, so a plain dot product is enough."""
    va, vb = model.encode([a, b], normalize_embeddings=True)
    return float(va @ vb)


PAIRS = [
    ("machine learning", "ML model training"),
    ("REST API development", "built web services that return JSON"),
    ("frontend developer", "built user interfaces with React"),
    ("machine learning", "cooking pasta"),
    ("Node.js backend", "Photoshop graphic design"),
    ("Java developer", "JavaScript developer"),
    ("Docker", "Kubernetes"),
]

print("2) Similarity of two texts (closer to 1 = closer meaning)")
results = sorted(((similarity(a, b), a, b) for a, b in PAIRS), reverse=True)
for score, a, b in results:
    bar = "#" * int(max(score, 0) * 30)
    print(f"   {score:5.2f}  {bar:<30}  {a}  <->  {b}")

# ---------- 3. Finding a skill inside resume lines (what Part 5 will do) ----------
SKILL = "machine learning"
RESUME_LINES = [
    "Trained ML models to predict customer churn",
    "Built REST APIs with Node.js and Express",
    "Designed the user interface in Figma",
    "Deployed services on AWS using Docker",
]

line_vectors = model.encode(RESUME_LINES, normalize_embeddings=True)
skill_vector = model.encode(SKILL, normalize_embeddings=True)
scores = line_vectors @ skill_vector

print(f"\n3) Which resume line is closest to the skill '{SKILL}'?")
for line, score in zip(RESUME_LINES, scores):
    print(f"   {float(score):5.2f}  {line}")
print(f"   Best match: {RESUME_LINES[int(scores.argmax())]}")