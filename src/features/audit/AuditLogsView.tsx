import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Filter, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { AuditEvent } from '../../types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        outcome: outcomeFilter !== 'all' ? outcomeFilter : undefined,
      });
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, outcomeFilter]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Enterprise Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable audit trail recording all user logins, document ingestion, query executions, role changes, and
            benchmark evaluations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold">Filters:</span>
        </div>

        {/* Action Type */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
        >
          <option value="all">All Action Events</option>
          <option value="KNOWLEDGE_QUERY">Knowledge Queries</option>
          <option value="DOCUMENT_UPLOAD">Document Uploads</option>
          <option value="DOCUMENT_REPROCESS">Reprocessing</option>
          <option value="DOCUMENT_DELETE">Deletions</option>
          <option value="COLLECTION_CREATE">Collection Creations</option>
          <option value="AUTH_SWITCH_ROLE">Role & Session Switches</option>
          <option value="EVALUATION_RUN">Benchmark Runs</option>
          <option value="SETTINGS_UPDATE">Settings Updates</option>
        </select>

        {/* Outcome */}
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
        >
          <option value="all">All Outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="denied">Security Denied</option>
        </select>

        <span className="ml-auto text-xs text-slate-500 font-mono">
          Showing {logs.length} logged events
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">Outcome</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>

                  <td className="py-3 px-4 font-sans whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{log.userName}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">{log.userRole}</span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-800">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                      {log.action}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-sans text-slate-700 max-w-md truncate">
                    {log.details}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        log.outcome === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : log.outcome === 'denied'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {log.outcome === 'success' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : log.outcome === 'denied' ? (
                        <ShieldAlert className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      <span>{log.outcome}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
