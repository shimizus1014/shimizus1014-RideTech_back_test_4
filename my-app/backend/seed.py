"""
デモ用シードデータ投入スクリプト
使い方:
  docker compose cp backend/seed.py backend:/app/seed.py
  docker compose exec backend python seed.py --reset
"""

import sys
from datetime import datetime, timedelta
from database import SessionLocal
import models
import auth

db = SessionLocal()
RESET = "--reset" in sys.argv
NOW = datetime.utcnow()

DEMO_EMAILS = [
    "tanaka@example.com", "sato@example.com", "yamada@example.com",
    "suzuki@example.com", "takahashi@example.com", "ito@example.com",
    "watanabe@example.com", "kobayashi@example.com", "kato@example.com",
    "nakamura@example.com", "yoshida@example.com", "hayashi@example.com",
    "inoue@example.com",
]
DEMO_PASSWORD = "demo1234"


def _delete_demo_user(email: str) -> None:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return
    now = datetime.utcnow()
    for plan in db.query(models.LearningPlan).filter(models.LearningPlan.user_id == user.id).all():
        for task in db.query(models.Task).filter(models.Task.learning_plan_id == plan.id).all():
            db.query(models.Knowledge).filter(models.Knowledge.task_id == task.id).delete()
            db.query(models.Comment).filter(
                models.Comment.target_type == "task", models.Comment.target_id == task.id
            ).delete()
            db.delete(task)
        db.query(models.Comment).filter(
            models.Comment.target_type == "plan", models.Comment.target_id == plan.id
        ).delete()
        db.delete(plan)
    db.query(models.Notification).filter(models.Notification.user_id == user.id).delete()
    db.query(models.UserPrivacySettings).filter(models.UserPrivacySettings.user_id == user.id).delete()
    db.delete(user)


# ─── リセット ────────────────────────────────────────────
if RESET:
    print("🗑️  既存のデモデータを削除中...")
    for email in DEMO_EMAILS:
        _delete_demo_user(email)
    db.commit()
    print("✅ 削除完了")

if db.query(models.User).filter(models.User.email == "tanaka@example.com").first():
    print("ℹ️  デモデータは既に登録されています。再投入する場合は --reset オプションを付けて実行してください。")
    db.close()
    sys.exit(0)

print("🌱 デモデータを投入中...")

# ─── ユーザー ────────────────────────────────────────────
users_data = [
    {"username": "tanaka",    "email": "tanaka@example.com",    "bio": "バックエンドエンジニア志望。Python・FastAPI を学習中。", "privacy": "public"},
    {"username": "sato",      "email": "sato@example.com",      "bio": "フロントエンド志望。React / Next.js を中心に学習中。", "privacy": "public"},
    {"username": "yamada",    "email": "yamada@example.com",    "bio": "インフラ・クラウド。AWS 認定資格取得を目指しています。", "privacy": "public"},
    {"username": "suzuki",    "email": "suzuki@example.com",    "bio": "PHP / Laravel で Web アプリ開発を学んでいます。", "privacy": "public"},
    {"username": "takahashi", "email": "takahashi@example.com", "bio": "Java と Spring Boot でバックエンド開発を勉強中。", "privacy": "public"},
    {"username": "ito",       "email": "ito@example.com",       "bio": "IT パスポート・基本情報技術者の取得を目指しています。", "privacy": "public"},
    {"username": "watanabe",  "email": "watanabe@example.com",  "bio": "応用情報技術者（午後）の対策中。アルゴリズムが苦手。", "privacy": "public"},
    {"username": "kobayashi", "email": "kobayashi@example.com", "bio": "Linux サーバー運用・LPIC 取得に向けて学習中。", "privacy": "public"},
    {"username": "kato",      "email": "kato@example.com",      "bio": "Web デザインからコーディングまで。HTML/CSS/JS の基礎固め。", "privacy": "public"},
    {"username": "nakamura",  "email": "nakamura@example.com",  "bio": "ネットワークエンジニア志望。CCNA 対策を進めています。", "privacy": "public"},
    {"username": "yoshida",   "email": "yoshida@example.com",   "bio": "SQL・データベース設計を学び、DB エンジニアを目指す。", "privacy": "public"},
    {"username": "hayashi",   "email": "hayashi@example.com",   "bio": "Ruby on Rails で Web サービスを作れるようになりたい。", "privacy": "public"},
    {"username": "inoue",     "email": "inoue@example.com",     "bio": "モバイルアプリ開発。Kotlin / Android を学習中。", "privacy": "private"},
]

