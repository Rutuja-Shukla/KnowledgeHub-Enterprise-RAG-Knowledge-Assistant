import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  Search,
  Sparkles,
  ChevronRight,
  Loader2,
  Bookmark,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  Conversation,
  ConversationMessage,
  Citation,
  KnowledgeCollection,
  DocumentRecord,
  DocumentChunk,
} from '../../types';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';

interface ChatViewProps {
  collections: KnowledgeCollection[];
}

export const ChatView: React.FC<ChatViewProps> = ({ collections }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Document preview modal states
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewChunks, setPreviewChunks] = useState<DocumentChunk[]>([]);
  const [previewHighlightSection, setPreviewHighlightSection] = useState<string | undefined>();
  const [previewHighlightPage, setPreviewHighlightPage] = useState<number | undefined>();
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Feedback modal
  const [feedbackModalMsgId, setFeedbackModalMsgId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<'positive' | 'negative'>('positive');
  const [feedbackComment, setFeedbackComment] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
      if (res.conversations.length > 0 && !activeConversationId) {
        selectConversation(res.conversations[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const res = await api.getConversation(id);
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputQuery('');
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isSending) return;

    setInputQuery('');
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId || 'pending',
      sender: 'user',
      content: q,
      groundingStatus: 'fully_grounded',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.sendChatMessage({
        query: q,
        conversationId: activeConversationId || undefined,
        collectionIds: selectedCollections.length > 0 ? selectedCollections : undefined,
      });

      setActiveConversationId(res.conversationId);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, res.message]);
      loadConversations();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversationId: activeConversationId || 'pending',
          sender: 'assistant',
          content: `Error processing RAG query: ${errorMsg}`,
          groundingStatus: 'insufficient_evidence',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const openCitationPreview = async (citation: Citation) => {
    try {
      const res = await api.getDocumentDetails(citation.documentId);
      setPreviewDoc(res.document);
      setPreviewChunks(res.chunks);
      setPreviewHighlightSection(citation.sectionTitle);
      setPreviewHighlightPage(citation.pageNumber);
      setPreviewModalOpen(true);
    } catch (err) {
      console.error('Failed to load document for preview:', err);
    }
  };

  const submitFeedbackAction = async () => {
    if (!feedbackModalMsgId) return;
    try {
      await api.submitFeedback({
        messageId: feedbackModalMsgId,
        rating: feedbackRating,
        comment: feedbackComment,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === feedbackModalMsgId
            ? {
                ...m,
                feedback: {
                  rating: feedbackRating,
                  comment: feedbackComment,
                  submittedAt: new Date().toISOString(),
                },
              }
            : m
        )
      );
      setFeedbackModalMsgId(null);
      setFeedbackComment('');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const exampleQuestions = [
    "What is our company's process for requesting production database access?",
    'How many days of paid vacation do employees accrue in their first year?',
    'What are the travel per diem meal rates and hotel limit in New York?',
    'What is the response SLA for a P0 critical security incident?',
    'Can an engineer approve their own code pull request into main?',
    'What is the reimbursement limit for employee pet insurance?', // Unanswerable refusal test
  ];

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(conversationSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Left Panel: Conversation History */}
      <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        {/* Top actions */}
        <div className="p-3 border-b border-slate-200 space-y-2">
          <button
            onClick={handleNewConversation}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Knowledge Chat</span>
          </button>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((c) => {
              const isActive = activeConversationId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`}
                    />
                    <div className="flex flex-col truncate">
                      <span className="text-xs truncate">{c.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">No conversations yet</div>
          )}
        </div>

        {/* Collection Filter Pill Bar */}
        <div className="border-t border-slate-200 p-3 bg-slate-50/50">
          <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Filter Knowledge Scope:</span>
            <span className="text-[10px] font-normal text-slate-400">
              {selectedCollections.length === 0 ? 'All Accessible' : `${selectedCollections.length} selected`}
            </span>
          </p>
          <div className="flex flex-wrap gap-1">
            {collections.map((col) => {
              const isSelected = selectedCollections.includes(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    setSelectedCollections((prev) =>
                      isSelected ? prev.filter((id) => id !== col.id) : [...prev, col.id]
                    );
                  }}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-700 text-white font-semibold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {col.code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 shadow-xs">
                <Sparkles className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Ask KnowledgeHub</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Ask natural language questions about internal policies, engineering runbooks, security rules, and
                  guidelines. Every answer is strictly grounded in authorized evidence with verified source citations.
                </p>
              </div>

              {/* Sample questions grid */}
              <div className="w-full space-y-2 text-left">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                  Try asking one of these enterprise questions:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(q)}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-left transition-all text-xs text-slate-700 shadow-2xs group"
                    >
                      <span className="truncate pr-2">{q}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-5 py-4 text-xs leading-relaxed transition-all shadow-xs ${
                      isUser
                        ? 'bg-blue-700 text-white rounded-br-xs max-w-xl'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs w-full'
                    }`}
                  >
                    {/* Header info for assistant */}
                    {!isUser && (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-800">
                            KH
                          </span>
                          <span className="font-semibold text-slate-900 text-xs">KnowledgeHub Assistant</span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                              msg.groundingStatus === 'fully_grounded'
                                ? 'bg-emerald-50 text-emerald-700'
                                : msg.groundingStatus === 'insufficient_evidence'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {msg.groundingStatus === 'fully_grounded'
                              ? 'Fully Grounded'
                              : msg.groundingStatus === 'insufficient_evidence'
                              ? 'Verified Insufficient Evidence'
                              : 'Grounded Evidence'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                          {msg.retrievalLatencyMs && (
                            <span>{msg.retrievalLatencyMs + (msg.generationLatencyMs || 0)}ms</span>
                          )}
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 hover:text-slate-700 transition-colors"
                            title="Copy answer"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Text content with formatted citations */}
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                    {/* Citations & Source Cards for Assistant Messages */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            Verified Evidence Sources ({msg.citations.length}):
                          </span>
                          <span className="text-[10px] text-slate-400">Click source to inspect excerpt in document</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {msg.citations.map((cit, idx) => (
                            <div
                              key={idx}
                              onClick={() => openCitationPreview(cit)}
                              className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer group text-left"
                            >
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                                <span className="truncate pr-1">{cit.documentTitle}</span>
                                <span className="rounded bg-white border border-slate-200 px-1.5 py-0.2 text-[9px] font-mono text-blue-700 shrink-0">
                                  Page {cit.pageNumber}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">{cit.sectionTitle}</p>
                              <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 italic">
                                &ldquo;{cit.excerpt}&rdquo;
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                                <span>{cit.collectionName}</span>
                                <span className="font-mono text-emerald-700 font-medium">
                                  Relevance: {Math.round(cit.relevanceScore * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback Rating Controls */}
                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-[10px]">Model: {msg.modelUsed || 'gemini-3.8-flash'}</span>

                        <div className="flex items-center gap-2">
                          <span>Was this answer accurate?</span>
                          <button
                            onClick={() => {
                              setFeedbackModalMsgId(msg.id);
                              setFeedbackRating('positive');
                            }}
                            className={`p-1 rounded hover:bg-slate-100 ${
                              msg.feedback?.rating === 'positive' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                            }`}
                            title="Helpful & grounded"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackModalMsgId(msg.id);
                              setFeedbackRating('negative');
                            }}
                            className={`p-1 rounded hover:bg-slate-100 ${
                              msg.feedback?.rating === 'negative' ? 'text-rose-600 font-bold' : 'text-slate-400'
                            }`}
                            title="Inaccurate or missing citations"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex items-start max-w-3xl mx-auto w-full">
              <div className="rounded-2xl rounded-bl-xs border border-slate-200 bg-white px-5 py-4 text-xs shadow-xs w-full">
                <div className="flex items-center gap-3 text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                  <span className="font-medium">
                    Retrieving authorized document chunks, calculating vector similarity, and generating grounded answer...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-3xl mx-auto flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a question about company policies, security guidelines, travel, or procedures..."
              disabled={isSending}
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
            />
            <button
              type="submit"
              disabled={isSending || !inputQuery.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>

          <p className="max-w-3xl mx-auto text-center text-[11px] text-slate-400 mt-2">
            Answers are strictly grounded in internal corporate documents. Citations are verified against real chunk IDs.
          </p>
        </div>
      </div>

      {/* Document Citation Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        document={previewDoc}
        chunks={previewChunks}
        highlightSectionTitle={previewHighlightSection}
        highlightPageNumber={previewHighlightPage}
      />

      {/* Feedback Comment Modal */}
      {feedbackModalMsgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Submit Retrieval Quality Feedback</h3>
            <p className="text-xs text-slate-500">
              Your feedback is recorded in the RAG monitoring audit logs to refine embedding similarity thresholds and
              citation precision.
            </p>

            <textarea
              rows={3}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Optional: What was good or what could be improved about this retrieved evidence?"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setFeedbackModalMsgId(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitFeedbackAction}
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
