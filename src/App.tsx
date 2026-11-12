/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './features/overview/OverviewView';
import { ChatView } from './features/chat/ChatView';
import { DocumentsView } from './features/documents/DocumentsView';
import { ProcessingView } from './features/processing/ProcessingView';
import { CollectionsView } from './features/collections/CollectionsView';
import { SearchExplorerView } from './features/search/SearchExplorerView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { EvaluationCenterView } from './features/evaluations/EvaluationCenterView';
import { UserManagementView } from './features/users/UserManagementView';
import { AuditLogsView } from './features/audit/AuditLogsView';
import { SettingsView } from './features/settings/SettingsView';
import { api } from './services/api';
import { User, KnowledgeCollection } from './types';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial session, users, and collections
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [authRes, usersRes, colRes] = await Promise.all([
        api.getAuthMe(),
        api.getUsers(),
        api.getCollections(),
      ]);

      setActiveUser(authRes.user);
      setGeminiConfigured(authRes.geminiConfigured);
      setUsers(usersRes.users);
      setCollections(colRes.collections);
    } catch (err) {
      console.error('Failed to initialize applet session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Global keyboard shortcut: press '/' to open Search Explorer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        setCurrentTab('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setActiveUser(res.user);
      // Refresh collections to recalculate accessibility for new user
      const colRes = await api.getCollections();
      setCollections(colRes.collections);
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const handleRefreshCollections = async () => {
    try {
      const colRes = await api.getCollections();
      setCollections(colRes.collections);
    } catch (err) {
      console.error('Failed to refresh collections:', err);
    }
  };

  const handleRefreshUsers = async () => {
    try {
      const usersRes = await api.getUsers();
      setUsers(usersRes.users);
    } catch (err) {
      console.error('Failed to refresh users:', err);
    }
  };

  if (loading && !activeUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-tight">Initializing KnowledgeHub...</span>
          <span className="text-xs text-slate-500">Connecting to enterprise vector index & permissions</span>
        </div>
      </div>
    );
  }

  const totalDocsCount = collections.reduce((acc, c) => acc + (c.documentCount || 0), 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        documentCount={totalDocsCount}
        collectionCount={collections.length}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          activeUser={activeUser}
          users={users}
          onSwitchUser={handleSwitchUser}
          geminiConfigured={geminiConfigured}
          onOpenGlobalSearch={() => setCurrentTab('search')}
        />

        {/* View Routing */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && (
            <OverviewView
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'chat' && (
            <ChatView collections={collections} />
          )}

          {currentTab === 'documents' && (
            <DocumentsView
              collections={collections}
              activeUser={activeUser}
            />
          )}

          {currentTab === 'processing' && (
            <ProcessingView />
          )}

          {currentTab === 'collections' && (
            <CollectionsView
              collections={collections}
              activeUser={activeUser}
              onRefreshCollections={handleRefreshCollections}
              onNavigateToDocs={(colId) => {
                setCurrentTab('documents');
              }}
            />
          )}

          {currentTab === 'search' && (
            <SearchExplorerView collections={collections} />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView />
          )}

          {currentTab === 'evaluations' && (
            <EvaluationCenterView />
          )}

          {currentTab === 'users' && (
            <UserManagementView
              users={users}
              activeUser={activeUser}
              collections={collections}
              onRefreshUsers={handleRefreshUsers}
              onSwitchUser={handleSwitchUser}
            />
          )}

          {currentTab === 'audit' && (
            <AuditLogsView />
          )}

          {currentTab === 'settings' && (
            <SettingsView activeUser={activeUser} />
          )}
        </main>
      </div>
    </div>
  );
}