created_users: dict[str, models.User] = {}
for u in users_data:
    user = models.User(
        username=u["username"],
        email=u["email"],
        hashed_password=auth.hash_password(DEMO_PASSWORD),
        bio=u["bio"],
        is_admin=False,
        created_at=NOW - timedelta(days=45),
    )
    db.add(user)
    db.flush()
    is_private = u["privacy"] == "private"
    db.add(models.UserPrivacySettings(
        user_id=user.id,
        profile_visibility=u["privacy"],
        show_in_search=not is_private,
        show_stats=True,
        default_plan_public=not is_private,
    ))
    created_users[u["username"]] = user
    print(f"  👤 {u['username']} ({u['email']})")

db.flush()
U = created_users  # ショートカット

# ─── 学習計画 ────────────────────────────────────────────
# tasks に knowledges: [{type, title, content}] を任意で付与
plans_data = [
    # ── tanaka: Python / FastAPI ──
    {
        "user": U["tanaka"], "title": "Python基礎マスター",
        "description": "Python の基礎文法から OOP まで体系的に学ぶ。",
        "is_public": True, "status": "active", "progress": 60.0,
        "deadline": NOW + timedelta(days=30), "created_at": NOW - timedelta(days=25),
        "tasks": [
            {"title": "変数・データ型・演算子", "status": "done", "order_index": 1,
             "description": "Python の基本的なデータ型を理解する。",
             "deadline": NOW - timedelta(days=20), "understanding_level": 5,
             "knowledges": [
                 {"type": "url", "title": "Python 公式チュートリアル", "content": "https://docs.python.org/ja/3/tutorial/"},
                 {"type": "url", "title": "組み込み型リファレンス", "content": "https://docs.python.org/ja/3/library/stdtypes.html"},
                 {"type": "code", "title": "リスト内包表記", "content": "squares = [x**2 for x in range(10)]"},
             ]},
            {"title": "条件分岐・ループ", "status": "done", "order_index": 2,
             "description": "if / for / while の使い方。", "deadline": NOW - timedelta(days=15), "understanding_level": 4,
             "knowledges": [{"type": "note", "title": "for vs while", "content": "回数が決まっている→for、条件次第→while"}]},
            {"title": "関数・スコープ・クロージャ", "status": "done", "order_index": 3,
             "description": "def・lambda・デコレータの基礎。", "deadline": NOW - timedelta(days=10), "understanding_level": 4},
            {"title": "クラスとオブジェクト指向", "status": "learning", "order_index": 4,
             "description": "継承・ポリモーフィズム・マジックメソッド。", "deadline": NOW + timedelta(days=7),
             "knowledges": [{"type": "url", "title": "Python クラス", "content": "https://docs.python.org/ja/3/tutorial/classes.html"}]},
            {"title": "ファイル操作・例外処理", "status": "not_started", "order_index": 5,
             "description": "open / with / try-except。", "deadline": NOW + timedelta(days=14)},
        ],
    },
    {
        "user": U["tanaka"], "title": "FastAPI入門",
        "description": "FastAPI で REST API を作れるようになる。",
        "is_public": True, "status": "active", "progress": 33.3,
        "deadline": NOW + timedelta(days=45), "created_at": NOW - timedelta(days=10),
        "tasks": [
            {"title": "FastAPI 基本構造", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=5), "understanding_level": 5,
             "knowledges": [{"type": "url", "title": "FastAPI 公式ドキュメント", "content": "https://fastapi.tiangolo.com/ja/"}]},
            {"title": "Pydantic バリデーション", "status": "learning", "order_index": 2, "deadline": NOW + timedelta(days=5),
             "knowledges": [{"type": "url", "title": "Pydantic Docs", "content": "https://docs.pydantic.dev/latest/"}]},
            {"title": "SQLAlchemy 連携", "status": "not_started", "order_index": 3, "deadline": NOW + timedelta(days=20),
             "knowledges": [{"type": "url", "title": "SQLAlchemy ORM", "content": "https://docs.sqlalchemy.org/en/20/orm/quickstart.html"}]},
        ],
    },
    # ── sato: React / TypeScript ──
    {
        "user": U["sato"], "title": "React 基礎から応用",
        "description": "コンポーネント設計・Hooks・状態管理を学ぶ。",
        "is_public": True, "status": "active", "progress": 50.0,
        "deadline": NOW + timedelta(days=20), "created_at": NOW - timedelta(days=20),
        "tasks": [
            {"title": "JSX・コンポーネント基礎", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=15), "understanding_level": 5,
             "knowledges": [{"type": "url", "title": "React 公式 Learn", "content": "https://ja.react.dev/learn"}]},
            {"title": "useState・useEffect", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=8), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "useState リファレンス", "content": "https://ja.react.dev/reference/react/useState"}]},
            {"title": "React Router", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=3),
             "knowledges": [{"type": "url", "title": "React Router Docs", "content": "https://reactrouter.com/en/main"}]},
            {"title": "Context API・状態管理", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=12)},
        ],
    },
    {
        "user": U["sato"], "title": "TypeScript 入門",
        "description": "型システムを理解して安全なコードを書く。",
        "is_public": True, "status": "active", "progress": 25.0,
        "deadline": NOW + timedelta(days=60), "created_at": NOW - timedelta(days=5),
        "tasks": [
            {"title": "型アノテーション・基本型", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=2), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "TypeScript Handbook", "content": "https://www.typescriptlang.org/docs/handbook/"}]},
            {"title": "インターフェース・型エイリアス", "status": "not_started", "order_index": 2, "deadline": NOW + timedelta(days=10)},
            {"title": "ジェネリクス", "status": "not_started", "order_index": 3, "deadline": NOW + timedelta(days=25)},
        ],
    },
    # ── yamada: AWS / Docker ──
    {
        "user": U["yamada"], "title": "AWS クラウドプラクティショナー対策",
        "description": "AWS 基礎サービスを理解して資格取得を目指す。",
        "is_public": True, "status": "active", "progress": 40.0,
        "deadline": NOW + timedelta(days=15), "created_at": NOW - timedelta(days=15),
        "tasks": [
            {"title": "クラウド基本概念・AWS インフラ", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=10), "understanding_level": 5,
             "knowledges": [{"type": "url", "title": "AWS CLF-C02 試験ガイド", "content": "https://aws.amazon.com/jp/certification/certified-cloud-practitioner/"}]},
            {"title": "EC2・S3・RDS 基礎", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=5), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Amazon EC2 ドキュメント", "content": "https://docs.aws.amazon.com/ec2/"}]},
            {"title": "IAM・セキュリティ基礎", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=2),
             "knowledges": [{"type": "url", "title": "IAM ベストプラクティス", "content": "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html"}]},
            {"title": "VPC・ネットワーク", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=8)},
            {"title": "模擬試験 × 3回", "status": "not_started", "order_index": 5, "deadline": NOW + timedelta(days=13)},
        ],
    },
    {
        "user": U["yamada"], "title": "Docker・コンテナ技術入門",
        "description": "Docker 基礎から docker-compose まで。",
        "is_public": True, "status": "active", "progress": 66.7,
        "deadline": NOW + timedelta(days=10), "created_at": NOW - timedelta(days=18),
        "tasks": [
            {"title": "Docker 基本コマンド", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=14), "understanding_level": 5,
             "knowledges": [
                 {"type": "url", "title": "Docker Docs", "content": "https://docs.docker.com/get-started/"},
                 {"type": "code", "title": "よく使うコマンド", "content": "docker ps -a\ndocker compose up -d\ndocker logs <id>"},
             ]},
            {"title": "Dockerfile 作成", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=9), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Dockerfile リファレンス", "content": "https://docs.docker.com/reference/dockerfile/"}]},
            {"title": "docker-compose 複数コンテナ", "status": "done", "order_index": 3, "deadline": NOW - timedelta(days=4), "understanding_level": 4},
            {"title": "本番環境向け最適化", "status": "paused", "order_index": 4, "deadline": NOW + timedelta(days=8)},
        ],
    },
    # ── suzuki: PHP / Laravel ──
    {
        "user": U["suzuki"], "title": "PHP Web開発入門",
        "description": "PHP の基礎から Web アプリ開発まで。",
        "is_public": True, "status": "active", "progress": 50.0,
        "deadline": NOW + timedelta(days=25), "created_at": NOW - timedelta(days=22),
        "tasks": [
            {"title": "PHP 基本文法", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=18), "understanding_level": 5,
             "knowledges": [
                 {"type": "url", "title": "PHP マニュアル", "content": "https://www.php.net/manual/ja/"},
                 {"type": "code", "title": "Hello World", "content": '<?php\necho "Hello, World!";\n?>'},
             ]},
            {"title": "フォーム処理・GET/POST", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=12), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "PHP スーパーグローバル", "content": "https://www.php.net/manual/ja/language.variables.superglobals.php"}]},
            {"title": "PDO で MySQL 接続", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=5),
             "knowledges": [{"type": "url", "title": "PHP PDO", "content": "https://www.php.net/manual/ja/book.pdo.php"}]},
            {"title": "セッション・Cookie 管理", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=15)},
        ],
    },
    {
        "user": U["suzuki"], "title": "Laravel フレームワーク",
        "description": "Laravel で MVC アプリを構築する。",
        "is_public": True, "status": "active", "progress": 20.0,
        "deadline": NOW + timedelta(days=40), "created_at": NOW - timedelta(days=8),
        "tasks": [
            {"title": "Laravel 環境構築", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=3), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Laravel 公式ドキュメント", "content": "https://laravel.com/docs"}]},
            {"title": "ルーティング・コントローラ", "status": "learning", "order_index": 2, "deadline": NOW + timedelta(days=7),
             "knowledges": [{"type": "url", "title": "Laravel Routing", "content": "https://laravel.com/docs/routing"}]},
            {"title": "Eloquent ORM", "status": "not_started", "order_index": 3, "deadline": NOW + timedelta(days=20)},
            {"title": "Blade テンプレート", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=30)},
        ],
    },
    # ── takahashi: Java / Spring ──
    {
        "user": U["takahashi"], "title": "Java プログラミング基礎",
        "description": "Java SE の基礎文法からオブジェクト指向まで。",
        "is_public": True, "status": "active", "progress": 66.7,
        "deadline": NOW + timedelta(days=35), "created_at": NOW - timedelta(days=28),
        "tasks": [
            {"title": "Java 基本文法・データ型", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=22), "understanding_level": 5,
             "knowledges": [{"type": "url", "title": "Oracle Java チュートリアル", "content": "https://docs.oracle.com/javase/tutorial/"}]},
            {"title": "クラス・継承・インターフェース", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=14), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Java OOP", "content": "https://docs.oracle.com/javase/tutorial/java/concepts/"}]},
            {"title": "コレクション・Generics", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=10),
             "knowledges": [{"type": "url", "title": "Collections Framework", "content": "https://docs.oracle.com/javase/tutorial/collections/"}]},
        ],
    },
    {
        "user": U["takahashi"], "title": "Spring Boot 入門",
        "description": "Spring Boot で REST API を構築する。",
        "is_public": True, "status": "active", "progress": 25.0,
        "deadline": NOW + timedelta(days=50), "created_at": NOW - timedelta(days=12),
        "tasks": [
            {"title": "Spring Boot プロジェクト作成", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=5), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Spring Boot Docs", "content": "https://spring.io/projects/spring-boot"}]},
            {"title": "REST API エンドポイント", "status": "learning", "order_index": 2, "deadline": NOW + timedelta(days=8),
             "knowledges": [{"type": "url", "title": "Building REST services", "content": "https://spring.io/guides/tutorials/rest/"}]},
            {"title": "Spring Data JPA", "status": "not_started", "order_index": 3, "deadline": NOW + timedelta(days=25)},
        ],
    },
    # ── ito: 基本情報 ──
    {
        "user": U["ito"], "title": "基本情報技術者 午前対策",
        "description": "IPA 基本情報技術者試験（科目A）の対策。",
        "is_public": True, "status": "active", "progress": 55.0,
        "deadline": NOW + timedelta(days=20), "created_at": NOW - timedelta(days=30),
        "tasks": [
            {"title": "テクノロジ系：アルゴリズム", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=20), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "IPA 基本情報", "content": "https://www.ipa.go.jp/shiken/kubun/fe.html"}]},
            {"title": "テクノロジ系：データベース", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=12), "understanding_level": 4,
             "knowledges": [{"type": "note", "title": "正規化の覚え方", "content": "第1:繰返し排除 / 第2:部分関数従属 / 第3:推移的関数従属"}]},
            {"title": "テクノロジ系：ネットワーク", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=5),
             "knowledges": [{"type": "url", "title": "OSI参照モデル", "content": "https://www.rfc-editor.org/"}]},
            {"title": "マネジメント系・ストラテジ系", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=12)},
            {"title": "過去問 10 年分", "status": "not_started", "order_index": 5, "deadline": NOW + timedelta(days=18)},
        ],
    },
    # ── watanabe: 応用情報 ──
    {
        "user": U["watanabe"], "title": "応用情報技術者 午後対策",
        "description": "応用情報技術者試験（午後）のアルゴリズム・設計対策。",
        "is_public": True, "status": "active", "progress": 30.0,
        "deadline": NOW + timedelta(days=45), "created_at": NOW - timedelta(days=20),
        "tasks": [
            {"title": "アルゴリズム問題（擬似言語）", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=10), "understanding_level": 3,
             "knowledges": [{"type": "url", "title": "IPA 応用情報", "content": "https://www.ipa.go.jp/shiken/kubun/ap.html"}]},
            {"title": "情報セキュリティ問題", "status": "learning", "order_index": 2, "deadline": NOW + timedelta(days=8),
             "knowledges": [{"type": "note", "title": "暗号方式まとめ", "content": "共通鍵: AES / 公開鍵: RSA / ハッシュ: SHA-256"}]},
            {"title": "プログラミング問題（Java/Python）", "status": "not_started", "order_index": 3, "deadline": NOW + timedelta(days=20)},
            {"title": "過去問 5 年分（午後）", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=40)},
        ],
    },
    # ── kobayashi: Linux / LPIC ──
    {
        "user": U["kobayashi"], "title": "LPIC Level 1 対策",
        "description": "Linux Professional Institute Certification Level 1。",
        "is_public": True, "status": "active", "progress": 45.0,
        "deadline": NOW + timedelta(days=30), "created_at": NOW - timedelta(days=25),
        "tasks": [
            {"title": "Linux コマンドライン操作", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=18), "understanding_level": 5,
             "knowledges": [{"type": "url", "title": "LPI 公式", "content": "https://www.lpi.org/our-certifications/exam-101-500-objectives/"}]},
            {"title": "ファイルシステム・パーティション", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=10), "understanding_level": 4,
             "knowledges": [{"type": "code", "title": "ディスク確認コマンド", "content": "df -h\nlsblk\nfdisk -l"}]},
            {"title": "systemd・サービス管理", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=7),
             "knowledges": [{"type": "url", "title": "systemd ドキュメント", "content": "https://www.freedesktop.org/software/systemd/man/"}]},
            {"title": "シェルスクリプト", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=18)},
        ],
    },
    # ── kato: HTML/CSS/JS ──
    {
        "user": U["kato"], "title": "HTML/CSS/JavaScript 基礎",
        "description": "Web ページ制作の基礎技術を身につける。",
        "is_public": True, "status": "active", "progress": 75.0,
        "deadline": NOW + timedelta(days=15), "created_at": NOW - timedelta(days=35),
        "tasks": [
            {"title": "HTML セマンティックマークアップ", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=28), "understanding_level": 5,
             "knowledges": [{"type": "url", "title": "MDN HTML", "content": "https://developer.mozilla.org/ja/docs/Web/HTML"}]},
            {"title": "CSS Flexbox・Grid", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=20), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "MDN CSS", "content": "https://developer.mozilla.org/ja/docs/Web/CSS"}]},
            {"title": "JavaScript DOM 操作", "status": "done", "order_index": 3, "deadline": NOW - timedelta(days=10), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "MDN JavaScript", "content": "https://developer.mozilla.org/ja/docs/Web/JavaScript"}]},
            {"title": "レスポンシブデザイン", "status": "learning", "order_index": 4, "deadline": NOW + timedelta(days=5)},
        ],
    },
    # ── nakamura: CCNA / ネットワーク ──
    {
        "user": U["nakamura"], "title": "CCNA ネットワーク基礎",
        "description": "Cisco CCNA 認定試験の対策。",
        "is_public": True, "status": "active", "progress": 35.0,
        "deadline": NOW + timedelta(days=60), "created_at": NOW - timedelta(days=18),
        "tasks": [
            {"title": "OSI 7層・TCP/IP", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=12), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Cisco CCNA", "content": "https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html"}]},
            {"title": "IP アドレッシング・サブネット", "status": "learning", "order_index": 2, "deadline": NOW + timedelta(days=5),
             "knowledges": [{"type": "note", "title": "サブネット計算", "content": "/24 = 256台 / /25 = 128台 / /26 = 64台"}]},
            {"title": "ルーティングプロトコル", "status": "not_started", "order_index": 3, "deadline": NOW + timedelta(days=20)},
            {"title": "VLAN・スイッチング", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=35)},
        ],
    },
    # ── yoshida: SQL / DB ──
    {
        "user": U["yoshida"], "title": "SQL・データベース設計",
        "description": "MySQL / PostgreSQL の SQL と DB 設計を学ぶ。",
        "is_public": True, "status": "active", "progress": 50.0,
        "deadline": NOW + timedelta(days=28), "created_at": NOW - timedelta(days=20),
        "tasks": [
            {"title": "SELECT・JOIN・集約関数", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=14), "understanding_level": 5,
             "knowledges": [
                 {"type": "url", "title": "MySQL リファレンス", "content": "https://dev.mysql.com/doc/refman/8.0/ja/"},
                 {"type": "code", "title": "JOIN 例", "content": "SELECT u.name, p.title\nFROM users u\nJOIN plans p ON u.id = p.user_id;"},
             ]},
            {"title": "インデックス・EXPLAIN", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=7), "understanding_level": 4,
             "knowledges": [{"type": "note", "title": "インデックス設計", "content": "WHERE/JOIN に使うカラムに付ける。カーディナリティが高いほど効果的。"}]},
            {"title": "ER 図・正規化", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=8)},
            {"title": "トランザクション・ACID", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=18)},
        ],
    },
    # ── hayashi: Ruby on Rails ──
    {
        "user": U["hayashi"], "title": "Ruby on Rails 入門",
        "description": "Ruby 言語と Rails フレームワークを学ぶ。",
        "is_public": True, "status": "active", "progress": 40.0,
        "deadline": NOW + timedelta(days=35), "created_at": NOW - timedelta(days=15),
        "tasks": [
            {"title": "Ruby 基本文法", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=10), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Ruby 公式", "content": "https://www.ruby-lang.org/ja/documentation/"}]},
            {"title": "Rails MVC 構造", "status": "done", "order_index": 2, "deadline": NOW - timedelta(days=5), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Rails Guides", "content": "https://guides.rubyonrails.org/"}]},
            {"title": "ActiveRecord・マイグレーション", "status": "learning", "order_index": 3, "deadline": NOW + timedelta(days=7),
             "knowledges": [{"type": "url", "title": "Active Record Basics", "content": "https://guides.rubyonrails.org/active_record_basics.html"}]},
            {"title": "認証機能（Devise）", "status": "not_started", "order_index": 4, "deadline": NOW + timedelta(days=20)},
        ],
    },
    # ── inoue: Kotlin / Android (非公開プロフィール) ──
    {
        "user": U["inoue"], "title": "Kotlin Android 開発",
        "description": "Kotlin で Android アプリを開発する。",
        "is_public": True, "status": "active", "progress": 33.3,
        "deadline": NOW + timedelta(days=40), "created_at": NOW - timedelta(days=12),
        "tasks": [
            {"title": "Kotlin 基本文法", "status": "done", "order_index": 1, "deadline": NOW - timedelta(days=8), "understanding_level": 4,
             "knowledges": [{"type": "url", "title": "Kotlin Docs", "content": "https://kotlinlang.org/docs/home.html"}]},
            {"title": "Android Studio 環境構築", "status": "learning", "order_index": 2, "deadline": NOW + timedelta(days=5),
             "knowledges": [{"type": "url", "title": "Android Developers", "content": "https://developer.android.com/"}]},
            {"title": "Activity・Fragment", "status": "not_started", "order_index": 3, "deadline": NOW + timedelta(days=15)},
        ],
    },
]

