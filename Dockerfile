# syntax=docker/dockerfile:1

# ==========================================
# Base Stage: Node.js 22 LTS Alpine
# ==========================================
FROM node:22-alpine AS base

# ネイティブモジュールやヘルスチェックに必要なユーティリティを追加
RUN apk add --no-cache libc6-compat curl wget

WORKDIR /app

# ==========================================
# Dependencies Stage: パッケージインストール
# ==========================================
FROM base AS deps

COPY package.json package-lock.json ./

# 高速・厳格なクリーンインストールを実行
RUN npm ci

# ==========================================
# Development Stage: ローカル開発用
# ==========================================
FROM base AS dev

WORKDIR /app

# インストール済み node_modules をコピー
COPY --from=deps /app/node_modules ./node_modules

# アプリケーションソースコードをコピー
COPY . .

# Next.js 開発サーバー用環境変数
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# ファイル変更監視（Dockerボリューム/WSL2環境でのホットリロード対応）
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3000

# 開発サーバーの起動（外部ホストからのアクセスを許可するため -H 0.0.0.0 を指定）
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
