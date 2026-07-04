const baseUrl = process.env.SECURITY_HEADER_BASE_URL ?? "http://127.0.0.1:3000";
const paths = (
  process.env.SECURITY_HEADER_PATHS ?? "/,/login,/launchbase-demo"
)
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

const requiredHeaders = {
  "content-security-policy": [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ],
  "x-frame-options": ["DENY"],
  "x-content-type-options": ["nosniff"],
  "referrer-policy": ["strict-origin-when-cross-origin"],
  "permissions-policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
  ],
  "cross-origin-opener-policy": ["same-origin"],
};

function urlFor(path) {
  return new URL(path, baseUrl).toString();
}

async function fetchWithRetry(url) {
  let lastError;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(url, { redirect: "manual" });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError;
}

for (const path of paths) {
  const response = await fetchWithRetry(urlFor(path));

  if (response.status >= 500) {
    throw new Error(`${path} returned ${response.status}`);
  }

  for (const [header, expectedValues] of Object.entries(requiredHeaders)) {
    const value = response.headers.get(header);

    if (!value) {
      throw new Error(`${path} is missing ${header}`);
    }

    for (const expectedValue of expectedValues) {
      if (!value.includes(expectedValue)) {
        throw new Error(
          `${path} ${header} expected ${expectedValue}, got ${value}`
        );
      }
    }
  }

  console.log(`ok - ${path} security headers`);
}
