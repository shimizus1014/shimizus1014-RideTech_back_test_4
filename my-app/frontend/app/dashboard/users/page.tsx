"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type User = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
};

type EditForm = {
  username: string;
  email: string;
};

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ username: "", email: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  function getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  const fetchUsers = useCallback(async (q: string) => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setUsers(await res.json());
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setCurrentUser(data);
      });

    fetchUsers("");
  }, [router, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchUsers]);

  async function handleDelete(user: User) {
    if (!confirm(`「${user.username}」を削除しますか？`)) return;
    const token = getToken();
    const res = await fetch(`${API_URL}/users/${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      const data = await res.json();
      setError(data.detail ?? "削除に失敗しました");
    }
  }

  function openEdit(user: User) {
    setEditTarget(user);
    setEditForm({ username: user.username, email: user.email });
    setEditError("");
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setSaving(true);
    setEditError("");
    const token = getToken();

    const res = await fetch(`${API_URL}/users/${editTarget.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editForm),
    });

    const data = await res.json();
    if (!res.ok) {
      setEditError(data.detail ?? "更新に失敗しました");
      setSaving(false);
      return;
    }

    setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? data : u)));
    setEditTarget(null);
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">ユーザー検索</h1>

      {/* 検索バー */}
      <div className="relative mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ユーザー名・メールアドレスで検索"
          className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {users.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">
            ユーザーが見つかりません
          </p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{user.username}</span>
                    {user.is_admin && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                        管理者
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
              </div>

              {/* 管理者のみ表示 */}
              {currentUser?.is_admin && user.id !== currentUser.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="text-xs px-3 py-1.5 border border-red-300 rounded hover:bg-red-50 text-red-600 transition-colors"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 編集モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm px-8 py-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              ユーザー編集
            </h2>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-700">ユーザー名</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {editError && <p className="text-sm text-red-500">{editError}</p>}

              <div className="flex gap-2 mt-2">
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
