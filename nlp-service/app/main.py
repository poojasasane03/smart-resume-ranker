import secrets
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request

from .analysis import analyze
from .config import MODEL_NAME, NLP_SECRET
from .embedder import Embedder
from .schemas import AnalyzeRequest, AnalyzeResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model once, when the service starts, so the first request is not slow
    if getattr(app.state, "embedder", None) is None:
        print(f"Loading model {MODEL_NAME} ...")
        app.state.embedder = Embedder(MODEL_NAME)
        print("Model ready")
    yield


app = FastAPI(title="Smart Resume Ranker NLP service", lifespan=lifespan)
app.state.embedder = None


def require_secret(x_nlp_secret: str = Header(default="")):
    """Runs before protected routes. Only our Express server knows the secret."""
    # compare_digest compares in constant time, so the secret cannot be guessed from response timing
    if not secrets.compare_digest(x_nlp_secret.encode(), NLP_SECRET.encode()):
        raise HTTPException(status_code=401, detail="Invalid or missing secret")


def get_embedder(request: Request) -> Embedder:
    embedder = request.app.state.embedder
    if embedder is None:
        raise HTTPException(status_code=503, detail="The model is not loaded yet")
    return embedder


@app.get("/health")
def health(request: Request):
    return {
        "status": "ok",
        "service": "nlp-service",
        "model": MODEL_NAME,
        "model_loaded": request.app.state.embedder is not None,
    }


@app.get("/ping", dependencies=[Depends(require_secret)])
def ping():
    return {"message": "pong"}


# A plain "def" (not "async def") makes FastAPI run this in a worker thread,
# so a long analysis does not block other requests such as /health.
@app.post("/analyze", response_model=AnalyzeResponse, dependencies=[Depends(require_secret)])
def analyze_resumes(payload: AnalyzeRequest, embedder: Embedder = Depends(get_embedder)):
    results = analyze(embedder, payload.job_text, payload.resumes)
    return {"model": embedder.model_name, "results": results}