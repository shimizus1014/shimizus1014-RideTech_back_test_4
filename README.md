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
| バックエンド | Python | 3.13 |
| バックエンド | python-dotenv | 環境変数読み込み |
| バックエンド | python-multipart | ファイルアップロード |
| データベース | MySQL | 8.0 |
| 認証 | JWT (python-jose + bcrypt) | - |
| 実行環境 | Docker / Docker Compose | - |

---

## ディレクトリ構成

```
8.自主開発/
├── my-app/
│   ├── backend/                    # FastAPI バックエンド
│   │   ├── main.py                 # APIエンドポイント
│   │   ├── models.py               # SQLAlchemy ORM モデル
│   │   ├── schemas.py              # Pydantic スキーマ
│   │   ├── auth.py                 # JWT認証
│   │   ├── database.py             # DB接続設定
│   │   ├── seed.py                 # デモ用シードデータ投入スクリプト
│   │   ├── requirements.txt        # Python依存パッケージ
│   │   ├── .env                    # 環境変数（Git管理外）
│   │   ├── .env.example            # 環境変数テンプレート
│   │   └── uploads/                # プロフィール画像保存先（Git管理外）
│   ├── frontend/                   # Next.js フロントエンド
│   │   └── app/                    # App Router
│   │       ├── layout.tsx
│   │       ├── page.tsx            # ルート → /login へリダイレクト
│   │       ├── login/
│   │       ├── register/
│   │       │   └── complete/
│   │       ├── forgot-password/
│   │       └── dashboard/
│   │           ├── layout.tsx
│   │           ├── Sidebar.tsx
│   │           ├── page.tsx        # ダッシュボード
│   │           ├── plans/
│   │           │   ├── new/
│   │           │   └── [id]/
│   │           │       ├── edit/
│   │           │       └── tasks/
│   │           │           ├── new/
│   │           │           └── [taskId]/
│   │           │               └── edit/
│   │           ├── profile/
│   │           │   └── edit/
│   │           ├── search/
│   │           ├── settings/
│   │           ├── users/
│   │           │   └── [userId]/
│   │           │       └── plans/
│   │           │           └── [planId]/
│   │           │               └── tasks/
│   │           │                   └── [taskId]/
│   │           └── admin/
│   │               ├── page.tsx
│   │               ├── comments/
│   │               ├── plans/
│   │               └── users/
│   ├── figma-mockup/               # UIモックアップ（HTML）
│   └── docker-compose.yml
├── .cursor/
│   └── rules/                      # Cursor AI 用プロジェクトルール（セキュリティ・DBスキーマ等）
├── .gitignore                      # Git管理外ファイル定義
├── ER図/                           # ER図 (PDF)
├── テーブル定義書/                  # テーブル定義書 (PDF)
├── 画面要件表/                      # 画面要件表 (PDF)
├── 機能要件表/                      # 機能要件表 (PDF)
├── 画面資料/                        # 画面デザイン画像
└── README.md                       # このファイル
```

---

## 起動方法

### 前提条件
- Docker Desktop がインストール・起動済みであること
- `my-app/backend/.env` が作成済みであること（後述）

### 手順

