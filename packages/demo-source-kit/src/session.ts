// SPDX-License-Identifier: MIT

import { createHmac, timingSafeEqual } from "node:crypto";

export function createSessionValue(secret: string, audience: string): string {
  const signature = createHmac("sha256", secret).update(audience).digest("base64url");
  return `v1.${signature}`;
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const entry of cookieHeader.split(";")) {
    const [candidateName, ...valueParts] = entry.trim().split("=");
    if (candidateName === name) {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function hasValidSession(
  cookieHeader: string | undefined,
  cookieName: string,
  secret: string,
  audience: string,
): boolean {
  const received = readCookie(cookieHeader, cookieName);
  if (!received) return false;
  const expectedBuffer = Buffer.from(createSessionValue(secret, audience));
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function sessionCookie(name: string, secret: string, audience: string): string {
  return `${name}=${encodeURIComponent(createSessionValue(secret, audience))}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`;
}

export function clearSessionCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function localLoginPage(title: string): string {
  return `<!doctype html>
    <html><head><title>${title} sign in</title></head><body>
      <main>
        <h1>${title}</h1>
        <p>Enter the local user token from <code>.env.example</code>.</p>
        <form id="login-form">
          <label>Local token <input id="token" name="token" type="password" required autofocus /></label>
          <button type="submit">Sign in</button>
          <p id="error" role="alert"></p>
        </form>
      </main>
      <script>
        document.getElementById("login-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const response = await fetch("/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: document.getElementById("token").value })
          });
          if (response.ok) location.assign("/");
          else document.getElementById("error").textContent = "Invalid local token.";
        });
      </script>
    </body></html>`;
}
