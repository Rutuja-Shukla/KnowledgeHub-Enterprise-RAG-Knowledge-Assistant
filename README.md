# KnowledgeHub — Enterprise RAG Knowledge Assistant

KnowledgeHub is a production-grade, enterprise Retrieval-Augmented Generation (RAG) platform built for cross-functional organizations. It enables employees, security teams, people operations, and managers to query internal corporate knowledge and receive verified, factual answers strictly grounded in authorized documentation with verifiable citations.

---

## 1. Key Architectural Features

### A. 9-Stage Query & Retrieval Pipeline
1. **Query Understanding & Firewall**: Normalizes incoming text, extracts query intent keywords, and protects against prompt injection attempts (`SYSTEM OVERRIDE`, password exfiltration, role bypass).
2. **Access Control & RBAC**: Enforces collection-level and document-level permissions on the server before vector similarity matching.
3. **Query Embedding**: Computes dense vector representations using Gemini `gemini-embedding-2` or the deterministic 384-dimensional dense projection engine with cosine distance.
4. **Hybrid Retrieval**: Combines dense semantic vector similarity with token-frequency BM25 keyword matching via configurable alpha weights (`hybridScore = alpha * vectorScore + (1 - alpha) * keywordScore`).
5. **Reranking & Redundancy Pruning**: Cross-evaluates title and section matches using reciprocal rank fusion to bubble up top-tier evidentiary chunks.
6. **Context Assembly**: Enforces context token limits and packages source chunks into structured evidence blocks (`[Doc Title - Page X: Section Title]`).
7. **Grounded Generation**: Generates answers using `gemini-3.8-flash` with a strict evidence-only system instruction.
8. **Citation Validation**: Verifies that every cited document ID and page number exists in the retrieved chunks. Hallucinated citations are rejected, and unanswerable queries trigger a safe refusal statement.
9. **Feedback & Audit Trail**: Records query latency (retrieval ms vs generation ms), chunks retrieved, model used, and user feedback into immutable audit logs.

### B. Ingestion & Ingestion Pipeline
- Multi-format text extraction: PDF, DOCX, TXT, Markdown, CSV.
- Structure preservation: Pages, sections, and markdown headers are preserved as metadata.
- Configurable semantic chunking: Default 500 characters with 80-character overlap.
- Vector indexing: All chunks are embedded and indexed into the vector store.
- Lifecycle monitoring: Stages tracked through `uploaded -> queued -> extracting -> chunking -> embedding -> indexed` (or `failed`).
- Safe reprocessing: Idempotent re-runs purge existing chunk vectors to prevent index duplication.

### C. 11 Enterprise Modules
1. **Overview Dashboard**: Live metrics calculated from actual database records (total documents, indexed vs failed, queries, average latency, grounding success, collection distribution charts).
2. **Ask KnowledgeHub (RAG Chat)**: Multi-turn conversations, verified citations with click-to-preview, source cards, thumbs up/down feedback, and pre-seeded enterprise questions.
3. **Knowledge Library**: High-density document table with filters (collection, status, format), search, upload modal, chunk inspector, reprocess, and deletion.
4. **Document Processing**: Pipeline stage monitoring, duration tracking, error logs, and retry failed jobs.
5. **Collections**: 6 core knowledge domains (ENG, HR, FIN, SEC, COMP, SUP) with RBAC access policies.
6. **Search Explorer**: Standalone search engine with mode switching (Hybrid, Semantic, Keyword), threshold sliders, and Admin Diagnostic Telemetry.
7. **Analytics**: Empirical telemetry for latency percentiles (P50/P90), query volume trajectories, and grounding distributions.
8. **Evaluation Centre**: Benchmark runner executing golden test scenarios (Recall@K, Precision@K, MRR, Faithfulness, Citation Precision).
9. **User Management**: 10 employee personas across Administrator, Knowledge Manager, and Employee roles with 1-click persona switching to test permission boundaries.
10. **Audit Logs**: Immutable log of logins, uploads, deletions, queries, permission changes, and benchmark runs.
11. **Settings**: Hyperparameter configuration for Top-K, Hybrid Alpha, Chunk Size, Overlap, Relevance Threshold, and System Prompts.

