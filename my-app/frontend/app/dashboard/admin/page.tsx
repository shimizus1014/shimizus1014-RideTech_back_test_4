"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Stats = {
  total_users: number;
  total_plans: number;
  total_tasks: number;
  total_comments: number;
  total_knowledges: number;
  active_plans: number;
  completed_tasks: number;
};

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) { localStorage.removeItem("access_token"); router.replace("/login"); return; }
        if (r.status === 403) { setError("管理者権限が必要です"); return; }
        setStats(await r.json());
      })
      .catch(() => setError("データの取得に失敗しました"));
  }, [router]);

  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  if (!stats) return <div className="text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">管理者</span>
        <h1 className="text-xl font-semibold text-gray-900">管理ダッシュボード</h1>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="総ユーザー数" value={stats.total_users} color="text-blue-600" />
        <StatCard label="総学習計画数" value={stats.total_plans} sub={`アクティブ ${stats.active_plans} 件`} color="text-indigo-600" />
        <StatCard label="総タスク数" value={stats.total_tasks} sub={`完了 ${stats.completed_tasks} 件`} color="text-green-600" />
        <StatCard label="総コメント数" value={stats.total_comments} color="text-orange-500" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="総ナレッジ数" value={stats.total_knowledges} color="text-purple-600" />
        <StatCard
          label="タスク完了率"
          value={stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0}
          sub="全タスク対比"
          color="text-teal-600"
        />
        <StatCard
          label="アクティブプラン率"
          value={stats.total_plans > 0 ? Math.round((stats.active_plans / stats.total_plans) * 100) : 0}
          sub="全プラン対比"
          color="text-cyan-600"
        />
      </div>

      {/* クイックリンク */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">管理メニュー</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            href: "/dashboard/admin/users",
            label: "ユーザー管理",
            desc: "ユーザーの一覧・編集・削除",
            color: "text-blue-600 bg-blue-50",
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
          },
          {
            href: "/dashboard/admin/plans",
            label: "プラン管理",
            desc: "全ユーザーの学習計画一覧",
            color: "text-indigo-600 bg-indigo-50",
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            ),
          },
          {
            href: "/dashboard/admin/comments",
            label: "コメント管理",
            desc: "全コメントの確認・削除",
            color: "text-orange-600 bg-orange-50",
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ),
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
