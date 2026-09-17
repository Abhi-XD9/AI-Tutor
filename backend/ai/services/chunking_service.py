# ai/services/chunking_service.py

# pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter


class ChunkingService:
    """Split already-structured document sections into retrievable chunks."""

    CHUNK_SIZE = 900
    CHUNK_OVERLAP = 150

    @staticmethod
    def chunker(documents):
        """
        Split LangChain documents into smaller chunks.

        Args:
            documents:
                List of LangChain Document objects.

        Returns:
            List of chunked LangChain Document objects.
        """

        if not documents:
            return []

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=ChunkingService.CHUNK_SIZE,
            chunk_overlap=ChunkingService.CHUNK_OVERLAP,
            add_start_index=True,
            separators=[
                "\n\n",
                "\n",
                ". ",
                " ",
                "",
            ],
        )

        # RecursiveCharacterTextSplitter preserves the metadata supplied by
        # DocumentProcessor. That makes every vector searchable as well as
        # traceable to its document, section, and page range.
        return splitter.split_documents(documents)
