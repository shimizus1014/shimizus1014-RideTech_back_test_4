"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  created_at: string | null;
};

type Knowledge = {
  id: number;
  user_id: number;
  username: string;
  type: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
};

type Comment = {
  id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string | null;
};

function statusLabel(status: string) {
  switch (status) {
    case "learning": return { label: "学習中",   cls: "bg-blue-100 text-blue-700" };
    case "done":     return { label: "完了",     cls: "bg-green-100 text-green-700" };
    case "paused":   return { label: "一時停止", cls: "bg-yellow-100 text-yellow-800" };
    default:         return { label: "未着手",   cls: "bg-gray-100 text-gray-500" };
  }
}

const knTypeLabel: Record<string, string> = { note: "メモ", url: "URL", code: "コード", file: "ファイル" };
const knTypeColor: Record<string, string> = {
  note: "bg-blue-50 text-blue-700 border-blue-200",
  url: "bg-purple-50 text-purple-700 border-purple-200",
  code: "bg-green-50 text-green-700 border-green-200",
  file: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function PublicTaskPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const planId = params.planId as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [username, setUsername] = useState("");
  const [knowledges, setKnowledges] = useState<Knowledge[]>([]);
  const [error, setError] = useState("");

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchComments = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_URL}/comments?target_type=task&target_id=${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setComments(d))
      .catch(() => {});
  }, [taskId]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/users/${userId}/profile`, { headers }),
      fetch(`${API_URL}/users/${userId}/public-plans/${planId}`, { headers }),
      fetch(`${API_URL}/users/${userId}/public-plans/${planId}/tasks/${taskId}`, { headers }),
      fetch(`${API_URL}/tasks/${taskId}/knowledges`, { headers }),
      fetch(`${API_URL}/me`, { headers }),
    ])
      .then(async ([userRes, planRes, taskRes, knRes, meRes]) => {
        if (!taskRes.ok) throw new Error("タスクが見つかりません");
        const [userData, planData, taskData, knData, meData] = await Promise.all([
          userRes.json(), planRes.json(), taskRes.json(), knRes.json(), meRes.json(),
        ]);
        setUsername(userData.username ?? "");
        setPlanTitle(planData.title ?? "");
        setTask(taskData);
        setKnowledges(Array.isArray(knData) ? knData : []);
        setCurrentUserId(meData.id);
      })
      .catch((e) => setError(e.message));

    fetchComments();
  }, [userId, planId, taskId, router, fetchComments]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    setCommentError("");
    if (!newComment.trim()) return;
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setCommentSaving(true);
    try {
      const res = await fetch(`${API_URL}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: "task", target_id: Number(taskId), content: newComment.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setCommentError(d.detail ?? "投稿に失敗しました"); return; }
      setNewComment("");
      fetchComments();
    } catch {
      setCommentError("サーバーに接続できませんでした");
    } finally {
      setCommentSaving(false);
    }
  }

  async function handleDeleteComment(id: number) {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setDeletingCommentId(id);
    try {
      await fetch(`${API_URL}/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchComments();
    } catch {
      /* ignore */
    } finally {
      setDeletingCommentId(null);
    }
  }

  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  if (!task) return <div className="text-gray-400 text-sm">読み込み中...</div>;

  const badge = statusLabel(task.status);

  return (
    <div className="max-w-3xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5 flex-wrap">
        <Link href={`/dashboard/users/${userId}`} className="text-blue-600 hover:underline">{username}</Link>
        <span>›</span>
        <Link href={`/dashboard/users/${userId}/plans/${planId}`} className="text-blue-600 hover:underline">{planTitle}</Link>
        <span>›</span>
        <span className="text-gray-900">{task.title}</span>
      </nav>

      {/* 読み取り専用バナー */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 text-sm text-blue-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        <strong className="mr-1">{username}</strong> さんのタスク（読み取り専用）
      </div>

      {/* タスク詳細 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>
        <dl className="flex flex-col gap-4">
          {task.description && (
            <div>
              <dt className="text-xs text-gray-500 mb-1">説明</dt>
              <dd className="text-sm text-gray-800 leading-relaxed">{task.description}</dd>
            </div>
          )}
          {task.deadline && (
            <div>
              <dt className="text-xs text-gray-500 mb-1">期限日</dt>
              <dd className="text-sm text-gray-800">
                {new Date(task.deadline).toLocaleDateString("ja-JP")}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* ナレッジ（読み取り専用） */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">学習ナレッジ</h2>
        {knowledges.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">ナレッジがありません</p>
        ) : (
          <div className="flex flex-col gap-3">
            {knowledges.map((kn) => (
              <div key={kn.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${knTypeColor[kn.type] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {knTypeLabel[kn.type] || kn.type}
                  </span>
                  {kn.title && <span className="text-sm font-medium text-gray-800">{kn.title}</span>}
                </div>
                {kn.content && (
                  kn.type === "url" ? (
                    <a href={kn.content} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                      {kn.content}
                    </a>
                  ) : kn.type === "code" ? (
                    <pre className="text-xs bg-gray-900 text-green-300 rounded p-3 overflow-x-auto mt-2 whitespace-pre-wrap">{kn.content}</pre>
                  ) : (
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{kn.content}</p>
                  )
                )}
                <p className="text-xs text-gray-400 mt-2">{kn.username} · {kn.created_at ? new Date(kn.created_at).toLocaleDateString("ja-JP") : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* コメント */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">コメント ({comments.length})</h2>
        <div className="flex flex-col gap-3 mb-4">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">コメントはありません</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                  {c.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-700">{c.username}</span>
                    <span className="text-xs text-gray-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("ja-JP") : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{c.content}</p>
                </div>
                {c.user_id === currentUserId && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    disabled={deletingCommentId === c.id}
                    className="flex-shrink-0 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            maxLength={500}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={commentSaving || !newComment.trim()}
            className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors whitespace-nowrap"
          >
            {commentSaving ? "投稿中..." : "投稿"}
          </button>
        </form>
        {commentError && <p className="text-xs text-red-500 mt-1">{commentError}</p>}
      </div>
    </div>
  );
}
