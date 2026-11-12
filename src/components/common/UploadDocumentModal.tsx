import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { KnowledgeCollection } from '../../types';
import { api } from '../../services/api';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: KnowledgeCollection[];
  onUploadSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  collections,
  onUploadSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [filename, setFilename] = useState('');
  const [collectionId, setCollectionId] = useState(collections[0]?.id || '');
  const [accessClassification, setAccessClassification] = useState<'internal' | 'confidential' | 'restricted'>('internal');
  const [content, setContent] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'txt' | 'md' | 'csv'>('pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    const ext = file.name.split('.').pop()?.toLowerCase() as any;
    if (['pdf', 'docx', 'txt', 'md', 'csv'].includes(ext)) {
      setFileType(ext);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }
    if (!collectionId) {
      setError('Please select a target knowledge collection.');
      return;
    }
    if (!content.trim()) {
      setError('Document content cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.uploadDocument({
        title: title.trim(),
        filename: filename || `${title.toLowerCase().replace(/\s+/g, '_')}.${fileType}`,
        collectionId,
        accessClassification,
        content: content.trim(),
        fileType,
      });

      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="flex flex-col w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Upload Knowledge Document</h3>
              <p className="text-xs text-slate-500">
                Trigger text extraction, chunking, embedding generation, and vector indexing.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 hover:bg-slate-50 transition-colors text-center">
            <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-700">
              Click to select a document file, or drag and drop here
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Supports PDF, DOCX, TXT, Markdown, CSV (up to 25 MB)</p>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>

          {/* Document Title & File Type */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Enterprise Security Playbook"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Format</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="txt">Plain Text (.txt)</option>
                <option value="md">Markdown (.md)</option>
                <option value="csv">CSV Data</option>
              </select>
            </div>
          </div>

          {/* Collection & Classification */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Knowledge Collection</label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Access Classification</label>
              <select
                value={accessClassification}
                onChange={(e) => setAccessClassification(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="internal">Internal (All Employees)</option>
                <option value="confidential">Confidential (Dept Managers)</option>
                <option value="restricted">Restricted (Audit & SecOps Only)</option>
              </select>
            </div>
          </div>

          {/* Content Textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Document Body Content</label>
              <span className="text-[11px] text-slate-400 font-mono">{content.length} chars</span>
            </div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste document text or markdown with headings (# Section Header) to automatically preserve section hierarchy during chunking..."
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors disabled:opacity-60 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing Pipeline...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload & Index Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
