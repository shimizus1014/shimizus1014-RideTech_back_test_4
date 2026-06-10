"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setEmailError("メールアドレスを入力してください");
      return;
    }
    setEmailError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "エラーが発生しました");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("サーバーに接続できませんでした");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow-sm w-full max-w-sm px-10 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          パスワード再発行
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          登録済みのメールアドレスを入力してください
        </p>

        {message ? (
          <div className="text-center">
            <p className="text-sm text-green-600 bg-green-50 rounded-md px-4 py-3 mb-6">
              {message}
            </p>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              ログインに戻る
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="example@email.com"
                className={`border rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  emailError
                    ? "border-red-500 focus:ring-red-500 bg-red-50"
                    : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                }`}
              />
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md py-2 text-sm font-medium transition-colors"
            >
              {loading ? "送信中..." : "送信する"}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                ログインに戻る
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
