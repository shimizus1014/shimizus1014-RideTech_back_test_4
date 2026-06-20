"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type LearningPlan = {
  id: number;
  title: string;
  progress: number;
  deadline: string | null;
};

type Task = {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
};

type DashboardData = {
  active_plan_count: number;
  completed_task_count: number;
  study_days: number;
  learning_plans: LearningPlan[];
  upcoming_tasks: Task[];
};

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "期限なし";
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "期限超過";
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  return `${diffDays}日後`;
}

function deadlineColor(deadline: string | null): string {
  if (!deadline) return "text-gray-500";
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "text-red-600";
  if (diffDays <= 1) return "text-orange-500";
  if (diffDays <= 3) return "text-yellow-600";
  return "text-gray-500";
}

function statusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "learning":
      return { label: "学習中", className: "bg-blue-100 text-blue-700" };
    case "done":
      return { label: "完了", className: "bg-green-100 text-green-700" };
    case "paused":
      return { label: "一時停止", className: "bg-yellow-100 text-yellow-800" };
    default:
      return { label: "未着手", className: "bg-gray-100 text-gray-600" };
  }
}

function deadlineDays(deadline: string | null): number {
  if (!deadline) return 999;
  const d = new Date(deadline);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch(`${API_URL}/dashboard`, {
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
      .then((json) => {
        if (json) setData(json);
      })
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) {
    return (
      <div className="text-red-500 text-sm">{error}</div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">ダッシュボード</h1>

      {/* 統計カード */}
      <div className="border border-dashed border-blue-300 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="アクティブ計画数" value={String(data.active_plan_count)} />
          <StatCard label="完了タスク数" value={String(data.completed_task_count)} />
          <StatCard label="今日の学習日数" value={`${data.study_days}日`} />
        </div>
      </div>

      {/* 進行中の学習計画 */}
      <section className="mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">進行中の学習計画</h2>
        <div className="border border-dashed border-blue-300 rounded-lg p-4">
          {data.learning_plans.length === 0 ? (
            <p className="text-sm text-gray-400">学習計画がありません</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {data.learning_plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 期限が近いタスク */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">期限が近いタスク</h2>
        <div className="border border-dashed border-blue-300 rounded-lg p-4">
          {data.upcoming_tasks.length === 0 ? (
            <p className="text-sm text-gray-400">期限が近いタスクはありません</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.upcoming_tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg px-4 py-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function PlanCard({ plan }: { plan: LearningPlan }) {
  const days = deadlineDays(plan.deadline);
  const dLabel = formatDeadline(plan.deadline);
  const dColor = deadlineColor(plan.deadline);
  const isAlert = plan.deadline !== null && days <= 3;

  return (
    <div className={`bg-white rounded-lg px-4 py-4 border ${isAlert && days < 0 ? "border-red-200" : isAlert ? "border-yellow-200" : "border-gray-100"}`}>
      <p className="text-sm font-medium text-gray-800 mb-3 leading-snug">{plan.title}</p>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div
          className="bg-blue-500 h-1.5 rounded-full"
          style={{ width: `${plan.progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{plan.progress}%</span>
        {plan.deadline && (
          <span className={`flex items-center gap-1 font-medium ${dColor}`}>
            {isAlert && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            {dLabel !== "期限なし" ? `期限 ${dLabel}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { label, className } = statusLabel(task.status);
  const dLabel = formatDeadline(task.deadline);
  const dColor = deadlineColor(task.deadline);

  return (
    <div className="flex items-center justify-between bg-white rounded-md px-4 py-3 border border-gray-100">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-800">{task.title}</span>
        <span className={`text-xs font-medium ${dColor}`}>
          {dLabel !== "期限なし" ? `期限 ${dLabel}` : ""}
        </span>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>
        {label}
      </span>
    </div>
  );
}
