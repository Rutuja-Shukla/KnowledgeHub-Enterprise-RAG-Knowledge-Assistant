import { storage } from './storage';
import { DocumentRecord, DocumentChunk, ProcessingJob, ProcessingStatus } from './types';
import { generateEmbedding } from './gemini';

export class IngestionService {
  /**
   * Process a document through the complete 7-stage ingestion pipeline
   */
  public async ingestDocument(options: {
    id?: string;
    filename: string;
    title: string;
    fileType: 'pdf' | 'docx' | 'txt' | 'md' | 'csv';
    fileSize: number;
    collectionId: string;
    uploadedBy: string;
    accessClassification?: 'internal' | 'confidential' | 'restricted';
    rawContent: string;
  }): Promise<DocumentRecord> {
    const startTime = Date.now();
    const docId = options.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const store = storage.getStore();
    const collection = store.collections.find((c) => c.id === options.collectionId);

    if (!collection) {
      throw new Error(`Collection with ID "${options.collectionId}" does not exist.`);
    }

    const uploader = store.users.find((u) => u.id === options.uploadedBy) || store.users[0];

    // Stage 1: Validation
    this.validateUpload(options.filename, options.fileType, options.fileSize, options.rawContent);

    // Initial Document Record
    const docRecord: DocumentRecord = {
      id: docId,
      filename: options.filename,
      title: options.title || options.filename.replace(/\.[^/.]+$/, ''),
      fileType: options.fileType,
      fileSize: options.fileSize,
      uploadedBy: uploader.id,
      uploadedByName: uploader.name,
      collectionId: collection.id,
      collectionName: collection.name,
      accessClassification: options.accessClassification || 'internal',
      processingStatus: 'queued',
      processingDurationMs: 0,
      pageCount: 1,
      chunkCount: 0,
      embeddingStatus: 'pending',
      content: options.rawContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Initial Job Record
    const job: ProcessingJob = {
      id: `job-${docId}`,
      documentId: docId,
      documentTitle: docRecord.title,
      stage: 'queued',
      progressPercent: 10,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      retryCount: 0,
    };

    store.documents.unshift(docRecord);
    store.processingJobs.unshift(job);
    collection.documentCount += 1;
    storage.save();

    storage.addAuditEvent({
      userId: uploader.id,
      userName: uploader.name,
      userRole: uploader.role,
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'document',
      resourceId: docId,
      details: `Initiated ingestion of "${docRecord.title}" into ${collection.name}`,
      outcome: 'success',
    });

    try {
      // Stage 2: Extract Text & Structure into Pages
      this.updateJobStage(job, docRecord, 'extracting', 25);
      const structuredPages = this.extractAndStructurePages(options.rawContent, options.fileType);
      docRecord.pageCount = structuredPages.length;

      // Stage 3: Split into Chunks
      this.updateJobStage(job, docRecord, 'chunking', 50);
      const settings = store.settings;
      const chunksToCreate: DocumentChunk[] = [];
      let chunkCounter = 0;

      structuredPages.forEach((page, pIdx) => {
        page.sections.forEach((section) => {
          const splitTexts = this.chunkText(section.body, settings.chunkSize, settings.chunkOverlap);

          splitTexts.forEach((textChunk) => {
            chunkCounter++;
            const chunkId = `chk-${docId}-p${pIdx + 1}-${chunkCounter}`;
            const formattedContent = `[${docRecord.title} - Page ${pIdx + 1}: ${section.title}]\n${textChunk}`;

            chunksToCreate.push({
              id: chunkId,
              documentId: docId,
              documentTitle: docRecord.title,
              collectionId: collection.id,
              collectionName: collection.name,
              pageNumber: pIdx + 1,
              sectionTitle: section.title,
              content: formattedContent,
              tokenCount: Math.ceil(formattedContent.length / 4),
              embedding: [], // will be populated in embedding stage
              createdAt: new Date().toISOString(),
            });
          });
        });
      });

      // Stage 4: Generate Embeddings
      this.updateJobStage(job, docRecord, 'embedding', 75);
      for (const chunk of chunksToCreate) {
        chunk.embedding = await generateEmbedding(chunk.content);
      }

      // Stage 5: Store Chunks & Complete Indexing
      this.updateJobStage(job, docRecord, 'indexed', 100);
      docRecord.chunkCount = chunksToCreate.length;
      docRecord.embeddingStatus = 'completed';
      docRecord.processingDurationMs = Date.now() - startTime;
      job.completedAt = new Date().toISOString();
      job.durationMs = docRecord.processingDurationMs;

      // Append chunks to store
      store.chunks.push(...chunksToCreate);
      storage.save();

      return docRecord;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.updateJobStage(job, docRecord, 'failed', 100, errorMsg);
      docRecord.embeddingStatus = 'failed';
      docRecord.errorDetails = errorMsg;
      storage.save();

      storage.addAuditEvent({
        userId: uploader.id,
        userName: uploader.name,
        userRole: uploader.role,
        action: 'DOCUMENT_UPLOAD',
        resourceType: 'document',
        resourceId: docId,
        details: `Ingestion failed for "${docRecord.title}": ${errorMsg}`,
        outcome: 'failure',
      });

      throw err;
    }
  }

  /**
   * Reprocesses an existing or failed document
   */
  public async reprocessDocument(documentId: string, requestedBy: string): Promise<DocumentRecord> {
    const store = storage.getStore();
    const doc = store.documents.find((d) => d.id === documentId);
    if (!doc) {
      throw new Error(`Document with ID "${documentId}" not found`);
    }

    // Remove existing chunks
    store.chunks = store.chunks.filter((c) => c.documentId !== documentId);

    // Reset document
    doc.processingStatus = 'queued';
    doc.embeddingStatus = 'pending';
    doc.errorDetails = undefined;

    // Reset or update existing job
    let job = store.processingJobs.find((j) => j.documentId === documentId);
    if (!job) {
      job = {
        id: `job-${doc.id}-${Date.now()}`,
        documentId: doc.id,
        documentTitle: doc.title,
        stage: 'queued',
        progressPercent: 10,
        startedAt: new Date().toISOString(),
        durationMs: 0,
        retryCount: 1,
      };
      store.processingJobs.unshift(job);
    } else {
      job.stage = 'queued';
      job.progressPercent = 10;
      job.startedAt = new Date().toISOString();
      job.retryCount += 1;
      job.errorMessage = undefined;
    }

    const uploader = store.users.find((u) => u.id === requestedBy) || store.users[0];
    storage.addAuditEvent({
      userId: uploader.id,
      userName: uploader.name,
      userRole: uploader.role,
      action: 'DOCUMENT_REPROCESS',
      resourceType: 'document',
      resourceId: doc.id,
      details: `Reprocessing initiated for "${doc.title}" (Attempt ${job.retryCount})`,
      outcome: 'success',
    });

    storage.save();

    // Re-execute ingestion on existing content
    return this.ingestDocument({
      id: doc.id,
      filename: doc.filename,
      title: doc.title,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      collectionId: doc.collectionId,
      uploadedBy: requestedBy,
      accessClassification: doc.accessClassification,
      rawContent: doc.content,
    });
  }

  /**
   * Delete document and its associated chunks, jobs, and audits
   */
  public deleteDocument(documentId: string, requestedBy: string): void {
    const store = storage.getStore();
    const docIdx = store.documents.findIndex((d) => d.id === documentId);
    if (docIdx === -1) {
      throw new Error(`Document with ID "${documentId}" not found`);
    }

    const doc = store.documents[docIdx];
    const collection = store.collections.find((c) => c.id === doc.collectionId);
    if (collection && collection.documentCount > 0) {
      collection.documentCount -= 1;
    }

    // Delete chunks
    store.chunks = store.chunks.filter((c) => c.documentId !== documentId);

    // Delete document
    store.documents.splice(docIdx, 1);

    const uploader = store.users.find((u) => u.id === requestedBy) || store.users[0];
    storage.addAuditEvent({
      userId: uploader.id,
      userName: uploader.name,
      userRole: uploader.role,
      action: 'DOCUMENT_DELETE',
      resourceType: 'document',
      resourceId: documentId,
      details: `Permanently deleted document "${doc.title}" and its ${doc.chunkCount} vector chunks`,
      outcome: 'success',
    });

    storage.save();
  }

  // --- Pipeline helpers ---

  private validateUpload(
    filename: string,
    fileType: string,
    fileSize: number,
    content: string
  ): void {
    const allowedTypes = ['pdf', 'docx', 'txt', 'md', 'csv'];
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      throw new Error(`Unsupported file format: .${fileType}. Permitted formats: PDF, DOCX, TXT, MD, CSV.`);
    }

    if (fileSize > 25 * 1024 * 1024) {
      throw new Error('File exceeds the 25 MB enterprise upload limit.');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Uploaded document contains no readable text content.');
    }
  }

