import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("healthz", () => {
  it("returns ok", async () => {
    const res = await app.request("/healthz", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
