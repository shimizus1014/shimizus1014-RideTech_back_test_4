"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type UserProfile = {
  id: number;
  username: string;
  bio: string | null;
};

type Plan = {
  id: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  deadline: string | null;
  is_public?: boolean;
};

function planStatusLabel(status: string) {
  switch (status) {
    case "active":    return { label: "学習中",     cls: "bg-blue-100 text-blue-700" };
    case "completed": return { label: "完了",       cls: "bg-green-100 text-green-700" };
    case "archived":  return { label: "アーカイブ", cls: "bg-gray-100 text-gray-500" };
    default:          return { label: status,       cls: "bg-gray-100 text-gray-500" };
  }
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/users/${userId}/profile`, { headers }),
      fetch(`${API_URL}/users/${userId}/public-plans`, { headers }),
      fetch(`${API_URL}/me`, { headers }),
    ])
      .then(async ([userRes, plansRes, meRes]) => {
        if (userRes.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        if (userRes.status === 403) throw new Error("このプロフィールは非公開です");
        if (!userRes.ok) {
          const err = await userRes.json().catch(() => ({}));
          throw new Error(err.detail ?? "ユーザーが見つかりません");
        }
        const userData = await userRes.json();
        setUser(userData);
        if (meRes.ok) {
          const meData = await meRes.json();
          setIsAdmin(meData.is_admin === true);
        }
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(Array.isArray(plansData) ? plansData : []);
        }
      })
      .catch((e) => setError(e.message));
  }, [userId, router]);

  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  if (!user) return <div className="text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div className="max-w-4xl">
      {/* パンくず */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard" className="text-blue-600 hover:underline">ダッシュボード</Link>
        <span>›</span>
        <span className="text-gray-900">{user.username}</span>
      </nav>

      {/* プロフィールカード */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.username}</h1>
            {user.bio && <p className="text-sm text-gray-500 mt-1">{user.bio}</p>}
          </div>
        </div>
      </div>

      {/* 公開学習計画 */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          {isAdmin ? "学習計画（すべて）" : "公開中の学習計画"} ({plans.length})
        </h2>
        {plans.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-400">公開中の学習計画はありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const s = planStatusLabel(plan.status);
              const progressColor = plan.status === "completed" ? "bg-green-500" : "bg-blue-600";
              return (
                <Link
                  key={plan.id}
                  href={`/dashboard/users/${userId}/plans/${plan.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer block"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{plan.title}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isAdmin && plan.is_public === false && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">非公開</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </div>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{plan.description}</p>
                  )}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">達成率</span>
                      <span className="font-bold text-blue-600">{plan.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${plan.progress}%` }} />
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
