"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type LearningPlan = {
  id: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  deadline: string | null;
  created_at: string | null;
};

const STATUS_FILTER = [
  { value: "", label: "すべて" },
  { value: "active", label: "アクティブ" },
  { value: "completed", label: "完了" },
  { value: "archived", label: "アーカイブ" },
];

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return { label: "アクティブ", cls: "bg-blue-100 text-blue-700" };
    case "completed":
      return { label: "完了", cls: "bg-green-100 text-green-700" };
    case "archived":
      return { label: "アーカイブ", cls: "bg-gray-100 text-gray-500" };
    default:
      return { label: status, cls: "bg-gray-100 text-gray-500" };
  }
}

function progressColor(status: string) {
  return status === "completed" ? "bg-green-500" : "bg-blue-600";
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "";
  const d = new Date(deadline);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    const params = filter ? `?status=${filter}` : "";
    setLoading(true);
    fetch(`${API_URL}/learning-plans${params}`, {
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
      .then((data) => { if (data) setPlans(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router, filter]);

  return (
    <div className="max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">学習計画</h1>
        <Link
          href="/dashboard/plans/new"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </Link>
      </div>

      {/* フィルタータブ */}
      <div className="border-b border-gray-200 mb-6 flex">
        {STATUS_FILTER.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              filter === f.value
                ? "border-blue-600 text-blue-600 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="text-gray-400 text-sm">読み込み中...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          学習計画がありません
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-4">{plans.length}件の学習計画</p>
          <div className="grid grid-cols-2 gap-4">
            {plans.map((plan) => {
              const badge = statusBadge(plan.status);
              return (
                <div
                  key={plan.id}
                  onClick={() => router.push(`/dashboard/plans/${plan.id}`)}
                  className="bg-white border border-gray-200 rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">{plan.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>達成率</span>
                      <span className="font-semibold text-gray-800">{plan.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${progressColor(plan.status)}`}
                        style={{ width: `${plan.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    {plan.deadline && <span>🗓 目標日: {formatDeadline(plan.deadline)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
