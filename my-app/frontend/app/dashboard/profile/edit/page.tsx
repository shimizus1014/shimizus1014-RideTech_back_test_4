"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type User = {
  id: number;
  username: string;
  bio: string | null;
  icon_url: string | null;
};

export default function ProfileEditPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", bio: "" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      .then((data) => {
        if (data) {
          setUser(data);
          setForm({ username: data.username ?? "", bio: data.bio ?? "" });
        }
      });
  }, [router]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("対応形式: JPEG, PNG, GIF, WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("ファイルサイズは2MB以下にしてください");
      return;
    }

    setError("");
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim()) {
      setError("ユーザー名を入力してください");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const token = getToken();

    // Step 1: 画像アップロード（ファイルが選択されている場合）
    if (avatarFile) {
      const formData = new FormData();
      formData.append("file", avatarFile);
      const avatarRes = await fetch(`${API_URL}/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!avatarRes.ok) {
        const data = await avatarRes.json();
        setError(data.detail ?? "画像のアップロードに失敗しました");
        setSaving(false);
        return;
      }
    }

    // Step 2: プロフィール情報を更新
    const res = await fetch(`${API_URL}/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: form.username.trim(),
        bio: form.bio.trim() || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.detail ?? "保存に失敗しました");
      setSaving(false);
      return;
    }

    setUser(data);
    setAvatarFile(null);
    setSuccess("プロフィールを保存しました");
    setSaving(false);
    setTimeout(() => router.push("/dashboard/profile"), 800);
  }

  function getAvatarSrc(): string | null {
    if (previewUrl) return previewUrl;
    if (user?.icon_url) return `${API_URL}${user.icon_url}`;
    return null;
  }

  if (!user) return <div className="text-gray-400 text-sm p-4">読み込み中...</div>;

  const avatarSrc = getAvatarSrc();

  return (
    <div className="max-w-2xl">
      {/* ページヘッダー */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          マイプロフィール
        </Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <h1 className="text-xl font-semibold text-gray-900">プロフィール編集</h1>
      </div>

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* プロフィール画像セクション */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">プロフィール画像</h2>
        <div className="flex items-center gap-5">
          {/* アバタープレビュー */}
          <div className="relative w-[72px] h-[72px] flex-shrink-0">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt="プロフィール画像"
                width={72}
                height={72}
                className="w-full h-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            {/* 変更中バッジ */}
            {avatarFile && (
              <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                変更中
              </span>
            )}
          </div>

          <div>
            {/* 隠しファイル入力 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm px-3.5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {avatarFile ? "別の画像を選択" : "画像を変更"}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">PNG / JPG / GIF / WebP（最大 2MB）</p>
            {avatarFile && (
              <p className="text-xs text-blue-600 mt-0.5">{avatarFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* 基本情報セクション */}
      <form onSubmit={handleSave}>
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">基本情報</h2>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                ユーザー名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                maxLength={50}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-sm"
                placeholder="ユーザー名"
              />
              <p className="text-xs text-gray-400">最大 50 文字</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">自己紹介</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
                maxLength={500}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="自己紹介を入力してください（任意）"
              />
              <div className="flex justify-between">
                <p className="text-xs text-gray-400">最大 500 文字</p>
                <p className="text-xs text-gray-400">{form.bio.length} / 500</p>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        {/* 保存・キャンセル */}
        <div className="flex justify-end gap-2">
          <Link
            href="/dashboard/profile"
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {saving ? "保存中..." : "変更を保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
