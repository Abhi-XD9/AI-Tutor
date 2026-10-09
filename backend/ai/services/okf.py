"""Canonical Open Knowledge Format view of the topic knowledge corpus."""

from dataclasses import dataclass

from ai.models import ContentChunk, DocumentChunk
from topics.models import Topic


@dataclass
class KnowledgeChunk:
    """Common chunk shape used by assessments and OKF exports."""

    source: object
    source_type: str

    @property
    def id(self):
        return self.source.id if self.source_type == "topic" else f"cc_{self.source.id}"

    @property
    def chunk_text(self):
        return self.source.chunk_text

    @property
    def meta_data(self):
        return (
            self.source.meta_data
            if self.source_type == "topic"
            else self.source.metadata
        ) or {}

    @property
    def document_id(self):
        return self.source.document_id

    @property
    def document(self):
        return self.source.document


class OpenKnowledgeFormat:
    """Expose one normalized knowledge corpus over both chunk sources."""

    VERSION = "1.0"

    @classmethod
    def chunks_for_topic(cls, topic_id):
        """Return topic-upload and mapped subject chunks in stable order."""

        topic_chunks = [
            KnowledgeChunk(chunk, "topic")
            for chunk in DocumentChunk.objects.filter(
                document__topic__topic_id=topic_id
            )
            .select_related("document")
            .order_by("document_id", "chunk_index", "id")
        ]

        try:
            topic = Topic.objects.select_related("subject").get(topic_id=topic_id)
        except Topic.DoesNotExist:
            return topic_chunks

        mapped_ids = list(topic.content_chunks.values_list("chunk_id", flat=True))
        subject_query = ContentChunk.objects.filter(document__subject=topic.subject)
        if mapped_ids:
            subject_query = subject_query.filter(id__in=mapped_ids)

        subject_chunks = [
            KnowledgeChunk(chunk, "subject")
            for chunk in subject_query.select_related("document")
            .order_by("document_id", "chunk_index", "id")
        ]
        return topic_chunks + subject_chunks

    @classmethod
    def for_topic(cls, topic):
        chunks = cls.chunks_for_topic(topic.topic_id)

        documents = {}
        for chunk in chunks:
            metadata = chunk.meta_data
            document_key = f"{chunk.source_type}:{chunk.document_id}"
            document = documents.setdefault(
                document_key,
                {
                    "id": document_key,
                    "source_type": chunk.source_type,
                    "title": chunk.document.title,
                    "file_type": chunk.document.file_type,
                    "chunks": [],
                },
            )
            document["chunks"].append(cls._serialize_chunk(chunk, metadata))

        return {
            "okf_version": cls.VERSION,
            "type": "knowledge_base",
            "topic": {
                "id": str(topic.topic_id),
                "title": topic.title,
            },
            "documents": list(documents.values()),
        }

    @staticmethod
    def _serialize_chunk(chunk, metadata):
        return {
            "id": str(chunk.id),
            "index": chunk.source.chunk_index,
            "text": chunk.chunk_text,
            "source": {
                "page_start": metadata.get("page_start"),
                "page_end": metadata.get("page_end"),
                "chapter": metadata.get("chapter_title"),
                "heading": metadata.get("heading_title"),
                "subheading": metadata.get("subheading_title"),
            },
            "metadata": metadata,
        }