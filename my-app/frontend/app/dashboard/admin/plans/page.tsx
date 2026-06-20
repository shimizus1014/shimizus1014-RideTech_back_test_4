"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AdminPlan = {
  id: number;
  user_id: number;
  username: string;
  title: string;
  status: string;
  progress: number;
  is_public: boolean;
  created_at: string | null;
};

function statusLabel(s: string) {
  switch (s) {
    case "active":    return { label: "学習中",     cls: "bg-blue-100 text-blue-700" };
    case "completed": return { label: "完了",       cls: "bg-green-100 text-green-700" };
    case "archived":  return { label: "アーカイブ", cls: "bg-gray-100 text-gray-500" };
    default:          return { label: s,            cls: "bg-gray-100 text-gray-500" };
  }
}

export default function AdminPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [filter, setFilter] = useState<"" | "active" | "completed" | "archived">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlans = useCallback(async (status: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    try {
      const url = status
        ? `${API_URL}/admin/plans?status=${status}`
        : `${API_URL}/admin/plans`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.replace("/login"); return; }
      if (res.status === 403) { setError("管理者権限が必要です"); return; }
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPlans(filter);
  }, [filter, fetchPlans]);

  return (
    <div className="max-w-5xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/admin" className="text-blue-600 hover:underline">管理ダッシュボード</Link>
        <span>›</span>
        <span className="text-gray-900">プラン管理</span>
      </nav>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">管理者</span>
          <h1 className="text-xl font-semibold text-gray-900">プラン管理</h1>
        </div>
        <div className="flex gap-2">
          {(["", "active", "completed", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "" ? "すべて" : f === "active" ? "学習中" : f === "completed" ? "完了" : "アーカイブ"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : plans.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">学習計画がありません</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ユーザー</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">プラン名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ステータス</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">達成率</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">公開</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">作成日</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const s = statusLabel(plan.status);
                return (
                  <tr key={plan.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/users/${plan.user_id}`}
                        className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {plan.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-600">{plan.username}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">
                      {plan.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${plan.status === "completed" ? "bg-green-500" : "bg-blue-600"}`}
                            style={{ width: `${plan.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{plan.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${plan.is_public ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {plan.is_public ? "公開" : "非公開"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {plan.created_at ? new Date(plan.created_at).toLocaleDateString("ja-JP") : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            全 {plans.length} 件
          </div>
        </div>
      )}
    </div>
  );
}
