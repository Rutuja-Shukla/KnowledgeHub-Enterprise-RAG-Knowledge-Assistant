import React, { useState } from 'react';
import { Users, Shield, Check, Edit2, AlertCircle, Key } from 'lucide-react';
import { User, UserRole, KnowledgeCollection } from '../../types';
import { api } from '../../services/api';

interface UserManagementViewProps {
  users: User[];
  activeUser: User | null;
  collections: KnowledgeCollection[];
  onRefreshUsers: () => void;
  onSwitchUser: (userId: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  activeUser,
  collections,
  onRefreshUsers,
  onSwitchUser,
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>('Employee');
  const [editingPermittedCols, setEditingPermittedCols] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
    setEditingPermittedCols(user.permittedCollectionIds || collections.map((c) => c.id));
  };

  const handleSaveRole = async () => {
    if (!editingUserId) return;
    setIsSaving(true);
    try {
      await api.updateUserRole(editingUserId, editingRole, editingPermittedCols);
      onRefreshUsers();
      setEditingUserId(null);
    } catch (err) {
      alert(`Failed to update user role: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCollectionPermission = (colId: string) => {
    setEditingPermittedCols((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const roleBadges: Record<UserRole, string> = {
    Administrator: 'bg-purple-100 text-purple-700 border-purple-200',
    'Knowledge Manager': 'bg-blue-100 text-blue-700 border-blue-200',
    Employee: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">User Management & Access Control</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure Role-Based Access Control (RBAC), collection permissions, and switch employee personas to verify
          cross-department isolation.
        </p>
      </div>

      {/* RBAC Info Card */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-semibold">Server-Enforced Access Isolation</p>
          <p className="text-blue-800 leading-relaxed">
            Permissions are filtered on the backend prior to vector similarity retrieval. An employee cannot retrieve
            information from a collection their role is barred from, even if prompt injection is attempted.
          </p>
        </div>
      </div>

      {/* User Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Employee Directory ({users.length} Synthetic Personas)
          </h3>
          <span className="text-[11px] text-slate-500">Click &ldquo;Switch Persona&rdquo; to test permissions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Accessible Collections</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrent = activeUser?.id === u.id;
                const isEditing = editingUserId === u.id;

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${isCurrent ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'}`}
                  >
                    {/* User info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{u.name}</span>
                            {isCurrent && (
                              <span className="rounded bg-blue-600 text-white px-1.5 py-0.2 text-[9px] font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 text-slate-700 font-medium">{u.department}</td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as UserRole)}
                          className="rounded border border-slate-300 p-1 text-xs text-slate-900"
                        >
                          <option value="Administrator">Administrator</option>
                          <option value="Knowledge Manager">Knowledge Manager</option>
                          <option value="Employee">Employee</option>
                        </select>
                      ) : (
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${roleBadges[u.role]}`}>
                          {u.role}
                        </span>
                      )}
                    </td>

                    {/* Collection Scope */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {collections.map((c) => {
                            const isAllowed = editingPermittedCols.includes(c.id);
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => toggleCollectionPermission(c.id)}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                  isAllowed ? 'bg-blue-700 text-white font-semibold' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {c.code}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          {u.role === 'Administrator'
                            ? 'All Collections (Super Admin)'
                            : u.role === 'Knowledge Manager'
                            ? 'All Department Knowledge'
                            : u.permittedCollectionIds && u.permittedCollectionIds.length > 0
                            ? u.permittedCollectionIds.map((id) => id.replace('col-', '').toUpperCase()).join(', ')
                            : 'All Employee Authorized'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveRole}
                              disabled={isSaving}
                              className="rounded-md bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(u)}
                              className="rounded-md border border-slate-200 p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                              title="Edit Role / Permissions"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {!isCurrent && (
                              <button
                                onClick={() => onSwitchUser(u.id)}
                                className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                Switch Persona
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