```bash
# 1. プロジェクトの my-app ディレクトリに移動
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

> DBスキーマ変更（モデル追加・カラム追加）後は `docker compose down -v && docker compose up --build` でDBを再作成してください。

### 開発時の注意

| 変更対象 | 反映方法 |
|---|---|
| フロントエンド（`frontend/`） | ボリュームマウントのため **自動反映**（ブラウザをリロード） |
| バックエンド（`backend/`） | **`docker compose up -d --build backend`** が必要（ソースはマウントされていない） |
| DBスキーマ（`models.py`） | `docker compose down -v && docker compose up --build` |
| シードデータ（`seed.py`） | 下記「デモ用シードデータ」参照 |

> フロントエンドは `.next` を匿名ボリュームで管理しているため、ルーティング不具合時は `docker compose restart frontend` またはハードリフレッシュ（Ctrl+Shift+R）を試してください。

---

## 環境変数

### バックエンド（`my-app/backend/.env`）

`.env.example` をコピーして `.env` を作成し、値を設定してください。

```bash
cp my-app/backend/.env.example my-app/backend/.env
```

| 変数名 | デフォルト値 | 説明 |
|---|---|---|
| `SECRET_KEY` | **必須・未設定時は起動失敗** | JWT署名用秘密鍵 |
| `DATABASE_URL` | `mysql+pymysql://appuser:apppass@db:3306/appdb` | MySQL接続URL |
| `ADMIN_EMAIL` | `admin@example.com` | 管理者初期アカウントのメール |
| `ADMIN_PASSWORD` | `admin1234` | 管理者初期アカウントのパスワード |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`（24時間） | JWTトークン有効期限（分） |

> `SECRET_KEY` は `python -c "import secrets; print(secrets.token_hex(32))"` で生成できます。

### フロントエンド（`my-app/frontend/.env.local`）

| 変数名 | デフォルト値 | 説明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | バックエンドAPIのURL |

> `.env.local` が存在しない場合はデフォルト値が使用されます。

---

## デフォルトアカウント

初回起動時に以下の管理者アカウントが自動作成されます（`backend/.env` の値を使用）。

| 項目 | 値 |
|---|---|
| メールアドレス | `ADMIN_EMAIL`（デフォルト: `admin@example.com`） |
| パスワード | `ADMIN_PASSWORD`（デフォルト: `admin1234`） |
| ロール | 管理者 |

> ⚠️ 本番環境では `.env` で必ず強いパスワードを設定してください。

---

## デモ用シードデータ

発表・動作確認用のデモデータを手動で投入できます。**起動時の自動作成は admin のみ**で、シードデータは含まれません。

### 投入内容（`seed.py --reset` 実行時）

| 項目 | 件数 |
|---|---|
| デモユーザー | 13名 |
| 学習計画 | 18件 |
| タスク | 約70件 |
| ナレッジ | 約50件（公式ドキュメント URL・コード・メモ） |
| コメント | 約27件 |
| 通知 | 約16件 |

**共通パスワード:** `demo1234`

### デモユーザー一覧

| username | 分野 | プロフィール |
|---|---|---|
| tanaka | Python / FastAPI | 公開 |
| sato | React / TypeScript | 公開 |
| yamada | AWS / Docker | 公開 |
| suzuki | PHP / Laravel | 公開 |
| takahashi | Java / Spring Boot | 公開 |
| ito | 基本情報技術者 | 公開 |
| watanabe | 応用情報技術者 | 公開 |
| kobayashi | Linux / LPIC | 公開 |
| kato | HTML / CSS / JavaScript | 公開 |
| nakamura | CCNA / ネットワーク | 公開 |
| yoshida | SQL / データベース設計 | 公開 |
| hayashi | Ruby on Rails | 公開 |
| inoue | Kotlin / Android | **非公開**（検索デモ用） |

### 投入・再投入コマンド

```bash
cd my-app

