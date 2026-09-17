# pyrefly: ignore [missing-import]
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

class EmbeddingService:

    def __init__(self):
        # self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.model = model

    def generate_embedding(self,text:str) -> list[float]:

        try:
            resposnse = self.model.encode(
            text,
            convert_to_numpy=True
           )

            return resposnse.tolist()

        except Exception as e:
            raise ValueError(f"Error generating embedding: {str(e)}")


# service = EmbeddingService()

# embedding = service.generate_embedding( "The Preamble of the Indian Constitution")


# print(type(embedding))
# print(len(embedding))
# print(embedding[:10])