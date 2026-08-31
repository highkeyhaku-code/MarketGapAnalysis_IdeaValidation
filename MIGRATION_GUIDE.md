# 🚀 デスクトップPC移行・Dockerローカル開発環境 起動マニュアル

本ドキュメントは、**MarketGapAnalysis & IdeaValidation** プロジェクトの開発環境をデスクトップPC上のDockerコンテナへ移行し、安全かつ迅速に開発を再開するための手順書です。

---

## 📋 1. 前提条件（デスクトップPC側）

デスクトップPCに以下のツールがインストールされていることを確認してください。

- **Git** (最新版)
- **Docker** & **Docker Compose**
  - Windows / macOS の場合: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (WSL2バックエンド推奨)
  - Linux の場合: Docker Engine (v24以上) + Docker Compose Plugin (v2以上)

---

## 🛠️ 2. 移行・セットアップ手順（ステップバイステップ）

### Step 1: リポジトリのクローン
デスクトップPCの作業ディレクトリでリポジトリをクローンします。

```bash
git clone <リポジトリURL>
cd MarketGapAnalysis_IdeaValidation
```

---

### Step 2: 環境変数の設定 (`.env.local`)
テンプレートファイル [`.env.example`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/.env.example) をコピーして [`.env.local`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/.env.local) を作成し、必要なAPIキー等を記述します。

```bash
cp .env.example .env.local
```

エディタ等で `.env.local` を開き、以下の項目を設定してください。

| 環境変数名 | 説明 | 必須 |
| :--- | :--- | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (公開キー) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (サーバー権限) | ✅ |
| `GEMINI_API_KEY` | Google AI Studio (Gemini) API Key | ✅ |
| `TAVILY_API_KEY` | Tavily Web Search API Key | ✅ |
| `GITHUB_ACCESS_TOKEN` | GitHub Personal Access Token | ✅ |
| `PRODUCT_HUNT_API_TOKEN` | Product Hunt API Token | ✅ |
| `INNGEST_EVENT_KEY` | Inngest Event Key (ローカル開発用ダミー値可) | ✅ |
| `INNGEST_SIGNING_KEY` | Inngest Signing Key (ローカル開発用ダミー値可) | ✅ |

> [!IMPORTANT]
> アプリケーション起動時、[`src/env.ts`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/src/env.ts) によるZodバリデーションが実行されます。必須環境変数が未設定または空文字の場合、コンテナ起動時にエラーとなりますのでご注意ください。

---

### Step 3: Docker コンテナのビルド & 起動
以下のコマンドを実行して、Next.js アプリケーションおよび Inngest 開発サーバーをバックグラウンドでビルド・起動します。

```bash
docker compose up -d --build
```

---

### Step 4: 起動確認
コンテナが正常に稼働しているか確認します。

```bash
docker compose ps
```

ブラウザで以下のURLにアクセスして動作を確認してください。

- **Next.js Web アプリケーション**: [http://localhost:3000](http://localhost:3000)
- **Inngest Dev Server (ジョブ監視ダッシュボード)**: [http://localhost:8288](http://localhost:8288)
- **ヘルスチェックエンドポイント**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 💻 3. 日常の開発コマンド集

### ログの確認
```bash
# アプリケーション（Next.js）のログをリアルタイム追跡
docker compose logs -f app

# Inngest サーバーのログを確認
docker compose logs -f inngest

# すべてのコンテナログを追跡
docker compose logs -f
```

### コンテナ内でのコマンド実行
```bash
# 型チェック (TypeScript)
docker compose exec app npm run typecheck

# E2E / シナリオテストの実行
docker compose exec app npm run test:e2e

# ヘルスチェックテストの実行
docker compose exec app npm run test:health

# コンテナ内の対話シェル (sh) を開く
docker compose exec app sh
```

### パッケージの追加・更新
```bash
# 新しいnpmパッケージをコンテナ内でインストール
docker compose exec app npm install <package-name>

# ホスト側の package.json / package-lock.json と同期するため、変更後は再ビルドを推奨
docker compose build app
```

### 停止と再起動
```bash
# コンテナの停止
docker compose down

# コンテナの再起動（設定変更の反映など）
docker compose restart app

# 匿名ボリュームも含めて完全クリーンアップして再起動
docker compose down -v
docker compose up -d --build
```

---

## 🔥 4. ホットリロード（Fast Refresh）の仕様

[`docker-compose.yml`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/docker-compose.yml) にて以下の設定が適用されています。

1. **双方向ボリュームマウント (`.:/app`)**: ホストPC側（デスクトップ側）でファイルを編集・保存すると、即座にコンテナ内へ同期されます。
2. **`WATCHPACK_POLLING=true` / `CHOKIDAR_USEPOLLING=true`**: DockerボリュームやWindows/WSL2環境でファイルイベント通知がドロップする問題を防止し、確実なFast Refreshを実現します。
3. **匿名ボリューム保護 (`/app/node_modules`, `/app/.next`)**: ホストOSのアーキテクチャ差分でコンテナ内のバイナリが破損しないよう隔離されています。

---

## 🔒 5. セキュリティ & AIアシスタント（agy等）の遮断設定

デスクトップPC環境における機密情報保護のため、以下の多層防御が自動適用されています。

### 1. バージョン管理 (`.gitignore`)
- [`.gitignore`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/.gitignore) により、すべての `.env*`、秘密鍵（`*.pem`, `*.key`）、認証JSON、内部設計書がGit追跡から完全に除外されています。

### 2. コンテナイメージ保護 (`.dockerignore`)
- [`.dockerignore`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/.dockerignore) により、Dockerイメージ内に `.env.local` やローカルの認証情報が焼き込まれないよう遮断されています。

### 3. AIアシスタント・エージェント遮断設定
以下のignore設定ファイルが配置されています。
- [`.cursorignore`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/.cursorignore) : Cursor / VS Code Copilot 等によるインデックス・読み取りを遮断
- [`.clineignore`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/.clineignore) : Cline / Roo-Code 等のAI自律エージェントによる秘密情報の読み取り・外部送信を遮断
- [`.agyignore`](file:///home/c0a241589e/dev/MarketGapAnalysis_IdeaValidation/.agyignore) : Antigravity (agy) などのAIコーディングアシスタント用遮断設定

---

## ❓ 6. トラブルシューティング

| 症状 | 原因 | 解決策 |
| :--- | :--- | :--- |
| **`3000` ポートが使えない** | ホストPC上の別プロセスがポートを使用中 | `docker-compose.yml` の `ports` を `"3001:3000"` などに変更する |
| **コンテナが起動直後に終了する (`Exited`)** | `.env.local` の環境変数バリデーションエラー | `docker compose logs app` を確認し、不足している環境変数を `.env.local` に追記する |
| **ファイルの変更がブラウザに反映されない** | WSL2や特定環境でのファイル監視遅延 | ブラウザを手動更新するか、`docker compose restart app` を実行する |
| **npmモジュールの不整合エラーが出る** | コンテナ内の `node_modules` キャッシュ不整合 | `docker compose down -v && docker compose up -d --build` でボリュームを再作成する |
