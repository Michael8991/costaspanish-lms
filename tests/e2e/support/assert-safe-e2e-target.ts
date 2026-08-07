const ALLOWED_E2E_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "demo.costaspanishclass.com",
]);

export function assertSafeE2ETarget(
  baseURL: string,
): void {
  let url: URL;

  try {
    url = new URL(baseURL);
  } catch {
    throw new Error(
      `Invalid PLAYWRIGHT_BASE_URL: "${baseURL}"`,
    );
  }

  if (!ALLOWED_E2E_HOSTS.has(url.hostname)) {
    throw new Error(
      [
        "Playwright E2E execution blocked.",
        `Host "${url.hostname}" is not an approved E2E target.`,
        `Base URL: ${baseURL}`,
      ].join(" "),
    );
  }
}