# 計画・タスク・ナレッジ作成
created_plans: list[models.LearningPlan] = []
task_registry: dict[str, models.Task] = {}  # "plan_title::task_title" -> Task

for plan_data in plans_data:
    plan = models.LearningPlan(
        user_id=plan_data["user"].id,
        title=plan_data["title"],
        description=plan_data["description"],
        is_public=plan_data["is_public"],
        status=plan_data["status"],
        progress=plan_data["progress"],
        deadline=plan_data["deadline"],
        created_at=plan_data["created_at"],
    )
    db.add(plan)
    db.flush()
    created_plans.append(plan)
    print(f"  📋 {plan_data['title']} ({plan_data['user'].username})")

    for task_data in plan_data["tasks"]:
        task = models.Task(
            learning_plan_id=plan.id,
            title=task_data["title"],
            description=task_data.get("description", ""),
            status=task_data["status"],
            order_index=task_data["order_index"],
            deadline=task_data["deadline"],
            understanding_level=task_data.get("understanding_level"),
            created_at=plan_data["created_at"] + timedelta(hours=task_data["order_index"]),
        )
        db.add(task)
        db.flush()
        task_registry[f"{plan_data['title']}::{task_data['title']}"] = task

        for kn in task_data.get("knowledges", []):
            db.add(models.Knowledge(
                task_id=task.id,
                user_id=plan_data["user"].id,
                type=kn["type"],
                title=kn["title"],
                content=kn["content"],
                created_at=plan_data["created_at"] + timedelta(hours=task_data["order_index"] + 1),
            ))

