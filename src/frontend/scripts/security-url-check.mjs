const baseUrl = process.env.FRONTEND_SECURITY_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

const reflectedPayloads = [
  "<script>alert(1)</script>",
  "\"><img src=x onerror=alert(1)>",
  "javascript:alert(1)",
];

const routes = [
  { path: "/", name: "home" },
  { path: "/login", name: "login" },
  { path: `/login?auth_error=${encodeURIComponent(reflectedPayloads[0])}`, name: "login xss query" },
  { path: `/login?next=${encodeURIComponent("https://evil.example/phish")}`, name: "login open redirect query" },
  { path: `/cadastro?returnTo=${encodeURIComponent("//evil.example")}`, name: "signup protocol-relative query" },
  { path: "/onboarding", name: "onboarding" },
  { path: "/discover", name: "discover" },
  { path: "/admin", name: "admin" },
  { path: "/%2e%2e/%2e%2e/.env", name: "encoded path traversal" },
  { path: "/_next/%2e%2e/package.json", name: "encoded next asset traversal" },
];

const expectedHeaders = {
  "content-security-policy": /default-src 'self'/,
  "x-content-type-options": /^nosniff$/i,
  "x-frame-options": /^DENY$/i,
  "referrer-policy": /^strict-origin-when-cross-origin$/i,
  "permissions-policy": /camera=\(\)/,
};

function toUrl(path) {
  return new URL(path, `${normalizedBaseUrl}/`).toString();
}

function normalizeBody(body) {
  return body
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'");
}

function hasReflectedPayload(body) {
  const normalizedBody = normalizeBody(body);
  return reflectedPayloads.some((payload) => normalizedBody.includes(payload));
}

async function checkRoute(route) {
  const response = await fetch(toUrl(route.path), {
    redirect: "manual",
    headers: {
      "user-agent": "ong-matching-security-url-check/1.0",
    },
  });

  const body = await response.text();
  const failures = [];

  if (response.status >= 500) {
    failures.push(`retornou HTTP ${response.status}`);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    if (/^https?:\/\/|^\/\//i.test(location) && !location.startsWith(normalizedBaseUrl)) {
      failures.push(`redirecionou para origem externa: ${location}`);
    }
  }

  if (hasReflectedPayload(body)) {
    failures.push("refletiu payload de URL no HTML");
  }

  for (const [header, pattern] of Object.entries(expectedHeaders)) {
    const value = response.headers.get(header);
    if (!value || !pattern.test(value)) {
      failures.push(`header ausente ou invalido: ${header}`);
    }
  }

  return {
    failures,
    name: route.name,
    path: route.path,
    status: response.status,
  };
}

const results = [];

for (const route of routes) {
  try {
    results.push(await checkRoute(route));
  } catch (error) {
    results.push({
      failures: [error instanceof Error ? error.message : String(error)],
      name: route.name,
      path: route.path,
      status: "erro",
    });
  }
}

const failed = results.filter((result) => result.failures.length > 0);

for (const result of results) {
  const prefix = result.failures.length > 0 ? "FAIL" : "PASS";
  console.log(`${prefix} ${result.status} ${result.name} ${result.path}`);
  for (const failure of result.failures) {
    console.log(`  - ${failure}`);
  }
}

if (failed.length > 0) {
  console.error(`\nSecurity URL check failed for ${failed.length} route(s).`);
  process.exit(1);
}

console.log(`\nSecurity URL check passed for ${results.length} route(s).`);
