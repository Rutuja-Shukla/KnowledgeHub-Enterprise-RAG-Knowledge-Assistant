import React, { useState } from 'react';
import { FolderTree, Plus, Shield, Users, FileText, Trash2, CheckCircle2, Lock, X } from 'lucide-react';
import { KnowledgeCollection, User, UserRole } from '../../types';
import { api } from '../../services/api';

interface CollectionsViewProps {
  collections: KnowledgeCollection[];
  activeUser: User | null;
  onRefreshCollections: () => void;
  onNavigateToDocs: (collectionId: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  activeUser,
  onRefreshCollections,
  onNavigateToDocs,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([
    'Administrator',
    'Knowledge Manager',
    'Employee',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = activeUser?.role !== 'Employee';
  const isAdmin = activeUser?.role === 'Administrator';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createCollection({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        department,
        accessRoles: selectedRoles,
      });
      onRefreshCollections();
      setModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
    } catch (err) {
      alert(`Failed to create collection: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete collection "${name}" and all its documents?`)) {
      return;
    }
    try {
      await api.deleteCollection(id);
      onRefreshCollections();
    } catch (err) {
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const toggleRole = (role: UserRole) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Collections & Knowledge Domains</h1>
          <p className="text-xs text-slate-500 mt-1">
            Segmented organizational knowledge domains with server-enforced role-based access control (RBAC).
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Collection</span>
          </button>
        )}
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {collections.map((col) => {
          const isAccessible = col.isAccessible !== false;
          return (
            <div
              key={col.id}
              className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${
                isAccessible
                  ? 'border-slate-200 bg-white shadow-2xs hover:border-blue-300'
                  : 'border-slate-200 bg-slate-50 opacity-80'
              }`}
            >
              <div>
                {/* Top badge bar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-700 font-mono">
                      {col.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase">{col.department}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAccessible ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="h-3 w-3" />
                        Accessible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        <Lock className="h-3 w-3" />
                        Restricted
                      </span>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(col.id, col.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete collection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{col.name}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">{col.description}</p>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span>{col.documentCount} Documents</span>
                  </span>
                  <span>Owner: {col.ownerName}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500">
                      Roles: {col.accessRoles.join(', ')}
                    </span>
                  </div>

                  {isAccessible && (
                    <button
                      onClick={() => onNavigateToDocs(col.id)}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Browse Files &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Collection Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Create Knowledge Collection</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Collection Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal & Contracts Archive"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Domain Code (2-5 chars)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. LEG"
                    maxLength={5}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 uppercase font-mono focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Legal & Compliance"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope and purpose of this knowledge domain..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* RBAC Role Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Permitted Access Roles (RBAC)</label>
                <div className="flex gap-2">
                  {(['Administrator', 'Knowledge Manager', 'Employee'] as UserRole[]).map((r) => {
                    const isChecked = selectedRoles.includes(r);
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => toggleRole(r)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 shadow-xs"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
