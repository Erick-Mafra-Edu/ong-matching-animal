import type { Page, Route } from "@playwright/test";

export function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockOngSettingsApi(page: Page) {
  await page.route("**/api/ong-settings", async (route) => json(route, {
    id: "default",
    ong_name: "MatchPet E2E",
    extension_college: "Faculdade E2E",
    social_links: {},
    business_hours: {},
    settings: {},
  }));
}
