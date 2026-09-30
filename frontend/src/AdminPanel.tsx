import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from './api';

// ─── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ path, size = 18, className = '' }: { path: string, size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  knowledge: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3-3h7z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  refresh: "M1 4v6h6 M23 20v-6h-6 M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  search: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Page = 'dashboard' | 'users' | 'activity' | 'knowledge' | 'settings';

interface Stats {
  total_users: number;
  active_users: number;
  total_knowledge_sources: number;
  questions_asked: number;
  documents_uploaded: number;
}

interface UserData {
  id: number;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  is_owner: boolean;
  created_at: string;
  last_active: string;
  conversation_count: number;
  question_count: number;
}

interface ActivityItem {
  id: number;
  user_email: string | null;
  activity_type: string;
  description: string;
  created_at: string;
}

interface KnowledgeSource {
  id: number;
  name: string;
  source_type: string;
  url: string | null;
  visibility: string;
  status: string;
  enabled: boolean;
  chunk_count: number;
  file_size: number;
  error_message: string | null;
  created_at: string;
  last_indexed_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
  if (!dateStr) return 'Never';
  // Ensure the date string is parsed as UTC by appending 'Z' if missing
  const utcDateStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
  const diff = Math.max(0, (Date.now() - new Date(utcDateStr).getTime()) / 1000);

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
    disabled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {status}
    </span>
  );
};

const activityTypeLabel: Record<string, string> = {
  login: '🔐 Login',
  question_asked: '💬 Question',
  voice_question: '🎤 Voice',
  doc_upload: '📄 Upload',
  knowledge_update: '📚 KB Update',
  knowledge_delete: '🗑️ KB Delete',
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface AdminPanelProps {
  user: { id: number; email: string; is_admin: boolean; is_owner: boolean };
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, onLogout }) => {
  const [page, setPage] = useState<Page>('dashboard');

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
    { id: 'users', label: 'Users', icon: icons.users },
    { id: 'activity', label: 'Activity', icon: icons.activity },
    { id: 'knowledge', label: 'Knowledge Base', icon: icons.knowledge },
    { id: 'settings', label: 'Settings', icon: icons.settings },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 glass-panel flex flex-col">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/30">
              A
            </div>
            <div>
              <div className="font-semibold text-sm text-white font-heading">PersonaAI</div>
              <div className="text-xs text-indigo-400">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.id
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon path={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-gray-500">Logged in as</div>
            <div className="text-xs text-gray-300 truncate">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Icon path={icons.logout} size={16} />
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'users' && <UsersPage />}
        {page === 'activity' && <ActivityPage />}
        {page === 'knowledge' && <KnowledgePage />}
        {page === 'settings' && <SettingsPage user={user} />}
      </main>
    </div>
  );
};

