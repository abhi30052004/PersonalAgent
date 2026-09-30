# PersonaAI (Digital Twin)

A next-generation, full-stack Artificial Intelligence application that serves as a highly intelligent, voice-enabled Digital Twin. 
This application features a beautiful, dynamic React frontend and a powerful Python FastAPI backend with LangGraph/ChromaDB for Retrieval-Augmented Generation (RAG).

## 🌟 Key Features

* **AI Digital Twin**: A conversational agent that understands deep context and responds based on uploaded knowledge sources.
* **Retrieval-Augmented Generation (RAG)**: Built-in vector database (ChromaDB) to accurately ground AI responses in custom documents and URLs.
* **Voice Integration**: Implements ElevenLabs Text-to-Speech (TTS) for hyper-realistic AI voice responses, with an automatic, seamless fallback to Browser SpeechSynthesis if API limits are reached.
* **Dynamic Admin Dashboard**: A comprehensive admin panel to manage users, monitor system activity logs, and directly curate the AI's knowledge base.
* **Secure Authentication**: Full JWT-based authentication system with Owner, Admin, and User roles.
* **Responsive UI/UX**: Premium, glassmorphism-inspired dark mode interface with Framer Motion animations.

## 🛠️ Technology Stack

**Frontend:**
* React 18 + TypeScript
* Vite
* Tailwind CSS (Custom Design System)
* Framer Motion (Animations)
* Lucide React (Icons)

**Backend:**
* Python 3.10+
* FastAPI
* SQLAlchemy + SQLite (Relational Database)
* LangChain & LangGraph (Agentic AI workflow)
* ChromaDB (Vector Database)
* ElevenLabs API (Voice)
* OpenAI API (LLM)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

* Node.js (v18 or higher)
* Python (3.10 or higher)
* API Keys for OpenAI and ElevenLabs

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Mac/Linux
source venv/bin/activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

Set up your environment variables. Create a `.env` file in the `backend` directory:
```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# Security
SECRET_KEY=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
DATABASE_URL=sqlite:///./abhitwin.db
```

Start the backend server:
```bash
python -m uvicorn app.main:app --reload
```
The backend API will run on `http://127.0.0.1:8000`.

### 2. Frontend Setup

Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend
```

Install the Node dependencies:
```bash
npm install
```

Start the frontend development server:
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`.

---

## 🔐 Default Admin Account

If you need to access the Admin Panel immediately, you can log in using the pre-configured owner account:
* **Email:** `admin@test.com`
* **Password:** `123`

*(Note: In a production environment, ensure you change this password and secure the database).*

## 📖 Architecture Highlights

* **Agentic AI**: Uses LangGraph to intelligently route user queries. If a question is out of scope, it gracefully falls back without hallucinating.
* **Knowledge Processing**: Supports uploading raw text, PDFs, or scraping website URLs. Data is chunked and embedded directly into ChromaDB.
* **Fault-Tolerant Voice**: The TTS system wraps ElevenLabs in a resilient error boundary. If your ElevenLabs quota runs out (402 Payment Required) or fails, the application instantly switches to the browser's native speech synthesis without interrupting the user's conversation.

## 📄 License

This project is licensed under the MIT License.
