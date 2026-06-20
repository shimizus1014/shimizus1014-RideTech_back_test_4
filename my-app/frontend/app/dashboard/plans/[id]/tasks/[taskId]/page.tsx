"use client";
// test edit
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Task = {
  id: number;
  learning_plan_id: number;
  title: string;
  description: string | null;
  status: string;
  understanding_level: number | null;
  deadline: string | null;
  created_at: string | null;
};

type Knowledge = {
  id: number;
  task_id: number;
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
  target_type: string;
  target_id: number;
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

function formatDate(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function deadlineDiff(dt: string | null): string {
  if (!dt) return "";
  const diff = Math.ceil((new Date(dt).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `（${Math.abs(diff)}日超過）`;
  if (diff === 0) return "（今日）";
  return `（${diff}日後）`;
}

function deadlineDiffColor(dt: string | null): string {
  if (!dt) return "text-gray-500";
  const diff = Math.ceil((new Date(dt).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "text-red-500";
  if (diff <= 3) return "text-orange-500";
  return "text-gray-500";
}

const knTypeLabel: Record<string, string> = {
  note: "メモ",
  url: "URL",
  code: "コード",
  file: "ファイル",
};

const knTypeColor: Record<string, string> = {
  note: "bg-blue-50 text-blue-700 border-blue-200",
  url: "bg-purple-50 text-purple-700 border-purple-200",
  code: "bg-green-50 text-green-700 border-green-200",
  file: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const taskId = params.taskId as string;

  const [planTitle, setPlanTitle] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Knowledge states
  const [knowledges, setKnowledges] = useState<Knowledge[]>([]);
  const [showAddKn, setShowAddKn] = useState(false);
  const [knType, setKnType] = useState("note");
  const [knTitle, setKnTitle] = useState("");
  const [knContent, setKnContent] = useState("");
  const [knSaving, setKnSaving] = useState(false);
  const [knError, setKnError] = useState("");
  const [deletingKnId, setDeletingKnId] = useState<number | null>(null);

  // Comment states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchKnowledges = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_URL}/tasks/${taskId}/knowledges`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setKnowledges(d))
      .catch(() => {});
  }, [taskId]);

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
      fetch(`${API_URL}/learning-plans/${planId}`, { headers }),
      fetch(`${API_URL}/tasks/${taskId}`, { headers }),
      fetch(`${API_URL}/me`, { headers }),
    ])
      .then(async ([planRes, taskRes, meRes]) => {
        if (planRes.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        if (!taskRes.ok) throw new Error("タスクが見つかりません");
        const [planData, taskData, meData] = await Promise.all([
          planRes.json(), taskRes.json(), meRes.json(),
        ]);
        setPlanTitle(planData.title ?? "");
        setTask(taskData);
        setEditStatus(taskData.status);
        setCurrentUserId(meData.id);
      })
      .catch((e) => setError(e.message));

    fetchKnowledges();
    fetchComments();
  }, [planId, taskId, router, fetchKnowledges, fetchComments]);

  async function handleStatusUpdate() {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setStatusSaving(true);
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: editStatus }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? "更新に失敗しました"); return; }
      const updated = await res.json();
      setTask(updated);
      setEditStatus(updated.status);
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDelete() {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? "削除に失敗しました"); return; }
      router.push(`/dashboard/plans/${planId}`);
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleAddKnowledge(e: React.FormEvent) {
    e.preventDefault();
    setKnError("");
    if (!knTitle.trim() && !knContent.trim()) {
      setKnError("タイトルまたは内容を入力してください");
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setKnSaving(true);
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/knowledges`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: knType, title: knTitle.trim() || null, content: knContent.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); setKnError(d.detail ?? "追加に失敗しました"); return; }
      setKnTitle("");
      setKnContent("");
      setKnType("note");
      setShowAddKn(false);
      fetchKnowledges();
    } catch {
      setKnError("サーバーに接続できませんでした");
    } finally {
      setKnSaving(false);
    }
  }

  async function handleDeleteKnowledge(id: number) {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setDeletingKnId(id);
    try {
      await fetch(`${API_URL}/knowledges/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchKnowledges();
    } catch {
      /* ignore */
    } finally {
      setDeletingKnId(null);
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

  if (error && !task) return <div className="text-red-500 text-sm">{error}</div>;
  if (!task) return <div className="text-gray-400 text-sm">読み込み中...</div>;

  const badge = statusLabel(task.status);

  return (
    <div className="max-w-3xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/plans" className="text-blue-600 hover:underline">学習計画一覧</Link>
        <span>›</span>
        <Link href={`/dashboard/plans/${planId}`} className="text-blue-600 hover:underline">{planTitle || "学習計画"}</Link>
        <span>›</span>
        <span className="text-gray-900">{task.title}</span>
      </nav>

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">ステータス:</span>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="border border-blue-200 rounded-md px-2 py-1 text-xs text-blue-700 bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="not_started">未着手</option>
              <option value="learning">学習中</option>
              <option value="done">完了</option>
              <option value="paused">一時停止</option>
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={statusSaving || editStatus === task.status}
              className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md disabled:opacity-40 transition-colors"
            >
              {statusSaving ? "更新中..." : "更新"}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/plans/${planId}/tasks/${taskId}/edit`}
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

      {/* タスク詳細 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">タスク詳細</h2>
        <dl className="flex flex-col gap-4">
          {task.description && (
            <div>
              <dt className="text-xs text-gray-500 mb-1">説明</dt>
              <dd className="text-sm text-gray-800 leading-relaxed">{task.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500 mb-1">期限日</dt>
            <dd className="text-sm text-gray-800 flex items-center gap-2">
              {task.deadline ? (
                <>
                  <span>{formatDate(task.deadline)}</span>
                  <span className={`text-xs font-medium ${deadlineDiffColor(task.deadline)}`}>
                    {deadlineDiff(task.deadline)}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">未設定</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-1">作成日</dt>
            <dd className="text-sm text-gray-500">{formatDate(task.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* ナレッジ */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">学習ナレッジ</h2>
          <button
            onClick={() => { setShowAddKn(!showAddKn); setKnError(""); }}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {showAddKn ? "キャンセル" : "ナレッジを追加"}
          </button>
        </div>

        {/* 追加フォーム */}
        {showAddKn && (
          <form onSubmit={handleAddKnowledge} className="mb-5 border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              {["note", "url", "code", "file"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setKnType(t)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                    knType === t ? knTypeColor[t] + " border-current" : "border-gray-300 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {knTypeLabel[t]}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={knTitle}
              onChange={(e) => setKnTitle(e.target.value)}
              placeholder="タイトル（任意）"
              maxLength={200}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={knContent}
              onChange={(e) => setKnContent(e.target.value)}
              placeholder={knType === "url" ? "https://..." : knType === "code" ? "コードを貼り付け..." : "内容を入力..."}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
            {knError && <p className="text-xs text-red-500">{knError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={knSaving}
                className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors"
              >
                {knSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        )}

        {/* ナレッジ一覧 */}
        {knowledges.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">ナレッジがありません</p>
        ) : (
          <div className="flex flex-col gap-3">
            {knowledges.map((kn) => (
              <div key={kn.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
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
                    <p className="text-xs text-gray-400 mt-2">{kn.username} · {formatDate(kn.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteKnowledge(kn.id)}
                    disabled={deletingKnId === kn.id}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors p-1"
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
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
                    <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{c.content}</p>
                </div>
                {(c.user_id === currentUserId) && (
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
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">タスクを削除しますか？</h2>
            <p className="text-sm text-gray-500 text-center mb-4">この操作は取り消せません。</p>
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-2 text-center mb-6">
              <span className="text-sm font-semibold text-red-600">「{task.title}」</span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md py-2.5 text-sm font-semibold transition-colors"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md py-2.5 text-sm transition-colors"
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
