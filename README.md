# 欲しいものリスト PWA

Cloudflare Workers + Hono + D1 で構築する、優先度(コスパ)ベースの欲しいものリスト管理アプリ。

## セットアップ

```bash
npm install
npm run db:migrate:local   # ローカルD1にスキーマ適用
npm run dev                # http://localhost:8787
```

## テスト

```bash
npm test
```

## デプロイ

```bash
npm run db:migrate:remote   # 本番D1にスキーマ適用(初回・マイグレーション追加時)
npm run deploy               # wrangler deploy
```

本番URL: https://wish-list.example.com (example.comのCloudflareゾーンにカスタムドメインとして割り当て済み)

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` により、以下を自動化している。

- **すべてのpush/PR**: 型チェック(`npm run typecheck`)とテスト(`npm test`)を実行
- **mainブランチへのpush**: テスト成功後、本番D1へのマイグレーション適用と`wrangler deploy`を自動実行

### 必要なGitHub Secrets

リポジトリの **Settings > Secrets and variables > Actions** で以下を登録する。

- `CLOUDFLARE_API_TOKEN`: Cloudflareダッシュボードの
  [API Tokens](https://dash.cloudflare.com/profile/api-tokens)から
  「Edit Cloudflare Workers」テンプレートで発行したトークン
  (D1マイグレーションも実行するため、対象アカウントのD1編集権限も含める)
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflareダッシュボード右側に表示されるAccount ID

これらが未設定の場合、`deploy`ジョブは認証エラーで失敗する
(`test`ジョブは無関係に動作する)。

## Cloudflare Accessによる保護

このアプリ自体には認証機能を実装していない。`wish-list.example.com`は
Cloudflare Access(Zero Trust)でアクセス制御済み(ダッシュボード側で設定)。
アプリ側にコード変更は不要で、以降もCloudflareの設定のみで完結する。
