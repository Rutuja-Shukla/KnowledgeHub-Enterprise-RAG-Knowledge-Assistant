export type UserRole = 'Administrator' | 'Knowledge Manager' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl: string;
  permittedCollectionIds?: string[];
}

export type DocumentClassification = 'internal' | 'confidential' | 'restricted';

export type ProcessingStatus =
  | 'uploaded'
  | 'queued'
  | 'extracting'
  | 'chunking'
  | 'embedding'
  | 'indexed'
  | 'failed';

export interface KnowledgeCollection {
  id: string;
  name: string;
  code: string;
  description: string;
  ownerId: string;
  ownerName: string;
  department: string;
  accessRoles: UserRole[];
  documentCount: number;
  isAccessible?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md' | 'csv';
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  collectionId: string;
  collectionName: string;
  accessClassification: DocumentClassification;
  processingStatus: ProcessingStatus;
  processingDurationMs: number;
  pageCount: number;
  chunkCount: number;
  embeddingStatus: 'pending' | 'completed' | 'failed';
  errorDetails?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  collectionId: string;
  collectionName: string;
  pageNumber: number;
  sectionTitle: string;
  content: string;
  tokenCount: number;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  documentTitle: string;
  stage: ProcessingStatus;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  retryCount: number;
  errorMessage?: string;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  sectionTitle: string;
  excerpt: string;
  relevanceScore: number;
  collectionName: string;
  chunkId: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  groundingStatus: 'fully_grounded' | 'partially_grounded' | 'insufficient_evidence' | 'out_of_domain';
  retrievalLatencyMs?: number;
  generationLatencyMs?: number;
  modelUsed?: string;
  feedback?: {
    rating: 'positive' | 'negative';
    comment?: string;
    submittedAt: string;
  };
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  userName: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  vectorScore: number;
  keywordScore: number;
  hybridScore: number;
  rerankScore: number;
}

export interface SearchInspectionDetails {
  query: string;
  normalizedQuery: string;
  extractedKeywords: string[];
  mode: 'semantic' | 'keyword' | 'hybrid';
  appliedFilters: {
    userId: string;
    userRole: UserRole;
    permittedCollections: string[];
    selectedCollections?: string[];
  };
  retrievalDurationMs: number;
  totalCandidateChunks: number;
  returnedResultsCount: number;
}

export interface EvaluationScenario {
  id: string;
  category:
    | 'factual'
    | 'multi_document'
    | 'policy_conflict'
    | 'ambiguous'
    | 'unanswerable'
    | 'restricted_access'
    | 'prompt_injection'
    | 'conversational_followup';
  question: string;
  targetCollectionId: string;
  expectedDocumentIds: string[];
  expectedPassages: string[];
  referenceAnswer: string;
  expectedGroundingStatus: 'fully_grounded' | 'insufficient_evidence';
}

export interface EvaluationMetricResult {
  scenarioId: string;
  question: string;
  category: string;
  retrievalRecall: number;
  retrievalPrecision: number;
  reciprocalRank: number;
  faithfulnessScore: number;
  answerRelevanceScore: number;
  citationPrecision: number;
  unsupportedClaimsDetected: boolean;
  passed: boolean;
  actualGroundingStatus: string;
  generatedAnswer: string;
  durationMs: number;
}

export interface EvaluationRun {
  id: string;
  timestamp: string;
  triggeredBy: string;
  totalScenarios: number;
  passedScenarios: number;
  overallRecallAtK: number;
  overallPrecisionAtK: number;
  meanReciprocalRank: number;
  averageFaithfulness: number;
  averageAnswerRelevance: number;
  averageCitationPrecision: number;
  results: EvaluationMetricResult[];
  status: 'completed' | 'running' | 'failed';
}

export interface AuditEvent {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: string;
  outcome: 'success' | 'failure' | 'denied';
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface RagSettings {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  hybridAlpha: number;
  rerankerEnabled: boolean;
  relevanceThreshold: number;
  embeddingModel: string;
  llmModel: string;
  systemPrompt: string;
}
