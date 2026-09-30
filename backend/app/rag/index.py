import os
from langchain_text_splitters import MarkdownTextSplitter
from langchain_core.documents import Document
import chromadb
from app.core.config import settings

class SimpleEmbedder:
    """Fallback embedder when OpenAI/Groq keys are missing. Just for structural integrity."""
    def __call__(self, input):
        # ChromaDB expects a list of lists of floats for embeddings
        # We will let Chroma use its default embedding function instead of this
        pass

def load_markdown_files(directory: str, visibility: str) -> list[Document]:
    documents = []
    if not os.path.exists(directory):
        print(f"Warning: Directory {directory} does not exist.")
        return documents
        
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract relative path for citation, e.g. "public/profile.md"
                rel_path = os.path.relpath(file_path, os.path.dirname(directory))
                
                doc = Document(
                    page_content=content,
                    metadata={
                        "source": rel_path,
                        "filename": file,
                        "visibility": visibility
                    }
                )
                documents.append(doc)
    return documents

def run_indexer():
    print("Starting Knowledge Base Indexer...")
    
    public_dir = os.path.join(settings.DATA_DIR, "public")
    private_dir = os.path.join(settings.DATA_DIR, "private")
    style_dir = os.path.join(settings.DATA_DIR, "style")
    qa_dir = os.path.join(settings.DATA_DIR, "qa")
    
    public_docs = load_markdown_files(public_dir, "public")
    private_docs = load_markdown_files(private_dir, "private")
    style_docs = load_markdown_files(style_dir, "style")
    qa_docs = load_markdown_files(qa_dir, "public")
    
    all_docs = public_docs + private_docs + style_docs + qa_docs
    print(f"Loaded {len(all_docs)} markdown files.")
    
    if not all_docs:
        print("No documents found. Exiting.")
        return

    # Chunking
    splitter = MarkdownTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunked_docs = splitter.split_documents(all_docs)
    print(f"Split into {len(chunked_docs)} chunks.")
    
    # Init Chroma
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
    
    # We rely on Chroma's default embedding function (all-MiniLM-L6-v2) for local testing
    collection = client.get_or_create_collection(name="PersonaAI_kb")
    
    documents = []
    metadatas = []
    ids = []
    
    for i, doc in enumerate(chunked_docs):
        documents.append(doc.page_content)
        metadatas.append(doc.metadata)
        # Idempotent ID based on source + chunk index
        doc_id = f"{doc.metadata['source']}_chunk_{i}"
        ids.append(doc_id)
        
    print("Upserting into ChromaDB...")
    
    # Batch upsert
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        collection.upsert(
            documents=documents[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
            ids=ids[i:i+batch_size]
        )
    
    print(f"Successfully indexed {len(chunked_docs)} chunks into ChromaDB.")

if __name__ == "__main__":
    run_indexer()
