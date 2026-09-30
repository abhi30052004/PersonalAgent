<div align="center">
  <img src="frontend/public/favicon.svg" alt="Logo" width="120" height="120">
  <h1 align="center">PersonaAI (Digital Twin)</h1>
  
  <p align="center">
    A next-generation, voice-enabled Digital Twin built with React, FastAPI, and LangGraph.
    <br />
    <a href="#-features"><strong>Explore the features »</strong></a>
    <br />
    <br />
    <a href="#-getting-started">View Demo</a>
    ·
    <a href="#-api-documentation">Report Bug</a>
    ·
    <a href="#-api-documentation">Request Feature</a>
  </p>
</div>

<!-- Badges -->
<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
</div>

<hr />

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#-about-the-project">About The Project</a></li>
    <li><a href="#-features">Features</a></li>
    <li><a href="#-tech-stack">Tech Stack</a></li>
    <li><a href="#-project-structure">Project Structure</a></li>
    <li><a href="#-getting-started">Getting Started</a></li>
    <li><a href="#-environment-variables">Environment Variables</a></li>
    <li><a href="#-api-documentation">API Documentation</a></li>
    <li><a href="#-license">License</a></li>
  </ol>
</details>

---

## 🚀 About The Project

**PersonaAI** is a full-stack Artificial Intelligence application designed to serve as a highly intelligent, interactive Digital Twin. It utilizes Retrieval-Augmented Generation (RAG) to ground its knowledge in custom documents, providing hyper-personalized and accurate responses based on your own data. 

Coupled with a dynamic glassmorphism React interface and realistic ElevenLabs TTS voice integration, PersonaAI creates a deeply immersive conversational experience.

## ✨ Features

- 🧠 **Agentic AI Workflow:** Powered by LangGraph to route queries intelligently. If a question is out of bounds, it gracefully falls back without hallucinating.
- 📚 **Dynamic RAG System:** Built-in vector database (ChromaDB) to accurately ground AI responses in custom documents and scraped URLs.
- 🎙️ **Fault-Tolerant Voice TTS:** Features hyper-realistic AI voice responses via ElevenLabs. Automatically falls back to native Browser Speech Synthesis without breaking the chat if API limits are reached.
- 🔐 **Role-Based Access Control:** Secure JWT authentication with distinct Owner, Admin, and User roles.
- 🎛️ **Admin Dashboard:** Real-time metrics, user management (deactivate/delete), and a live interface to curate the AI's knowledge base.
- 🎨 **Premium UI/UX:** Stunning dark-mode glassmorphism design with fluid Framer Motion animations.

## 💻 Tech Stack

### Frontend
- **React 18** (Vite + TypeScript)
- **Tailwind CSS** (Custom CSS variables & utility classes)
- **Framer Motion** (Micro-animations)
- **Lucide React** (Beautiful iconography)

### Backend
- **FastAPI** (High-performance Python web framework)
- **SQLAlchemy** (ORM for relational data)
- **LangChain / LangGraph** (Agentic AI orchestration)
- **ChromaDB** (Local vector embeddings storage)
- **OpenAI & ElevenLabs APIs** (LLM and Voice generation)

---

## 📁 Project Structure

```text
📦 PersonalAgent
 ┣ 📂 backend
 ┃ ┣ 📂 app
 ┃ ┃ ┣ 📂 agent        # LangGraph definitions
 ┃ ┃ ┣ 📂 api          # FastAPI route handlers (auth, chat, admin, feedback)
 ┃ ┃ ┣ 📂 core         # Database engine, JWT security, LLM setups
 ┃ ┃ ┣ 📂 models       # SQLAlchemy DB schemas
 ┃ ┃ ┣ 📂 rag          # ChromaDB retrieval and embedding logic
 ┃ ┃ ┗ 📂 services     # Heavy business logic (knowledge processing)
 ┃ ┣ 📂 data           # Initial markdown knowledge files
 ┃ ┗ 📜 main.py        # FastAPI entry point
 ┣ 📂 frontend
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 components   # Reusable React components
 ┃ ┃ ┣ 📂 hooks        # Custom React hooks (useVoice)
 ┃ ┃ ┣ 📜 App.tsx      # Main Chat Interface
 ┃ ┃ ┣ 📜 Admin.tsx    # Admin Dashboard Interface
 ┃ ┃ ┗ 📜 api.ts       # Frontend API client wrapper
 ┃ ┗ 📜 index.html
 ┗ 📜 README.md
```

---

## ⚙️ Getting Started

Follow these steps to set up the project locally for development.

### Prerequisites

- Node.js (v18+)
- Python (3.10+)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/abhi30052004/PersonalAgent.git
cd PersonalAgent
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Start the server (runs on http://127.0.0.1:8000)
python -m uvicorn app.main:app --reload
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the development server (runs on http://localhost:5173)
npm run dev
```

---

## 🔑 Environment Variables

To run this project, you will need to add the following environment variables. 
Create a `.env` file in the `backend/` directory:

```env
# API Keys
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk-...
ELEVENLABS_VOICE_ID=your_preferred_voice_id

# Security
SECRET_KEY=your_secure_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
DATABASE_URL=sqlite:///./abhitwin.db
```

---

## 🛡️ Default Admin Credentials

When booting up a fresh database, you can use the following default Owner account to access the Admin Dashboard:

- **Email:** `admin@test.com`
- **Password:** `123`

*(Make sure to change these credentials before deploying to production!)*

---

## 📚 API Documentation

Once the backend is running, FastAPI automatically generates interactive API documentation.
Visit the following URLs in your browser to view and test all available endpoints:

- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

<div align="center">
  <p>Built with ❤️ by Abhijit Bhunia</p>
</div>