---

## 2. Seeded Enterprise Dataset
The environment is pre-seeded with 30 internally consistent enterprise documents across 6 knowledge collections:
- **Engineering (ENG)**: Production Database Access Policy, API Security Standards, Cloud Infrastructure Deployment Standard, SSDLC Guidelines, Change Advisory Board (CAB) Procedure.
- **HR & People Ops (HR)**: Employee Annual & Sick Leave Policy, Remote & Hybrid Work Guidelines, Parental Support Policy, Performance Review & Promotion Framework, Code of Conduct.
- **Finance (FIN)**: Travel & Expense Reimbursement Policy, Procurement Thresholds, Payment Reconciliation & Treasury Operations, CapEx Approval Matrix, Corporate Credit Card Guidelines.
- **Security (SEC)**: Incident Response Plan (IRP), Identity & Access Management (IAM), Encryption Key Management & TLS 1.3, Vulnerability Patching SLAs, Vendor Risk Assessment Protocol.
- **Compliance & Risk (COMP)**: SOC 2 Type II Security Framework, Data Retention & NIST 800-88 Disposal, GDPR & CCPA DSAR Procedure, Whistleblower Protections, Business Continuity (BCDR).
- **Customer Support (SUP)**: Customer Escalation Matrix, SLA Handoff Standards, Customer PII Masking Standards, Refund & Dispute Manual, Enterprise Onboarding Guide.

---

## 3. Technology Stack & API Endpoints

### Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, TSX, `@google/genai` (Gemini 3.8 Flash & Gemini Embedding 2), Multer.
- **Storage**: Typed Relational & Vector Storage Engine (`data/knowledgehub_store.json`).

### REST API Endpoints
- `GET /api/auth/me` — Retrieve active user session and accessible collections.
- `POST /api/auth/switch-user` — Switch active user persona (Admin / Knowledge Manager / Employee).
- `GET /api/users` — List all employee users.
- `PATCH /api/users/:id/role` — Update user role or collection permissions.
- `GET /api/collections` — List knowledge collections with access flags.
- `POST /api/collections` — Create knowledge collection.
- `DELETE /api/collections/:id` — Delete collection and associated documents.
- `GET /api/documents` — Query documents with search, collection, status, and format filters.
- `GET /api/documents/:id` — Get document details and all chunk records.
- `POST /api/documents` — Upload new document and trigger ingestion pipeline.
- `POST /api/documents/:id/reprocess` — Reprocess document pipeline.
- `DELETE /api/documents/:id` — Delete document and delete vector embeddings.
- `GET /api/processing/jobs` — Retrieve all ingestion pipeline jobs.
- `POST /api/processing/retry/:jobId` — Retry failed processing job.
- `POST /api/chat` — Execute 9-stage RAG pipeline and generate grounded answer.
- `GET /api/conversations` — List conversations for active user.
- `GET /api/conversations/:id` — Get conversation messages and citations.
- `DELETE /api/conversations/:id` — Delete conversation.
- `POST /api/chat/feedback` — Submit thumbs up/down quality feedback.
- `POST /api/search` — Search Explorer vector and keyword retrieval with diagnostic telemetry.
- `GET /api/analytics/overview` — Aggregated metrics, latency percentiles, and charts data.
- `GET /api/evaluations/scenarios` — List golden evaluation test scenarios.
- `GET /api/evaluations/runs` — List historical benchmark runs.
- `POST /api/evaluations/run` — Run live evaluation benchmark suite.
- `GET /api/audit-logs` — Query immutable enterprise audit events.
- `GET /api/settings` — Get active RAG pipeline configuration.
- `PATCH /api/settings` — Update RAG pipeline settings.

---

## 4. Setup & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env`. AI Studio automatically injects `GEMINI_API_KEY`:
   ```bash
   GEMINI_API_KEY="your-gemini-api-key"
   PORT=3000
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`. Express handles all `/api/*` routes, and Vite handles client-side rendering.

4. **Build & Production**:
   ```bash
   npm run build
   npm run start
   ```
