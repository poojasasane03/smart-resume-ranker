import re

from .limits import MAX_CHUNK_CHARS, MIN_CHUNK_CHARS

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL_RE = re.compile(r"(?:https?://|www\.)\S+|(?:linkedin|github)\.com/\S+", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)")
BULLET_RE = re.compile(r"^[•●○◦▪■□▶►‣⁃*\-–—·]+\s*")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def redact_text(text, terms=()):
    """Removes personal details (the candidate's name and email, any email, phone number or profile link)
    so they never reach the model and cannot influence a score."""
    for term in terms:
        term = term.strip()
        if len(term) >= 2:
            text = re.sub(re.escape(term), " ", text, flags=re.IGNORECASE)
    text = EMAIL_RE.sub(" ", text)
    text = URL_RE.sub(" ", text)
    text = PHONE_RE.sub(" ", text)
    return text


def split_chunks(text, max_chunks):
    """Cuts a text into short, meaningful pieces (lines or sentences).
    The model only reads a limited amount of text at once, so we embed small pieces instead of the whole resume."""

    # 1. Join lines that were broken in the middle of a sentence (common in PDFs)
    merged = []
    previous_is_open = False
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            previous_is_open = False
            continue

        starts_with_bullet = BULLET_RE.match(line) is not None
        if merged and previous_is_open and not starts_with_bullet and line[0].islower():
            merged[-1] += " " + line
        else:
            merged.append(line)
        previous_is_open = not line.endswith((".", "!", "?", ":", ";"))

    # 2. Remove bullets, split into sentences, and keep only useful pieces
    chunks = []
    seen = set()
    for line in merged:
        line = BULLET_RE.sub("", line).strip()
        for part in SENTENCE_SPLIT_RE.split(line):
            part = re.sub(r"\s+", " ", part).strip()
            if len(part) < MIN_CHUNK_CHARS:
                continue
            if sum(char.isalpha() for char in part) < 0.5 * len(part):
                continue  # mostly digits or symbols, such as dates and grades
            part = part[:MAX_CHUNK_CHARS]

            key = part.lower()
            if key in seen:
                continue
            seen.add(key)

            chunks.append(part)
            if len(chunks) >= max_chunks:
                return chunks
    return chunks