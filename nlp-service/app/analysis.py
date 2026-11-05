import numpy as np

from .limits import MAX_JOB_CHUNKS, MAX_RESUME_CHUNKS
from .text_utils import redact_text, split_chunks


def analyze(embedder, job_text, resumes):
    """For every resume returns:
    - semantic_similarity: how much of the job is covered by the resume, in meaning
    - skill_matches: for each skill the exact matching missed, the closest resume line (a hint, not proof)
    """
    job_chunks = split_chunks(job_text, MAX_JOB_CHUNKS)
    job_vectors = embedder.encode(job_chunks)

    # Each skill is embedded only once, even when many resumes miss it
    unique_skills = sorted({skill for resume in resumes for skill in resume.missing_skills})
    skill_vectors = dict(zip(unique_skills, embedder.encode(unique_skills)))

    return [_analyze_one(embedder, resume, job_vectors, skill_vectors) for resume in resumes]


def _analyze_one(embedder, resume, job_vectors, skill_vectors):
    text = redact_text(resume.text, resume.redact)
    chunks = split_chunks(text, MAX_RESUME_CHUNKS)

    if not chunks:
        return {"id": resume.id, "semantic_similarity": None, "chunks": 0, "skill_matches": []}

    vectors = embedder.encode(chunks)

    semantic = None
    if len(job_vectors) > 0:
        # For every piece of the job, find the closest resume line, then average those scores
        semantic = float((job_vectors @ vectors.T).max(axis=1).mean())

    matches = []
    for skill in resume.missing_skills:
        scores = vectors @ skill_vectors[skill]
        best_index = int(scores.argmax())
        best = float(scores[best_index])
        matches.append(
            {
                "skill": skill,
                "line": chunks[best_index],
                "similarity": round(best, 3),
                # How much the best line stands out from a typical line of this resume
                "margin": round(best - float(np.median(scores)), 3),
            }
        )

    return {
        "id": resume.id,
        "semantic_similarity": None if semantic is None else round(semantic, 3),
        "chunks": len(chunks),
        "skill_matches": matches,
    }