plan_by_title = {p.title: p for p in created_plans}

# ─── コメント ────────────────────────────────────────────
comments_data = [
    # Python 計画
    ("plan", "Python基礎マスター", U["sato"], "Python基礎、一緒に頑張りましょう！クロージャあたりで詰まりました。", -8),
    ("plan", "Python基礎マスター", U["tanaka"], "ありがとう！デコレータも合わせて理解するとスッキリしました。", -7),
    ("plan", "Python基礎マスター", U["takahashi"], "Java から Python に触ったらインデントに慣れるのが大変でした。", -6),
    ("task", "Python基礎マスター::クラスとオブジェクト指向", U["yamada"], "継承よりコンポジションを使う場面が多いですよ。", -1),
    ("task", "Python基礎マスター::クラスとオブジェクト指向", U["tanaka"], "なるほど、ありがとうございます！参考にします。", 0),
    # FastAPI
    ("plan", "FastAPI入門", U["suzuki"], "PHP から FastAPI に挑戦してみようと思います。参考になります！", -4),
    ("plan", "FastAPI入門", U["tanaka"], "ぜひ！Pydantic の型定義が特に便利ですよ。", -3),
    # React
    ("plan", "React 基礎から応用", U["kato"], "HTML/CSS から React に進もうとしています。Hooks が難しい…", -5),
    ("plan", "React 基礎から応用", U["sato"], "useEffect の依存配列を意識すると理解が深まりますよ！", -4),
    ("task", "React 基礎から応用::React Router", U["hayashi"], "Rails から React に移ると SPA の考え方が新鮮です。", -2),
    # AWS
    ("plan", "AWS クラウドプラクティショナー対策", U["nakamura"], "ネットワークの知識と合わせると AWS が理解しやすいです。", -6),
    ("plan", "AWS クラウドプラクティショナー対策", U["yamada"], "IAM は最初つまずきやすいので、ポリシーシミュレータがおすすめです。", -5),
    # PHP
    ("plan", "PHP Web開発入門", U["tanaka"], "PDO のプリペアドステートメント、SQL インジェクション対策に必須ですね。", -3),
    ("plan", "PHP Web開発入門", U["suzuki"], "はい！バインドパラメータを必ず使うようにしています。", -2),
    ("plan", "Laravel フレームワーク", U["hayashi"], "Rails ユーザーですが Laravel も MVC で似た感覚ですね。", -1),
    # 資格
    ("plan", "基本情報技術者 午前対策", U["watanabe"], "基本情報クリアしました。応用情報は午後が本番です…", -7),
    ("plan", "基本情報技術者 午前対策", U["ito"], "応用情報、一緒に頑張りましょう！アルゴリズムは過去問が効きます。", -6),
    ("plan", "応用情報技術者 午後対策", U["ito"], "擬似言語のトレース問題、紙に書いて追うのがおすすめです。", -4),
    ("plan", "応用情報技術者 午後対策", U["watanabe"], "ありがとうございます！やってみます。", -3),
    # SQL
    ("plan", "SQL・データベース設計", U["tanaka"], "SQLAlchemy 使ってますが、生 SQL も書けると強いですよね。", -2),
    ("plan", "SQL・データベース設計", U["yoshida"], "EXPLAIN で実行計画を見る習慣をつけると良いです！", -1),
    # Docker
    ("plan", "Docker・コンテナ技術入門", U["kobayashi"], "LPIC 勉強中ですが Docker もサーバー運用で必須ですね。", -3),
    ("task", "Docker・コンテナ技術入門::Docker 基本コマンド", U["yamada"], "docker compose logs -f でリアルタイムログが見れます。", -2),
    # Java
    ("plan", "Java プログラミング基礎", U["sato"], "TypeScript 経験者ですが Java の型システムはより厳密ですね。", -4),
    ("plan", "Spring Boot 入門", U["tanaka"], "FastAPI と Spring Boot、どちらも DI コンテナの考え方が似ています。", -1),
    # CCNA
    ("plan", "CCNA ネットワーク基礎", U["kobayashi"], "サブネット計算、毎日1問やると慣れますよ。", -2),
    # HTML/CSS
    ("plan", "HTML/CSS/JavaScript 基礎", U["sato"], "フロントエンドの基礎大事ですね。Flexbox 最初むずかしかった。", -3),
]

