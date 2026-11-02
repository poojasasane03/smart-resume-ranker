import secrets

from fastapi import Depends, FastAPI, Header, HTTPException

from .config import NLP_SECRET

app = FastAPI(title="Smart Resume Ranker NLP service")


def require_secret(x_nlp_secret: str = Header(default="")):
    """Runs before protected routes. Only our Express server knows the secret."""
    # compare_digest compares in constant time, so the secret cannot be guessed from response timing
    if not secrets.compare_digest(x_nlp_secret.encode(), NLP_SECRET.encode()):
        raise HTTPException(status_code=401, detail="Invalid or missing secret")


@app.get("/health")
def health():
    return {"status": "ok", "service": "nlp-service"}


@app.get("/ping", dependencies=[Depends(require_secret)])
def ping():
    return {"message": "pong"}