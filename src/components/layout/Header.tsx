import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Shield,
  Search,
  Check,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { User } from '../../types';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavigationTab;
  activeUser: User | null;
  users: User[];
  onSwitchUser: (userId: string) => void;
  geminiConfigured: boolean;
  onOpenGlobalSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeUser,
  users,
  onSwitchUser,
  geminiConfigured,
  onOpenGlobalSearch,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabLabels: Record<NavigationTab, string> = {
    overview: 'Executive Overview',
    chat: 'Ask KnowledgeHub (RAG Assistant)',
    documents: 'Knowledge Library & Documents',
    processing: 'Document Processing Monitoring',
    collections: 'Collections & RBAC',
    search: 'Search Explorer',
    analytics: 'Analytics & Quality Metrics',
    evaluations: 'RAG Evaluation Centre',
    users: 'User Management & Roles',
    audit: 'Enterprise Audit Logs',
    settings: 'RAG Pipeline Settings',
  };

  const getRoleBadge = (role: string) => {
    if (role === 'Administrator') {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (role === 'Knowledge Manager') {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500">KnowledgeHub</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-900">{tabLabels[currentTab]}</span>
      </div>

      {/* Right Controls: Quick Search + Gemini Status + User Switcher */}
      <div className="flex items-center gap-4">
        {/* Global Search Trigger */}
        <button
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800 transition-colors shadow-2xs"
        >
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <span>Search documents or knowledge...</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
            /
          </kbd>
        </button>

        {/* Gemini Status */}
        <div className="flex items-center gap-2 rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs">
          <Sparkles className={`h-3.5 w-3.5 ${geminiConfigured ? 'text-amber-500' : 'text-slate-400'}`} />
          <span className="text-[11px] font-medium text-slate-700">
            {geminiConfigured ? 'Gemini 3.8 Flash' : 'Deterministic RAG'}
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${geminiConfigured ? 'bg-emerald-500' : 'bg-blue-500'}`}
            title={geminiConfigured ? 'Live Gemini API Active' : 'Offline / Dense Fallback Active'}
          />
        </div>

        {/* User Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-1.5 pr-2.5 hover:bg-slate-50 transition-colors text-left"
          >
            {activeUser ? (
              <img
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-slate-200" />
            )}

            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-900 leading-tight">
                {activeUser?.name || 'Select User'}
              </span>
              <span className="text-[10px] text-slate-500 leading-none">
                {activeUser?.role || 'Guest'}
              </span>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </button>

          {/* User Selection Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in-50 zoom-in-95">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-900">Switch Role / User Persona</p>
                <p className="text-[11px] text-slate-500">
                  Simulate enterprise permissions across Administrator, Knowledge Manager, and Employee roles.
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto py-1 space-y-0.5">
                {users.map((u) => {
                  const isSelected = activeUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                        isSelected ? 'bg-blue-50/70 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-medium text-slate-900 truncate">{u.name}</span>
                          <span className="text-[10px] text-slate-500 truncate">{u.department}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-blue-700" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 p-2 text-[10px] text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-slate-500" />
                  RBAC Server Enforced
                </span>
                <span className="font-mono text-slate-500">10 Personas</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
