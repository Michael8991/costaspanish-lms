export type E2ETarget =
  | "local-staging"
  | "remote-staging";

const ALLOWED_LOCAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const ALLOWED_REMOTE_ORIGINS = new Set([
  "https://demo.costaspanishclass.com",
]);

const PRODUCTION_HOSTS = new Set([
  "app.costaspanishclass.com",
]);

export function assertSafeE2ETarget(
  baseURL: string,
  target: string,
): URL {
  let url: URL;

  try {
    url = new URL(baseURL);
  } catch {
    throw new Error(
      `Invalid PLAYWRIGHT_BASE_URL: "${baseURL}"`,
    );
  }

  if (PRODUCTION_HOSTS.has(url.hostname)) {
    throw new Error(
      [
        "PLAYWRIGHT EXECUTION BLOCKED.",
        "Production is never an approved E2E target.",
        `Received host: "${url.hostname}".`,
      ].join(" "),
    );
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "PLAYWRIGHT_BASE_URL must be a clean application origin.",
    );
  }

  if (url.pathname !== "/") {
    throw new Error(
      [
        "PLAYWRIGHT_BASE_URL must not contain a path.",
        `Received: "${baseURL}".`,
      ].join(" "),
    );
  }

  if (
    target !== "local-staging" &&
    target !== "remote-staging"
  ) {
    throw new Error(
      [
        "Invalid E2E_TARGET.",
        `Received: "${target}".`,
        'Allowed values: "local-staging", "remote-staging".',
      ].join(" "),
    );
  }

  if (target === "local-staging") {
    if (!ALLOWED_LOCAL_ORIGINS.has(url.origin)) {
      throw new Error(
        [
          "Playwright E2E execution blocked.",
          '"local-staging" may only target localhost:3000.',
          `Received: "${url.origin}".`,
        ].join(" "),
      );
    }
  }

  if (target === "remote-staging") {
    if (!ALLOWED_REMOTE_ORIGINS.has(url.origin)) {
      throw new Error(
        [
          "Playwright E2E execution blocked.",
          '"remote-staging" may only target the CostaSpanish demo.',
          `Received: "${url.origin}".`,
        ].join(" "),
      );
    }
  }

  return url;
}