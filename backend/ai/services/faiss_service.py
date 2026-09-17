from pathlib import Path
# pyrefly: ignore [missing-import]
import faiss
import numpy as np

class FaissService:

    def __init__(self,topic_id,dimension = 384,index_path=None):

        self.dimension = dimension
        vector_db_path = Path(__file__).resolve().parents[2] / "vector_db"
        vector_db_path.mkdir(exist_ok=True)
        self.index_path = str(index_path or vector_db_path / f"topic_{topic_id}.index")

        if Path(self.index_path).exists():
            self.index = faiss.read_index(self.index_path)
        else:
            self.index = faiss.IndexFlatL2(self.dimension)
        
    
    def add_embeddings(self,embedding):
        vectors = np.array([embedding]).astype('float32')
        self.index.add(vectors)
        return self.index.ntotal - 1

    def search(self,embedding, k =5):

        if self.index.ntotal == 0:
            return np.empty((1, 0), dtype=np.float32), np.empty((1, 0), dtype=np.int64)

        query = np.array([embedding], dtype=np.float32)
        distances,indices = self.index.search(query, min(k, self.index.ntotal))
        return distances , indices

    
    def save(self):
        faiss.write_index(self.index , self.index_path)
    
    def reset_index(self):
        self.index = faiss.IndexFlatL2(self.dimension)


