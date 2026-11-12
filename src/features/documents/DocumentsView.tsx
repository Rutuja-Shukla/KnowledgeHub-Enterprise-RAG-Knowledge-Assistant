import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { DocumentRecord, DocumentChunk, KnowledgeCollection, User } from '../../types';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { UploadDocumentModal } from '../../components/common/UploadDocumentModal';

interface DocumentsViewProps {
  collections: KnowledgeCollection[];
  activeUser: User | null;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ collections, activeUser }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewChunks, setPreviewChunks] = useState<DocumentChunk[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Reprocessing state tracking
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.getDocuments({
        collectionId: selectedCollection !== 'all' ? selectedCollection : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        fileType: selectedFileType !== 'all' ? selectedFileType : undefined,
        search: searchQuery.trim() || undefined,
      });
      setDocuments(res.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCollection, selectedStatus, selectedFileType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const openPreview = async (doc: DocumentRecord) => {
    try {
      const res = await api.getDocumentDetails(doc.id);
      setPreviewDoc(res.document);
      setPreviewChunks(res.chunks);
      setPreviewModalOpen(true);
    } catch (err) {
      console.error('Failed to load doc preview:', err);
    }
  };

  const handleReprocess = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReprocessingId(docId);
    try {
      await api.reprocessDocument(docId);
      await fetchDocuments();
    } catch (err) {
      alert(`Reprocessing failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDelete = async (docId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete "${title}" and remove its vector embeddings?`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'title') comp = a.title.localeCompare(b.title);
    else if (sortBy === 'size') comp = a.fileSize - b.fileSize;
    else comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortOrder === 'desc' ? -comp : comp;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canManageDocs = activeUser?.role !== 'Employee';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Knowledge Library</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise document repository with automated text extraction, semantic chunking, and vector indexing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManageDocs ? (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Document</span>
            </button>
          ) : (
            <div className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
              Read-Only Access (Role: {activeUser?.role})
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title, filename, or content..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Collection Filter */}
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Collections</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name} ({col.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="indexed">Indexed (Ready)</option>
            <option value="chunking">Chunking</option>
            <option value="embedding">Embedding</option>
            <option value="failed">Failed</option>
          </select>

          {/* Format Filter */}
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Formats</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="txt">Plain Text</option>
            <option value="md">Markdown</option>
            <option value="csv">CSV</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="date">Sort: Upload Date</option>
            <option value="title">Sort: Title</option>
            <option value="size">Sort: File Size</option>
          </select>
        </div>
      </div>

      {/* High-Density Document Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Document Title & Filename</th>
                <th className="py-3 px-4">Collection</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Pages / Chunks</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-700" />
                    Loading documents...
                  </td>
                </tr>
              ) : sortedDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching documents found in knowledge base.
                  </td>
                </tr>
              ) : (
                sortedDocuments.map((doc) => {
                  const isReprocessing = reprocessingId === doc.id;
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => openPreview(doc)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      {/* Title & Format */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col truncate max-w-xs">
                            <span className="font-semibold text-slate-900 truncate">{doc.title}</span>
                            <span className="text-[11px] text-slate-400 font-mono truncate">{doc.filename}</span>
                          </div>
                        </div>
                      </td>

                      {/* Collection */}
                      <td className="py-3 px-4">
                        <span className="rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          {doc.collectionName}
                        </span>
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-700 font-medium">{doc.accessClassification}</span>
                      </td>

                      {/* Processing Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            doc.processingStatus === 'indexed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : doc.processingStatus === 'failed'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              doc.processingStatus === 'indexed'
                                ? 'bg-emerald-500'
                                : doc.processingStatus === 'failed'
                                ? 'bg-rose-500'
                                : 'bg-blue-500 animate-pulse'
                            }`}
                          />
                          <span className="capitalize">{doc.processingStatus}</span>
                        </span>
                      </td>

                      {/* Pages / Chunks */}
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        <span>{doc.pageCount} pgs</span>
                        <span className="text-slate-300 mx-1.5">/</span>
                        <span>{doc.chunkCount} chunks</span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatFileSize(doc.fileSize)}
                      </td>

                      {/* Upload Date */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openPreview(doc)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Preview Chunks & Content"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>

                          {canManageDocs && (
                            <>
                              <button
                                onClick={(e) => handleReprocess(doc.id, e)}
                                disabled={isReprocessing}
                                className="p-1.5 rounded-md text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                title="Reprocess Pipeline"
                              >
                                <RotateCw
                                  className={`h-3.5 w-3.5 ${isReprocessing ? 'animate-spin text-blue-700' : ''}`}
                                />
                              </button>

                              <button
                                onClick={(e) => handleDelete(doc.id, doc.title, e)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
          <span>Showing {sortedDocuments.length} enterprise documents</span>
          <span className="font-mono text-[11px]">AES-256 Encrypted & Vector Indexed</span>
        </div>
      </div>

      {/* Document Detail Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        document={previewDoc}
        chunks={previewChunks}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        collections={collections}
        onUploadSuccess={fetchDocuments}
      />
    </div>
  );
};
