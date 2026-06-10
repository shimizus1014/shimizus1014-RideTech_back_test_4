import Link from "next/link";

export default function RegisterCompletePage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <div className="bg-white rounded-xl shadow-sm w-full max-w-sm px-10 py-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          登録が完了しました
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          ログインしてご利用ください
        </p>

        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-8 py-2 text-sm font-medium transition-colors"
        >
          ログインする
        </Link>
      </div>
    </div>
  );
}
