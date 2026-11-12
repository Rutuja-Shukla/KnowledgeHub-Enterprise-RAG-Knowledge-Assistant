import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Cpu,
  FolderTree,
  Search,
  BarChart3,
  CheckCircle2,
  Users,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';

export type NavigationTab =
  | 'overview'
  | 'chat'
  | 'documents'
  | 'processing'
  | 'collections'
  | 'search'
  | 'analytics'
  | 'evaluations'
  | 'users'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  documentCount?: number;
  collectionCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  documentCount = 30,
  collectionCount = 6,
}) => {
  const navItems = [
    { id: 'overview' as NavigationTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'chat' as NavigationTab, label: 'Ask KnowledgeHub', icon: MessageSquare, badge: 'RAG' },
    { id: 'documents' as NavigationTab, label: 'Knowledge Library', icon: BookOpen, count: documentCount },
    { id: 'processing' as NavigationTab, label: 'Document Processing', icon: Cpu },
    { id: 'collections' as NavigationTab, label: 'Collections', icon: FolderTree, count: collectionCount },
    { id: 'search' as NavigationTab, label: 'Search Explorer', icon: Search },
    { id: 'analytics' as NavigationTab, label: 'Analytics', icon: BarChart3 },
    { id: 'evaluations' as NavigationTab, label: 'Evaluation Centre', icon: CheckCircle2 },
    { id: 'users' as NavigationTab, label: 'User Management', icon: Users },
    { id: 'audit' as NavigationTab, label: 'Audit Logs', icon: ShieldAlert },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-200 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white shadow-xs">
            <Database className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold tracking-tight text-slate-900">KnowledgeHub</span>
              <span className="text-[11px] font-medium text-slate-500">Enterprise RAG Assistant</span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
                }`}
              />

              {!collapsed && (
                <div className="flex flex-1 items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && !item.badge && (
                    <span className="text-[11px] font-mono text-slate-500">
                      {item.count}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Indicator */}
      <div className="border-t border-slate-200 p-3">
        {!collapsed ? (
          <div className="rounded-md border border-slate-200/80 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>RAG Engine Online</span>
              </span>
              <span className="font-mono text-slate-500">v3.2</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">Grounded evidence retrieval & verification</p>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="RAG Engine Online" />
          </div>
        )}
      </div>
    </aside>
  );
};
