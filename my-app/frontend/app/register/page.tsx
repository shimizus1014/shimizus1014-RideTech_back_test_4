"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type FormData = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

type FieldErrors = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

function inputCls(hasError: boolean) {
  return `border rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-500 focus:ring-red-500 bg-red-50"
      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
  }`;
}

const emptyFieldErrors: FieldErrors = { username: "", email: "", password: "", passwordConfirm: "" };

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyFieldErrors);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const errs: FieldErrors = { ...emptyFieldErrors };
    if (!form.username.trim()) errs.username = "ユーザー名を入力してください";
    if (!form.email.trim()) errs.email = "メールアドレスを入力してください";
    if (!form.password) {
      errs.password = "パスワードを入力してください";
    } else if (form.password.length < 8) {
      errs.password = "パスワードは8文字以上で入力してください";
    }
    if (!form.passwordConfirm) {
      errs.passwordConfirm = "確認用パスワードを入力してください";
    } else if (form.password !== form.passwordConfirm) {
      errs.passwordConfirm = "パスワードが一致しません";
    }

    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setStep(2);
  }

  async function handleRegister() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "登録に失敗しました");
        setStep(1);
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      router.push("/register/complete");
    } catch {
      setError("サーバーに接続できませんでした");
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  if (step === 2) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-sm px-10 py-10">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">
            登録内容の確認
          </h1>

          <table className="w-full text-sm mb-6">
            <tbody>
              <tr className="border border-gray-200">
                <td className="bg-gray-50 px-4 py-3 text-gray-600 w-1/3">
                  ユーザー名
                </td>
                <td className="px-4 py-3 text-gray-900">{form.username}</td>
              </tr>
              <tr className="border border-gray-200 border-t-0">
                <td className="bg-gray-50 px-4 py-3 text-gray-600">
                  メールアドレス
                </td>
                <td className="px-4 py-3 text-gray-900">{form.email}</td>
              </tr>
              <tr className="border border-gray-200 border-t-0">
                <td className="bg-gray-50 px-4 py-3 text-gray-600">
                  パスワード
                </td>
                <td className="px-4 py-3 text-gray-900">
                  {"•".repeat(form.password.length)}
                </td>
              </tr>
            </tbody>
          </table>

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleRegister}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md py-2 text-sm font-medium transition-colors"
            >
              {loading ? "登録中..." : "登録する"}
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md py-2 text-sm font-medium transition-colors"
            >
              修正する
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow-sm w-full max-w-sm px-10 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          アカウント作成
        </h1>

        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="例：田中太郎"
              className={inputCls(!!fieldErrors.username)}
            />
            {fieldErrors.username && (
              <p className="text-xs text-red-500">{fieldErrors.username}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              className={inputCls(!!fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">
              パスワード <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••（8文字以上）"
              className={inputCls(!!fieldErrors.password)}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">
              パスワード（確認） <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="••••••••"
              className={inputCls(!!fieldErrors.passwordConfirm)}
            />
            {fieldErrors.passwordConfirm && (
              <p className="text-xs text-red-500">{fieldErrors.passwordConfirm}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 text-sm font-medium transition-colors"
          >
            確認する
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              ログインはこちら
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
