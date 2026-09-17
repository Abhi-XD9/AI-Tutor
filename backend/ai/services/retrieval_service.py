"""Hybrid chat retrieval over a topic's shared chunk corpus."""

from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document

from ai.models import DocumentChunk

from .embedding_service import EmbeddingService
from .faiss_service import FaissService


class RetrievalService:
    """Fuse semantic and lexical topic retrieval with reciprocal-rank fusion."""

    RRF_K = 60

    def __init__(self, topic_id):
        self.topic_id = topic_id
        self.embedding_service = EmbeddingService()
        self.faiss_service = FaissService(topic_id)

    def retrieve(self, query, k=5):
        """Return the best chunks from every document under this topic."""

        candidate_count = max(k * 2, k)
        faiss_chunks = self.retrieve_faiss(query, candidate_count)
        bm25_chunks = self.retrieve_bm25(query, candidate_count)
        return self.reciprocal_rank(faiss_chunks, bm25_chunks)[:k]

    def retrieve_faiss(self, query, k=5):
        embedding = self.embedding_service.generate_embedding(query)
        _, indices = self.faiss_service.search(embedding, k)
        faiss_indices = [index for index in indices[0].tolist() if index >= 0]

        chunks = DocumentChunk.objects.filter(
            document__topic__topic_id=self.topic_id,
            faiss_index__in=faiss_indices,
        ).select_related("document")
        chunk_map = {chunk.faiss_index: chunk for chunk in chunks}
        return [chunk_map[index] for index in faiss_indices if index in chunk_map]

    def retrieve_bm25(self, query, k=5):
        chunks = list(
            DocumentChunk.objects.filter(document__topic__topic_id=self.topic_id)
            .select_related("document")
            .order_by("document_id", "chunk_index", "id")
        )
        if not chunks:
            return []

        documents = [
            Document(page_content=chunk.chunk_text, metadata={"chunk_id": chunk.id})
            for chunk in chunks
        ]
        retriever = BM25Retriever.from_documents(documents)
        retriever.k = min(k, len(documents))
        results = retriever.invoke(query)

        chunk_map = {chunk.id: chunk for chunk in chunks}
        return [chunk_map[result.metadata["chunk_id"]] for result in results]

    def reciprocal_rank(self, faiss_chunks, bm25_chunks):
        scores = {}
        for ranked_chunks in (faiss_chunks, bm25_chunks):
            for rank, chunk in enumerate(ranked_chunks, start=1):
                scores[chunk.id] = scores.get(chunk.id, 0) + 1 / (self.RRF_K + rank)

        chunks = {chunk.id: chunk for chunk in faiss_chunks + bm25_chunks}
        return sorted(chunks.values(), key=lambda chunk: scores[chunk.id], reverse=True)
