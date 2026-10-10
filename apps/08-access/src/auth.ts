import { createRemoteJWKSet, importJWK, jwtVerify } from "jose";

import { parse } from "hono/utils/cookie";
import { publicJwk } from "../local-fixture.ts";
import { fail } from "../../../packages/ui/server.tsx";

export type AuthEnv = { MODE: string; ACCESS_ISSUER: string; ACCESS_AUDIENCE: string };
export async function identity(token: string, env: AuthEnv) {
  if (!env.ACCESS_ISSUER || !env.ACCESS_AUDIENCE) fail(401, "CONFIG", "Accessの設定が必要です。");
  try {
    const key =
      env.MODE === "local"
        ? await importJWK(publicJwk, "RS256")
        : createRemoteJWKSet(new URL("/cdn-cgi/access/certs", env.ACCESS_ISSUER));
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["RS256"],
      issuer: env.ACCESS_ISSUER,
      audience: env.ACCESS_AUDIENCE,
      requiredClaims: ["exp", "iat", "email"],
    });
    return { email: payload["email"], expiresAt: payload.exp };
  } catch {
    return fail(401, "UNAUTHORIZED", "署名・発行元・対象・有効期限を確認できません。");
  }
}
export async function authorize(request: Request, env: AuthEnv) {
  const token =
    request.headers.get("Cf-Access-Jwt-Assertion") ??
    parse(request.headers.get("Cookie") ?? "")["CF_Authorization"];
  if (!token) fail(401, "UNAUTHORIZED", "JWTが必要です。");
  return identity(token, env);
}
