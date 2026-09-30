import React, { useState, useRef, useEffect } from 'react';
import './index.css';
import { apiClient } from './api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, Menu, X, Plus,
  LogOut, Copy, ThumbsUp, ThumbsDown, Check,
  Bot, User as UserIcon, Settings, AlertCircle,
  Mic, Volume2, Square, VolumeX
} from 'lucide-react';
import { useVoice } from './hooks/useVoice';
import { VoiceSettingsPanel } from './components/VoiceSettingsPanel';
import { AdminPanel } from './AdminPanel';

// Types
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: string[];
  dbId?: number;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('PersonaAI_token'));
  const [user, setUser] = useState<{ id: number; email: string; is_owner: boolean; is_admin: boolean } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const voice = useVoice();
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Auto-submit voice transcript when recording stops
  useEffect(() => {
    if (!voice.isListening && voice.transcript) {
      setInput(voice.transcript);
      handleSubmit(undefined, voice.transcript, true);
      voice.setTranscript('');
    }
  }, [voice.isListening, voice.transcript]);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Group conversations by date
  const groupedConversations = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const groups: { [key: string]: Conversation[] } = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Older': []
    };

    conversations.forEach(conv => {
      const convDate = new Date(conv.created_at);
      if (convDate >= today) groups['Today'].push(conv);
      else if (convDate >= yesterday) groups['Yesterday'].push(conv);
      else if (convDate >= last7Days) groups['Previous 7 Days'].push(conv);
      else groups['Older'].push(conv);
    });

    return groups;
  }, [conversations]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    if (isAuthenticated) {
      apiClient('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          setUser(data);
          loadConversations();
        })
        .catch(() => setIsAuthenticated(false));
    }

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const loadConversations = async () => {
    try {
      const res = await apiClient('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadConversation = async (id: number) => {
    try {
      const res = await apiClient(`/api/chat/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: any) => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          sources: m.sources,
          dbId: m.id
        })));
        setActiveConversationId(id);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient(`/api/chat/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        startNewChat();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const response = await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Authentication failed');

      if (isRegistering) {
        setIsRegistering(false);
        setAuthError('');
        // Automatically login or show success. Here we show success.
        alert('Registration successful. Please sign in.');
      } else {
        localStorage.setItem('PersonaAI_token', data.access_token);
        setIsAuthenticated(true);
        setUser(data.user);
        if (data.user && data.user.is_admin) {
          setShowAdminPanel(true);
        }
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('PersonaAI_token');
    setIsAuthenticated(false);
    setUser(null);
    setMessages([]);
    setActiveConversationId(null);
    setConversations([]);
    setShowProfileMenu(false);
  };

  const handleSubmit = async (e?: React.FormEvent, customInput?: string, isVoiceInput: boolean = false) => {
    if (e) e.preventDefault();
    const text = customInput || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const payload: any = {
        message: userMessage.content,
        tone: voice.settings.tone
      };
      if (activeConversationId) payload.conversation_id = activeConversationId;

      const response = await apiClient('/api/chat/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("API returned error");

      const data = await response.json();

      if (data.conversation_id && !activeConversationId) {
        setActiveConversationId(data.conversation_id);
        loadConversations();
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        dbId: data.message_id,
        role: 'ai',
        content: data.answer || "I'm sorry, I couldn't process that request.",
        sources: data.sources || []
      };

      setMessages(prev => [...prev, aiMessage]);

      if (voice.settings.autoPlay || isVoiceInput) {
        const textToSpeak = aiMessage.content.replace(/Sources:[\s\S]*$/, '').trim();
        voice.speak(textToSpeak);
      }
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Something went wrong. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const submitFeedback = async (msgId: number, rating: string) => {
    try {
      await apiClient('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ message_id: msgId, rating })
      });
      setFeedbackSent(msgId.toString());
      setTimeout(() => setFeedbackSent(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // --- RENDERING ---

  // Admin Panel route
  if (isAuthenticated && user?.is_admin && showAdminPanel) {
    return (
      <AdminPanel
        user={user as any}
        onLogout={() => setShowAdminPanel(false)}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
        {/* Background Orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px] glass p-8 rounded-3xl relative z-10"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-16 h-16 mx-auto bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[var(--glow-primary)]"
            >
              <Bot size={32} className="text-white" />
            </motion.div>
            <h1 className="text-4xl font-heading font-bold tracking-tight text-gradient-accent mb-2">PersonaAI</h1>
            <p className="text-[var(--text-secondary)] text-sm font-medium">Experience the Next-Gen Digital Twin</p>
            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 inline-block text-left">
              <div className="font-semibold mb-1">Admin Demo Account:</div>
              <div className="font-mono">Email: admin@test.com</div>
              <div className="font-mono">Pass: 123</div>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full input-premium p-4 rounded-xl outline-none text-sm font-medium"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full input-premium p-4 rounded-xl outline-none text-sm font-medium"
                required
              />
            </div>

            {authError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-[#ff7979] text-xs bg-[rgba(255,121,121,0.1)] p-3 rounded-xl border border-[rgba(255,121,121,0.2)]">
                <AlertCircle size={14} />
                {authError}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full btn-primary p-4 rounded-xl text-sm font-bold tracking-wide disabled:opacity-50 flex justify-center items-center gap-2 mt-4 shadow-lg shadow-[var(--glow-primary)]"
            >
              {isAuthLoading && <Loader2 size={18} className="animate-spin" />}
              {isAuthLoading ? 'Authenticating...' : (isRegistering ? 'Create Account' : 'Sign In to Access')}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-[var(--text-secondary)] font-medium">
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors font-semibold ml-1">
              {isRegistering ? 'Sign In' : 'Create account'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Global Background Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed lg:static inset-y-0 left-0 w-[280px] glass-panel flex flex-col z-30 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-5 flex items-center justify-between">
          <div className="font-heading font-bold tracking-wide text-xl text-gradient-accent cursor-pointer flex items-center gap-2" onClick={startNewChat}>
            <Bot size={24} className="text-[var(--accent-primary)]" />
            PersonaAI
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startNewChat} className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors lg:hidden" title="New Chat">
              <Plus size={20} />
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 hidden lg:block">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] transition-colors text-sm font-medium border border-[rgba(255,255,255,0.03)]"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-4 pb-4">
          {Object.entries(groupedConversations).map(([groupName, convs]) => {
            if (convs.length === 0) return null;
            return (
              <div key={groupName}>
                <div className="px-2 text-xs font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                  {groupName}
                </div>
                {convs.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${activeConversationId === conv.id ? 'bg-[var(--card-1)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--card-1)] hover:text-[var(--text-primary)]'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity shrink-0"
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Profile / Settings Dropdown Container */}
        <div className="relative p-3 border-t border-[var(--border)]">
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-3 right-3 mb-2 bg-[var(--card-2)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden py-1 z-40"
              >
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <div className="text-sm font-medium truncate">{user?.email}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{user?.is_owner ? 'Admin' : 'User'}</div>
                </div>
                <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--card-1)] hover:text-[var(--text-primary)] transition-colors text-left">
                  <Settings size={16} /> Settings
                </button>
                {user?.is_admin && (
                  <button onClick={() => { setShowAdminPanel(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors text-left">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> Admin Panel
                  </button>
                )}
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--card-1)] hover:text-[var(--text-primary)] transition-colors text-left">
                  <LogOut size={16} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--card-1)] transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-xs font-medium border border-[var(--border)] shrink-0">
              <UserIcon size={16} className="text-[var(--text-secondary)]" />
            </div>
            <div className="text-sm text-[var(--text-secondary)] font-medium truncate flex-1">
              {user?.email}
            </div>
          </button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full h-full min-w-0 z-10">

        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 sticky top-0 z-10 glass justify-between border-b-0 border-r-0 border-l-0 rounded-none">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-white transition-colors">
            <Menu size={22} />
          </button>
          <div className="font-heading font-bold text-gradient-accent text-lg">PersonaAI</div>
          <button onClick={startNewChat} className="p-2 -mr-2 text-[var(--text-secondary)] hover:text-white transition-colors">
            <Plus size={22} />
          </button>
        </header>

        {/* Messages / Empty State */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 relative custom-scrollbar">

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto py-10 px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                  className="w-20 h-20 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[var(--glow-primary)]"
                >
                  <Bot size={40} className="text-white" />
                </motion.div>
                <h2 className="text-4xl font-heading font-bold mb-4 text-white">Meet your AI Digital Twin</h2>
                <p className="text-[var(--text-secondary)] text-base max-w-lg mx-auto leading-relaxed">
                  Ask questions about my experience, projects, skills, education and learning journey. I am equipped with detailed knowledge about Abhijit's professional life.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {[
                  { icon: <Bot size={18} />, text: "Tell me about your experience" },
                  { icon: <Check size={18} />, text: "What projects have you built?" },
                  { icon: <Check size={18} />, text: "What are your core skills?" },
                  { icon: <Check size={18} />, text: "Tell me about your learning journey" }
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSubmit(undefined, suggestion.text)}
                    className="p-5 rounded-2xl glass glass-hover text-left flex items-start gap-3 transition-all duration-300 shadow-lg"
                  >
                    <div className="mt-0.5 text-[var(--accent-primary)]">{suggestion.icon}</div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{suggestion.text}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto pb-[160px] space-y-8">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  key={msg.id}
                  className={`flex gap-4 md:gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI Avatar */}
                  {msg.role === 'ai' && (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-[var(--glow-primary)]">
                      <Bot size={20} className="text-white" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[80%] ${msg.role === 'user' ? 'bg-gradient-to-br from-[#4f46e5]/20 to-[#9333ea]/20 border border-[#a855f7]/30 shadow-lg px-5 py-4 rounded-3xl rounded-tr-sm text-white' : 'bg-[rgba(24,24,32,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] shadow-lg px-6 py-5 rounded-3xl rounded-tl-sm text-gray-200'}`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap text-[1rem] font-medium leading-relaxed">{msg.content}</div>
                    ) : (
                      <div className="markdown-body text-gray-200 text-[0.95rem] leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content.replace(/Sources:[\s\S]*$/, '')}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Sources & Feedback for AI */}
                    {msg.role === 'ai' && (
                      <div className="mt-4 flex flex-col gap-3">
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
                            <span className="text-xs font-semibold text-[var(--text-muted)]">Sources</span>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-[var(--card-1)] rounded border border-[var(--border)] text-[var(--text-secondary)]">
                                  {src}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1.5 hover:bg-[var(--card-1)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            title="Copy"
                          >
                            {copiedId === msg.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (voice.isSpeaking) {
                                  voice.stopSpeaking();
                                } else {
                                  // Don't read the sources out loud
                                  const textToSpeak = msg.content.replace(/Sources:[\s\S]*$/, '').trim();
                                  voice.speak(textToSpeak);
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${voice.isSpeaking ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-[var(--card-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                              title={voice.isSpeaking ? "Stop Speaking" : "Play Message"}
                            >
                              {voice.isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                            {voice.isSpeaking && voice.ttsProvider === 'browser' && (
                              <span className="text-[10px] text-[var(--text-muted)] italic px-2 py-0.5 bg-[var(--card-1)] rounded-full animate-pulse">
                                Using browser voice
                              </span>
                            )}
                          </div>
                          {msg.dbId && (
                            <>
                              <button
                                onClick={() => submitFeedback(msg.dbId!, 'positive')}
                                className="p-1.5 hover:bg-[var(--card-1)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                title="Helpful"
                              >
                                <ThumbsUp size={14} />
                              </button>
                              <button
                                onClick={() => submitFeedback(msg.dbId!, 'negative')}
                                className="p-1.5 hover:bg-[var(--card-1)] rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                title="Not helpful"
                              >
                                <ThumbsDown size={14} />
                              </button>
                            </>
                          )}
                          {feedbackSent === msg.dbId?.toString() && (
                            <span className="text-xs text-[var(--text-muted)] ml-2">Feedback sent</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--card-2)] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={16} className="text-[var(--text-secondary)]" />
                  </div>
                  <div className="py-2.5 flex items-center gap-2 text-[var(--text-muted)] text-sm">
                    Thinking
                    <div className="flex gap-1 ml-1">
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent pt-20 pointer-events-none z-20">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative glass rounded-3xl border border-[var(--card-border)] focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_20px_var(--glow-primary)] transition-all duration-300 shadow-2xl"
            >
              <form onSubmit={handleSubmit} className="flex flex-col bg-[rgba(0,0,0,0.3)] rounded-3xl">
                <textarea
                  value={voice.isListening ? voice.transcript : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={voice.isListening ? "Listening..." : "Ask PersonaAI anything..."}
                  className={`flex-1 max-h-48 min-h-[60px] bg-transparent resize-none outline-none px-6 py-5 text-[1rem] custom-scrollbar ${voice.isListening ? 'text-purple-400' : 'text-[var(--text-primary)] placeholder-[var(--text-muted)]'}`}
                  rows={1}
                />
                <div className="flex justify-between items-center px-4 pb-3 pt-1">
                  <div className="text-xs text-[var(--text-muted)] px-2 font-medium flex items-center gap-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                        className="p-1.5 hover:bg-[var(--card-1)] rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-[var(--border)]"
                      >
                        <Settings size={14} />
                        <span>Voice: {voice.settings.tone}</span>
                      </button>
                      <VoiceSettingsPanel
                        isOpen={showVoiceSettings}
                        onClose={() => setShowVoiceSettings(false)}
                        settings={voice.settings}
                        updateSettings={voice.updateSettings}
                        voices={voice.voices}
                      />
                    </div>
                    <span className="hidden md:inline">AI generated responses based on verified knowledge.</span>
                  </div>
                  <div className="flex gap-2">
                    {voice.supported && (
                      <button
                        type="button"
                        onClick={voice.isListening ? voice.stopListening : voice.startListening}
                        className={`p-2.5 rounded-xl transition-all shadow-lg ${voice.isListening ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50' : 'bg-[var(--card-1)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]'}`}
                      >
                        {voice.isListening ? <Square size={18} /> : <Mic size={18} />}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={(!input.trim() && !voice.transcript) || isLoading || voice.isListening}
                      className="p-2.5 rounded-xl btn-primary text-white transition-opacity disabled:opacity-30 disabled:bg-[var(--card-1)] disabled:text-[var(--text-muted)] disabled:shadow-none disabled:cursor-not-allowed shadow-lg"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--card-1)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-[var(--text-secondary)] hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider">Account</h3>
                  <div className="p-4 bg-[var(--card-2)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{user?.email}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">{user?.is_owner ? 'Administrator' : 'Standard User'}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider">Appearance</h3>
                  <div className="p-4 bg-[var(--card-2)] border border-[var(--border)] rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                      <span>Theme</span>
                      <span className="text-[var(--text-secondary)] bg-[var(--card-1)] px-3 py-1 rounded-md border border-[var(--border)]">Dark Mode (Default)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider">About</h3>
                  <div className="p-4 bg-[var(--card-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] leading-relaxed">
                    PersonaAI is a personal AI digital twin. Built with FastAPI, React, and LangGraph.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;
