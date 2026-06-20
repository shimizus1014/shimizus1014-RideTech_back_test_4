"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type User = { id: number; username: string; email: string; is_admin: boolean; icon_url: string | null };

type Notification = {
  id: number;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string | null;
};

const navItems = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    exact: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/plans",
    label: "学習計画一覧",
    exact: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/search",
    label: "検索",
    exact: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/users",
    label: "ユーザー検索",
    exact: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const adminItems = [
  {
    href: "/dashboard/admin",
    label: "管理ダッシュボード",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/admin/users",
    label: "ユーザー管理",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/admin/plans",
    label: "プラン管理",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: "/dashboard/admin/comments",
    label: "コメント管理",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 通知
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  function getToken() { return localStorage.getItem("access_token"); }

  const fetchUnreadCount = useCallback(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setUnreadCount(d.count ?? 0); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.id) setUser(d); })
      .catch(() => {});

    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  // クリック外でドロップダウンを閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function openNotifPanel() {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setNotifications(await res.json());
    setNotifOpen((v) => !v);
  }

  async function markRead(id: number, link: string | null) {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_URL}/notifications/${id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    if (link) { setNotifOpen(false); router.push(link); }
  }

  async function markAllRead() {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_URL}/notifications/read-all`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function timeAgo(isoStr: string | null): string {
    if (!isoStr) return "";
    const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
    if (diff < 60) return "たった今";
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/login");
  }

  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex flex-col relative">

      {/* アバターエリア（クリックでドロップダウン） */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className={`w-full flex items-center gap-2 px-4 py-4 border-b border-gray-200 transition-colors text-left ${
            dropdownOpen ? "bg-blue-50" : "hover:bg-gray-50"
          }`}
        >
          <div className={`w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 transition-shadow overflow-hidden ${
            dropdownOpen ? "ring-2 ring-white ring-offset-1 ring-offset-blue-600" : ""
          }`}>
            {user?.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${API_URL}${user.icon_url}`}
                alt="アバター"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <span className="text-sm font-semibold text-gray-800 flex-1 truncate">学習管理システム</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180 text-blue-600" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* ドロップダウンメニュー */}
        {dropdownOpen && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {/* ユーザー情報 */}
            <div className="px-3.5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.username ?? "読み込み中..."}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.email ?? ""}</p>
            </div>

            <div className="py-1">
              <Link
                href="/dashboard/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                マイプロフィール
              </Link>
              <Link
                href="/dashboard/profile/edit"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                プロフィール編集
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                設定
              </Link>

              <div className="h-px bg-gray-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {user?.is_admin && (
          <>
            <div className="px-4 pt-4 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">管理者</p>
            </div>
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-purple-50 text-purple-700 font-medium border-r-2 border-purple-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* 通知ベルボタン */}
      <div className="border-t border-gray-200 p-3" ref={notifRef}>
        <button
          onClick={openNotifPanel}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
            notifOpen ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <div className="relative flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span>通知</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-xs font-semibold text-red-500">{unreadCount}</span>
          )}
        </button>

        {/* 通知パネル（サイドバー右に展開） */}
        {notifOpen && (
          <div className="fixed top-0 left-52 w-80 h-screen bg-white border-r border-gray-200 shadow-xl z-40 flex flex-col">
            {/* パネルヘッダー */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">通知</h2>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:underline"
                >
                  すべて既読
                </button>
              )}
            </div>

            {/* 通知一覧 */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm text-gray-400">通知はありません</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id, n.link)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                        !n.is_read ? "bg-blue-50/60" : ""
                      }`}
                    >
                      {/* アイコン */}
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        !n.is_read ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${!n.is_read ? "text-blue-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${!n.is_read ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                          {n.message}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
