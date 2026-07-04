import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("PWA対応", () => {
  it("HTML内にmanifestリンクとService Worker登録スクリプトが含まれる", async () => {
    const res = await app.request("/", {}, env);
    const body = await res.text();
    expect(body).toContain('<link rel="manifest" href="/manifest.json"/>');
    expect(body).toContain("serviceWorker.register('/sw.js')");
    expect(body).toContain('name="theme-color" content="#2563eb"');
  });
});
