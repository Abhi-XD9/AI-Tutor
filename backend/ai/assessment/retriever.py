"""Topic-wide retrieval helpers used by the assessment workflow."""

from ai.services.okf import KnowledgeChunk, OpenKnowledgeFormat


_ChunkAdapter = KnowledgeChunk


class AssessmentRetrievalService:
    """Read all structured chunks for one topic, across every document source."""

    def __init__(self, topic_id):
        self.topic_id = topic_id

    def all_chunks(self):
        """
        Return chunks in priority order:
        1. Topic-level DocumentChunks (uploaded directly to the topic).
        2. Subject-level ContentChunks mapped to this topic via TopicChunk.
        3. All ContentChunks from the subject's source documents (fallback for
           topics created from a proposal that have no TopicChunk mappings yet).
        """
        return OpenKnowledgeFormat.chunks_for_topic(self.topic_id)

    def get_structure(self):
        documents = {}
        for chunk in self.all_chunks():
            metadata = chunk.meta_data or {}
            document = documents.setdefault(
                chunk.document_id,
                {
                    "document_id": chunk.document_id,
                    "document_title": chunk.document.title,
                    "chapters": {},
                },
            )
            chapter_title = metadata.get("chapter_title") or "Uncategorised"
            heading_title = metadata.get("heading_title") or "General"
            subheading_title = metadata.get("subheading_title") or "General"
            chapter = document["chapters"].setdefault(chapter_title, {})
            heading = chapter.setdefault(heading_title, {})
            heading.setdefault(subheading_title, []).append(chunk.id)
        return list(documents.values())

    def get_chapters(self, document_id=None):
        return self._unique_metadata_values(
            self._filter_chunks(document_id=document_id), "chapter_title"
        )

    def get_headings(self, chapter_title, document_id=None):
        chunks = self.get_section_chunks(chapter_title=chapter_title, document_id=document_id)
        return self._unique_metadata_values(chunks, "heading_title")

    def get_subheadings(self, chapter_title, heading_title, document_id=None):
        chunks = self.get_section_chunks(
            chapter_title=chapter_title, heading_title=heading_title, document_id=document_id
        )
        return self._unique_metadata_values(chunks, "subheading_title")

    def get_section_chunks(self, chapter_title=None, heading_title=None, subheading_title=None, document_id=None):
        chunks = self._filter_chunks(document_id=document_id)
        matching = []
        for chunk in chunks:
            metadata = chunk.meta_data or {}
            if chapter_title is not None and metadata.get("chapter_title") != chapter_title:
                continue
            if heading_title is not None and metadata.get("heading_title") != heading_title:
                continue
            if subheading_title is not None and metadata.get("subheading_title") != subheading_title:
                continue
            matching.append(chunk)
        return matching

    def build_context(self, chunks=None):
        chunks = self.all_chunks() if chunks is None else chunks
        context_parts = []
        for chunk in chunks:
            metadata = chunk.meta_data or {}
            location = " > ".join(
                value for value in (
                    metadata.get("chapter_title"),
                    metadata.get("heading_title"),
                    metadata.get("subheading_title"),
                ) if value
            ) or "Uncategorised"
            context_parts.append(
                "\n".join((
                    f"[chunk:{chunk.id}] {chunk.document.title}",
                    f"Section: {location}",
                    f"Pages: {self._page_range(metadata)}",
                    f"Content: {chunk.chunk_text}",
                ))
            )
        return "\n\n---\n\n".join(context_parts)

    def _filter_chunks(self, document_id=None):
        chunks = self.all_chunks()
        if document_id:
            return [c for c in chunks if c.document_id == document_id]
        return chunks

    @staticmethod
    def _unique_metadata_values(chunks, key):
        values = []
        for chunk in chunks:
            value = (chunk.meta_data or {}).get(key)
            if value and value not in values:
                values.append(value)
        return values

    @staticmethod
    def _page_range(metadata):
        start = metadata.get("page_start")
        end = metadata.get("page_end")
        if start is None and end is None:
            return "Not available"
        return f"{start if start is not None else end}-{end if end is not None else start}"
