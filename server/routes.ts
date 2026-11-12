import { Router, Request, Response } from 'express';
import multer from 'multer';
import { storage } from './storage';
import { ragEngine } from './rag';
import { ingestionService } from './ingestion';
import { evaluationService } from './evaluations';
import { isGeminiConfigured } from './gemini';

const router = Router();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

// ----------------------------------------------------
// AUTH & USERS
// ----------------------------------------------------
router.get('/auth/me', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  const allCollections = storage.getStore().collections;
  const permittedCollectionIds = ragEngine.getPermittedCollections(user);
  res.json({
    user,
    permittedCollectionIds,
    totalCollections: allCollections.length,
    geminiConfigured: isGeminiConfigured(),
  });
});

router.post('/auth/switch-user', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const user = storage.setActiveUser(userId);
    res.json({ user, permittedCollectionIds: ragEngine.getPermittedCollections(user) });
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get('/users', (req: Request, res: Response) => {
  res.json({ users: storage.getStore().users });
});

router.patch('/users/:id/role', (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, permittedCollectionIds } = req.body;
  const store = storage.getStore();
  const user = store.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (role) {
    user.role = role;
  }
  if (permittedCollectionIds) {
    user.permittedCollectionIds = permittedCollectionIds;
  }

  storage.save();
  res.json({ user });
});

// ----------------------------------------------------
// COLLECTIONS
// ----------------------------------------------------
router.get('/collections', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  const collections = storage.getStore().collections;
  const permittedIds = ragEngine.getPermittedCollections(user);

  const enriched = collections.map((col) => ({
    ...col,
    isAccessible: permittedIds.includes(col.id),
  }));

  res.json({ collections: enriched });
});

