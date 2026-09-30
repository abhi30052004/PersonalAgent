import os
import chromadb
from app.core.config import settings

def get_chroma_collection():
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
    return client.get_or_create_collection("PersonaAI_kb")

def retrieve_documents(query: str, n_results: int = 5, visibility: str = None) -> list[dict]:
    """Retrieve top-k relevant chunks from ChromaDB based on the query."""
    collection = get_chroma_collection()
    
    # We can filter by visibility (public/private) if provided
    where_filter = None
    if visibility and visibility != "all":
        where_filter = {"visibility": visibility}
    
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter
        )
        
        docs = []
        if results and "documents" in results and results["documents"]:
            for idx in range(len(results["documents"][0])):
                docs.append({
                    "page_content": results["documents"][0][idx],
                    "metadata": results["metadatas"][0][idx],
                    "id": results["ids"][0][idx],
                    "distance": results["distances"][0][idx] if "distances" in results else None
                })
        return docs
    except Exception as e:
        print(f"Retrieval error: {e}")
        return []
