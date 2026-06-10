# 学習管理システム

個人の学習計画・タスクを管理し、進捗を可視化するWebアプリケーションです。

<!-- TODO: 実装完了後にスクリーンショットを追加 -->
<!-- ![スクリーンショット](./docs/screenshot.png) -->

---

## 技術スタック

| 層 | 技術 | バージョン |
|---|---|---|
| フロントエンド | Next.js (App Router) | 16.2.7 |
| フロントエンド | React | 19.2.4 |
| フロントエンド | TypeScript | ^5 |
| フロントエンド | Tailwind CSS | ^4 |
| バックエンド | FastAPI | 最新 |
| バックエンド | SQLAlchemy | 最新 |
| バックエンド | Python | 3.x |
| データベース | MySQL | 8.0 |
| 認証 | JWT (python-jose + bcrypt) | - |
| 実行環境 | Docker / Docker Compose | - |

---

## ディレクトリ構成

```
8.自主開発/
├── my-app/
│   ├── backend/            # FastAPI バックエンド
│   │   ├── main.py         # APIエンドポイント
│   │   ├── models.py       # SQLAlchemy ORM モデル
│   │   ├── schemas.py      # Pydantic スキーマ
│   │   ├── auth.py         # JWT認証
│   │   ├── database.py     # DB接続設定
│   │   └── requirements.txt
│   ├── frontend/           # Next.js フロントエンド
│   │   └── app/            # App Router
│   ├── figma-mockup/       # UIモックアップ（HTML）
│   └── docker-compose.yml
├── ER図/                   # ER図 (PDF)
├── テーブル定義書/          # テーブル定義書 (PDF)
├── 画面要件表/              # 画面要件表 (PDF)
├── 機能要件表/              # 機能要件表 (PDF)
└── README.md               # このファイル
```

---

## 起動方法

### 前提条件
- Docker Desktop がインストール・起動済みであること

### 手順

```bash
# 1. リポジトリのルートに移動
cd my-app

# 2. コンテナをビルドして起動
docker compose up --build

# 3. ブラウザでアクセス
#    フロントエンド: http://localhost:3000
#    バックエンドAPI: http://localhost:8000
#    APIドキュメント: http://localhost:8000/docs
```

### コンテナを停止する

```bash
docker compose down
```

### データ（DBボリューム）ごと削除する

```bash
docker compose down -v
```

---

## 環境変数

### フロントエンド（`my-app/frontend/.env.local`）

| 変数名 | デフォルト値 | 説明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | バックエンドAPIのURL |

> `.env.local` が存在しない場合はデフォルト値が使用されます。

### バックエンド

| 変数名 | デフォルト値 | 説明 |
|---|---|---|
| DB接続情報 | `database.py` 内に記載 | MySQL接続URL |

<!-- TODO: 本番環境用の環境変数設定手順を追記 -->

---

## デフォルトアカウント

初回起動時に以下の管理者アカウントが自動作成されます。

| 項目 | 値 |
|---|---|
| メールアドレス | `admin@example.com` |
| パスワード | `admin1234` |
| ロール | 管理者 |

> ⚠️ 本番環境では必ずパスワードを変更してください。

---

## 主な機能

### 一般ユーザー

| 機能ID | 機能名 | 概要 |
|---|---|---|
| F-001 | ログイン / ログアウト | メール・パスワードで認証 |
| F-003 | パスワード再発行 | メールアドレスへ再設定リンク送信 |
| F-004 | ユーザー登録 | 新規アカウントを作成 |
| F-005 | プロフィール表示・編集 | アイコン・自己紹介の管理 |
| F-007 | 学習計画 CRUD | 学習計画の作成・編集・削除 |
| F-012 | タスク CRUD | タスクの作成・編集・削除 |
| F-017 | タスク状態管理 | 未着手 / 学習中 / 完了 / 一時停止 |
| F-018 | 理解度管理 | タスクの理解度を5段階で記録 |
| F-019 | 学習進捗率表示 | タスク達成率からの進捗算出 |
| F-020 | 学習ナレッジ管理 | URL・メモ・コードの記録 |
| F-021 | コメント投稿・閲覧 | 学習計画・タスクへのコメント |
| F-023 | ユーザー検索 | ユーザー名・学習計画名で検索 |
| F-025 | 公開学習計画閲覧 | 他ユーザーの公開計画を閲覧 |
| F-030 | パスワード変更 | 設定画面からパスワードを変更 |
| F-031 | アカウント削除 | 自身のアカウントと関連データを削除 |

