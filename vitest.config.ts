import path from "node:path";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, "migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            // テストはCloudflare Accessの実際のJWTを持たないため、本番のwrangler.jsonc設定
            // に関わらずAUD未設定のフォールバック経路(DEV_USER_EMAIL)を強制的に使う。
            CF_ACCESS_TEAM_DOMAIN: "",
            CF_ACCESS_AUD: "",
            DEV_USER_EMAIL: "test@example.com",
          },
        },
      }),
    ],
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
