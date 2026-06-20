"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const NOTIF_KEY = "settings_notifications";
const PRIVACY_KEY = "settings_privacy";

type Tab = "account" | "notifications" | "privacy";

type DeleteStep = {
  label: string;
  status: "pending" | "running" | "done";
};

type NotifSettings = {
  taskDeadline: boolean;
  newComment: boolean;
  weeklySummary: boolean;
  systemAnnouncement: boolean;
};

type PrivacySettings = {
  profileVisibility: "public" | "private";
  showInSearch: boolean;
  defaultPlanPublic: boolean;
  showStats: boolean;
};

const DEFAULT_NOTIF: NotifSettings = {
  taskDeadline: true,
  newComment: true,
  weeklySummary: false,
  systemAnnouncement: true,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: "public",
  showInSearch: true,
  defaultPlanPublic: false,
  showStats: true,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("account");
  const [email, setEmail] = useState("");
  const [mounted, setMounted] = useState(false);

  // 通知設定
  const [notif, setNotif] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  // プライバシー設定
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  // パスワード変更
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // アカウント削除モーダル
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // S-024 削除中ステップ
  const [deleteSteps, setDeleteSteps] = useState<DeleteStep[]>([
    { label: "学習計画・タスクを削除", status: "pending" },
    { label: "ナレッジ・コメントを削除", status: "pending" },
    { label: "アカウント情報を削除", status: "pending" },
    { label: "セッションを終了", status: "pending" },
  ]);

  const confirmInputRef = useRef<HTMLInputElement>(null);

  function getToken() {
    return localStorage.getItem("access_token");
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((d) => { if (d?.email) setEmail(d.email); });

    // 通知設定は引き続き localStorage
    try {
      const savedNotif = localStorage.getItem(NOTIF_KEY);
      if (savedNotif) setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(savedNotif) });
    } catch { /* ignore */ }

    // プライバシー設定はバックエンドから取得
    fetch(`${API_URL}/me/privacy`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setPrivacy({
            profileVisibility: d.profile_visibility === "private" ? "private" : "public",
            showInSearch: d.show_in_search ?? true,
            showStats: d.show_stats ?? true,
            defaultPlanPublic: d.default_plan_public ?? false,
          });
        }
      })
      .catch(() => {});

    setMounted(true);
  }, [router]);

  function handleNotifSave() {
    setNotifSaving(true);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notif));
    setTimeout(() => {
      setNotifSaving(false);
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 2500);
    }, 400);
  }

  async function handlePrivacySave() {
    setPrivacySaving(true);
    const token = getToken();
    const res = await fetch(`${API_URL}/me/privacy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        profile_visibility: privacy.profileVisibility,
        show_in_search: privacy.showInSearch,
        show_stats: privacy.showStats,
        default_plan_public: privacy.defaultPlanPublic,
      }),
    });
    setPrivacySaving(false);
    if (res.ok) {
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 2500);
    }
  }

  // モーダル表示時にフォーカス
  useEffect(() => {
    if (deleteModal) {
      setTimeout(() => confirmInputRef.current?.focus(), 50);
    }
  }, [deleteModal]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.next !== pwForm.confirm) {
      setPwError("新しいパスワードと確認用が一致しません");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("新しいパスワードは8文字以上で入力してください");
      return;
    }
    setPwSaving(true);
    const res = await fetch(`${API_URL}/me/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPwError(data.detail ?? "パスワード変更に失敗しました");
    } else {
      setPwSuccess("パスワードを変更しました");
      setPwForm({ current: "", next: "", confirm: "" });
    }
    setPwSaving(false);
  }

  async function handleDeleteConfirm() {
    if (!deletePassword) {
      setDeleteError("パスワードを入力してください");
      return;
    }
    setDeleting(true);
    setDeleteError("");

    // ステップアニメーション + API呼び出し
    const steps: DeleteStep[] = [
      { label: "学習計画・タスクを削除", status: "running" },
      { label: "ナレッジ・コメントを削除", status: "pending" },
      { label: "アカウント情報を削除", status: "pending" },
      { label: "セッションを終了", status: "pending" },
    ];
    setDeleteSteps([...steps]);

    await new Promise((r) => setTimeout(r, 700));
    steps[0] = { ...steps[0], status: "done" };
    steps[1] = { ...steps[1], status: "running" };
    setDeleteSteps([...steps]);

    // 実際の API コール
    const res = await fetch(`${API_URL}/me`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ password: deletePassword }),
    });

    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.detail ?? "アカウント削除に失敗しました");
      setDeleting(false);
      setDeleteSteps([
        { label: "学習計画・タスクを削除", status: "pending" },
        { label: "ナレッジ・コメントを削除", status: "pending" },
        { label: "アカウント情報を削除", status: "pending" },
        { label: "セッションを終了", status: "pending" },
      ]);
      return;
    }

    // 成功ステップアニメーション
    await new Promise((r) => setTimeout(r, 600));
    steps[1] = { ...steps[1], status: "done" };
    steps[2] = { ...steps[2], status: "running" };
    setDeleteSteps([...steps]);
    await new Promise((r) => setTimeout(r, 500));
    steps[2] = { ...steps[2], status: "done" };
    steps[3] = { ...steps[3], status: "running" };
    setDeleteSteps([...steps]);
    await new Promise((r) => setTimeout(r, 500));
    steps[3] = { ...steps[3], status: "done" };
    setDeleteSteps([...steps]);
    await new Promise((r) => setTimeout(r, 400));

    localStorage.removeItem("access_token");
    router.replace("/login");
  }

  if (!mounted) return <div className="text-gray-400 text-sm p-4">読み込み中...</div>;

  // S-024 削除中フルスクリーン
  if (deleting) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="flex flex-col items-center text-center max-w-sm w-full px-6">
          {/* スピナー */}
          <div className="mb-8">
            <div className="w-13 h-13 border-4 border-white/20 border-t-white rounded-full animate-spin" style={{ width: 52, height: 52 }} />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">アカウントを削除しています</h1>
          <p className="text-sm text-slate-400 mb-10">しばらくお待ちください。ページを閉じないでください。</p>

          {/* ステップ */}
          <div className="w-full flex flex-col gap-3 mb-10">
            {deleteSteps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                  step.status === "running"
                    ? "bg-blue-900/40 border border-blue-700/50 animate-pulse"
                    : step.status === "done"
                    ? "bg-white/5"
                    : "bg-white/[0.03]"
                }`}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  {step.status === "done" ? (
                    <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  ) : step.status === "running" ? (
                    <div className="w-6 h-6 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-xs text-slate-500 font-bold">{i + 1}</span>
                    </div>
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  step.status === "done" ? "text-green-300" :
                  step.status === "running" ? "text-blue-300" : "text-slate-500"
                }`}>
                  {step.label}{step.status === "done" ? "しました" : step.status === "running" ? "中…" : ""}
                </span>
              </div>
            ))}
          </div>

          {/* 警告 */}
          <div className="w-full bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-4 py-3 flex items-start gap-2 text-left">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-yellow-300 leading-relaxed">
              ページを閉じたりブラウザを終了しないでください。<br />
              削除が完了すると自動的にトップページに移動します。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">設定</h1>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["account", "notifications", "privacy"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { account: "アカウント", notifications: "通知", privacy: "プライバシー" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "account" && (
        <>
          {/* メールアドレスセクション */}
          <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">メールアドレス</h2>
              <p className="text-xs text-gray-500 mt-0.5">ログインに使用するメールアドレス</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">現在のメールアドレス</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500 bg-gray-50 max-w-xs"
                />
                <p className="text-xs text-gray-400 mt-1">メールアドレスの変更は現在準備中です</p>
              </div>
            </div>
          </div>

          {/* パスワード変更セクション */}
          <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">パスワード</h2>
              <p className="text-xs text-gray-500 mt-0.5">セキュリティのため定期的な変更を推奨します</p>
            </div>
            <form onSubmit={handlePasswordChange} className="px-6 py-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">現在のパスワード</label>
                  <input
                    type="password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                    required
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-xs"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">新しいパスワード</label>
                  <input
                    type="password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                    required
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-xs"
                    placeholder="••••••••（8文字以上）"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">新しいパスワード（確認）</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                    required
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-xs"
                    placeholder="••••••••"
                  />
                </div>

                {pwError && <p className="text-sm text-red-500">{pwError}</p>}
                {pwSuccess && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {pwSuccess}
                  </p>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {pwSaving ? "変更中..." : "パスワードを変更する"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* アカウント削除（危険ゾーン） */}
          <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50">
              <h2 className="text-sm font-semibold text-red-700">アカウント削除</h2>
              <p className="text-xs text-gray-500 mt-0.5">一度削除すると元に戻せません</p>
            </div>
            <div className="px-6 py-5 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600 max-w-sm">
                すべての学習計画・タスク・ナレッジが完全に削除されます。この操作は取り消せません。
              </p>
              <button
                onClick={() => {
                  setDeleteModal(true);
                  setDeleteConfirmText("");
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="flex-shrink-0 text-sm px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                アカウントを削除する
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "notifications" && (
        <>
          {notifSuccess && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              通知設定を保存しました
            </div>
          )}

          {/* タスク・学習通知 */}
          <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">タスク・学習</h2>
              <p className="text-xs text-gray-500 mt-0.5">学習計画とタスクに関する通知</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">タスク期限リマインダー</p>
                  <p className="text-xs text-gray-500 mt-0.5">期限が近いタスクを事前にお知らせします</p>
                </div>
                <Toggle checked={notif.taskDeadline} onChange={(v) => setNotif((n) => ({ ...n, taskDeadline: v }))} />
              </div>
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">週次学習サマリー</p>
                  <p className="text-xs text-gray-500 mt-0.5">毎週月曜日に先週の学習進捗をお届けします</p>
                </div>
                <Toggle checked={notif.weeklySummary} onChange={(v) => setNotif((n) => ({ ...n, weeklySummary: v }))} />
              </div>
            </div>
          </div>

          {/* コミュニティ通知 */}
          <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">コミュニティ</h2>
              <p className="text-xs text-gray-500 mt-0.5">他のユーザーからのアクティビティ</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">新着コメント通知</p>
                  <p className="text-xs text-gray-500 mt-0.5">自分の学習計画やタスクにコメントがついたとき</p>
                </div>
                <Toggle checked={notif.newComment} onChange={(v) => setNotif((n) => ({ ...n, newComment: v }))} />
              </div>
            </div>
          </div>

          {/* システム通知 */}
          <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">システム</h2>
              <p className="text-xs text-gray-500 mt-0.5">サービスからのお知らせ</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">システムからのお知らせ</p>
                  <p className="text-xs text-gray-500 mt-0.5">機能追加・メンテナンス情報などのお知らせ</p>
                </div>
                <Toggle checked={notif.systemAnnouncement} onChange={(v) => setNotif((n) => ({ ...n, systemAnnouncement: v }))} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleNotifSave}
              disabled={notifSaving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {notifSaving ? "保存中..." : "設定を保存する"}
            </button>
          </div>
        </>
      )}

      {tab === "privacy" && (
        <>
          {privacySuccess && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              プライバシー設定を保存しました
            </div>
          )}

          {/* プロフィール公開設定 */}
          <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">プロフィール公開設定</h2>
              <p className="text-xs text-gray-500 mt-0.5">あなたのプロフィールを誰が見られるか設定します</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-col gap-2">
                {(
                  [
                    { value: "public",  label: "全員に公開", desc: "他のユーザーもプロフィールを閲覧できます" },
                    { value: "private", label: "非公開",     desc: "自分のみ閲覧できます（ユーザー検索にも表示されません）" },
                  ] as { value: PrivacySettings["profileVisibility"]; label: string; desc: string }[]
                ).map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      privacy.profileVisibility === value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="profileVisibility"
                      value={value}
                      checked={privacy.profileVisibility === value}
                      onChange={() => setPrivacy((p) => ({ ...p, profileVisibility: value }))}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 検索・ディスカバリー */}
          <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">検索・ディスカバリー</h2>
              <p className="text-xs text-gray-500 mt-0.5">他のユーザーからの見え方を設定します</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">ユーザー検索に表示</p>
                  <p className="text-xs text-gray-500 mt-0.5">オフにするとユーザー検索に表示されなくなります</p>
                </div>
                <Toggle checked={privacy.showInSearch} onChange={(v) => setPrivacy((p) => ({ ...p, showInSearch: v }))} />
              </div>
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">統計情報を公開</p>
                  <p className="text-xs text-gray-500 mt-0.5">完了タスク数や公開プラン数をプロフィールに表示します</p>
                </div>
                <Toggle checked={privacy.showStats} onChange={(v) => setPrivacy((p) => ({ ...p, showStats: v }))} />
              </div>
            </div>
          </div>

          {/* 学習計画のデフォルト設定 */}
          <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">学習計画のデフォルト設定</h2>
              <p className="text-xs text-gray-500 mt-0.5">新規作成時の初期値</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">新規学習計画をデフォルトで公開</p>
                  <p className="text-xs text-gray-500 mt-0.5">オンにすると新規作成時に「公開」がデフォルトになります</p>
                </div>
                <Toggle checked={privacy.defaultPlanPublic} onChange={(v) => setPrivacy((p) => ({ ...p, defaultPlanPublic: v }))} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handlePrivacySave}
              disabled={privacySaving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {privacySaving ? "保存中..." : "設定を保存する"}
            </button>
          </div>
        </>
      )}

      {/* ── 削除確認モーダル（S-023-delete-confirm） ── */}
      {deleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden mx-4">

            {/* モーダルヘッダー */}
            <div className="px-6 py-5 border-b border-red-100 bg-red-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-red-800">アカウントを削除しますか？</h2>
                <p className="text-xs text-gray-500 mt-0.5">この操作は取り消すことができません</p>
              </div>
            </div>

            {/* モーダルボディ */}
            <div className="px-6 py-5">
              {/* 削除される内容 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
                <p className="text-xs font-semibold text-red-700 mb-2">削除される内容</p>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "すべての学習計画とタスク",
                    "蓄積したナレッジ・メモ",
                    "投稿したコメント",
                    "アカウント情報（復元不可）",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 確認テキスト入力 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  確認のため{" "}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-red-600 font-bold">削除する</code>
                  {" "}と入力してください
                </label>
                <input
                  ref={confirmInputRef}
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="削除する"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">「削除する」と完全一致で入力してください</p>
              </div>

              {/* パスワード入力 */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード確認</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="現在のパスワードを入力"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {deleteError && <p className="text-sm text-red-500 mb-4">{deleteError}</p>}

              {/* ボタン */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmText !== "削除する" || !deletePassword}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  削除する
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">
                「削除する」と入力 + パスワード入力で削除ボタンが有効になります
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
