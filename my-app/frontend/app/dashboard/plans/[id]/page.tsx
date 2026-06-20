"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type LearningPlan = {
  id: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  is_public: boolean;
  deadline: string | null;
  created_at: string | null;
};

type Task = {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  understanding_level: number | null;
};

type Comment = {
  id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string | null;
};

function taskStatusLabel(status: string) {
  switch (status) {
    case "learning":     return { label: "学習中",   cls: "bg-blue-100 text-blue-700" };
    case "done":         return { label: "完了",     cls: "bg-green-100 text-green-700" };
    case "paused":       return { label: "一時停止", cls: "bg-yellow-100 text-yellow-800" };
    default:             return { label: "未着手",   cls: "bg-gray-100 text-gray-500" };
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "active":    return { label: "学習中",       cls: "bg-blue-100 text-blue-700" };
    case "completed": return { label: "完了",         cls: "bg-green-100 text-green-700" };
    case "archived":  return { label: "アーカイブ",   cls: "bg-gray-100 text-gray-500" };
    default:          return { label: status,         cls: "bg-gray-100 text-gray-500" };
  }
}

function formatDate(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function PlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Comment states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchComments = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_URL}/comments?target_type=plan&target_id=${planId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setComments(d))
      .catch(() => {});
  }, [planId]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/learning-plans/${planId}`, { headers }),
      fetch(`${API_URL}/learning-plans/${planId}/tasks`, { headers }),
      fetch(`${API_URL}/me`, { headers }),
    ])
      .then(async ([planRes, tasksRes, meRes]) => {
        if (planRes.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        if (!planRes.ok) throw new Error("データの取得に失敗しました");
        const [planData, tasksData, meData] = await Promise.all([planRes.json(), tasksRes.json(), meRes.json()]);
        setPlan(planData);
        setTasks(tasksData);
        setCurrentUserId(meData.id);
      })
      .catch((e) => setError(e.message));

    fetchComments();
  }, [planId, router, fetchComments]);

  async function handleDelete() {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/learning-plans/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? "削除に失敗しました");
        return;
      }
      router.push("/dashboard/plans");
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

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
        body: JSON.stringify({ target_type: "plan", target_id: Number(planId), content: newComment.trim() }),
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
  if (!plan) return <div className="text-gray-400 text-sm">読み込み中...</div>;

  const badge = statusBadge(plan.status);
  const progressColor = plan.status === "completed" ? "bg-green-500" : "bg-blue-600";

  return (
    <div className="max-w-4xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/plans" className="text-blue-600 hover:underline">学習計画一覧</Link>
        <span>›</span>
        <span className="text-gray-900">{plan.title}</span>
      </nav>

      {/* ヒーローカード */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* アイコン */}
            <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>

            {/* 情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {plan.is_public ? "公開" : "非公開"}
                </span>
              </div>

              {plan.description && (
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
              )}

              {/* 進捗 */}
              <div className="max-w-lg">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">達成率</span>
                  <span className="font-bold text-blue-600">{plan.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${progressColor}`}
                    style={{ width: `${plan.progress}%` }}
                  />
                </div>
                {plan.deadline && (
                  <p className="text-xs text-gray-400 mt-1.5">🗓 目標日: {formatDate(plan.deadline)}</p>
                )}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/dashboard/plans/${plan.id}/edit`}
              className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 border border-red-300 hover:bg-red-50 text-red-600 text-sm font-medium px-3 py-2 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              削除
            </button>
          </div>
        </div>
      </div>

      {/* タスク一覧 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">タスク一覧</h2>
          <Link
            href={`/dashboard/plans/${plan.id}/tasks/new`}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            タスクを追加
          </Link>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">タスクがありません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => {
              const s = taskStatusLabel(task.status);
              return (
                <div
                  key={task.id}
                  onClick={() => router.push(`/dashboard/plans/${plan.id}/tasks/${task.id}`)}
                  className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {task.deadline && (
                      <span className="text-xs text-gray-400">{formatDate(task.deadline)}</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* コメント */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">コメント ({comments.length})</h2>
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
                    title="削除"
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

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm px-8 py-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">学習計画を削除しますか？</h2>
            <p className="text-sm text-gray-500 mb-6">
              「{plan.title}」を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md py-2 text-sm font-medium transition-colors"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md py-2 text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
