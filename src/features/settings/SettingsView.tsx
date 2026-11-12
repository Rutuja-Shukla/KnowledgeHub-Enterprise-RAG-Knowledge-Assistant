import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Sliders, Shield, Sparkles, RefreshCw, Key } from 'lucide-react';
import { api } from '../../services/api';
import { RagSettings, User } from '../../types';

interface SettingsViewProps {
  activeUser: User | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ activeUser }) => {
  const [settings, setSettings] = useState<RagSettings | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      setSettings(res.settings);
      setGeminiConfigured(res.geminiConfigured);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isAdmin = activeUser?.role === 'Administrator';

  if (loading || !settings) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">RAG Pipeline Architecture Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Tune chunking granularity, hybrid retrieval weighting, relevance thresholds, and strict grounding instructions.
        </p>
      </div>

      {/* AI Engine Status Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-blue-700" />
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Generation & Embedding Engine</h3>
              <p className="text-[11px] text-slate-500">Google Gemini & Local Dense Embedding System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                geminiConfigured
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  geminiConfigured ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
              />
              {geminiConfigured ? 'Gemini 3.8 Flash Online' : 'Local Dense Semantic Vector Engine'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {geminiConfigured
            ? 'Your server is connected to the Google Gemini API with GEMINI_API_KEY. Document questions are dynamically grounded and synthesized with strict verified citations.'
            : 'Using the high-accuracy deterministic 384-dimensional dense projection engine with true cosine similarity and verified source citation linking. To enable live Gemini LLM generation, set GEMINI_API_KEY in the AI Studio Secrets panel.'}
        </p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>RAG parameters successfully saved and synchronized across active retrieval pipelines.</span>
          </div>
        )}

        {/* Hyperparameters Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Retrieval & Chunking Hyperparameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top-K */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700">Top-K Passages</label>
                <span className="font-mono text-slate-500">{settings.topK} passages</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                disabled={!isAdmin}
                value={settings.topK}
                onChange={(e) => setSettings({ ...settings, topK: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-600"
              />
              <p className="text-[10px] text-slate-400">Maximum evidence passages assembled into context</p>
            </div>

            {/* Hybrid Alpha */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700">Hybrid Alpha Weight</label>
                <span className="font-mono text-slate-500">{settings.hybridAlpha.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                disabled={!isAdmin}
                value={settings.hybridAlpha}
                onChange={(e) => setSettings({ ...settings, hybridAlpha: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.0 (Pure BM25 Keyword)</span>
                <span>1.0 (Pure Semantic Vector)</span>
              </div>
            </div>

            {/* Chunk Size */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Chunk Size (Characters)</label>
              <input
                type="number"
                min="200"
                max="2000"
                step="50"
                disabled={!isAdmin}
                value={settings.chunkSize}
                onChange={(e) => setSettings({ ...settings, chunkSize: parseInt(e.target.value, 10) })}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            {/* Chunk Overlap */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Chunk Overlap (Characters)</label>
              <input
                type="number"
                min="20"
                max="300"
                step="10"
                disabled={!isAdmin}
                value={settings.chunkOverlap}
                onChange={(e) => setSettings({ ...settings, chunkOverlap: parseInt(e.target.value, 10) })}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            {/* Relevance Threshold */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-700">Minimum Relevance Threshold</label>
                <span className="font-mono text-slate-500">{settings.relevanceThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                disabled={!isAdmin}
                value={settings.relevanceThreshold}
                onChange={(e) => setSettings({ ...settings, relevanceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <p className="text-[10px] text-slate-400">Passages below this score are pruned before answer synthesis</p>
            </div>

            {/* Reranker Toggle */}
            <div className="space-y-1 flex flex-col justify-center">
              <label className="text-xs font-semibold text-slate-700">Reranking & Redundancy Pruning</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="rerankerCheck"
                  disabled={!isAdmin}
                  checked={settings.rerankerEnabled}
                  onChange={(e) => setSettings({ ...settings, rerankerEnabled: e.target.checked })}
                  className="h-4 w-4 rounded accent-blue-600"
                />
                <label htmlFor="rerankerCheck" className="text-xs text-slate-700 cursor-pointer">
                  Enable Reciprocal Rank Fusion & Section Title Boosting
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* System Prompt Customization */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Grounded System Prompt & Guardrails
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Strict Evidence Directive</span>
          </div>

          <textarea
            rows={6}
            disabled={!isAdmin}
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
          />
          <p className="text-[10px] text-slate-400">
            Controls citation formatting rules, refusal phrases, and defense against prompt injection in retrieved
            documents.
          </p>
        </div>

        {/* Save button */}
        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 shadow-xs transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving Parameters...' : 'Save Settings'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
