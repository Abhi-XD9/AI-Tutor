# ai/services/document_processor.py
import io
import os
import re
from pathlib import Path

try:
    import pypdfium2 as pdfium
    _PDFIUM_AVAILABLE = True
except ImportError:
    _PDFIUM_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False

# Configure tesseract binary path from environment if provided
if _OCR_AVAILABLE:
    _tess = os.environ.get("TESSERACT_CMD")
    if _tess:
        pytesseract.pytesseract.tesseract_cmd = _tess

# pyrefly: ignore [missing-import]
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVLoader,
    Docx2txtLoader,
)

# pyrefly: ignore [missing-import]
from langchain_community.document_loaders.excel import (
    UnstructuredExcelLoader,
)
from langchain_core.documents import Document


class DocumentProcessor:
    """
    Handles document extraction and basic textbook structure detection.

    Supported file types:
        - PDF
        - TXT
        - CSV
        - DOCX
        - XLSX
    """

    CHAPTER_PATTERN = re.compile(
        r"^(chapter\s+"
        r"(\d+|[ivxlcdm]+)"
        r"[\s:.\-].*)$",
        re.IGNORECASE,
    )

    NUMBERED_HEADING_PATTERN = re.compile(
        r"^\d+(\.\d+)*[\.)]?\s+.+"
    )

    ALL_CAPS_HEADING_PATTERN = re.compile(
        r"^[A-Z][A-Z\s\-:&(),]{4,}$"
    )

    # --------------------------------------------------
    # Document extraction
    # --------------------------------------------------

    @staticmethod
    def extract(file_path: str):
        extension = Path(file_path).suffix.lower()

        if extension == ".pdf":
            # Primary: PyPDFLoader for text-based PDFs
            loader = PyPDFLoader(file_path)
            pages = loader.load()

            # OCR fallback: for each page with very little text, render + OCR
            if _PDFIUM_AVAILABLE and _OCR_AVAILABLE:
                pdf = pdfium.PdfDocument(file_path)
                enriched = []
                for i, page_doc in enumerate(pages):
                    text = page_doc.page_content or ""
                    # If fewer than 80 chars on the page, it's likely image-only
                    if len(text.strip()) < 80 and i < len(pdf):
                        try:
                            page = pdf[i]
                            bitmap = page.render(scale=2.0)  # 2x for better OCR
                            pil_image = bitmap.to_pil()
                            ocr_text = pytesseract.image_to_string(pil_image, lang="eng")
                            if ocr_text.strip():
                                page_doc = Document(
                                    page_content=ocr_text,
                                    metadata={**page_doc.metadata, "ocr": True},
                                )
                        except Exception:
                            pass
                    enriched.append(page_doc)
                pdf.close()
                return enriched

            return pages

        elif extension == ".txt":
            return TextLoader(file_path).load()
        elif extension == ".csv":
            return CSVLoader(file_path).load()
        elif extension == ".docx":
            return Docx2txtLoader(file_path).load()
        elif extension == ".xlsx":
            return UnstructuredExcelLoader(file_path).load()
        else:
            raise ValueError(f"Unsupported file type: {extension}")


    # --------------------------------------------------
    # Structure detection
    # --------------------------------------------------

    @classmethod
    def detect_structure(cls, documents):
        """
        Detect a basic textbook structure.

        Structure:

            Chapter
                ↓
            Heading
                ↓
            Subheading
                ↓
            Paragraph content

        Args:
            documents:
                List of LangChain Document objects.

        Returns:
            List of structured sections.
        """

        sections = []

        current_chapter = None
        current_heading = None
        current_subheading = None
        current_text = []

        current_page_start = None
        current_page_end = None

        def save_current_section():
            """
            Save the current section before moving
            to another chapter or heading.
            """

            if not current_text:
                return

            section_text = "\n".join(
                current_text
            ).strip()

            if not section_text:
                return

            sections.append(
                {
                    "chapter_title": current_chapter,
                    "heading_title": current_heading,
                    "subheading_title": current_subheading,
                    "text": section_text,
                    "page_start": current_page_start,
                    "page_end": current_page_end,
                }
            )

        for document in documents:
            text = document.page_content or ""
            metadata = document.metadata or {}

            page_number = cls.get_page_number(
                metadata
            )

            lines = text.splitlines()

            for raw_line in lines:
                line = cls.clean_line(raw_line)

                if not line:
                    continue

                if cls.is_chapter(line):
                    save_current_section()

                    current_chapter = line
                    current_heading = None
                    current_subheading = None
                    current_text = []

                    current_page_start = page_number
                    current_page_end = page_number

                elif cls.is_heading(line):
                    save_current_section()

                    if cls.is_subheading(line):
                        current_subheading = line
                    else:
                        current_heading = line
                        current_subheading = None

                    current_text = []

                    current_page_start = page_number
                    current_page_end = page_number

                else:
                    current_text.append(line)

                    if current_page_start is None:
                        current_page_start = page_number

                    current_page_end = page_number

        save_current_section()

        return sections

    @staticmethod
    def extract_page_images(file_path: str):
        """
        Render each PDF page to a PIL image.
        Returns list of dicts: {page_number, image (PIL), ocr_text}.
        Used to store DocumentElement records with image assets.
        """
        if not _PDFIUM_AVAILABLE:
            return []

        results = []
        try:
            pdf = pdfium.PdfDocument(file_path)
            for i in range(len(pdf)):
                page = pdf[i]
                bitmap = page.render(scale=2.0)
                pil_image = bitmap.to_pil()
                ocr_text = ""
                if _OCR_AVAILABLE:
                    try:
                        ocr_text = pytesseract.image_to_string(pil_image, lang="eng")
                    except Exception:
                        pass
                results.append({
                    "page_number": i + 1,
                    "image": pil_image,
                    "ocr_text": ocr_text,
                })
            pdf.close()
        except Exception:
            pass
        return results


    @classmethod
    def structure_documents(cls, documents, document_title):
        """Return section-level Documents ready for chunking.

        Chunking the extracted pages directly discards the structure detected
        above.  This method is deliberately kept beside the extractor and
        detector so ingestion has one source of truth for document metadata.
        """

        sections = cls.detect_structure(documents)

        if not sections:
            return []

        structured_documents = []
        for section_number, section in enumerate(sections):
            text = section["text"].strip()
            if not text:
                continue

            metadata = {
                "document_title": document_title,
                "chapter_title": section["chapter_title"],
                "heading_title": section["heading_title"],
                "subheading_title": section["subheading_title"],
                "page_start": section["page_start"],
                "page_end": section["page_end"],
                "section_index": section_number,
            }
            structured_documents.append(
                Document(page_content=text, metadata=metadata)
            )

        return structured_documents

    # --------------------------------------------------
    # Helper methods
    # --------------------------------------------------

    @staticmethod
    def clean_line(line: str):
        """
        Remove unnecessary whitespace from a line.
        """

        return re.sub(
            r"\s+",
            " ",
            line,
        ).strip()

    @staticmethod
    def get_page_number(metadata):
        """
        Support common PDF loader metadata keys.
        """

        page_number = metadata.get("page")

        if page_number is None:
            page_number = metadata.get(
                "page_number"
            )

        if page_number is None:
            page_number = metadata.get(
                "page_index"
            )

        return page_number

    @classmethod
    def is_chapter(cls, line: str):
        """
        Check whether a line represents a chapter.
        """

        return bool(
            cls.CHAPTER_PATTERN.match(line)
        )

    @classmethod
    def is_heading(cls, line: str):
        """
        Detect headings such as:

            1.1 Fundamental Rights
            1.1.1 Article 14
            FUNDAMENTAL RIGHTS
        """

        if cls.is_chapter(line):
            return False

        if cls.NUMBERED_HEADING_PATTERN.match(line):
            return True

        if cls.ALL_CAPS_HEADING_PATTERN.match(line):
            return True

        return False

    @staticmethod
    def is_subheading(line: str):
        """
        Detect headings such as:

            1.1.1 Article 14
            2.3.4 Judicial Review
        """

        return bool(
            re.match(
                r"^\d+\.\d+\.\d+",
                line,
            )
        )
