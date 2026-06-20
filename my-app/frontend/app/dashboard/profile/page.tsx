"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type User = {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  icon_url: string | null;
  is_admin: boolean;
  created_at: string | null;
};

type Plan = {
  id: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  is_public: boolean;
};

function planStatusBadge(status: string) {
  switch (status) {
    case "active":    return { label: "進行中",     cls: "bg-blue-100 text-blue-700" };
    case "completed": return { label: "完了",       cls: "bg-green-100 text-green-700" };
    case "archived":  return { label: "アーカイブ", cls: "bg-gray-100 text-gray-500" };
    default:          return { label: status,       cls: "bg-gray-100 text-gray-500" };
  }
}

function formatJoinDate(isoStr: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月に参加`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [error, setError] = useState("");

  function getToken() {
    return localStorage.getItem("access_token");
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }

    Promise.all([
      fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/learning-plans`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([meRes, plansRes, dashRes]) => {
        if (meRes.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        const [meData, plansData, dashData] = await Promise.all([
          meRes.json(),
          plansRes.ok ? plansRes.json() : [],
          dashRes.ok ? dashRes.json() : {},
        ]);
        setUser(meData);
        setPlans(Array.isArray(plansData) ? plansData : []);
        setCompletedTasks(dashData.completed_task_count ?? 0);
      })
      .catch(() => setError("データの読み込みに失敗しました"));
  }, [router]);

  if (error) return <div className="text-red-500 text-sm p-4">{error}</div>;
  if (!user) return <div className="text-gray-400 text-sm p-4">読み込み中...</div>;

  const publicPlans = plans.filter((p) => p.is_public);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">マイプロフィール</h1>

      {/* プロフィールヘッダーカード */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 flex items-start gap-6">
        {/* アバター */}
        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden">
          {user.icon_url ? (
            <Image
              src={`${API_URL}${user.icon_url}`}
              alt="プロフィール画像"
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* 名前 + 編集ボタン */}
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900 truncate">{user.username}</h2>
            {user.is_admin && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex-shrink-0">
                管理者
              </span>
            )}
            <Link
              href="/dashboard/profile/edit"
              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors flex-shrink-0 ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集する
            </Link>
          </div>

          {/* 自己紹介 */}
          {user.bio ? (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{user.bio}</p>
          ) : (
            <p className="text-sm text-gray-400 italic mb-3">自己紹介が設定されていません</p>
          )}

          {/* 統計 */}
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <span>
              <strong className="text-gray-900 font-semibold">{publicPlans.length}</strong>
              {" "}公開学習計画
            </span>
            <span>
              <strong className="text-gray-900 font-semibold">{completedTasks}</strong>
              {" "}完了タスク
            </span>
            {user.created_at && (
              <span>{formatJoinDate(user.created_at)}</span>
            )}
          </div>
        </div>
      </div>

      {/* 公開学習計画セクション */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">公開学習計画</h3>
          <Link href="/dashboard/plans" className="text-sm text-blue-600 hover:underline">
            すべて見る →
          </Link>
        </div>

        {publicPlans.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400">公開中の学習計画はありません</p>
            <Link
              href="/dashboard/plans"
              className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              学習計画を作成する →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicPlans.slice(0, 4).map((plan) => {
              const s = planStatusBadge(plan.status);
              return (
                <Link
                  key={plan.id}
                  href={`/dashboard/plans/${plan.id}`}
                  className="bg-slate-50 border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all block"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{plan.title}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>達成率</span>
                      <span className="font-bold text-blue-600">{plan.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-blue-600"
                        style={{ width: `${plan.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
