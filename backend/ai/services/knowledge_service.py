"""Topic-level knowledge ingestion and retrieval orchestration."""

from django.db import transaction

from ai.models import DocumentChunk

from .document_processor import DocumentProcessor
from .embedding_service import EmbeddingService
from .faiss_service import FaissService
from .ingestion import DocumentIngestionService
from .retrieval_service import RetrievalService


class KnowledgeService:
    """Maintain the one structured corpus and FAISS index for a topic."""

    def __init__(self, topic_id):
        self.topic_id = topic_id
        self.document_processor = DocumentProcessor()
        self.ingestion_service = DocumentIngestionService()
        self.embedding_service = EmbeddingService()
        self.faiss_service = FaissService(topic_id)
        self.retrieval_service = RetrievalService(topic_id)

    def process_document(self, document):
        """Extract, structure, chunk, save, and index one topic document."""

        try:
            document.processing_status = document.ProcessingStatus.PROCESSING
            document.save(update_fields=["processing_status"])

            with transaction.atomic():
                extracted_documents = self.document_processor.extract(document.file.path)
                result = self.ingestion_service.process_and_save(
                    document=document,
                    documents=extracted_documents,
                    replace_existing=True,
                )

                # FAISS uses sequential vector ids. Rebuilding after an upload
                # keeps all topic documents in one consistent index.
                self.rebuild_topic_index()

                document.processing_status = document.ProcessingStatus.PROCESSED
                document.save(update_fields=["processing_status"])

            return result
        except Exception:
            document.processing_status = document.ProcessingStatus.FAILED
            document.save(update_fields=["processing_status"])
            raise

    def retrieve_context(self, question, k=5):
        return self.retrieval_service.retrieve(question, k)

    def build_context(self, question, k=5):
        """Build labelled context for the tutor graph's document tool."""

        chunks = self.retrieve_context(question, k)
        context_parts = []

        for chunk in chunks:
            metadata = chunk.meta_data or {}
            section = " > ".join(
                value
                for value in (
                    metadata.get("chapter_title"),
                    metadata.get("heading_title"),
                    metadata.get("subheading_title"),
                )
                if value
            )
            context_parts.append(
                "\n".join(
                    (
                        f"[chunk:{chunk.id}] Document: {chunk.document.title}",
                        f"Section: {section or 'Uncategorised'}",
                        f"Content: {chunk.chunk_text}",
                    )
                )
            )

        return "\n\n---\n\n".join(context_parts)

    def rebuild_topic_index(self):
        """Rebuild the topic FAISS index from its persisted document chunks."""

        self.faiss_service = FaissService(self.topic_id)
        self.faiss_service.reset_index()
        chunks = (
            DocumentChunk.objects.filter(document__topic__topic_id=self.topic_id)
            .select_related("document")
            .order_by("document_id", "chunk_index", "id")
        )

        for chunk in chunks:
            embedding = self.embedding_service.generate_embedding(chunk.chunk_text)
            chunk.faiss_index = self.faiss_service.add_embeddings(embedding)
            chunk.save(update_fields=["faiss_index"])

        self.faiss_service.save()