// ─── Page Header ─────────────────────────────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold font-heading text-white">{title}</h1>
      {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient('/api/admin/stats').then(r => r.json()),
      apiClient('/api/admin/activity?limit=20').then(r => r.json()),
    ]).then(([s, a]) => {
      setStats(s);
      setActivity(Array.isArray(a) ? a : []);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Active Users', value: stats.active_users, color: 'from-purple-500 to-purple-600' },
    { label: 'Knowledge Sources', value: stats.total_knowledge_sources, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Questions Asked', value: stats.questions_asked, color: 'from-blue-500 to-blue-600' },
    { label: 'Docs Uploaded', value: stats.documents_uploaded, color: 'from-amber-500 to-amber-600' },
  ] : [];

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" subtitle="Overview of your AI Twin system" />

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading stats...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {statCards.map(s => (
              <Card key={s.label} className="text-center">
                <div className={`text-3xl font-bold font-heading bg-gradient-to-br ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="text-base font-semibold mb-4 font-heading">Recent Activity</h2>
            {activity.length === 0 ? (
              <div className="text-center text-gray-500 py-6 text-sm">No activity yet</div>
            ) : (
              <div className="space-y-2">
                {activity.slice(0, 15).map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="text-lg w-6 shrink-0">{activityTypeLabel[item.activity_type]?.split(' ')[0] || '📋'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate">{item.description}</div>
                      <div className="text-xs text-gray-500">{item.user_email || 'System'}</div>
                    </div>
                    <div className="text-xs text-gray-500 shrink-0">{timeAgo(item.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

// ─── Users Page ───────────────────────────────────────────────────────────────
const UsersPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    apiClient(`/api/admin/users${qs}`).then(r => r.json()).then(data => {
      setUsers(Array.isArray(data) ? data : []);
    }).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (user: UserData) => {
    if (user.is_owner) {
      alert("Cannot deactivate the owner.");
      return;
    }
    try {
      const res = await apiClient(`/api/admin/users/${user.id}/toggle-active`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: data.is_active } : u));
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to toggle user status');
      }
    } catch {
      alert('Failed to toggle user status');
    }
  };

  const handleDelete = async (user: UserData) => {
    if (user.is_owner) {
      alert("Cannot delete the owner.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete ${user.email}?`)) {
      return;
    }
    try {
      const res = await apiClient(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to delete user');
      }
    } catch {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Users" subtitle={`${users.length} registered users`} />

      <Card className="mb-4">
        <div className="relative">
          <Icon path={icons.search} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="text-left pb-3 pr-4">Email</th>
                  <th className="text-left pb-3 pr-4">Role</th>
                  <th className="text-left pb-3 pr-4">Status</th>
                  <th className="text-left pb-3 pr-4">Joined</th>
                  <th className="text-left pb-3 pr-4">Last Active</th>
                  <th className="text-left pb-3 pr-4">Questions</th>
                  <th className="text-left pb-3 pr-4">Conversations</th>
                  <th className="text-right pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                          {u.email[0].toUpperCase()}
                        </div>
                        <span className="text-gray-200 truncate max-w-[160px]">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {u.is_owner ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Owner</span>
                      ) : u.is_admin ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Admin</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">User</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${u.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{timeAgo(u.created_at)}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{timeAgo(u.last_active)}</td>
                    <td className="py-3 pr-4 text-gray-400">{u.question_count}</td>
                    <td className="py-3 pr-4 text-gray-400">{u.conversation_count}</td>
                    <td className="py-3">
                      {!u.is_owner && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`p-1.5 rounded-lg transition-all ${u.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Icon path={u.is_active ? icons.check : icons.eye} size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete user"
                          >
                            <Icon path={icons.trash} size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Activity Page ────────────────────────────────────────────────────────────
const ActivityPage = () => {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    let qs = '?limit=200';
    if (filterType) qs += `&activity_type=${filterType}`;
    if (filterEmail) qs += `&email=${encodeURIComponent(filterEmail)}`;

    apiClient(`/api/admin/activity${qs}`).then(r => r.json()).then(data => {
      setActivity(Array.isArray(data) ? data : []);
    }).finally(() => setLoading(false));
  }, [filterType, filterEmail]);

  useEffect(() => { load(); }, [load]);

  const types = ['login', 'question_asked', 'doc_upload', 'knowledge_update', 'knowledge_delete'];

  return (
    <div className="p-6">
      <PageHeader title="Activity" subtitle="User activity timeline" />

      <Card className="mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <Icon path={icons.search} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="Filter by user email..."
              value={filterEmail}
              onChange={e => setFilterEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === '' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white border border-white/10 hover:border-white/20'}`}
            >
              All
            </button>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === t ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white border border-white/10 hover:border-white/20'}`}
              >
                {activityTypeLabel[t] || t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : activity.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No activity found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="text-left pb-3 pr-4">User</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3 pr-4">Description</th>
                  <th className="text-left pb-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {activity.map(item => (
                  <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">{item.user_email || 'System'}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs">{activityTypeLabel[item.activity_type] || item.activity_type}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-300 text-xs max-w-[320px] truncate">{item.description}</td>
                    <td className="py-2.5 text-gray-500 text-xs whitespace-nowrap">{timeAgo(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Knowledge Page ───────────────────────────────────────────────────────────
const KnowledgePage = () => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [showEdit, setShowEdit] = useState<KnowledgeSource | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<KnowledgeSource | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    apiClient(`/api/admin/knowledge${qs}`).then(r => r.json()).then(d => {
      setSources(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5s if any source is processing
  useEffect(() => {
    const hasProcessing = sources.some(s => s.status === 'processing');
    if (!hasProcessing) return;
    const t = setTimeout(load, 5000);
    return () => clearTimeout(t);
  }, [sources, load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('visibility', 'public');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/admin/knowledge/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('PersonaAI_token')}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.detail || 'Upload failed', 'err');
      } else {
        showToast('File uploaded! Processing in background...');
        setShowUpload(false);
        setTimeout(load, 1500);
      }
    } catch {
      showToast('Upload failed', 'err');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      const res = await apiClient('/api/admin/knowledge/url', {
        method: 'POST',
        body: JSON.stringify({ url: urlInput.trim(), name: urlName.trim() || urlInput.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.detail || 'Failed to add URL', 'err');
      } else {
        showToast('URL added! Fetching content...');
        setShowUrl(false);
        setUrlInput('');
        setUrlName('');
        setTimeout(load, 1500);
      }
    } catch {
      showToast('Failed to add URL', 'err');
    }
  };

  const handleToggle = async (source: KnowledgeSource) => {
    const res = await apiClient(`/api/admin/knowledge/${source.id}/toggle`, { method: 'PATCH' });
    if (res.ok) {
      const d = await res.json();
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: d.enabled, status: d.status } : s));
      showToast(`${source.name} ${d.enabled ? 'enabled' : 'disabled'}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await apiClient(`/api/admin/knowledge/${deleteConfirm.id}`, { method: 'DELETE' });
    if (res.ok) {
      setSources(prev => prev.filter(s => s.id !== deleteConfirm.id));
      showToast(`"${deleteConfirm.name}" deleted`);
    }
    setDeleteConfirm(null);
  };

  const handleReindex = async (source: KnowledgeSource) => {
    const res = await apiClient(`/api/admin/knowledge/${source.id}/reindex`, { method: 'POST' });
    if (res.ok) {
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: 'processing' } : s));
      showToast('Re-indexing started...');
    }
  };

  const openEdit = async (source: KnowledgeSource) => {
    if (source.source_type === 'url') {
      showToast('URL sources cannot be edited inline', 'err');
      return;
    }
    try {
      const res = await apiClient(`/api/admin/knowledge/${source.id}/content`);
      if (res.ok) {
        const d = await res.json();
        setEditContent(d.content);
        setShowEdit(source);
      } else {
        showToast('Could not load file content', 'err');
      }
    } catch {
      showToast('Could not load file content', 'err');
    }
  };

  const saveEdit = async () => {
    if (!showEdit) return;
    const res = await apiClient(`/api/admin/knowledge/${showEdit.id}/content`, {
      method: 'PATCH',
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      showToast('Saved and re-indexing...');
      setShowEdit(null);
      setTimeout(load, 1000);
    } else {
      showToast('Save failed', 'err');
    }
  };

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border transition-all ${toast.type === 'ok' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      <PageHeader
        title="Knowledge Base"
        subtitle={`${sources.length} sources`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowUrl(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all"
            >
              <Icon path={icons.link} size={14} /> Add URL
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm btn-primary font-medium"
            >
              <Icon path={icons.upload} size={14} /> Upload File
            </button>
          </div>
        }
      />

      {/* Search */}
      <Card className="mb-4">
        <div className="relative">
          <Icon path={icons.search} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            placeholder="Search knowledge sources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : sources.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📚</div>
            <div className="text-gray-400 text-sm">No knowledge sources yet</div>
            <div className="text-gray-500 text-xs mt-1">Upload a file or add a URL to get started</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="text-left pb-3 pr-4">Name</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3 pr-4">Status</th>
                  <th className="text-left pb-3 pr-4">Chunks</th>
                  <th className="text-left pb-3 pr-4">Size</th>
                  <th className="text-left pb-3 pr-4">Last Indexed</th>
                  <th className="text-right pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(s => (
                  <tr key={s.id} className={`border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors ${!s.enabled ? 'opacity-50' : ''}`}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-200 truncate max-w-[200px]">{s.name}</div>
                      {s.url && <div className="text-xs text-gray-500 truncate max-w-[200px]">{s.url}</div>}
                      {s.error_message && (
                        <div className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                          <Icon path={icons.alert} size={10} /> {s.error_message.slice(0, 60)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {s.source_type}
                      </span>
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 pr-4 text-gray-400">{s.chunk_count > 0 ? s.chunk_count : '—'}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{formatBytes(s.file_size)}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{s.last_indexed_at ? timeAgo(s.last_indexed_at) : '—'}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.source_type !== 'url' && (
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                            title="Edit content"
                          >
                            <Icon path={icons.edit} size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleReindex(s)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          title="Re-index"
                        >
                          <Icon path={icons.refresh} size={13} />
                        </button>
                        <button
                          onClick={() => handleToggle(s)}
                          className={`p-1.5 rounded-lg transition-all ${s.enabled ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                          title={s.enabled ? 'Disable' : 'Enable'}
                        >
                          <Icon path={s.enabled ? icons.check : icons.eye} size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(s)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete"
                        >
                          <Icon path={icons.trash} size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      {showUpload && (
        <Modal title="Upload Knowledge File" onClose={() => setShowUpload(false)}>
          <div className="text-sm text-gray-400 mb-4">Supported: .md, .pdf, .doc, .docx, .txt (max 10MB)</div>
          <div
            className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-500/50 transition-all group"
            onClick={() => fileRef.current?.click()}
          >
            <Icon path={icons.upload} size={32} className="mx-auto mb-3 text-gray-600 group-hover:text-indigo-400 transition-colors" />
            <div className="text-gray-400 text-sm">{uploading ? 'Uploading...' : 'Click to select file'}</div>
          </div>
          <input ref={fileRef} type="file" accept=".md,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleUpload} />

          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <div>📤 Upload → ✂️ Extract Text → 🔪 Chunk → 🧠 Embed → ✅ Available to AI</div>
          </div>
        </Modal>
      )}

      {/* URL Modal */}
      {showUrl && (
        <Modal title="Add Website / URL" onClose={() => setShowUrl(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Website URL *</label>
              <input
                className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder="https://example.com"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Name (optional)</label>
              <input
                className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder="My website source"
                value={urlName}
                onChange={e => setUrlName(e.target.value)}
              />
            </div>
            <button onClick={handleAddUrl} className="w-full py-2.5 rounded-xl btn-primary text-sm font-medium mt-2">
              Add to Knowledge Base
            </button>
            <div className="text-xs text-gray-500">🌐 Fetch → 📝 Extract Text → ✂️ Chunk → 🧠 Embed → ✅ Available to AI</div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title={`Edit: ${showEdit.name}`} onClose={() => setShowEdit(null)} wide>
          <textarea
            className="w-full h-96 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-gray-200 font-mono focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-medium">
              Save & Re-index
            </button>
            <button onClick={() => setShowEdit(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="Delete Knowledge Source" onClose={() => setDeleteConfirm(null)}>
          <div className="text-sm text-gray-300 mb-1">Are you sure you want to delete:</div>
          <div className="text-base font-semibold text-white mb-4">"{deleteConfirm.name}"</div>
          <div className="text-xs text-gray-500 mb-5">This will remove the file, all chunks, and embeddings from the vector database. This cannot be undone.</div>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-medium transition-all">
              Delete Permanently
            </button>
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Settings Page ────────────────────────────────────────────────────────────
const SettingsPage = ({ user }: { user: any }) => (
  <div className="p-6">
    <PageHeader title="Settings" subtitle="Admin configuration" />
    <Card>
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Admin Account</div>
          <div className="text-sm text-white">{user.email}</div>
          <div className="flex gap-2 mt-1">
            {user.is_owner && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Owner</span>}
            {user.is_admin && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Admin</span>}
          </div>
        </div>
        <div className="border-t border-white/5 pt-4">
          <div className="text-xs text-gray-500 mb-2">Backend</div>
          <div className="text-sm text-gray-400">API: <span className="text-gray-200">http://127.0.0.1:8000</span></div>
          <div className="text-sm text-gray-400 mt-1">Frontend: <span className="text-gray-200">http://localhost:5173</span></div>
        </div>
        <div className="border-t border-white/5 pt-4">
          <div className="text-xs text-gray-500 mb-2">Notes</div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>• To grant admin access to a user, run: <code className="bg-white/5 px-1 rounded">POST /api/admin/make-admin?user_id=X</code> as the owner</div>
            <div>• Knowledge sources with status "disabled" are excluded from AI retrieval</div>
            <div>• Re-indexing re-embeds all chunks for a source</div>
          </div>
        </div>
      </div>
    </Card>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, children, onClose, wide = false }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className={`glass rounded-2xl p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} shadow-2xl`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold font-heading text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
          <Icon path={icons.x} size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default AdminPanel;
