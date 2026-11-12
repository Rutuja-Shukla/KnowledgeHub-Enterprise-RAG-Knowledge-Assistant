import {
  User,
  KnowledgeCollection,
  DocumentRecord,
  DocumentChunk,
  ProcessingJob,
  Conversation,
  ConversationMessage,
  RetrievalResult,
  SearchInspectionDetails,
  EvaluationScenario,
  EvaluationRun,
  AuditEvent,
  RagSettings,
} from '../types';

export const api = {
  // Auth & Session
  async getAuthMe(): Promise<{
    user: User;
    permittedCollectionIds: string[];
    totalCollections: number;
    geminiConfigured: boolean;
  }> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Failed to fetch active session');
    return res.json();
  },

  async switchUser(userId: string): Promise<{ user: User; permittedCollectionIds: string[] }> {
    const res = await fetch('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to switch user');
    return res.json();
  },

  async getUsers(): Promise<{ users: User[] }> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async updateUserRole(id: string, role: string, permittedCollectionIds?: string[]): Promise<{ user: User }> {
    const res = await fetch(`/api/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permittedCollectionIds }),
    });
    if (!res.ok) throw new Error('Failed to update user role');
    return res.json();
  },

  // Collections
  async getCollections(): Promise<{ collections: KnowledgeCollection[] }> {
    const res = await fetch('/api/collections');
    if (!res.ok) throw new Error('Failed to fetch collections');
    return res.json();
  },

  async createCollection(data: Partial<KnowledgeCollection>): Promise<{ collection: KnowledgeCollection }> {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create collection');
    }
    return res.json();
  },

  async deleteCollection(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete collection');
    return res.json();
  },

  // Documents
  async getDocuments(params?: {
    collectionId?: string;
    status?: string;
    fileType?: string;
    search?: string;
  }): Promise<{ documents: DocumentRecord[] }> {
    const sp = new URLSearchParams();
    if (params?.collectionId) sp.set('collectionId', params.collectionId);
    if (params?.status) sp.set('status', params.status);
    if (params?.fileType) sp.set('fileType', params.fileType);
    if (params?.search) sp.set('search', params.search);

    const res = await fetch(`/api/documents?${sp.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getDocumentDetails(id: string): Promise<{ document: DocumentRecord; chunks: DocumentChunk[] }> {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document details');
    return res.json();
  },

  async uploadDocument(data: {
    title: string;
    filename: string;
    collectionId: string;
    accessClassification: string;
    content: string;
    fileType?: string;
  }): Promise<{ document: DocumentRecord }> {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload document');
    }
    return res.json();
  },

  async reprocessDocument(id: string): Promise<{ document: DocumentRecord }> {
    const res = await fetch(`/api/documents/${id}/reprocess`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reprocess document');
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // Processing Jobs
  async getProcessingJobs(): Promise<{ jobs: ProcessingJob[] }> {
    const res = await fetch('/api/processing/jobs');
    if (!res.ok) throw new Error('Failed to fetch processing jobs');
    return res.json();
  },

  async retryProcessingJob(jobId: string): Promise<{ document: DocumentRecord; job: ProcessingJob }> {
    const res = await fetch(`/api/processing/retry/${jobId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to retry job');
    }
    return res.json();
  },

  // RAG Chat
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    const res = await fetch('/api/conversations');
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async getConversation(id: string): Promise<{ conversation: Conversation; messages: ConversationMessage[] }> {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  },

  async sendChatMessage(payload: {
    query: string;
    conversationId?: string;
    collectionIds?: string[];
  }): Promise<{
    message: ConversationMessage;
    conversationId: string;
    retrievalResults: RetrievalResult[];
    inspection?: SearchInspectionDetails;
  }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Chat query failed');
    }
    return res.json();
  },

  async submitFeedback(payload: {
    messageId: string;
    rating: 'positive' | 'negative';
    comment?: string;
  }): Promise<{ success: boolean }> {
    const res = await fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  },

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  // Search Explorer
  async search(payload: {
    query: string;
    mode?: 'semantic' | 'keyword' | 'hybrid';
    collectionIds?: string[];
    limit?: number;
    threshold?: number;
  }): Promise<{ results: RetrievalResult[]; inspection: SearchInspectionDetails }> {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Search query failed');
    }
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<{
    metrics: {
      totalDocuments: number;
      indexedDocuments: number;
      queuedOrProcessing: number;
      failedDocuments: number;
      totalQueries: number;
      avgResponseTimeMs: number;
      retrievalSuccessRate: number;
      userSatisfactionScore: number;
    };
    collectionCounts: { name: string; code: string; documents: number }[];
    recentActivity: AuditEvent[];
    ingestionTrend: { period: string; indexed: number; queries: number }[];
  }> {
    const res = await fetch('/api/analytics/overview');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Evaluation Centre
  async getEvaluationScenarios(): Promise<{ scenarios: EvaluationScenario[] }> {
    const res = await fetch('/api/evaluations/scenarios');
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return res.json();
  },

  async getEvaluationRuns(): Promise<{ runs: EvaluationRun[] }> {
    const res = await fetch('/api/evaluations/runs');
    if (!res.ok) throw new Error('Failed to fetch evaluation runs');
    return res.json();
  },

  async runBenchmark(): Promise<{ run: EvaluationRun }> {
    const res = await fetch('/api/evaluations/run', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to execute benchmark run');
    }
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(params?: { action?: string; userId?: string; outcome?: string }): Promise<{ logs: AuditEvent[] }> {
    const sp = new URLSearchParams();
    if (params?.action) sp.set('action', params.action);
    if (params?.userId) sp.set('userId', params.userId);
    if (params?.outcome) sp.set('outcome', params.outcome);

    const res = await fetch(`/api/audit-logs?${sp.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ settings: RagSettings; geminiConfigured: boolean }> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<RagSettings>): Promise<{ settings: RagSettings }> {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update settings');
    }
    return res.json();
  },
};
