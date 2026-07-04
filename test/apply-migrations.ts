import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// setupFilesはテストファイルごとのストレージ分離の外側で実行され、複数回呼ばれうる。
// applyD1Migrationsは未適用のマイグレーションのみ適用するため、ここで呼んでも安全。
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
