import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";

const ACCESS_JWT_HEADER = "Cf-Access-Jwt-Assertion";
const TEST_USER_EMAIL_HEADER = "X-Test-User-Email";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
    );
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  aud: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
    const email = payload.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

export const requireUser: MiddlewareHandler<{
  Bindings: Env;
  Variables: { userEmail: string };
}> = async (c, next) => {
  const teamDomain = c.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = c.env.CF_ACCESS_AUD;

  if (teamDomain && aud) {
    const token = c.req.header(ACCESS_JWT_HEADER);
    const email = token
      ? await verifyAccessJwt(token, teamDomain, aud)
      : null;
    if (!email) {
      return c.text("認証が必要です。", 401);
    }
    c.set("userEmail", email);
    await next();
    return;
  }

  // CloudFlare Accessが未設定のローカル開発・テスト環境向けフォールバック。
  // DEV_USER_EMAILが設定された環境でだけ有効にする。本番でAUDを設定し忘れても、
  // X-Test-User-Emailヘッダーで任意のユーザーになりすませないようにするため。
  const devEmail = c.env.DEV_USER_EMAIL;
  if (!devEmail) {
    return c.text(
      "DEV_USER_EMAIL が未設定です。ローカル開発用のユーザーメールアドレスを設定してください。",
      401,
    );
  }
  c.set("userEmail", c.req.header(TEST_USER_EMAIL_HEADER) || devEmail);
  await next();
};
