"""
Knowledge processing service: handles file upload, URL fetching, text extraction,
chunking, and ChromaDB indexing for the admin knowledge base.
"""
import os
import json
import uuid
import hashlib
from datetime import datetime
from typing import Optional

import chromadb
from langchain_text_splitters import MarkdownTextSplitter, RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from app.core.config import settings

SUPPORTED_EXTENSIONS = {".md", ".pdf", ".doc", ".docx", ".txt"}
MAX_FILE_SIZE_MB = 10


def get_chroma_client():
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    return chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)


def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection("PersonaAI_kb")


def extract_text_from_file(file_path: str, ext: str) -> str:
    """Extract plain text from supported file types."""
    if ext == ".md" or ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    elif ext == ".pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            return "\n".join(page.get_text() for page in doc)
        except Exception as e:
            raise ValueError(f"PDF extraction failed: {e}")

    elif ext in (".doc", ".docx"):
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(file_path)
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            raise ValueError(f"DOCX extraction failed: {e}")

    else:
        raise ValueError(f"Unsupported file type: {ext}")


def extract_text_from_url(url: str) -> str:
    """Fetch web page and extract readable text."""
    try:
        import requests
        from html.parser import HTMLParser

        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.text_parts = []
                self._skip_tags = {"script", "style", "nav", "footer", "head"}
                self._current_skip = 0

            def handle_starttag(self, tag, attrs):
                if tag in self._skip_tags:
                    self._current_skip += 1

            def handle_endtag(self, tag):
                if tag in self._skip_tags:
                    self._current_skip = max(0, self._current_skip - 1)

            def handle_data(self, data):
                if self._current_skip == 0:
                    cleaned = data.strip()
                    if cleaned:
                        self.text_parts.append(cleaned)

        parser = TextExtractor()
        parser.feed(resp.text)
        return "\n".join(parser.text_parts)
    except Exception as e:
        raise ValueError(f"URL extraction failed: {e}")


def chunk_and_index(
    text: str,
    source_name: str,
    source_id: int,
    source_type: str,
    visibility: str = "public",
    filename: Optional[str] = None,
) -> int:
    """Chunk text, generate embeddings, and upsert into ChromaDB. Returns chunk count."""
    if source_type == "markdown" or (filename and filename.endswith(".md")):
        splitter = MarkdownTextSplitter(chunk_size=1000, chunk_overlap=100)
    else:
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

    docs = splitter.create_documents(
        [text],
        metadatas=[{
            "source": source_name,
            "filename": filename or source_name,
            "visibility": visibility,
            "knowledge_source_id": str(source_id),
        }]
    )

    if not docs:
        return 0

    collection = get_collection()

    # Delete any old chunks for this source first (idempotent re-index)
    try:
        existing = collection.get(where={"knowledge_source_id": str(source_id)})
        if existing and existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass

    chunk_ids = [f"ks_{source_id}_chunk_{i}_{hashlib.md5(d.page_content.encode()).hexdigest()[:8]}" for i, d in enumerate(docs)]

    collection.upsert(
        documents=[d.page_content for d in docs],
        metadatas=[d.metadata for d in docs],
        ids=chunk_ids,
    )

    return len(docs)


def delete_source_from_chroma(source_id: int):
    """Remove all chunks belonging to a knowledge source from ChromaDB."""
    try:
        collection = get_collection()
        existing = collection.get(where={"knowledge_source_id": str(source_id)})
        if existing and existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception as e:
        print(f"Warning: Could not delete chunks for source {source_id}: {e}")


def get_all_sources_from_chroma() -> dict:
    """Get aggregated chunk counts per knowledge_source_id from ChromaDB."""
    try:
        collection = get_collection()
        all_items = collection.get(include=["metadatas"])
        counts = {}
        for meta in all_items.get("metadatas", []):
            ks_id = meta.get("knowledge_source_id")
            if ks_id:
                counts[ks_id] = counts.get(ks_id, 0) + 1
        return counts
    except Exception:
        return {}