# seed.py をコンテナにコピーして実行
docker compose cp backend/seed.py backend:/app/seed.py
docker compose exec backend python seed.py --reset
```

### 検索デモ用キーワード例

`Python` / `PHP` / `Java` / `React` / `SQL` / `AWS` / `Docker` / `基本情報` / `応用情報` / `LPIC` / `CCNA` / `Laravel` / `Spring`

---

## 主な機能

### 一般ユーザー

| 機能ID | 機能名 | 概要 |
|---|---|---|
| F-001 | ログイン / ログアウト | メール・パスワードで認証、JWT発行 |
| F-003 | パスワード再発行 | メールアドレス入力画面（メール送信は未実装） |
| F-004 | ユーザー登録 | 新規アカウントを作成、登録完了画面あり |
| F-005 | プロフィール表示 | アイコン・自己紹介・統計情報を表示 |
| F-006 | プロフィール編集 | ユーザー名・自己紹介の変更、プロフィール画像アップロード |
| F-007 | 学習計画 CRUD | 学習計画の作成・閲覧・編集・削除（論理削除） |
| F-012 | タスク CRUD | タスクの作成・閲覧・編集・削除（論理削除） |
| F-017 | タスク状態管理 | 未着手 / 学習中 / 完了 / 一時停止 の4ステータス |
| F-018 | 理解度管理 | タスクの理解度を5段階で記録 |
| F-019 | 学習進捗率表示 | タスク達成率からの進捗算出・プログレスバー表示 |
| F-020 | 学習ナレッジ管理 | URL・メモ・コードの記録・編集・削除 |
| F-021 | コメント投稿・閲覧 | 学習計画・タスクへのコメント（オーナーへ通知を自動作成） |
| F-023 | ユーザー検索 | ユーザー名・メールアドレスで検索（非公開ユーザーは除外、管理者は全員表示） |
| F-025 | 公開学習計画閲覧 | 他ユーザーの公開計画・タスクを閲覧・コメント |
| F-030 | パスワード変更 | 設定画面から現在のパスワードを確認して変更 |
| F-031 | アカウント削除 | 確認テキスト・パスワード入力による自身のアカウント削除（論理削除・関連データ一括削除） |
| -     | コンテンツ横断検索 | 学習計画・タスク名で横断検索。所有者名表示・プロフィールへのリンク付き |
| -     | プロフィール画像アップロード | サーバーへの画像保存（JPEG/PNG/GIF/WebP、最大2MB） |
| -     | 通知機能 | コメント受信時にサイドバーへベル通知（未読バッジ・一覧表示・既読管理・30秒ポーリング） |
| -     | プライバシー設定 | プロフィール公開（全員/非公開）・検索表示・統計公開・計画デフォルト公開設定 |
| -     | 期限バリデーション | 学習計画・タスク作成/編集時に、今日より前の期限を選択不可 |
| -     | 期限アラート | ダッシュボードで学習計画・タスクの期限超過・期限間近を色分け表示 |

### 管理者（上記に加えて）

| 機能ID | 機能名 | 概要 |
|---|---|---|
| F-027 | ユーザー一覧表示 | 登録ユーザーを一覧表示・検索 |
| F-028 | ユーザー管理 | ユーザー情報の変更・アカウント削除（論理削除） |
| F-029 | コメント管理 | 全コメントの閲覧・削除 |
| -     | 管理統計 | ユーザー数・計画数・タスク数・コメント数等の集計表示 |
| -     | 学習計画管理 | 全ユーザーの学習計画一覧・ステータス別フィルタ |
| -     | 全計画閲覧 | 公開/非公開を問わず全ユーザーの学習計画・タスクを閲覧可能 |

---

## プライバシー・公開設定のルール

### プロフィール公開設定（2段階）

| 設定 | 値 | 動作 |
|---|---|---|
| 全員に公開 | `public` | 他ユーザーもプロフィールを閲覧可能 |
| 非公開 | `private` | 本人・管理者のみ閲覧可能。**ユーザー検索にも表示されない** |

### 学習計画の公開設定

| 学習計画 `is_public` | 他ユーザーからの閲覧 |
|---|---|
| `true`（公開） | 公開プロフィールのユーザーの計画として閲覧・検索可能 |
| `false`（非公開） | 本人・管理者のみ閲覧可能 |

### 上位権限（プロフィール非公開）

プロフィールを **非公開** に設定した場合、学習計画が `is_public=true` でも **外部からは一切閲覧不可**（検索結果・公開プラン API から除外）。

### 管理者の例外

管理者（`is_admin=true`）は以下の制限を **すべてバイパス** できます。

- 非公開プロフィールの閲覧
- 非公開学習計画の閲覧
- ユーザー検索での非公開ユーザー表示
- 横断検索での非公開計画・タスク表示

---

## データベースモデル

| テーブル名 | 概要 |
|---|---|
| `users` | ユーザー情報（論理削除対応） |
| `learning_plans` | 学習計画（論理削除対応） |
| `tasks` | タスク（論理削除対応） |
| `knowledges` | ナレッジ・メモ（論理削除対応） |
| `comments` | コメント（論理削除対応） |
| `notifications` | 通知（コメント受信等） |
| `user_privacy_settings` | ユーザーのプライバシー設定 |

### 主要 enum 値

| カラム | 値 | 意味 |
|---|---|---|
| `tasks.status` | `not_started` / `learning` / `done` / `paused` | 未着手 / 学習中 / 完了 / 一時停止 |
| `learning_plans.status` | `active` / `completed` / `archived` | 進行中 / 完了 / アーカイブ |
| `knowledges.type` | `note` / `url` / `code` / `file` | メモ / URL / コード / ファイル |
| `user_privacy_settings.profile_visibility` | `public` / `private` | 全員に公開 / 非公開 |
| `comments.target_type` | `plan` / `task` | コメント対象種別 |

---

## APIエンドポイント

| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| POST | `/auth/register` | ユーザー登録 | 不要 |
| POST | `/auth/login` | ログイン | 不要 |
| POST | `/auth/forgot-password` | パスワード再発行リクエスト | 不要 |
| GET | `/me` | 自分の情報取得 | 必要 |
| PUT | `/me` | 自分の情報更新（ユーザー名・自己紹介） | 必要 |
| POST | `/me/avatar` | プロフィール画像アップロード | 必要 |
| PUT | `/me/password` | パスワード変更 | 必要 |
| DELETE | `/me` | アカウント削除（論理削除） | 必要 |
| GET | `/me/privacy` | プライバシー設定取得 | 必要 |
| PUT | `/me/privacy` | プライバシー設定更新 | 必要 |
| GET | `/dashboard` | ダッシュボードデータ取得 | 必要 |
| GET | `/users/search` | ユーザー検索（プライバシー設定を反映、管理者は全員） | 必要 |
| PUT | `/users/{user_id}` | ユーザー情報更新（管理者） | 必要 |
| DELETE | `/users/{user_id}` | ユーザー削除（管理者・論理削除） | 必要 |
| GET | `/users/{user_id}/profile` | 他ユーザーのプロフィール取得 | 任意 |
| GET | `/users/{user_id}/public-plans` | 他ユーザーの公開学習計画一覧（管理者は非公開含む全件） | 任意 |
| GET | `/users/{user_id}/public-plans/{plan_id}` | 公開学習計画詳細（管理者は非公開も可） | 任意 |
| GET | `/users/{user_id}/public-plans/{plan_id}/tasks` | 公開学習計画のタスク一覧（管理者は非公開も可） | 任意 |
| GET | `/users/{user_id}/public-plans/{plan_id}/tasks/{task_id}` | 公開タスク詳細（管理者は非公開も可） | 任意 |
| GET | `/learning-plans` | 自分の学習計画一覧 | 必要 |
| POST | `/learning-plans` | 学習計画作成 | 必要 |
| GET | `/learning-plans/{plan_id}` | 学習計画詳細 | 必要 |
| PUT | `/learning-plans/{plan_id}` | 学習計画更新 | 必要 |
| DELETE | `/learning-plans/{plan_id}` | 学習計画削除（論理削除） | 必要 |
| GET | `/learning-plans/{plan_id}/tasks` | タスク一覧取得 | 必要 |
| POST | `/learning-plans/{plan_id}/tasks` | タスク作成 | 必要 |
| GET | `/tasks/{task_id}` | タスク詳細 | 必要 |
| PUT | `/tasks/{task_id}` | タスク更新 | 必要 |
| DELETE | `/tasks/{task_id}` | タスク削除（論理削除） | 必要 |
| GET | `/tasks/{task_id}/knowledges` | ナレッジ一覧 | 必要 |
| POST | `/tasks/{task_id}/knowledges` | ナレッジ作成 | 必要 |
| PUT | `/knowledges/{knowledge_id}` | ナレッジ更新 | 必要 |
| DELETE | `/knowledges/{knowledge_id}` | ナレッジ削除（論理削除） | 必要 |
| GET | `/comments` | コメント一覧（target_type + target_id で絞込） | 必要 |
| POST | `/comments` | コメント投稿（オーナーへ通知作成） | 必要 |
| DELETE | `/comments/{comment_id}` | コメント削除（論理削除） | 必要 |
| GET | `/notifications` | 通知一覧（最新30件） | 必要 |
| GET | `/notifications/unread-count` | 未読通知数 | 必要 |
| PUT | `/notifications/{id}/read` | 1件既読にする | 必要 |
| PUT | `/notifications/read-all` | 全件既読にする | 必要 |
| GET | `/search` | 学習計画・タスクの横断検索（所有者情報付き、管理者は全件） | 必要 |
| GET | `/admin/stats` | 管理統計情報 | 必要（管理者） |
| GET | `/admin/plans` | 全学習計画一覧 | 必要（管理者） |
| GET | `/admin/users` | 全ユーザー一覧 | 必要（管理者） |
| GET | `/admin/comments` | 全コメント一覧 | 必要（管理者） |
| GET | `/uploads/{filename}` | アップロード画像の静的配信 | 不要 |

---

## 画面一覧

| 画面ID | 画面名 | URL |
|---|---|---|
| - | ルート（ログインへリダイレクト） | `/` |
| S-001 | ログイン | `/login` |
| S-003 | パスワード再発行 | `/forgot-password` |
| S-004〜005 | ユーザー登録（入力・確認） | `/register` |
| S-006 | ユーザー登録（完了） | `/register/complete` |
| S-007 | ダッシュボード | `/dashboard` |
| S-008 | 学習計画一覧 | `/dashboard/plans` |
| S-009 | 学習計画 作成 | `/dashboard/plans/new` |
| S-009 | 学習計画 編集 | `/dashboard/plans/[id]/edit` |
| S-010 | 学習計画 詳細 | `/dashboard/plans/[id]` |
| - | タスク一覧 | `/dashboard/plans/[id]/tasks` |
| S-011 | タスク 作成 | `/dashboard/plans/[id]/tasks/new` |
| S-011 | タスク 編集 | `/dashboard/plans/[id]/tasks/[taskId]/edit` |
| S-012 | タスク 詳細 | `/dashboard/plans/[id]/tasks/[taskId]` |
| S-015 | コンテンツ検索 | `/dashboard/search` |
| - | ユーザー検索 | `/dashboard/users` |
| S-016 | 他ユーザー プロフィール | `/dashboard/users/[userId]` |
| - | 他ユーザー 公開学習計画詳細 | `/dashboard/users/[userId]/plans/[planId]` |
| - | 他ユーザー 公開タスク詳細 | `/dashboard/users/[userId]/plans/[planId]/tasks/[taskId]` |
| S-022 | マイプロフィール | `/dashboard/profile` |
| S-022 | プロフィール編集 | `/dashboard/profile/edit` |
| S-023〜024 | 設定（アカウント・通知・プライバシー・削除） | `/dashboard/settings` |
| - | 管理者 ダッシュボード | `/dashboard/admin` |
| S-019 | 管理者 ユーザー一覧 | `/dashboard/admin/users` |
| - | 管理者 プラン管理 | `/dashboard/admin/plans` |
| S-021 | 管理者 コメント管理 | `/dashboard/admin/comments` |

---

## UIモックアップ

デザインモックアップ（HTML）は `my-app/figma-mockup/` に格納されています。
nginx を使ってローカルで閲覧できます。

```bash
# 1. figma-mockup ディレクトリに移動
cd my-app/figma-mockup

