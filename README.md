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

`wrangler.jsonc`の`routes`の`pattern`と`CF_ACCESS_TEAM_DOMAIN`はプレースホルダー(`example.com`等)。
通常のデプロイは後述のGitHub Actionsが行い、その際にGitHub Secretsの値で置き換える。
手元からデプロイする場合は、これらを自分の値に書き換えてから実行すること。

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

- `PROD_HOSTNAME`: 本番のカスタムドメイン(例: `wish-list.your-domain.com`)
- `ACCESS_TEAM_DOMAIN`: Cloudflare Accessのteam domain(例: `your-team.cloudflareaccess.com`)

`CLOUDFLARE_ACCOUNT_ID`は設定していない。トークンがアクセスできる
Cloudflareアカウントが1つだけであればwranglerが自動解決するため不要。
複数アカウントを持つトークンを使う場合は`accountId`をwrangler-actionに
明示的に渡す必要がある。

これが未設定の場合、`deploy`ジョブは認証エラーで失敗する
(`test`ジョブは無関係に動作する)。

## マルチテナント化(Cloudflare Access連携)

本番環境はCloudflare Access(Zero Trust)でアクセス制御しており、
アプリはAccessが認証したメールアドレスをテナントキーとして各アイテムを分離している
(`items.user_email`列)。同じアプリを複数人で使っても、各自が自分の登録したアイテムのみを見る。

### 仕組み

- Accessを通過したリクエストには`Cf-Access-Jwt-Assertion`ヘッダーが付与される。
- `src/lib/auth.ts`の`requireUser`ミドルウェアがこのJWTをCloudflareの公開鍵
  (`https://<team-domain>/cdn-cgi/access/certs`)で検証し、`aud`クレームを照合したうえで
  `email`クレームを取り出す。
- 検証に成功したメールアドレスを`c.set("userEmail", ...)`し、以降すべてのDB操作は
  このメールアドレスでフィルタされる。

### 必要な設定(`wrangler.jsonc`の`vars`)

- `CF_ACCESS_TEAM_DOMAIN`: Accessのteam domain(例: `your-team.cloudflareaccess.com`)
- `CF_ACCESS_AUD`: CloudflareダッシュボードでこのアプリのAccess Applicationを作成した際に
  発行されるAUDタグ。

`CF_ACCESS_AUD`が空の間は、JWT検証をスキップして`DEV_USER_EMAIL`(ローカル開発用の固定
メールアドレス)にフォールバックする。`DEV_USER_EMAIL`も空なら全リクエストを401で拒否するので、
本番では`DEV_USER_EMAIL`を空のままにすること。

### ローカル開発

`.dev.vars`に以下を設定すると、Access無しでログイン状態を再現できる。

```
DEV_USER_EMAIL=you@example.com
```

## ライセンス

[MIT License](LICENSE)
