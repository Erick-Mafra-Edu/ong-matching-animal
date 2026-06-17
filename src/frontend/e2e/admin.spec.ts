import { expect, test, type Page, type Route } from "@playwright/test";

type AdminRecord = Record<string, unknown>;

interface AdminMockState {
  admin: AdminRecord;
  adminUsers: AdminRecord[];
  customFields: AdminRecord[];
  onboardingQuestions: AdminRecord[];
  lastCustomFieldPayload: AdminRecord | null;
  lastOnboardingQuestionPayload: AdminRecord | null;
}

function buildAdminMockState(): AdminMockState {
  return {
    admin: {
      id: "admin-row-123",
      auth_user_id: "admin-auth-123",
      email: "admin@example.com",
      is_active: true,
    },
    adminUsers: [
      {
        id: "admin-row-123",
        auth_user_id: "admin-auth-123",
        email: "admin@example.com",
        is_active: true,
      },
    ],
    customFields: [],
    onboardingQuestions: [],
    lastCustomFieldPayload: null,
    lastOnboardingQuestionPayload: null,
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockAdminApi(page: Page, state: AdminMockState) {
  await page.addInitScript((token) => {
    (window as Window & { __E2E_ACCESS_TOKEN__?: string }).__E2E_ACCESS_TOKEN__ = token;
  }, "e2e-admin-token");

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/admin/me") {
      return json(route, state.admin);
    }

    if (path === "/api/admin/bootstrap") {
      const resource = url.searchParams.get("resource") ?? "admin-users";
      const rows = resource === "custom-fields"
        ? state.customFields
        : resource === "onboarding-questions"
          ? state.onboardingQuestions
          : state.adminUsers;

      return json(route, {
        admin: state.admin,
        custom_fields: state.customFields,
        onboarding_questions: state.onboardingQuestions,
        resource,
        rows,
      });
    }

    if (path === "/api/admin/custom-fields" && method === "GET") {
      return json(route, state.customFields);
    }

    if (path === "/api/admin/onboarding-questions" && method === "GET") {
      return json(route, state.onboardingQuestions);
    }

    if (path === "/api/admin/admin-users" && method === "GET") {
      return json(route, state.adminUsers);
    }

    if (path === "/api/admin/custom-fields" && method === "POST") {
      const payload = request.postDataJSON() as AdminRecord;
      state.lastCustomFieldPayload = payload;
      const created = {
        id: "custom-field-1",
        source_question_id: null,
        ...payload,
      };
      state.customFields = [created, ...state.customFields];
      return json(route, created, 201);
    }

    if (path === "/api/admin/onboarding-questions" && method === "POST") {
      const payload = request.postDataJSON() as AdminRecord;
      state.lastOnboardingQuestionPayload = payload;
      const created = {
        description: null,
        placeholder: null,
        ...payload,
      };
      state.onboardingQuestions = [created, ...state.onboardingQuestions];
      return json(route, created, 201);
    }

    return json(route, []);
  });
}

test("permite cadastrar campo customizado sem options e envia null para o endpoint", async ({ page }) => {
  const state = buildAdminMockState();
  await mockAdminApi(page, state);

  await page.goto("/admin");
  await page.getByRole("button", { name: "Campos customizados" }).click();
  await page.getByRole("button", { name: "Adicionar Novo" }).click();
  await page.getByLabel("Serve para").selectOption("animal");
  await page.getByLabel("Chave do campo").fill("pelagem");
  await page.getByLabel("Descrição do campo").fill("Pelagem");
  await page.getByRole("button", { name: "Criar Registro" }).click();

  await expect(page.getByText("Registro criado.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pelagem para animal pelagem" })).toBeVisible();
  expect(state.lastCustomFieldPayload).toMatchObject({
    entity_type: "animal",
    field_key: "pelagem",
    label: "Pelagem",
    field_type: "text",
    options: null,
  });
});

test("gera o id da pergunta de onboarding e envia payload valido para criacao", async ({ page }) => {
  const state = buildAdminMockState();
  await mockAdminApi(page, state);

  await page.goto("/admin");
  await page.getByRole("button", { name: "Onboarding" }).click();
  await page.getByRole("button", { name: "Adicionar Novo" }).click();
  await page.getByRole("textbox", { name: "Pergunta*" }).fill("Qual nome voce imagina para o pet?");

  await expect(page.getByLabel("Identificador")).toHaveValue("qual_nome_voce_imagina_para_o_pet");
  await page.getByRole("button", { name: "Criar Registro" }).click();

  await expect(page.getByText("Registro criado.")).toBeVisible();
  expect(state.lastOnboardingQuestionPayload).toMatchObject({
    id: "qual_nome_voce_imagina_para_o_pet",
    label: "Qual nome voce imagina para o pet?",
    type: "text",
    options: null,
  });
});
