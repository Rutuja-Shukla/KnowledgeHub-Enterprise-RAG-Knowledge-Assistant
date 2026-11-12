import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Award,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Info,
  Clock,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { EvaluationRun, EvaluationScenario, EvaluationMetricResult } from '../../types';

export const EvaluationCenterView: React.FC = () => {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [scenarios, setScenarios] = useState<EvaluationScenario[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [selectedScenarioResult, setSelectedScenarioResult] = useState<EvaluationMetricResult | null>(null);

  const fetchEvalData = async () => {
    try {
      setLoading(true);
      const [scenariosRes, runsRes] = await Promise.all([
        api.getEvaluationScenarios(),
        api.getEvaluationRuns(),
      ]);
      setScenarios(scenariosRes.scenarios);
      setRuns(runsRes.runs);
      if (runsRes.runs.length > 0 && !selectedRun) {
        setSelectedRun(runsRes.runs[0]);
      }
    } catch (err) {
      console.error('Failed to load evaluation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvalData();
  }, []);

  const handleRunBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const res = await api.runBenchmark();
      setRuns((prev) => [res.run, ...prev]);
      setSelectedRun(res.run);
    } catch (err) {
      alert(`Benchmark execution failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const activeRun = selectedRun || runs[0];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">RAG Evaluation Centre</h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized evaluation benchmark measuring retrieval accuracy (Recall@K, MRR) and generation faithfulness
            against synthetic golden test sets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEvalData}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRunBenchmark}
            disabled={runningBenchmark}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 shadow-xs transition-colors"
          >
            {runningBenchmark ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Evaluating Scenarios...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Run Benchmark Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Benchmark KPI Scorecard */}
      {activeRun ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Selected Benchmark Run:</span>
              <span className="font-mono font-semibold text-slate-900">{activeRun.id}</span>
              <span>·</span>
              <span>Executed on {new Date(activeRun.timestamp).toLocaleString()}</span>
            </div>

            {runs.length > 1 && (
              <select
                value={activeRun.id}
                onChange={(e) => {
                  const r = runs.find((item) => item.id === e.target.value);
                  if (r) setSelectedRun(r);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} ({new Date(r.timestamp).toLocaleDateString()}) - {r.passedScenarios}/{r.totalScenarios} Passed
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {/* Overall Score */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-blue-900 uppercase">Test Suite Pass Rate</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-900">
                  {Math.round((activeRun.passedScenarios / (activeRun.totalScenarios || 1)) * 100)}%
                </span>
                <span className="text-xs text-blue-700">
                  ({activeRun.passedScenarios}/{activeRun.totalScenarios})
                </span>
              </div>
            </div>

            {/* Recall@K */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Recall@K</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  {Math.round(activeRun.overallRecallAtK * 100)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Gold passages captured</span>
            </div>

            {/* Precision@K */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Precision@K</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  {Math.round(activeRun.overallPrecisionAtK * 100)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Relevant / retrieved</span>
            </div>

            {/* Mean Reciprocal Rank */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">MRR</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  {activeRun.meanReciprocalRank.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">First relevant rank</span>
            </div>

            {/* Faithfulness */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Faithfulness</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  {Math.round(activeRun.averageFaithfulness * 100)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Hallucination check</span>
            </div>

            {/* Citation Precision */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Citation Precision</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  {Math.round(activeRun.averageCitationPrecision * 100)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Verified sources</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
          No benchmark runs yet. Click &ldquo;Run Benchmark Suite&rdquo; above to execute the golden test suite.
        </div>
      )}

      {/* Scenario Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Golden Evaluation Scenarios (10 Standard Test Dimensions)
            </h3>
            <p className="text-[11px] text-slate-500">
              Covers factual lookups, cross-policy multi-doc synthesis, ambiguous queries, safe refusals, and injection defenses.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Scenario Category</th>
                <th className="py-3 px-4">Evaluation Question</th>
                <th className="py-3 px-4">Recall@K</th>
                <th className="py-3 px-4">Faithfulness</th>
                <th className="py-3 px-4">Citations</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Drilldown</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(activeRun?.results || []).map((res) => (
                <tr
                  key={res.scenarioId}
                  onClick={() => setSelectedScenarioResult(res)}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-700 capitalize">
                      {res.category.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-900 max-w-md truncate">
                    {res.question}
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {Math.round(res.retrievalRecall * 100)}%
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {Math.round(res.faithfulnessScore * 100)}%
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {Math.round(res.citationPrecision * 100)}%
                  </td>

                  <td className="py-3 px-4">
                    {res.passed ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                        <XCircle className="h-3 w-3" />
                        FAILED
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button className="text-xs font-semibold text-blue-700 hover:underline">
                      View Details &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario Drill-Down Inspection Modal */}
      {selectedScenarioResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-700">
                  {selectedScenarioResult.category.replace(/_/g, ' ')}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Scenario: {selectedScenarioResult.scenarioId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedScenarioResult(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="font-semibold text-slate-700">Question Tested:</span>
                <p className="font-medium text-slate-900 mt-0.5">{selectedScenarioResult.question}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded border border-slate-200 p-2">
                  <span className="text-[10px] text-slate-400">Recall@K</span>
                  <p className="font-mono font-bold text-slate-900 text-sm">
                    {Math.round(selectedScenarioResult.retrievalRecall * 100)}%
                  </p>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <span className="text-[10px] text-slate-400">MRR</span>
                  <p className="font-mono font-bold text-slate-900 text-sm">
                    {selectedScenarioResult.reciprocalRank.toFixed(2)}
                  </p>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <span className="text-[10px] text-slate-400">Faithfulness</span>
                  <p className="font-mono font-bold text-slate-900 text-sm">
                    {Math.round(selectedScenarioResult.faithfulnessScore * 100)}%
                  </p>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <span className="text-[10px] text-slate-400">Duration</span>
                  <p className="font-mono font-bold text-slate-900 text-sm">
                    {selectedScenarioResult.durationMs}ms
                  </p>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700">Actual Generated Answer:</span>
                <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3 leading-relaxed whitespace-pre-wrap text-slate-800">
                  {selectedScenarioResult.generatedAnswer}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedScenarioResult(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
