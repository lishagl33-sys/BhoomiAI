import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, 
  Send, 
  Square, 
  Copy, 
  Check, 
  RotateCcw, 
  Trash2, 
  Plus, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ExternalLink, 
  MapPin, 
  Navigation, 
  AlertCircle, 
  Info, 
  ShieldCheck, 
  CornerDownLeft, 
  Maximize2,
  Minimize2,
  Compass,
  FileText,
  Map as MapIcon,
  HelpCircle,
  Menu,
  Key
} from 'lucide-react';
import { 
  getChatStatus, 
  getChatConversations, 
  getChatConversationDetail, 
  deleteChatConversation, 
  clearAllChatConversations 
} from '../api';

const WELCOME_SUGGESTIONS = [
  {
    title: 'What is RTC and Pahani?',
    subtitle: 'Learn about Form 16, Column 9 & 12 rights',
    icon: FileText,
    prompt: 'What is RTC and Pahani in Karnataka? Explain what details each column contains.'
  },
  {
    title: 'How can I check my land survey number?',
    subtitle: 'Guide to locating your cadastral survey plot',
    icon: Compass,
    prompt: 'How can I check my land survey number in Karnataka and verify it on Bhoomi?'
  },
  {
    title: 'How do I calculate land area?',
    subtitle: 'Acres, Guntas, Cents & Square Feet conversions',
    icon: HelpCircle,
    prompt: 'How do I calculate land area in Karnataka? Explain conversions between Acre, Gunta, and Square Feet.'
  },
  {
    title: 'How can I find a village on the map?',
    subtitle: 'Cadastral GIS navigation & satellite imagery',
    icon: MapPin,
    prompt: 'How can I find a village on the BhoomiAI map and inspect its survey boundaries?'
  },
  {
    title: 'What is land mutation?',
    subtitle: 'Form 21, transfer of title & 30-day notice',
    icon: ShieldCheck,
    prompt: 'What is land mutation (Form 21 / MR) in Karnataka and how does ownership transfer work?'
  },
  {
    title: 'Ask me anything',
    subtitle: 'General questions, technology, math & farming',
    icon: Sparkles,
    prompt: 'Hello! What can you help me with today?'
  }
];

