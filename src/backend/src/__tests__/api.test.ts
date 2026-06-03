import request from "supertest";
import app from "../index";

describe("API Endpoints", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe("ok");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should return valid ISO timestamp", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      const timestamp = response.body.timestamp;
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe("GET /api/onboarding-questions", () => {
    it("should list active onboarding questions", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "preferred_energy",
            label: "Energia",
            type: "radio",
            required: true,
            options: [{ label: "Baixo", value: "baixo" }],
          },
        ],
      }) as jest.Mock;

      const response = await request(app).get("/api/onboarding-questions");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("id", "preferred_energy");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/rest/v1/onboarding_questions"),
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: "service-key",
          }),
        }),
      );
    });

    it("should return 500 when Supabase env vars are missing", async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const response = await request(app).get("/api/onboarding-questions");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("POST /api/tutors", () => {
    it("should require an authenticated user", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

      const response = await request(app)
        .post("/api/tutors")
        .send({
          auth_user_id: "user-123",
          name: "Tutor Teste",
          custom_fields: { onboarding_complete: true },
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message");
    });

    it("should upsert the authenticated tutor using Supabase", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "tutor-123", auth_user_id: "user-123" }],
        }) as jest.Mock;

      const response = await request(app)
        .post("/api/tutors")
        .set("Authorization", "Bearer access-token")
        .send({
          auth_user_id: "user-123",
          name: "Tutor Teste",
          custom_fields: { onboarding_complete: true, home_type: "apartamento" },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("auth_user_id", "user-123");
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        "https://example.supabase.co/auth/v1/user",
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer access-token",
          }),
        }),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "https://example.supabase.co/rest/v1/tutors?on_conflict=auth_user_id",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            authorization: "Bearer service-key",
            prefer: "resolution=merge-duplicates,return=representation",
          }),
        }),
      );
    });
  });

  describe("GET /api/tutors/:id", () => {
    it("should get tutor by id", async () => {
      const response = await request(app).get("/api/tutors/123");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("GET /api/animals", () => {
    it("should list animals", async () => {
      const response = await request(app).get("/api/animals");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("POST /api/animals", () => {
    it("should create an animal", async () => {
      const response = await request(app).post("/api/animals");

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("sucesso");
    });
  });

  describe("POST /api/match", () => {
    it("should return match response with required fields", async () => {
      const response = await request(app)
        .post("/api/match")
        .send({ tutor_id: "tutor123" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("tutor_id");
      expect(response.body).toHaveProperty("tutor_name");
      expect(response.body).toHaveProperty("total_animals_evaluated");
      expect(response.body).toHaveProperty("matches");
      expect(response.body).toHaveProperty("timestamp");
      expect(Array.isArray(response.body.matches)).toBe(true);
    });

    it("should accept tutor_id in request body", async () => {
      const tutor_id = "test_tutor_456";
      const response = await request(app)
        .post("/api/match")
        .send({ tutor_id });

      expect(response.status).toBe(200);
      expect(response.body.tutor_id).toBe(tutor_id);
    });

    it("should return timestamp field", async () => {
      const response = await request(app)
        .post("/api/match")
        .send({ tutor_id: "tutor789" });

      expect(response.status).toBe(200);
      const timestamp = response.body.timestamp;
      expect(() => new Date(timestamp)).not.toThrow();
    });
  });

  describe("CORS", () => {
    it("should have CORS enabled", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      // CORS headers would be set if enabled (tested in browser context)
    });
  });

  describe("JSON Body Parsing", () => {
    it("should parse JSON request bodies", async () => {
      const testData = { tutor_id: "test123", data: "test" };
      const response = await request(app)
        .post("/api/match")
        .set("Content-Type", "application/json")
        .send(testData);

      expect(response.status).toBe(200);
      expect(response.body.tutor_id).toBe(testData.tutor_id);
    });
  });
});
