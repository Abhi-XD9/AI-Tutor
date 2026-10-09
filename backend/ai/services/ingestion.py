# ai/services/ingestion.py

from ai.models import DocumentChunk

from .document_processor import (
    DocumentProcessor
)
from .chunking_service import (
    ChunkingService
)


class DocumentIngestionService:

    def process_sections(self, documents, document_title=""):
        """
        Process extracted LangChain documents.

        Args:
            documents:
                List of LangChain Document objects.

        Returns:
            Dictionary containing sections and chunks.
        """

        sections = DocumentProcessor.detect_structure(documents)
        structured_documents = DocumentProcessor.structure_documents(
            documents,
            document_title=document_title,
        )
        chunks = ChunkingService.chunker(structured_documents)

        return {
            "sections": sections,
            "chunks": chunks,
        }

    def process_and_save(
        self,
        document,
        documents,
        replace_existing=False,
    ):
        """
        Process extracted documents and save chunks.

        Args:
            document:
                TopicDocument instance.

            documents:
                List of LangChain Document objects.

            replace_existing:
                Delete existing chunks before saving
                when set to True.
        """

        if replace_existing:
            DocumentChunk.objects.filter(
                document=document
            ).delete()

        result = self.process_sections(documents, document_title=document.title)
        sections = result["sections"]
        chunks = result["chunks"]

        saved_chunks = []

        for global_chunk_index, chunk in enumerate(
            chunks
        ):
            metadata = chunk.metadata or {}
            metadata["document_id"] = document.id

            saved_chunk = (
                DocumentChunk.objects.create(
                    document=document,
                    chunk_index=global_chunk_index,
                    chunk_text=chunk.page_content,
                    meta_data=metadata,
                )
            )

            saved_chunks.append(
                saved_chunk
            )

        return {
            "sections": sections,
            "chunks": saved_chunks,
        }
