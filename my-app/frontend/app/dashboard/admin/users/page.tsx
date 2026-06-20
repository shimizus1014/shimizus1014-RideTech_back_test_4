"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type User = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  bio: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async (q: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    try {
      const url = q ? `${API_URL}/admin/users?q=${encodeURIComponent(q)}` : `${API_URL}/admin/users`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.replace("/login"); return; }
      if (res.status === 403) { setError("管理者権限が必要です"); return; }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.id))
      .catch(() => {});
    fetchUsers("");
  }, [router, fetchUsers]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(query), 300);
    return () => clearTimeout(t);
  }, [query, fetchUsers]);

  async function handleDelete(user: User) {
    if (!confirm(`「${user.username}」を削除しますか？この操作は取り消せません。`)) return;
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setDeletingId(user.id);
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        const d = await res.json();
        setError(d.detail ?? "削除に失敗しました");
      }
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(user: User) {
    setEditTarget(user);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditError("");
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setSaving(true);
    setEditError("");
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const res = await fetch(`${API_URL}/users/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: editUsername, email: editEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.detail ?? "更新に失敗しました"); return; }
      setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? { ...u, ...data } : u)));
      setEditTarget(null);
    } catch {
      setEditError("サーバーに接続できませんでした");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/admin" className="text-blue-600 hover:underline">管理ダッシュボード</Link>
        <span>›</span>
        <span className="text-gray-900">ユーザー管理</span>
      </nav>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">管理者</span>
          <h1 className="text-xl font-semibold text-gray-900">ユーザー管理</h1>
        </div>
        <p className="text-xs text-gray-500">{users.length} 件</p>
      </div>

      {/* 検索 */}
      <div className="relative mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ユーザー名・メールで検索..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ユーザー名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">メールアドレス</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">権限</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 text-sm py-10">ユーザーが見つかりません</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{user.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.is_admin ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                        {user.is_admin ? "管理者" : "一般"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.id !== currentUserId && (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(user)}
                            className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="text-xs px-3 py-1.5 border border-red-300 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-40 transition-colors"
                          >
                            {deletingId === user.id ? "削除中..." : "削除"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {users.length > 0 && (
            <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
              全 {users.length} 名
            </div>
          )}
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm px-8 py-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">ユーザー編集</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-700 font-medium">ユーザー名</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-700 font-medium">メールアドレス</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {editError && <p className="text-sm text-red-500">{editError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md py-2 text-sm font-medium transition-colors"
                >
                  {saving ? "保存中..." : "保存する"}
                </button>
                <button
                  onClick={() => setEditTarget(null)}
                  disabled={saving}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md py-2 text-sm font-medium transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
