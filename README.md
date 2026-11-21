# 欲しいものリスト PWA

Cloudflare Workers + Hono + D1 で構築する、優先度(コスパ)ベースの欲しいものリスト管理アプリ。

## 主な機能

- **欲しいものの登録**: 名前・URL・値段と、「欲しい度」「使用頻度」(各1〜10)を登録する。
  評価の目安は入力画面に表示される(`src/lib/ratingCriteria.ts`)。
- **優先度順の一覧**: 優先度 = 値段 ÷ (欲しい度 × 使用頻度)。値が小さいほどコスパが良く、上に並ぶ。
- **予算から買うものを提案**(`/budget`): 予算を入力すると、その範囲でコスパ
  (欲しい度 × 使用頻度 ÷ 値段)の合計が最大になる組み合わせをナップサック問題として計算して提案する。
- **購入済みの管理**: 購入済みにしたアイテムは`/purchased`に移る。元に戻すこともできる。
- **マルチテナント**: Cloudflare Accessで認証したメールアドレスごとにアイテムを分離する。
- **PWA**: ホーム画面に追加して使える。オフライン時はオフラインページを表示する。

## セットアップ

Node.js(26.13.0)とpnpm(12.16.1)は[mise](https://mise.jdx.dev/)で管理している(`mise.toml`)。

```bash
mise install
pnpm install
cp .dev.vars.example .dev.vars   # ローカルでログインしているとみなすユーザーを設定
pnpm run db:migrate:local        # ローカルD1にスキーマ適用
pnpm run dev                     # http://localhost:8787
```

ローカルにはCloudflare Accessがないため、`.dev.vars`で`CF_ACCESS_AUD`を空にしてJWT検証を無効にし、
`DEV_USER_EMAIL`のユーザーとして動作する。

## テスト・型チェック

```bash
pnpm test
pnpm exec wrangler types   # worker-configuration.d.ts(gitignore対象)を生成
pnpm run typecheck
```

## デプロイ

通常は後述のGitHub Actionsがmainへのpushでデプロイする。手元からデプロイする場合は以下。

```bash
pnpm run db:migrate:remote  # 本番D1にスキーマ適用(初回・マイグレーション追加時)
pnpm run deploy             # wrangler deploy
```

`wrangler.jsonc`の次の値は自分の環境に合わせる。

- `d1_databases[0].database_id`: `pnpm exec wrangler d1 create smart-wish-list-db`で作成したDBのID
  (リポジトリに入っている値は開発者のもの)
- `routes`の`pattern`と`CF_ACCESS_TEAM_DOMAIN`: プレースホルダー(`example.com`等)。
  GitHub Actionsでデプロイする場合はSecretsの値で置き換えられるので、書き換えなくてよい
- `CF_ACCESS_AUD`: 後述のAccess Applicationを作成したときに発行されるAUDタグ

## CI/CD(GitHub Actions)

`.github/workflows/ci.yml` により、以下を自動化している。

- **すべてのpush/PR**: 型チェック(`pnpm run typecheck`)とテスト(`pnpm test`)を実行
- **mainブランチへのpush**: テスト成功後、本番D1へのマイグレーション適用と`wrangler deploy`を自動実行
  (push = 本番反映)

リポジトリの **Settings > Secrets and variables > Actions** で以下を登録する。

| Secret | 内容 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | [API Tokens](https://dash.cloudflare.com/profile/api-tokens) で「Edit Cloudflare Workers」テンプレートに`D1: 編集`を追加して発行したトークン |
| `PROD_HOSTNAME` | 本番のカスタムドメイン(例: `wish-list.your-domain.com`) |
| `ACCESS_TEAM_DOMAIN` | Cloudflare Accessのteam domain(例: `your-team.cloudflareaccess.com`) |

デプロイ直前に、`wrangler.jsonc`のプレースホルダーをこれらの値で置き換える。
`CLOUDFLARE_ACCOUNT_ID`は不要(トークンがアクセスできるアカウントが1つならwranglerが自動で特定する)。

## 認証(Cloudflare Access)

本番環境はCloudflare Access(Zero Trust)でアクセス制御し、Accessが認証したメールアドレスを
テナントキーとして各アイテムを分離している(`items.user_email`列)。同じアプリを複数人で使っても、
各自が自分の登録したアイテムのみを見る。

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
  発行されるAUDタグ
- `DEV_USER_EMAIL`: 本番では空のままにする

`CF_ACCESS_AUD`が空の間は、JWT検証をスキップして`DEV_USER_EMAIL`(ローカル開発用の固定
メールアドレス)にフォールバックする。`DEV_USER_EMAIL`も空なら全リクエストを401で拒否するので、
Accessの設定を忘れても誰かになりすまされることはない。

## エージェント接続(MCP)

AIエージェントが MCP(Streamable HTTP、ステートレス、`https://<本番ドメイン>/mcp`)でリストを操作できる。
attendance-manager-web と同じ方式で、SDKは `@modelcontextprotocol/server`(v2)の `createMcpHandler`、
認可は自前のOAuth 2.1(状態はすべてD1)。Durable ObjectsもKVも使わない。

- **OAuth 2.1に対応したエージェント**: `/mcp` のURLを登録するだけでよい。エージェントが `/mcp` の401から
  認可サーバーを見つけ、クライアント登録(CIMDかDCR)→ブラウザで同意画面(`/oauth/authorize`、Accessでログイン)→
  トークン発行まで自動で進む。
- **OAuthに対応していないエージェント(Museなど)**: `/settings/mcp` で名前を付けてトークンを発行し、
  `Authorization: Bearer <トークン>` として登録する(トークンは発行直後に一度だけ表示される)。
- できるのはアイテムの一覧・追加・編集・削除・購入済み化と、予算での提案(`src/mcp.ts`)。操作先は接続を作ったユーザー本人のリスト。
- トークン・認可コードはSHA-256のハッシュだけを保存する。OAuthのアクセストークンは1時間、リフレッシュトークンは
  使うたびに入れ替え、古いものが再び使われたら接続ごと失効させる。90日使われない接続は失効し、期限切れの行はCron Trigger
  (`wrangler.jsonc` の `triggers`)で毎日消す。誰でも呼べる `/oauth/register` はIPごとに回数を制限する。
- **Accessのポリシーからユーザーを外しても、その人の接続は動き続ける**(`/mcp` はAccessを通らないため)。
  管理者画面は無いので、外した人の接続は必要に応じてD1の `agent_connections` から消すこと。

### Cloudflare Access の設定(本番で必須・ダッシュボードで行う)

エージェントのサーバーはAccessを通れないため、次のパスだけを **Bypass** にする。
**同意画面 `/oauth/authorize` とそれ以外のパス(`/`・`/settings/mcp` など)はBypassしないこと**
(同意画面はAccessのJWTで「誰が許可したか」を決めている)。

| パス | 用途 |
|---|---|
| `/mcp` | MCPエンドポイント(Bearerトークンで認証) |
| `/oauth/token` | トークン発行・リフレッシュ |
| `/oauth/register` | クライアント登録(DCR) |
| `/oauth/revoke` | トークン取り消し |
| `/.well-known/*` | 認可サーバー・保護リソースのメタデータ |

手順(Zero Trust ダッシュボード):

1. **Access > Applications > Add an application > Self-hosted** で新しいアプリを作る。
2. 本番ドメインでパス `mcp` を指定する。続けて **Add public hostname** で同じドメインに `oauth/token`・
   `oauth/register`・`oauth/revoke`・`.well-known/*` を追加する(5件)。
3. ポリシーを1つ作り、**Action: Bypass**、**Include: Everyone** にする。
4. 保存する。既存のアプリ(ドメイン全体を保護しているもの)は変更しない。パスを指定したアプリの方が
   優先されるため、上の5パスだけがAccessの外に出る。
5. 確かめる:
   - `curl -i -X POST https://<本番ドメイン>/mcp` が401と `WWW-Authenticate: Bearer resource_metadata="..."` を返す
     (Accessのログイン画面への302ではない)。
   - ブラウザで `https://<本番ドメイン>/oauth/authorize` を開くとAccessのログインが求められる。
   - `curl -i https://<本番ドメイン>/` がAccessのログインへの302を返す(Bypassになっていない)。

## ライセンス

[MIT License](LICENSE)
