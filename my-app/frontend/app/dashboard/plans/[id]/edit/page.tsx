"use client";

import { useEffect, useState } from "react";
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
};

function toDateInput(dt: string | null): string {
  if (!dt) return "";
  return new Date(dt).toISOString().slice(0, 10);
}

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("active");
  const [isPublic, setIsPublic] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    fetch(`${API_URL}/learning-plans/${planId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        if (!res.ok) throw new Error("データの取得に失敗しました");
        return res.json();
      })
      .then((data: LearningPlan) => {
        if (!data) return;
        setPlan(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
        setDeadline(toDateInput(data.deadline));
        setStatus(data.status);
        setIsPublic(data.is_public);
      })
      .catch((e) => setError(e.message));
  }, [planId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setTitleError("タイトルを入力してください");
      return;
    }
    setTitleError("");
    setSaving(true);

    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    try {
      const res = await fetch(`${API_URL}/learning-plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          deadline: deadline || null,
          status,
          is_public: isPublic,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? "更新に失敗しました");
        return;
      }

      router.push(`/dashboard/plans/${planId}`);
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full border rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-400 focus:ring-red-400 bg-red-50"
        : "border-gray-300 focus:ring-blue-500"
    }`;

  if (error && !plan) return <div className="text-red-500 text-sm">{error}</div>;
  if (!plan) return <div className="text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div className="max-w-2xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/plans" className="text-blue-600 hover:underline">学習計画一覧</Link>
        <span>›</span>
        <Link href={`/dashboard/plans/${planId}`} className="text-blue-600 hover:underline">{plan.title}</Link>
        <span>›</span>
        <span className="text-gray-900">編集</span>
      </nav>

      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">学習計画を編集</h1>
        <p className="text-sm text-gray-500 mt-1">内容を変更して保存してください</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* タイトル */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
              placeholder="例: JavaScript基礎"
              maxLength={100}
              className={inputCls(!!titleError)}
            />
            {titleError && <p className="text-xs text-red-500">{titleError}</p>}
            <p className="text-xs text-gray-400">必須 / 最大100文字</p>
          </div>

          {/* 説明 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="この学習計画の目的や内容を記入してください（任意）"
              maxLength={1000}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between">
              <p className="text-xs text-gray-400">任意 / 最大1000文字</p>
              <p className="text-xs text-gray-400">{description.length} / 1000</p>
            </div>
          </div>

          {/* 目標日 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">目標日</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={today}
              className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">任意 / 学習完了の目標日</p>
          </div>

          {/* ステータス */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              計画ステータス <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-56 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="active">進行中（active）</option>
              <option value="completed">完了（completed）</option>
              <option value="archived">アーカイブ（archived）</option>
            </select>
          </div>

          {/* 公開設定 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">公開設定</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">公開する</span>
            </label>
            <p className="text-xs text-gray-400">
              {isPublic ? "他のユーザーに表示されます" : "他のユーザーには表示されません"}
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="border-t border-gray-100 pt-5 flex justify-end gap-3">
            <Link
              href={`/dashboard/plans/${planId}`}
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
