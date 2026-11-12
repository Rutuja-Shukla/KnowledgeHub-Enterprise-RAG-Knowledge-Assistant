import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Layers,
  FileText,
  ExternalLink,
  Shield,
  Zap,
  Info,
  ChevronDown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { RetrievalResult, SearchInspectionDetails, KnowledgeCollection, DocumentRecord, DocumentChunk } from '../../types';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';

interface SearchExplorerViewProps {
  collections: KnowledgeCollection[];
}

export const SearchExplorerView: React.FC<SearchExplorerViewProps> = ({ collections }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [threshold, setThreshold] = useState(0.2);
  const [limit, setLimit] = useState(10);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [inspection, setInspection] = useState<SearchInspectionDetails | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewChunks, setPreviewChunks] = useState<DocumentChunk[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewSection, setPreviewSection] = useState<string | undefined>();
  const [previewPage, setPreviewPage] = useState<number | undefined>();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await api.search({
        query: query.trim(),
        mode,
        collectionIds: selectedCollection !== 'all' ? [selectedCollection] : undefined,
        limit,
        threshold,
      });
      setResults(res.results);
      setInspection(res.inspection);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const openDocumentPreview = async (chunk: RetrievalResult['chunk']) => {
    try {
      const res = await api.getDocumentDetails(chunk.documentId);
      setPreviewDoc(res.document);
      setPreviewChunks(res.chunks);
      setPreviewSection(chunk.sectionTitle);
      setPreviewPage(chunk.pageNumber);
      setPreviewModalOpen(true);
    } catch (err) {
      console.error('Failed to open document preview:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Search Explorer</h1>
        <p className="text-xs text-slate-500 mt-1">
          Inspect vector embeddings, semantic relevance distances, and BM25 keyword matching across knowledge chunks
          without LLM answer generation.
        </p>
      </div>

      {/* Search Bar & Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query e.g. 'dual signoff requirements for database access'..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>Execute Search</span>
          </button>
        </form>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs text-slate-600">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Mode:</span>
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setMode('hybrid')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mode === 'hybrid' ? 'bg-white text-blue-700 font-semibold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Hybrid (Vector + BM25)
              </button>
              <button
                type="button"
                onClick={() => setMode('semantic')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mode === 'semantic' ? 'bg-white text-blue-700 font-semibold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Semantic Vector Only
              </button>
              <button
                type="button"
                onClick={() => setMode('keyword')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mode === 'keyword' ? 'bg-white text-blue-700 font-semibold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Exact Keyword
              </button>
            </div>
          </div>

          {/* Collection Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Collection:</span>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
            >
              <option value="all">All Accessible Domains</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Threshold slider */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Threshold:</span>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <span className="font-mono text-[11px] text-slate-500 w-8">{threshold.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Admin Retrieval Inspection Details Panel */}
      {inspection && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-blue-700" />
              Retrieval Diagnostic Telemetry
            </span>
            <span className="text-[11px] font-mono text-blue-800">
              Latency: {inspection.retrievalDurationMs}ms · Mode: {inspection.mode.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-500">Extracted Keywords:</span>
              <p className="font-mono text-slate-800 truncate">
                {inspection.extractedKeywords.join(', ') || 'None'}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Candidate Chunks:</span>
              <p className="font-mono text-slate-800">{inspection.totalCandidateChunks} chunks</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Filtered Returns:</span>
              <p className="font-mono text-slate-800">{inspection.returnedResultsCount} matches</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Access Scope:</span>
              <p className="font-mono text-slate-800 truncate">
                {inspection.appliedFilters.permittedCollections.length} collections
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {isSearching ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-700" />
            <p className="text-xs font-medium">Scanning multi-dimensional vector index and calculating cosine similarity...</p>
          </div>
        ) : results.length > 0 ? (
          results.map((res, index) => {
            const chunk = res.chunk;
            return (
              <div
                key={chunk.id}
                onClick={() => openDocumentPreview(chunk)}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
              >
                {/* Header line */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[11px] font-bold text-slate-700 font-mono">
                      #{index + 1}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {chunk.documentTitle}
                    </h3>
                    <span className="rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      Page {chunk.pageNumber} · {chunk.sectionTitle}
                    </span>
                  </div>

                  {/* Score Badges */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-500 text-[11px]">
                      Vector: <strong>{(res.vectorScore * 100).toFixed(1)}%</strong>
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Keyword: <strong>{(res.keywordScore * 100).toFixed(1)}%</strong>
                    </span>
                    <span className="rounded bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 text-[11px] border border-emerald-200">
                      Composite: {(res.rerankScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Excerpt */}
                <p className="text-xs text-slate-700 leading-relaxed font-sans line-clamp-3">
                  {chunk.content.replace(/^\[.*?\]\n/, '')}
                </p>

                {/* Footer metadata */}
                <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-2 text-[11px] text-slate-400">
                  <span>
                    Collection: <strong>{chunk.collectionName}</strong> · Chunk ID: {chunk.id}
                  </span>
                  <span className="text-blue-700 font-medium group-hover:underline flex items-center gap-1">
                    <span>Inspect In Document</span>
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        ) : hasSearched ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-500">
            No document chunks met the current similarity threshold ({threshold.toFixed(2)}). Try lowering the
            threshold or adjusting the search query.
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400">
            Enter a query above to test similarity scoring across the enterprise knowledge base.
          </div>
        )}
      </div>

      {/* Document Detail Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        document={previewDoc}
        chunks={previewChunks}
        highlightSectionTitle={previewSection}
        highlightPageNumber={previewPage}
      />
    </div>
  );
};
