import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { ProcessingJob } from '../../types';

export const ProcessingView: React.FC = () => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.getProcessingJobs();
      setJobs(res.jobs);
    } catch (err) {
      console.error('Failed to load processing jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await api.retryProcessingJob(jobId);
      await fetchJobs();
    } catch (err) {
      alert(`Retry failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRetryingJobId(null);
    }
  };

  const completedJobs = jobs.filter((j) => j.stage === 'indexed').length;
  const failedJobs = jobs.filter((j) => j.stage === 'failed').length;
  const activeJobs = jobs.filter((j) => j.stage !== 'indexed' && j.stage !== 'failed').length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Document Processing Pipeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline monitoring across text extraction, syntactic cleaning, chunking, and vector embedding.
          </p>
        </div>

        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Successfully Indexed Jobs</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{completedJobs}</span>
            <span className="text-[11px] text-emerald-600 font-medium">Ready for search</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Ingestion Jobs</span>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeJobs}</span>
            <span className="text-[11px] text-blue-600 font-medium">Processing stages</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Failed Ingestion Jobs</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{failedJobs}</span>
            <span className="text-[11px] text-slate-500">Requires manual retry</span>
          </div>
        </div>
      </div>

      {/* Ingestion Pipeline Stages Diagram */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
          Ingestion Architecture Workflow
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-mono font-semibold text-slate-400">STAGE 1</span>
            <p className="font-semibold text-slate-900 mt-1">Upload & Validate</p>
            <p className="text-[10px] text-slate-500 mt-0.5">MIME & 25MB check</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-mono font-semibold text-slate-400">STAGE 2</span>
            <p className="font-semibold text-slate-900 mt-1">Text Extraction</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Parse pages & layout</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-mono font-semibold text-slate-400">STAGE 3</span>
            <p className="font-semibold text-slate-900 mt-1">Structure & Clean</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Extract section headers</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-mono font-semibold text-slate-400">STAGE 4</span>
            <p className="font-semibold text-slate-900 mt-1">Semantic Chunking</p>
            <p className="text-[10px] text-slate-500 mt-0.5">500 chars / 80 overlap</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-mono font-semibold text-slate-400">STAGE 5</span>
            <p className="font-semibold text-slate-900 mt-1">Dense Embeddings</p>
            <p className="text-[10px] text-slate-500 mt-0.5">384-dim vector projection</p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
            <span className="text-[10px] font-mono font-semibold text-blue-700">STAGE 6</span>
            <p className="font-semibold text-blue-900 mt-1">Vector Indexing</p>
            <p className="text-[10px] text-blue-700 mt-0.5">Searchable in RAG</p>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Pipeline Jobs Log ({jobs.length} jobs)
          </h3>
          <span className="text-[11px] text-slate-500">Idempotent processing with deduplication safeguard</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Retries</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const isRetrying = retryingJobId === job.id;
                return (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {job.documentTitle}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          job.stage === 'indexed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : job.stage === 'failed'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        <span className="capitalize">{job.stage}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 max-w-[140px]">
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              job.stage === 'indexed'
                                ? 'bg-emerald-500'
                                : job.stage === 'failed'
                                ? 'bg-rose-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${job.progressPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">{job.progressPercent}%</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {job.durationMs > 0 ? `${job.durationMs}ms` : 'In progress'}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{job.retryCount}</td>

                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      {new Date(job.startedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {job.stage === 'failed' ? (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={isRetrying}
                          className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors ml-auto"
                        >
                          <RotateCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                          <span>Retry Job</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
