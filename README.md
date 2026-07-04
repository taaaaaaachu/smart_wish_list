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

デプロイ後、Cloudflareダッシュボードに表示されるWorkerのURL
(`https://smart-wish-list.<あなたのサブドメイン>.workers.dev` など)にアクセスして動作確認する。

## Cloudflare Accessによる保護

このアプリ自体には認証機能を実装していない。個人利用のため、Cloudflare Access
(Zero Trust)でアクセス制御をかける想定。

1. Cloudflareダッシュボードで対象アカウントの **Zero Trust** に移動する。
   (初回はZero Trustプランの選択が必要。Freeプランで問題ない)
2. **Access > Applications** で「Add an application」→「Self-hosted」を選択。
3. アプリケーションドメインに、デプロイしたWorkerのURL
   (`smart-wish-list.<サブドメイン>.workers.dev` など)を指定する。
   - `*.workers.dev`をAccessで保護するには、事前にダッシュボードの
     **Workers & Pages > (該当Worker) > Settings > Domains & Routes** で
     `workers.dev`のURLを有効化しておく必要がある。カスタムドメインを
     Workerにアタッチしている場合はそちらのドメインを指定してもよい。
4. ポリシーを作成し、許可するメールアドレス(または許可するメールドメイン)を指定する。
   個人利用であれば「Emails」ルールに自分のメールアドレスを1件追加するだけでよい。
5. 保存後、対象URLにアクセスするとCloudflare Accessのワンタイムコード
   (メール認証)画面が表示され、認証済みユーザーのみアプリへアクセスできるようになる。

以降、Workerのコードを変更する必要はなく、Cloudflare側の設定のみで
アクセス制御が完結する。