# 2. コンテナを起動
docker compose up -d

# 3. ブラウザでアクセス
#    http://localhost:8080

# 4. 停止する場合
docker compose down
```

> メインアプリ（port 3000/8000）とは独立して起動できます。同時起動も可能です。

---

## セキュリティ対策

本プロジェクトでは `.cursor/rules/security.mdc` に定義した規約に沿って実装しています。

| 対策 | 内容 |
|---|---|
| SQLインジェクション | SQLAlchemy ORM によるパラメータバインド（生SQLの文字列埋め込み禁止） |
| XSS | React の自動エスケープ、`dangerouslySetInnerHTML` 不使用 |
| 認証 | JWT（`SECRET_KEY` は環境変数必須、未設定時は起動失敗） |
| 認可 | エンドポイント内での管理者チェック・リソース所有者チェック |
| パスワード | bcrypt ハッシュ化、レスポンスに含めない |
| 環境変数 | `.env` は Git 管理外、`.env.example` をテンプレートとしてコミット |
| ファイルアップロード | MIME タイプ・サイズ（2MB）検証 |

---

## 開発ドキュメント

| ドキュメント | 最新版 | 場所 |
|---|---|---|
| ER図 | ver 1.1 | `ER図/ER図_1.1.pdf` |
| テーブル定義書 | ver 1.0 | `テーブル定義書/テーブル定義書ver_1.0.pdf` |
| 画面要件表 | ver 1.1 | `画面要件表/画面要件表ver_1.1.pdf` |
| 機能要件表 | ver 1.1 | `機能要件表/機能要件表ver_1.1.pdf` |
| 画面遷移図 | - | `画面遷移図.pdf` |
| 画面デザイン資料 | - | `画面資料/` |

---

## 今後の実装予定

- [ ] テストコードの追加（pytest / Vitest）
- [ ] パスワード再発行メールの実際の送信（smtplib / SendGrid等）
- [ ] 通知設定のサーバー側保存（現在は通知 ON/OFF のみ localStorage）
- [ ] 通知のメール配信対応
- [ ] WebSocket によるリアルタイム通知（現在は30秒ポーリング）
- [ ] Alembic によるマイグレーション管理
- [ ] タスク並び替え UI（ドラッグ＆ドロップ、`order_index` は DB カラムあり）
- [ ] 期限リマインダーのバックグラウンドジョブ（現在はダッシュボード上のアラート表示のみ）

---

## DB 直接確認（開発用）

```bash
cd my-app
docker compose exec db mysql -u appuser -papppass appdb -e "SHOW TABLES;"
```

> パスワードは `docker-compose.yml` の `MYSQL_PASSWORD`（デフォルト: `apppass`）に合わせてください。

---

## ライセンス

<!-- TODO: ライセンスを決定後に記載 -->
