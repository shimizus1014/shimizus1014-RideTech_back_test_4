"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Comment = {
  id: number;
  user_id: number;
  username: string;
  target_type: string;
  target_id: number;
  content: string;
  created_at: string | null;
};

export default function AdminCommentsPage() {
  const router = useRouter();

  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<"" | "plan" | "task">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchComments = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    const url = filter
      ? `${API_URL}/admin/comments?target_type=${filter}`
      : `${API_URL}/admin/comments`;
    setLoading(true);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) { localStorage.removeItem("access_token"); router.replace("/login"); return; }
        if (r.status === 403) { setError("管理者権限が必要です"); return; }
        const data = await r.json();
        setComments(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("データの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [filter, router]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleDelete(id: number) {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setDeletingId(id);
    try {
      await fetch(`${API_URL}/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchComments();
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-5xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard" className="text-blue-600 hover:underline">ダッシュボード</Link>
        <span>›</span>
        <span className="text-gray-900">コメント管理</span>
      </nav>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">コメント管理</h1>
        <div className="flex gap-2">
          {(["", "plan", "task"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "" ? "すべて" : f === "plan" ? "学習計画" : "タスク"}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-gray-400 text-sm">読み込み中...</div>
      ) : comments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">コメントがありません</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">投稿者</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">種別</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">内容</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">投稿日</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{c.username}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      c.target_type === "plan"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {c.target_type === "plan" ? "学習計画" : "タスク"} #{c.target_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{c.content}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("ja-JP") : ""}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-40 text-xs font-medium transition-colors"
                    >
                      {deletingId === c.id ? "削除中..." : "削除"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            全 {comments.length} 件
          </div>
        </div>
      )}
    </div>
  );
}
