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

デプロイ手順とCloudflare Access設定は実装完了後にこのREADMEへ追記する。
