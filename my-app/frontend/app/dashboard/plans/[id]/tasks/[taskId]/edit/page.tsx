"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function toDateInput(dt: string | null): string {
  if (!dt) return "";
  return new Date(dt).toISOString().slice(0, 10);
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const taskId = params.taskId as string;

  const [planTitle, setPlanTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("not_started");
  const [titleError, setTitleError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/learning-plans/${planId}`, { headers }),
      fetch(`${API_URL}/tasks/${taskId}`, { headers }),
    ])
      .then(async ([planRes, taskRes]) => {
        if (planRes.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        if (!taskRes.ok) throw new Error("タスクが見つかりません");
        const [planData, taskData] = await Promise.all([planRes.json(), taskRes.json()]);
        setPlanTitle(planData.title ?? "");
        setTaskTitle(taskData.title);
        setTitle(taskData.title);
        setDescription(taskData.description ?? "");
        setDeadline(toDateInput(taskData.deadline));
        setStatus(taskData.status);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [planId, taskId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setTitleError("タスク名を入力してください"); return; }
    setTitleError("");
    setSaving(true);

    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          deadline: deadline || null,
          status,
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail ?? "更新に失敗しました");
        return;
      }
      router.push(`/dashboard/plans/${planId}/tasks/${taskId}`);
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full border rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
      hasError ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"
    }`;

  if (error && !loaded) return <div className="text-red-500 text-sm">{error}</div>;
  if (!loaded) return <div className="text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div className="max-w-2xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/plans" className="text-blue-600 hover:underline">学習計画一覧</Link>
        <span>›</span>
        <Link href={`/dashboard/plans/${planId}`} className="text-blue-600 hover:underline">{planTitle || "学習計画"}</Link>
        <span>›</span>
        <Link href={`/dashboard/plans/${planId}/tasks/${taskId}`} className="text-blue-600 hover:underline">{taskTitle}</Link>
        <span>›</span>
        <span className="text-gray-900">編集</span>
      </nav>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">タスクを編集</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* タスク名 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
              maxLength={200}
              className={inputCls(!!titleError)}
            />
            {titleError && <p className="text-xs text-red-500">{titleError}</p>}
          </div>

          {/* 説明 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between">
              <p className="text-xs text-gray-400">任意 / 最大2000文字</p>
              <p className="text-xs text-gray-400">{description.length} / 2000</p>
            </div>
          </div>

          {/* 期限日 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">期限日</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={today}
              className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ステータス */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">ステータス</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-56 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="not_started">未着手</option>
              <option value="learning">学習中</option>
              <option value="done">完了</option>
              <option value="paused">一時停止</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="border-t border-gray-100 pt-5 flex justify-end gap-3">
            <Link
              href={`/dashboard/plans/${planId}/tasks/${taskId}`}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