export default function BhoomiAssistant({
  theme = 'dark',
  isFloatingModal = false,
  onCloseModal = null,
  onExpandToFullTab = null,
  onNavigateToLocation = null,
  selectedParcelContext = null
}) {
  const isDark = theme === 'dark';

  // Chat conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('New Chat');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeMapAction, setActiveMapAction] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isFloatingModal);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load API status and conversation list on mount
  useEffect(() => {
    fetchApiStatus();
    loadConversations();
  }, []);

  // Auto-scroll on new message or streaming chunk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputMessage]);

  const fetchApiStatus = async () => {
    try {
      const res = await getChatStatus();
      setApiStatus(res.data);
    } catch (err) {
      console.warn('Could not fetch chat status:', err);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await getChatConversations();
      setConversations(res.data || []);
    } catch (err) {
      console.warn('Could not load chat conversations:', err);
    }
  };

  const handleSelectConversation = async (convId) => {
    if (isStreaming) return;
    setIsLoadingHistory(true);
    setErrorMessage(null);
    try {
      const res = await getChatConversationDetail(convId);
      setActiveConversationId(res.data.id);
      setConversationTitle(res.data.title || 'Conversation');
      setMessages(res.data.messages || []);
      setStreamingContent('');
      setActiveMapAction(null);
      if (isFloatingModal) setIsSidebarOpen(false);
    } catch (err) {
      setErrorMessage('Failed to load conversation history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleStartNewChat = () => {
    if (isStreaming) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setActiveConversationId(null);
    setConversationTitle('New Chat');
    setMessages([]);
    setStreamingContent('');
    setActiveMapAction(null);
    setErrorMessage(null);
    if (textareaRef.current) textareaRef.current.focus();
    if (isFloatingModal) setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await deleteChatConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        handleStartNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleClearAllConversations = async () => {
    if (!window.confirm('Are you sure you want to delete all saved conversations? This cannot be undone.')) return;
    try {
      await clearAllChatConversations();
      setConversations([]);
      handleStartNewChat();
    } catch (err) {
      console.error('Failed to clear conversations:', err);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isStreaming) return;

    setInputMessage('');
    setErrorMessage(null);

    // Append user message immediately
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');
    setActiveMapAction(null);

    // Setup AbortController for stop-generation support
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('bhoomi_user_id') || 'guest-user'
        },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          message: text,
          selected_parcel_context: selectedParcelContext
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned error status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let detectedMapAction = null;
      let finalConvId = activeConversationId;
      let finalTitle = conversationTitle;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataPayload = trimmed.slice(5).trim();
          if (dataPayload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.type === 'start') {
              finalConvId = parsed.conversation_id;
              finalTitle = parsed.title;
              setActiveConversationId(parsed.conversation_id);
              setConversationTitle(parsed.title);
              if (parsed.map_action) {
                detectedMapAction = parsed.map_action;
                setActiveMapAction(parsed.map_action);
              }
            } else if (parsed.type === 'chunk') {
              accumulatedContent += parsed.content;
              setStreamingContent(accumulatedContent);
            } else if (parsed.type === 'map_action') {
              detectedMapAction = parsed.action;
              setActiveMapAction(parsed.action);
            } else if (parsed.type === 'done') {
              finalConvId = parsed.conversation_id;
              finalTitle = parsed.title;
              if (parsed.map_action) detectedMapAction = parsed.map_action;
            }
          } catch (e) {
            // Non-JSON chunk, ignore
          }
        }
      }

      // Finalize assistant message
      if (accumulatedContent) {
        const assistantMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: accumulatedContent,
          map_action: detectedMapAction,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingContent('');
      }

      // Refresh conversation list
      loadConversations();

    } catch (err) {
      if (err.name === 'AbortError') {
        // User deliberately clicked Stop Generation
        if (streamingContent) {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now() + 1,
              role: 'assistant',
              content: streamingContent + '\n\n*(Generation stopped by user)*',
              map_action: activeMapAction,
              created_at: new Date().toISOString()
            }
          ]);
          setStreamingContent('');
        }
      } else {
        console.error('Chat error:', err);
        setErrorMessage(err.message || 'An error occurred while generating the response.');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isStreaming) return;
    // Find last user message
    let lastUserMsg = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsg = messages[i];
        break;
      }
    }
    if (lastUserMsg) {
      // Remove the last assistant message if present
      if (messages[messages.length - 1].role === 'assistant') {
        setMessages(prev => prev.slice(0, prev.length - 1));
      }
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTriggerMapAction = (action) => {
    if (!action) return;
    if (typeof onNavigateToLocation === 'function') {
      onNavigateToLocation(action);
    }
  };

  return (
    <div className={`flex h-full w-full overflow-hidden transition-colors rounded-2xl border shadow-xl ${
      isFloatingModal 
        ? 'max-h-[85vh] h-[680px]' 
        : 'h-[calc(100vh-140px)] min-h-[620px]'
    } ${
      isDark 
        ? 'bg-slate-950 border-emerald-500/30 text-slate-100' 
        : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* 1. CHAT HISTORY SIDEBAR */}
      <aside className={`relative flex flex-col flex-shrink-0 transition-all duration-300 border-r z-20 ${
        isSidebarOpen ? 'w-72 sm:w-80' : 'w-0 border-r-0'
      } ${
        isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/95 border-slate-200'
      } overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-3 border-b flex items-center justify-between border-inherit">
          <button
            type="button"
            onClick={handleStartNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="ml-2 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition sm:hidden"
            title="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Saved Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
              <span>No conversations yet. Start a new chat to begin!</span>
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = activeConversationId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition border ${
                    isActive
                      ? isDark 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold' 
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : isDark
                        ? 'border-transparent text-slate-300 hover:bg-slate-800/50'
                        : 'border-transparent text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate text-[12px]">{c.title || 'Conversation'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    title="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-inherit flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className={`w-2 h-2 rounded-full ${apiStatus?.api_key_configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[11px] font-mono truncate">
              {apiStatus?.api_key_configured ? 'GPT-4o Connected' : 'Setup Required'}
            </span>
          </div>
          {conversations.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllConversations}
              className="text-[11px] text-red-400/80 hover:text-red-300 transition"
              title="Clear all conversations"
            >
              Clear All
            </button>
          )}
        </div>
      </aside>

      {/* 2. MAIN CHAT WORKSPACE */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navbar */}
        <div className={`px-4 py-3 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-xl border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
                title="Open history sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm tracking-tight truncate">
                  BhoomiAI Assistant
                </h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {conversationTitle || 'Your intelligent Karnataka land & geography companion'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleStartNewChat}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition border border-slate-700/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}

            {isFloatingModal && onExpandToFullTab && (
              <button
                type="button"
                onClick={onExpandToFullTab}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition"
                title="Expand to Full View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {isFloatingModal && onCloseModal && (
              <button
                type="button"
                onClick={onCloseModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* API Key Status Notice Banner (if not yet configured) */}
        {apiStatus && !apiStatus.api_key_configured && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 truncate">
              <Key className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="truncate">
                Add your OpenAI API key in <code className="bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px] font-mono">backend/.env</code> to activate unconstrained live GPT completions.
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 whitespace-nowrap">
              Demo Knowledge Active
            </span>
          </div>
        )}

        {/* 3. CONVERSATION MESSAGES VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Welcome Screen (Zero message state) */}
          {messages.length === 0 && !streamingContent && (
            <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8 text-center animate-fadeIn">
              <div className="space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Hello! Welcome to Bhoomi<span className="text-emerald-500">AI</span> 👋
                </h1>
                <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
                  I'm your intelligent land and geography assistant. I can help you understand land records, survey numbers, agriculture, Karnataka geography and much more.
                </p>
                <p className="text-xs font-semibold text-emerald-400">
                  What would you like to know today?
                </p>
              </div>

              {/* Clickable Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
                {WELCOME_SUGGESTIONS.map((sug, i) => {
                  const Icon = sug.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(sug.prompt)}
                      className={`group p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between hover:scale-[1.02] ${
                        isDark 
                          ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900' 
                          : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition">
                          <Icon className="w-4 h-4" />
                        </span>
                        <CornerDownLeft className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition mb-0.5">
                          {sug.title}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2">
                          {sug.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Render Message History */}
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 sm:gap-4 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm text-xs sm:text-[13px] leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : isDark
                      ? 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                      : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-400 prose-code:text-emerald-300 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              return !inline ? (
                                <div className="relative my-2 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                                    <span>{match ? match[1] : 'code'}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCode(codeString, index)}
                                      className="flex items-center gap-1 hover:text-white transition"
                                    >
                                      {copiedCodeIndex === index ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="p-3 text-[11px] overflow-x-auto text-slate-200">
                                    <code>{children}</code>
                                  </pre>
                                </div>
                              ) : (
                                <code className="px-1.5 py-0.5 rounded bg-slate-800/70 text-emerald-300 text-[11px] font-mono" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            table({ children }) {
                              return (
                                <div className="overflow-x-auto my-3 rounded-xl border border-slate-700/50">
                                  <table className="min-w-full divide-y divide-slate-700/60 text-xs">
                                    {children}
                                  </table>
                                </div>
                              );
                            },
                            th({ children }) {
                              return (
                                <th className="px-3 py-2 bg-slate-800/80 font-bold text-left text-slate-300">
                                  {children}
                                </th>
                              );
                            },
                            td({ children }) {
                              return (
                                <td className="px-3 py-2 border-t border-slate-800 text-slate-300">
                                  {children}
                                </td>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Map Action Button (if associated with this assistant turn) */}
                      {msg.map_action && (
                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 truncate">
                            <Navigation className="w-4 h-4 flex-shrink-0 animate-bounce" />
                            <span className="truncate">
                              {msg.map_action.action === 'navigate_location'
                                ? `Location Match: ${msg.map_action.target_name || 'Karnataka'} (${msg.map_action.district || 'Pilot Area'})`
                                : `Selected Parcel Survey No. ${msg.map_action.survey_number || ''}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTriggerMapAction(msg.map_action)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm whitespace-nowrap"
                          >
                            <span>Fly to Map</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Message Actions: Copy Response & Regenerate */}
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 opacity-60 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.content, index)}
                          className="flex items-center gap-1 hover:text-slate-200 transition"
                          title="Copy message to clipboard"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        {index === messages.length - 1 && (
                          <button
                            type="button"
                            onClick={handleRegenerate}
                            className="flex items-center gap-1 hover:text-slate-200 transition ml-2"
                            title="Regenerate this response"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Regenerate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0 shadow-sm mt-0.5 font-bold text-xs">
                    You
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Streaming Chunk Display */}
          {isStreaming && (
            <div className="flex gap-3 sm:gap-4 max-w-4xl mx-auto justify-start animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl rounded-tl-none px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm text-xs sm:text-[13px] leading-relaxed ${
                isDark 
                  ? 'bg-slate-900/90 border border-slate-800 text-slate-200' 
                  : 'bg-slate-100 border border-slate-200 text-slate-800'
              }`}>
                {streamingContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-middle" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs">BhoomiAI Assistant is thinking...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="max-w-xl mx-auto p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. MESSAGE INPUT BOX & CONTROLS */}
        <div className={`p-3 sm:p-4 border-t flex-shrink-0 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Context Badge (if user has selected a parcel on the map) */}
            {selectedParcelContext && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold truncate">
                    Attached Context: Survey No. {selectedParcelContext.survey_number} ({selectedParcelContext.village || 'Karnataka'}, {selectedParcelContext.area_acres} Acres)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  Map Parcel Linked
                </span>
              </div>
            )}

            <div className={`relative flex items-end rounded-2xl border transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-700/80 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20' 
                : 'bg-slate-50 border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
            }`}>
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask BhoomiAI anything about land records, survey numbers, geography, agriculture..."
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none bg-transparent px-4 py-3 text-xs sm:text-sm focus:outline-hidden disabled:opacity-50 max-h-40"
              />

              <div className="p-2 flex items-center gap-1.5 flex-shrink-0">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-sm"
                    title="Stop generation"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim()}
                    className={`p-2.5 rounded-xl transition ${
                      inputMessage.trim()
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                    title="Send message (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>
                Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">Shift+Enter</kbd> for newline
              </span>
              <span className="hidden sm:inline text-slate-400">
                BhoomiAI Assistant can make mistakes. Verify critical revenue information with official records.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
