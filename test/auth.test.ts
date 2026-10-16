import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("認証ミドルウェア", () => {
  it("CloudFlare Access未設定時はDEV_USER_EMAILで認証される", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
  });

  it("CloudFlare Access未設定時にDEV_USER_EMAILも無い場合は401になる", async () => {
    const res = await app.request(
      "/",
      {},
      { ...env, DEV_USER_EMAIL: "" },
    );
    expect(res.status).toBe(401);
  });

  it("CloudFlare Access未設定時にDEV_USER_EMAILが無ければX-Test-User-Emailヘッダーがあっても401になる", async () => {
    const res = await app.request(
      "/",
      { headers: { "X-Test-User-Email": "alice@example.com" } },
      { ...env, DEV_USER_EMAIL: "" },
    );
    expect(res.status).toBe(401);
  });

  it("X-Test-User-Emailヘッダーがある場合はDEV_USER_EMAILより優先される", async () => {
    const res = await app.request(
      "/items",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Test-User-Email": "alice@example.com",
        },
        body: new URLSearchParams({
          title: "Alice専用アイテム",
          url: "",
          price: "100",
          wantLevel: "5",
          usageFreq: "5",
        }).toString(),
      },
      env,
    );
    expect(res.status).toBe(302);

    const aliceRes = await app.request(
      "/",
      { headers: { "X-Test-User-Email": "alice@example.com" } },
      env,
    );
    expect(await aliceRes.text()).toContain("Alice専用アイテム");

    const defaultRes = await app.request("/", {}, env);
    expect(await defaultRes.text()).not.toContain("Alice専用アイテム");
  });

  it("CloudFlare Access設定時にJWTヘッダーが無いと401になる", async () => {
    const res = await app.request(
      "/",
      {},
      {
        ...env,
        CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
        CF_ACCESS_AUD: "dummy-aud",
      },
    );
    expect(res.status).toBe(401);
  });

  it("CloudFlare Access設定時に不正なJWTでは401になる", async () => {
    const res = await app.request(
      "/",
      { headers: { "Cf-Access-Jwt-Assertion": "invalid.jwt.token" } },
      {
        ...env,
        CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
        CF_ACCESS_AUD: "dummy-aud",
      },
    );
    expect(res.status).toBe(401);
  });
});