### 管理者（上記に加えて）

| 機能ID | 機能名 | 概要 |
|---|---|---|
| F-027 | ユーザー一覧表示 | 登録ユーザーを一覧表示 |
| F-028 | ユーザー管理 | ユーザー状態の変更・アカウント削除 |
| F-029 | コメント管理 | 不適切なコメントの削除・管理 |

---

## APIエンドポイント

<!-- TODO: 実装完了後に全エンドポイントの一覧を記載 -->
<!-- 現時点で実装済みのエンドポイントは http://localhost:8000/docs（Swagger UI）で確認できます -->

| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| POST | `/auth/register` | ユーザー登録 | 不要 |
| POST | `/auth/login` | ログイン | 不要 |
| POST | `/auth/forgot-password` | パスワード再発行メール送信 | 不要 |
| GET | `/me` | 自分の情報取得 | 必要 |
| GET | `/dashboard` | ダッシュボードデータ取得 | 必要 |
| GET | `/users/search` | ユーザー検索 | 必要 |
| PUT | `/users/{user_id}` | ユーザー情報更新（管理者） | 必要 |
| DELETE | `/users/{user_id}` | ユーザー削除（管理者） | 必要 |

<!-- TODO: 学習計画・タスク・コメント・ナレッジのエンドポイントを実装後に追記 -->

---

## 画面一覧

<!-- TODO: 実装完了後に各画面のスクリーンショットを追加 -->

| 画面ID | 画面名 | URL |
|---|---|---|
| S-001 | ログイン | `/login` |
| S-003 | パスワード再発行 | `/forgot-password` |
| S-004〜006 | ユーザー登録 | `/register` |
| S-007 | ダッシュボード | `/dashboard` |
| S-008 | 学習計画一覧 | `/dashboard/plans` |
| S-009 | 学習計画 作成・編集 | `/dashboard/plans/new` |
| S-010 | 学習計画 詳細 | `/dashboard/plans/[id]` |
| S-011 | タスク 作成・編集 | `/dashboard/plans/[id]/tasks/new` |
| S-012 | タスク 詳細 | `/dashboard/plans/[id]/tasks/[taskId]` |
| S-015 | ユーザー検索 | `/dashboard/search` |
| S-016 | 他ユーザープロフィール | `/dashboard/users/[userId]` |
| S-019 | ユーザー一覧（管理者） | `/dashboard/admin/users` |
| S-020 | ユーザー管理（管理者） | `/dashboard/admin/users/[userId]` |
| S-021 | コメント管理（管理者） | `/dashboard/admin/comments` |
| S-022 | マイプロフィール | `/dashboard/profile` |
| S-023 | 設定 | `/dashboard/settings` |

---

## UIモックアップ

デザインモックアップ（HTML）は `my-app/figma-mockup/` に格納されています。

```bash
# figma-mockup の起動（Dockerが起動している場合）
# ブラウザで http://localhost:8080 にアクセス
```

<!-- TODO: figma-mockup の起動手順を docker-compose.yml 確認後に正確な手順を記載 -->

---

## 開発ドキュメント

| ドキュメント | 場所 |
|---|---|
| ER図 | `ER図/ER図ver_1.0.pdf` |
| テーブル定義書 | `テーブル定義書/テーブル定義書ver_1.0.pdf` |
| 画面要件表 | `画面要件表/画面要件表ver_1.0.pdf` |
| 機能要件表 | `機能要件表/機能要件表ver_1.0.pdf` |
| 画面遷移図 | `画面遷移図.pdf` |

---

## 今後の実装予定

<!-- TODO: 実装の進捗に合わせて更新 -->

- [ ] 学習計画 CRUD API
- [ ] タスク CRUD API
- [ ] コメント API
- [ ] ナレッジ API
- [ ] プロフィール編集 API
- [ ] パスワード変更 API
- [ ] アカウント削除 API
- [ ] フロントエンド各画面の実装
- [ ] テストコードの追加

---

## ライセンス

<!-- TODO: ライセンスを決定後に記載 -->