  private updateJobStage(
    job: ProcessingJob,
    doc: DocumentRecord,
    stage: ProcessingStatus,
    percent: number,
    error?: string
  ): void {
    job.stage = stage;
    job.progressPercent = percent;
    doc.processingStatus = stage;
    if (error) {
      job.errorMessage = error;
      doc.errorDetails = error;
    }
    storage.save();
  }

  private extractAndStructurePages(
    rawText: string,
    fileType: string
  ): { pageNumber: number; sections: { title: string; body: string }[] }[] {
    // If text has page breaks e.g. "--- Page X ---" or form feed \f
    const pagesRaw = rawText.split(/\f|\n---+\s*Page\s+\d+\s*---+/i);
    const pages = pagesRaw.length > 0 ? pagesRaw : [rawText];

    return pages.map((pageContent, idx) => {
      // Split into sections based on Markdown headers # or double newlines
      const sectionBlocks = pageContent.split(/\n(?=#{1,4}\s+|\b[A-Z0-9\s]{4,30}:)/);
      const sections = sectionBlocks
        .map((blk) => {
          const lines = blk.trim().split('\n');
          let title = `Section ${idx + 1}.${sectionsLengthFallback(lines[0])}`;
          let body = blk.trim();

          if (lines[0].startsWith('#')) {
            title = lines[0].replace(/^#+\s*/, '').trim();
            body = lines.slice(1).join('\n').trim();
          } else if (lines[0].includes(':') && lines[0].length < 60) {
            const parts = lines[0].split(':');
            title = parts[0].trim();
            body = lines.join('\n').trim();
          }

          return { title, body: body || title };
        })
        .filter((s) => s.body.length > 0);

      return {
        pageNumber: idx + 1,
        sections: sections.length > 0 ? sections : [{ title: `Page ${idx + 1} Content`, body: pageContent.trim() }],
      };
    });
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      if (end >= text.length) {
        chunks.push(text.substring(start).trim());
        break;
      }

      // Try to break at a sentence boundary or newline
      const lastPeriod = text.lastIndexOf('. ', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod + 1, lastNewline);

      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint;
      }

      chunks.push(text.substring(start, end).trim());
      start = end - overlap;
    }

    return chunks.filter((c) => c.length > 0);
  }
}

function sectionsLengthFallback(firstLine: string): string {
  const clean = firstLine.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  return clean.substring(0, 15) || 'Overview';
}

export const ingestionService = new IngestionService();
