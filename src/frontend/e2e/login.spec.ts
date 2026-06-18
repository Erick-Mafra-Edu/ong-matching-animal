import { expect, test } from "@playwright/test";
import { mockOngSettingsApi } from "./mocks";

test("renderiza apenas um campo de email na tela de login", async ({ page }) => {
  await mockOngSettingsApi(page);

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveCount(1);
  await expect(page.locator('input[name="password"]')).toHaveCount(1);
  await expect(page.getByText("Projeto de Extensão Faculdade E2E.")).toBeVisible();
});
