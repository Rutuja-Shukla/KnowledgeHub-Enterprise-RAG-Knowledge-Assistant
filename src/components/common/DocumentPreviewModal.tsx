import React from 'react';
import { X, FileText, CheckCircle, Shield, Calendar, Layers, Hash } from 'lucide-react';
import { DocumentRecord, DocumentChunk } from '../../types';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  chunks: DocumentChunk[];
  highlightSectionTitle?: string;
  highlightPageNumber?: number;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  chunks,
  highlightSectionTitle,
  highlightPageNumber,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="flex flex-col h-[85vh] w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3 truncate">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{document.title}</h3>
                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-700">
                  {document.fileType}
                </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                  {document.collectionName}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">{document.filename}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document Metadata Bar */}
        <div className="flex flex-wrap items-center gap-6 border-b border-slate-200 px-6 py-2.5 bg-white text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span>Classification:</span>
            <span className="font-semibold capitalize text-slate-800">{document.accessClassification}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span>Pages:</span>
            <span className="font-semibold text-slate-800">{document.pageCount}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <span>Vector Chunks:</span>
            <span className="font-semibold text-slate-800">{document.chunkCount || chunks.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Indexed:</span>
            <span className="font-semibold text-slate-800">
              {new Date(document.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Searchable in Vector Store</span>
          </div>
        </div>

        {/* Body Content - Chunks / Pages Viewer */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          {highlightSectionTitle && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-center justify-between">
              <span>
                Navigated from cited passage: <strong>{highlightSectionTitle}</strong>
                {highlightPageNumber ? ` (Page ${highlightPageNumber})` : ''}
              </span>
              <span className="text-[11px] font-medium text-amber-700">Verified Evidence Grounding</span>
            </div>
          )}

          {chunks.length > 0 ? (
            chunks.map((chunk, idx) => {
              const isTarget =
                (highlightSectionTitle &&
                  chunk.sectionTitle.toLowerCase().includes(highlightSectionTitle.toLowerCase())) ||
                (highlightPageNumber && chunk.pageNumber === highlightPageNumber);

              return (
                <div
                  key={chunk.id || idx}
                  className={`rounded-xl border p-4 transition-all ${
                    isTarget
                      ? 'border-blue-400 bg-blue-50/50 shadow-sm ring-1 ring-blue-300'
                      : 'border-slate-200 bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        Page {chunk.pageNumber}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900">{chunk.sectionTitle}</h4>
                      {isTarget && (
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Cited Section
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Chunk ID: {chunk.id} ({chunk.tokenCount} tokens)
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {chunk.content.replace(/^\[.*?\]\n/, '')}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-xs font-semibold text-slate-900 mb-2">Document Raw Content</h4>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {document.content}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
          <span className="text-xs text-slate-500">
            Uploaded by {document.uploadedByName || 'Administrator'} · All chunks encrypted with AES-256
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};
