"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Plan = {
  id: number;
  title: string;
  status: string;
  progress: number;
  deadline: string | null;
  is_public: boolean;
  user_id: number;
  username: string;
  icon_url: string | null;
  is_own: boolean;
};

type Task = {
  id: number;
  learning_plan_id: number;
  title: string;
  status: string;
  deadline: string | null;
  user_id: number;
  username: string;
  icon_url: string | null;
  is_own: boolean;
};

function planStatusLabel(s: string) {
  switch (s) {
    case "active":    return { label: "学習中",     cls: "bg-blue-100 text-blue-700" };
    case "completed": return { label: "完了",       cls: "bg-green-100 text-green-700" };
    case "archived":  return { label: "アーカイブ", cls: "bg-gray-100 text-gray-500" };
    default:          return { label: s,            cls: "bg-gray-100 text-gray-500" };
  }
}

function taskStatusLabel(s: string) {
  switch (s) {
    case "learning": return { label: "学習中",   cls: "bg-blue-100 text-blue-700" };
    case "done":     return { label: "完了",     cls: "bg-green-100 text-green-700" };
    case "paused":   return { label: "一時停止", cls: "bg-yellow-100 text-yellow-800" };
    default:         return { label: "未着手",   cls: "bg-gray-100 text-gray-500" };
  }
}

function UserChip({
  userId,
  username,
  iconUrl,
  isOwn,
  onClick,
}: {
  userId: number;
  username: string;
  iconUrl: string | null;
  isOwn: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={isOwn ? "マイプロフィール" : `${username} のプロフィール`}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0 group"
    >
      <div className="w-5 h-5 rounded-full bg-blue-600 overflow-hidden flex items-center justify-center flex-shrink-0">
        {iconUrl ? (
          <Image
            src={`${API_URL}${iconUrl}`}
            alt={username}
            width={20}
            height={20}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <span className="text-white text-[10px] font-bold leading-none">
            {username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span className="group-hover:underline truncate max-w-[80px]">
        {isOwn ? "自分" : username}
      </span>
    </button>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searched, setSearched] = useState(!!searchParams.get("q"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setPlans([]); setTasks([]); setSearched(false); return; }
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setPlans(data.plans ?? []);
      setTasks(data.tasks ?? []);
    } catch {
      setError("検索に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (query) doSearch(query);
  }, [query, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuery(inputValue);
    router.replace(`/dashboard/search?q=${encodeURIComponent(inputValue)}`);
  }

  function navigateToProfile(e: React.MouseEvent, isOwn: boolean, userId: number) {
    e.preventDefault();
    e.stopPropagation();
    router.push(isOwn ? "/dashboard/profile" : `/dashboard/users/${userId}`);
  }

  const totalResults = plans.length + tasks.length;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">検索</h1>

      {/* 検索フォーム */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="学習計画・タスク名で検索..."
            autoFocus
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          {loading ? "検索中..." : "検索"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {!searched ? (
        <div className="text-center py-16 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">キーワードを入力して検索してください</p>
          <p className="text-xs mt-1">自分の計画・タスク、および他ユーザーの公開計画を横断検索できます</p>
        </div>
      ) : loading ? (
        <div className="text-gray-400 text-sm text-center py-8">検索中...</div>
      ) : totalResults === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-gray-500 font-medium">「{query}」の検索結果はありません</p>
          <p className="text-xs text-gray-400 mt-1">別のキーワードをお試しください</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 mb-4">{totalResults} 件の結果</p>

          {/* 学習計画 */}
          {plans.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                学習計画 ({plans.length})
              </h2>
              <div className="flex flex-col gap-2">
                {plans.map((plan) => {
                  const s = planStatusLabel(plan.status);
                  const href = plan.is_own
                    ? `/dashboard/plans/${plan.id}`
                    : `/dashboard/users/${plan.user_id}/plans/${plan.id}`;
                  return (
                    <Link
                      key={plan.id}
                      href={href}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{plan.title}</p>
                          <UserChip
                            userId={plan.user_id}
                            username={plan.username}
                            iconUrl={plan.icon_url}
                            isOwn={plan.is_own}
                            onClick={(e) => navigateToProfile(e, plan.is_own, plan.user_id)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-400">{plan.progress}%</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* タスク */}
          {tasks.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                タスク ({tasks.length})
              </h2>
              <div className="flex flex-col gap-2">
                {tasks.map((task) => {
                  const s = taskStatusLabel(task.status);
                  const href = task.is_own
                    ? `/dashboard/plans/${task.learning_plan_id}/tasks/${task.id}`
                    : `/dashboard/users/${task.user_id}/plans/${task.learning_plan_id}/tasks/${task.id}`;
                  return (
                    <Link
                      key={task.id}
                      href={href}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                          <UserChip
                            userId={task.user_id}
                            username={task.username}
                            iconUrl={task.icon_url}
                            isOwn={task.is_own}
                            onClick={(e) => navigateToProfile(e, task.is_own, task.user_id)}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm">読み込み中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