for target_type, key, author, content, days_ago in comments_data:
    if target_type == "plan":
        target_id = plan_by_title[key].id
    else:
        plan_title, task_title = key.split("::")
        target_id = task_registry[f"{plan_title}::{task_title}"].id
    db.add(models.Comment(
        user_id=author.id,
        target_type=target_type,
        target_id=target_id,
        content=content,
        created_at=NOW + timedelta(days=days_ago),
    ))

# ─── 通知 ────────────────────────────────────────────────
notifications_data = [
    (U["tanaka"], "sato さんが「Python基礎マスター」にコメントしました", f"/dashboard/plans/{plan_by_title['Python基礎マスター'].id}", -8),
    (U["tanaka"], "yamada さんが「クラスとオブジェクト指向」にコメントしました", f"/dashboard/plans/{plan_by_title['Python基礎マスター'].id}/tasks/{task_registry['Python基礎マスター::クラスとオブジェクト指向'].id}", -1),
    (U["tanaka"], "suzuki さんが「FastAPI入門」にコメントしました", f"/dashboard/plans/{plan_by_title['FastAPI入門'].id}", -4),
    (U["sato"], "kato さんが「React 基礎から応用」にコメントしました", f"/dashboard/plans/{plan_by_title['React 基礎から応用'].id}", -5),
    (U["sato"], "hayashi さんが「React Router」にコメントしました", f"/dashboard/plans/{plan_by_title['React 基礎から応用'].id}/tasks/{task_registry['React 基礎から応用::React Router'].id}", -2),
    (U["yamada"], "nakamura さんが「AWS クラウドプラクティショナー対策」にコメントしました", f"/dashboard/plans/{plan_by_title['AWS クラウドプラクティショナー対策'].id}", -6),
    (U["suzuki"], "tanaka さんが「PHP Web開発入門」にコメントしました", f"/dashboard/plans/{plan_by_title['PHP Web開発入門'].id}", -3),
    (U["suzuki"], "hayashi さんが「Laravel フレームワーク」にコメントしました", f"/dashboard/plans/{plan_by_title['Laravel フレームワーク'].id}", -1),
    (U["ito"], "watanabe さんが「基本情報技術者 午前対策」にコメントしました", f"/dashboard/plans/{plan_by_title['基本情報技術者 午前対策'].id}", -7),
    (U["watanabe"], "ito さんが「応用情報技術者 午後対策」にコメントしました", f"/dashboard/plans/{plan_by_title['応用情報技術者 午後対策'].id}", -4),
    (U["yoshida"], "tanaka さんが「SQL・データベース設計」にコメントしました", f"/dashboard/plans/{plan_by_title['SQL・データベース設計'].id}", -2),
    (U["kobayashi"], "yamada さんが「Docker 基本コマンド」にコメントしました", f"/dashboard/plans/{plan_by_title['Docker・コンテナ技術入門'].id}/tasks/{task_registry['Docker・コンテナ技術入門::Docker 基本コマンド'].id}", -2),
    (U["takahashi"], "sato さんが「Java プログラミング基礎」にコメントしました", f"/dashboard/plans/{plan_by_title['Java プログラミング基礎'].id}", -4),
    (U["tanaka"], "takahashi さんが「Spring Boot 入門」にコメントしました", f"/dashboard/plans/{plan_by_title['Spring Boot 入門'].id}", -1),
    (U["nakamura"], "kobayashi さんが「CCNA ネットワーク基礎」にコメントしました", f"/dashboard/plans/{plan_by_title['CCNA ネットワーク基礎'].id}", -2),
    (U["kato"], "sato さんが「HTML/CSS/JavaScript 基礎」にコメントしました", f"/dashboard/plans/{plan_by_title['HTML/CSS/JavaScript 基礎'].id}", -3),
]

for user, message, link, days_ago in notifications_data:
    db.add(models.Notification(
        user_id=user.id,
        type="comment",
        message=message,
        link=link,
        is_read=days_ago < -3,
        created_at=NOW + timedelta(days=days_ago),
    ))

db.commit()
db.close()

print()
print("✅ デモデータ投入完了！")
print()
print(f"  ユーザー: {len(users_data)} 名 / 学習計画: {len(plans_data)} 件")
print(f"  パスワード共通: {DEMO_PASSWORD}")
print()
print("─── 検索デモ用キーワード例 ─────────────────────")
print("  Python / PHP / Java / React / SQL / AWS / Docker")
print("  基本情報 / 応用情報 / LPIC / CCNA / Laravel / Spring")
print("────────────────────────────────────────────────")