router.post('/collections', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  if (user.role === 'Employee') {
    return res.status(403).json({ error: 'Employees cannot create new collections.' });
  }

  const { name, code, description, department, accessRoles } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Collection name and code are required' });
  }

  const newCol = {
    id: `col-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
    name,
    code: code.toUpperCase(),
    description: description || '',
    ownerId: user.id,
    ownerName: user.name,
    department: department || user.department,
    accessRoles: accessRoles || ['Administrator', 'Knowledge Manager', 'Employee'],
    documentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  storage.getStore().collections.push(newCol);
  storage.addAuditEvent({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'COLLECTION_CREATE',
    resourceType: 'collection',
    resourceId: newCol.id,
    details: `Created collection "${newCol.name}" (${newCol.code})`,
    outcome: 'success',
  });
  storage.save();

  res.status(201).json({ collection: newCol });
});

router.delete('/collections/:id', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  if (user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only Administrators can delete collections.' });
  }

  const store = storage.getStore();
  const index = store.collections.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const col = store.collections[index];
  store.collections.splice(index, 1);

  // Also remove associated documents
  store.documents = store.documents.filter((d) => d.collectionId !== req.params.id);
  store.chunks = store.chunks.filter((c) => c.collectionId !== req.params.id);

  storage.addAuditEvent({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'COLLECTION_DELETE',
    resourceType: 'collection',
    resourceId: req.params.id,
    details: `Deleted collection "${col.name}" and all its documents`,
    outcome: 'success',
  });
  storage.save();

  res.json({ success: true });
});

// ----------------------------------------------------
// DOCUMENTS & INGESTION
// ----------------------------------------------------
router.get('/documents', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  const { collectionId, status, fileType, search } = req.query;
  const permittedIds = ragEngine.getPermittedCollections(user);
  let docs = storage.getStore().documents.filter((d) => permittedIds.includes(d.collectionId));

  if (collectionId && collectionId !== 'all') {
    docs = docs.filter((d) => d.collectionId === collectionId);
  }
  if (status && status !== 'all') {
    docs = docs.filter((d) => d.processingStatus === status);
  }
  if (fileType && fileType !== 'all') {
    docs = docs.filter((d) => d.fileType === fileType);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    docs = docs.filter((d) => d.title.toLowerCase().includes(q) || d.filename.toLowerCase().includes(q));
  }

  res.json({ documents: docs });
});

router.get('/documents/:id', (req: Request, res: Response) => {
  const doc = storage.getStore().documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const chunks = storage.getStore().chunks.filter((c) => c.documentId === doc.id);
  res.json({ document: doc, chunks });
});

router.post('/documents', upload.single('file'), async (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  if (user.role === 'Employee') {
    return res.status(403).json({ error: 'Employees do not have upload privileges. Role Knowledge Manager or Administrator required.' });
  }

  try {
    let filename = req.body.filename;
    let title = req.body.title;
    let fileType = (req.body.fileType || 'txt').toLowerCase();
    let fileSize = 1024;
    let rawContent = req.body.content || '';
    const collectionId = req.body.collectionId;
    const accessClassification = req.body.accessClassification || 'internal';

    if (req.file) {
      filename = req.file.originalname;
      title = title || filename.replace(/\.[^/.]+$/, '');
      fileSize = req.file.size;
      const ext = filename.split('.').pop()?.toLowerCase();
      fileType = ext || 'txt';
      rawContent = req.file.buffer.toString('utf-8');
    }

    if (!collectionId) {
      return res.status(400).json({ error: 'collectionId is required' });
    }

    if (!rawContent || rawContent.trim().length === 0) {
      return res.status(400).json({ error: 'Document content is empty or unreadable' });
    }

    const doc = await ingestionService.ingestDocument({
      filename: filename || 'untitled_document.txt',
      title: title || 'Untitled Document',
      fileType: fileType as 'pdf' | 'docx' | 'txt' | 'md' | 'csv',
      fileSize,
      collectionId,
      uploadedBy: user.id,
      accessClassification,
      rawContent,
    });

    res.status(201).json({ document: doc });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/documents/:id/reprocess', async (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  if (user.role === 'Employee') {
    return res.status(403).json({ error: 'Employees cannot trigger document reprocessing.' });
  }

  try {
    const updated = await ingestionService.reprocessDocument(req.params.id, user.id);
    res.json({ document: updated });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete('/documents/:id', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  if (user.role === 'Employee') {
    return res.status(403).json({ error: 'Employees cannot delete documents.' });
  }

  try {
    ingestionService.deleteDocument(req.params.id, user.id);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ----------------------------------------------------
// DOCUMENT PROCESSING MONITORING
// ----------------------------------------------------
router.get('/processing/jobs', (req: Request, res: Response) => {
  res.json({ jobs: storage.getStore().processingJobs });
});

router.post('/processing/retry/:jobId', async (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  const job = storage.getStore().processingJobs.find((j) => j.id === req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Processing job not found' });
  }

  try {
    const updated = await ingestionService.reprocessDocument(job.documentId, user.id);
    res.json({ document: updated, job });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ----------------------------------------------------
// ASK KNOWLEDGEHUB (RAG CHAT)
// ----------------------------------------------------
router.get('/conversations', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  const convs = storage.getStore().conversations.filter((c) => c.userId === user.id);
  res.json({ conversations: convs });
});

router.get('/conversations/:id', (req: Request, res: Response) => {
  const store = storage.getStore();
  const conv = store.conversations.find((c) => c.id === req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  const messages = store.messages.filter((m) => m.conversationId === conv.id);
  res.json({ conversation: conv, messages });
});

router.post('/chat', async (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  const { query, conversationId, collectionIds } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query is required' });
  }

  const store = storage.getStore();
  let conv = store.conversations.find((c) => c.id === conversationId);

  if (!conv) {
    conv = {
      id: `conv-${Date.now()}`,
      title: query.length > 45 ? `${query.substring(0, 42)}...` : query,
      userId: user.id,
      userName: user.name,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.conversations.unshift(conv);
  }

  // Record user message
  const userMsg = {
    id: `msg-${Date.now()}-u`,
    conversationId: conv.id,
    sender: 'user' as const,
    content: query.trim(),
    groundingStatus: 'fully_grounded' as const,
    createdAt: new Date().toISOString(),
  };
  store.messages.push(userMsg);
  conv.messageCount += 1;
  conv.updatedAt = new Date().toISOString();

  try {
    const ragResult = await ragEngine.executePipeline({
      query: query.trim(),
      collectionIds,
      user,
      includeInspection: true,
    });

    const assistantMsg = {
      id: `msg-${Date.now()}-a`,
      conversationId: conv.id,
      sender: 'assistant' as const,
      content: ragResult.answer,
      citations: ragResult.citations,
      groundingStatus: ragResult.groundingStatus,
      retrievalLatencyMs: ragResult.retrievalLatencyMs,
      generationLatencyMs: ragResult.generationLatencyMs,
      modelUsed: ragResult.modelUsed,
      createdAt: new Date().toISOString(),
    };
    store.messages.push(assistantMsg);
    conv.messageCount += 1;
    storage.save();

    res.json({
      message: assistantMsg,
      conversationId: conv.id,
      retrievalResults: ragResult.retrievalResults,
      inspection: ragResult.inspection,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/chat/feedback', (req: Request, res: Response) => {
  const { messageId, rating, comment } = req.body;
  const store = storage.getStore();
  const msg = store.messages.find((m) => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }

  msg.feedback = {
    rating,
    comment,
    submittedAt: new Date().toISOString(),
  };

  storage.addAuditEvent({
    userId: storage.getActiveUser().id,
    userName: storage.getActiveUser().name,
    userRole: storage.getActiveUser().role,
    action: 'FEEDBACK_SUBMIT',
    resourceType: 'query',
    resourceId: messageId,
    details: `User submitted ${rating} feedback on assistant answer`,
    outcome: 'success',
  });
  storage.save();

  res.json({ success: true, feedback: msg.feedback });
});

router.delete('/conversations/:id', (req: Request, res: Response) => {
  const store = storage.getStore();
  store.conversations = store.conversations.filter((c) => c.id !== req.params.id);
  store.messages = store.messages.filter((m) => m.conversationId !== req.params.id);
  storage.save();
  res.json({ success: true });
});

// ----------------------------------------------------
// SEARCH EXPLORER
// ----------------------------------------------------
router.post('/search', async (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  const { query, mode, collectionIds, limit, threshold } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query string is required' });
  }

  try {
    const searchOutput = await ragEngine.executeSearch({
      query,
      mode,
      collectionIds,
      user,
      limit,
      threshold,
    });

    res.json(searchOutput);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ----------------------------------------------------
// ANALYTICS & DASHBOARD METRICS
// ----------------------------------------------------
router.get('/analytics/overview', (req: Request, res: Response) => {
  const store = storage.getStore();
  const docs = store.documents;
  const jobs = store.processingJobs;
  const messages = store.messages.filter((m) => m.sender === 'assistant');
  const audits = store.auditEvents;

  const totalDocuments = docs.length;
  const indexedDocuments = docs.filter((d) => d.processingStatus === 'indexed').length;
  const queuedOrProcessing = docs.filter(
    (d) => d.processingStatus !== 'indexed' && d.processingStatus !== 'failed'
  ).length;
  const failedDocuments = docs.filter((d) => d.processingStatus === 'failed').length;

  const totalQueries = messages.length;
  let totalLatency = 0;
  let groundedCount = 0;
  let positiveFeedback = 0;
  let totalFeedback = 0;

  messages.forEach((m) => {
    totalLatency += (m.retrievalLatencyMs || 0) + (m.generationLatencyMs || 0);
    if (m.groundingStatus === 'fully_grounded') {
      groundedCount++;
    }
    if (m.feedback) {
      totalFeedback++;
      if (m.feedback.rating === 'positive') positiveFeedback++;
    }
  });

  const avgResponseTimeMs = totalQueries > 0 ? Math.round(totalLatency / totalQueries) : 320;
  const retrievalSuccessRate = totalQueries > 0 ? Math.round((groundedCount / totalQueries) * 100) : 96;
  const userSatisfactionScore = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 94;

  // Collection distribution
  const collectionCounts = store.collections.map((col) => {
    const count = docs.filter((d) => d.collectionId === col.id).length;
    return {
      name: col.name,
      code: col.code,
      documents: count,
    };
  });

  // Recent activity
  const recentActivity = audits.slice(0, 8);

  // Ingestion trend (by month)
  const ingestionTrend = [
    { period: 'Nov', indexed: 4, queries: 12 },
    { period: 'Dec', indexed: 8, queries: 24 },
    { period: 'Jan', indexed: 18, queries: 64 },
    { period: 'Feb', indexed: 26, queries: 110 },
    { period: 'Mar', indexed: 30, queries: Math.max(140, totalQueries) },
  ];

  res.json({
    metrics: {
      totalDocuments,
      indexedDocuments,
      queuedOrProcessing,
      failedDocuments,
      totalQueries,
      avgResponseTimeMs,
      retrievalSuccessRate,
      userSatisfactionScore,
    },
    collectionCounts,
    recentActivity,
    ingestionTrend,
  });
});

// ----------------------------------------------------
// EVALUATION CENTRE
// ----------------------------------------------------
router.get('/evaluations/scenarios', (req: Request, res: Response) => {
  res.json({ scenarios: storage.getStore().evaluationScenarios });
});

router.get('/evaluations/runs', (req: Request, res: Response) => {
  res.json({ runs: storage.getStore().evaluationRuns });
});

router.post('/evaluations/run', async (req: Request, res: Response) => {
  try {
    const user = storage.getActiveUser();
    const run = await evaluationService.runBenchmark(user.id);
    res.json({ run });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ----------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------
router.get('/audit-logs', (req: Request, res: Response) => {
  const { action, userId, outcome, limit } = req.query;
  let logs = storage.getStore().auditEvents;

  if (action && action !== 'all') {
    logs = logs.filter((l) => l.action === action);
  }
  if (userId && userId !== 'all') {
    logs = logs.filter((l) => l.userId === userId);
  }
  if (outcome && outcome !== 'all') {
    logs = logs.filter((l) => l.outcome === outcome);
  }

  const max = limit ? parseInt(limit as string, 10) : 100;
  res.json({ logs: logs.slice(0, max) });
});

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
router.get('/settings', (req: Request, res: Response) => {
  res.json({
    settings: storage.getStore().settings,
    geminiConfigured: isGeminiConfigured(),
  });
});

router.patch('/settings', (req: Request, res: Response) => {
  const user = storage.getActiveUser();
  if (user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only Administrators can update RAG system settings.' });
  }

  const current = storage.getStore().settings;
  const updated = { ...current, ...req.body };
  storage.getStore().settings = updated;

  storage.addAuditEvent({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SETTINGS_UPDATE',
    resourceType: 'settings',
    details: `Updated RAG system parameters (TopK: ${updated.topK}, Alpha: ${updated.hybridAlpha}, Threshold: ${updated.relevanceThreshold})`,
    outcome: 'success',
  });
  storage.save();

  res.json({ settings: updated });
});

export default router;
