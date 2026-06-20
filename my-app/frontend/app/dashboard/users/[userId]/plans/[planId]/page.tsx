"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Plan = {
  id: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  deadline: string | null;
};

type Task = {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
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
    case "learning": return { label: "学習中",   cls: "bg-blue-100 text-blue-700" };
    case "done":     return { label: "完了",     cls: "bg-green-100 text-green-700" };
    case "paused":   return { label: "一時停止", cls: "bg-yellow-100 text-yellow-800" };
    default:         return { label: "未着手",   cls: "bg-gray-100 text-gray-500" };
  }
}

function planStatusLabel(status: string) {
  switch (status) {
    case "active":    return { label: "学習中",     cls: "bg-blue-100 text-blue-700" };
    case "completed": return { label: "完了",       cls: "bg-green-100 text-green-700" };
    case "archived":  return { label: "アーカイブ", cls: "bg-gray-100 text-gray-500" };
    default:          return { label: status,       cls: "bg-gray-100 text-gray-500" };
  }
}

export default function PublicPlanPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const planId = params.planId as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [username, setUsername] = useState("");
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
      fetch(`${API_URL}/users/${userId}/profile`, { headers }),
      fetch(`${API_URL}/users/${userId}/public-plans/${planId}`, { headers }),
      fetch(`${API_URL}/users/${userId}/public-plans/${planId}/tasks`, { headers }),
      fetch(`${API_URL}/me`, { headers }),
    ])
      .then(async ([userRes, planRes, tasksRes, meRes]) => {
        if (!planRes.ok) throw new Error("学習計画が見つかりません");
        const [userData, planData, tasksData, meData] = await Promise.all([
          userRes.json(), planRes.json(), tasksRes.json(), meRes.json(),
        ]);
        setUsername(userData.username ?? "");
        setPlan(planData);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setCurrentUserId(meData.id);
      })
      .catch((e) => setError(e.message));

    fetchComments();
  }, [userId, planId, router, fetchComments]);

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

  const badge = planStatusLabel(plan.status);
  const progressColor = plan.status === "completed" ? "bg-green-500" : "bg-blue-600";

  return (
    <div className="max-w-4xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard" className="text-blue-600 hover:underline">ダッシュボード</Link>
        <span>›</span>
        <Link href={`/dashboard/users/${userId}`} className="text-blue-600 hover:underline">{username}</Link>
        <span>›</span>
        <span className="text-gray-900">{plan.title}</span>
      </nav>

      {/* 読み取り専用バナー */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 text-sm text-blue-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        これは <strong className="mx-1">{username}</strong> さんの公開学習計画です（読み取り専用）
      </div>

      {/* プランカード */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>
        {plan.description && <p className="text-sm text-gray-500 mb-4">{plan.description}</p>}
        <div className="max-w-lg">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">達成率</span>
            <span className="font-bold text-blue-600">{plan.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${progressColor}`} style={{ width: `${plan.progress}%` }} />
          </div>
        </div>
      </div>

      {/* タスク一覧（読み取り専用） */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">タスク一覧</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">タスクがありません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => {
              const s = taskStatusLabel(task.status);
              return (
                <Link
                  key={task.id}
                  href={`/dashboard/users/${userId}/plans/${planId}/tasks/${task.id}`}
                  className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* コメント */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
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
