import numpy as np


class Embedder:
    """Wraps the embedding model. Every vector it returns has length 1,
    so a plain dot product between two vectors is their cosine similarity."""

    def __init__(self, model_name):
        # Imported here, so the rest of the service can be tested without the heavy model
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name
        self._model = SentenceTransformer(model_name)
        self.dimension = len(self._model.encode("test", normalize_embeddings=True))

    def encode(self, texts):
        if not texts:
            return np.zeros((0, self.dimension), dtype=np.float32)
        return self._model.encode(
            texts, normalize_embeddings=True, batch_size=32, show_progress_bar=False
        )