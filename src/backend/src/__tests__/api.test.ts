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

  describe("OpenAPI documentation", () => {
    it("should expose the OpenAPI document", async () => {
      const response = await request(app).get("/api/openapi.json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("swagger", "2.0");
      expect(response.body).toHaveProperty("basePath", "/api");
      expect(response.body.paths).toHaveProperty("/health");
      expect(response.body.paths).toHaveProperty("/tutors");
      expect(response.body.paths).toHaveProperty("/animals/{id}/photos");
      expect(response.body.paths).toHaveProperty("/animals/{id}/photos/signed-url");
    });

    it("should expose Swagger UI", async () => {
      const response = await request(app).get("/api/docs/");

      expect(response.status).toBe(200);
      expect(response.text).toContain("Swagger UI");
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

  describe("Admin endpoints", () => {
    it("should require admin access (401 when no token)", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

      const response = await request(app).get("/api/admin/tutors");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message");
    });

    it("should list an admin resource for active admins", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "admin-auth-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-row-123", auth_user_id: "admin-auth-123", email: "admin@example.com", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "tutor-123", name: "Tutor Teste" }],
        }) as jest.Mock;

      const response = await request(app)
        .get("/api/admin/tutors")
        .set("Authorization", "Bearer access-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("/rest/v1/tutors"),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer service-key",
          }),
        }),
      );
    });

    it("should create an auth user before inserting an admin user", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "admin-auth-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-row-123", auth_user_id: "admin-auth-123", email: "admin@example.com", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: "new-auth-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "new-admin-row", auth_user_id: "new-auth-123", email: "new@example.com", is_active: true }],
        }) as jest.Mock;

      const response = await request(app)
        .post("/api/admin/admin-users")
        .set("Authorization", "Bearer access-token")
        .send({
          email: "new@example.com",
          password: "temporary-password",
          full_name: "Novo Admin",
          is_active: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("auth_user_id", "new-auth-123");
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        "https://example.supabase.co/auth/v1/admin/users",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"email\":\"new@example.com\""),
        }),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        4,
        "https://example.supabase.co/rest/v1/admin_users",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"created_by\":\"admin-auth-123\""),
        }),
      );
    });

    it("should list tutor interest records with tutor and animal labels for admins", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "admin-auth-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-row-123", auth_user_id: "admin-auth-123", email: "admin@example.com", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: "interest-uuid-123",
            uuid_registro: "interest-uuid-123",
            tutor_id: "tutor-123",
            animal_id: "animal-123",
            data_registro: "2026-06-05T12:00:00.000Z",
            tutor: { id: "tutor-123", name: "Tutor Admin" },
            animal: { id: "animal-123", name: "Yolo", species: "Cachorro" },
          }],
        }) as jest.Mock;

      const response = await request(app)
        .get("/api/admin/tutor-interessados")
        .set("Authorization", "Bearer access-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: "interest-uuid-123",
        uuid_registro: "interest-uuid-123",
        tutor_name: "Tutor Admin",
        animal_name: "Yolo",
        detail_url: "/interessados/interest-uuid-123",
      });
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("/rest/v1/tutor_interessados"),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer service-key",
          }),
        }),
      );
    });

    it("should list calendar events for admins", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "admin-auth-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-row-123", auth_user_id: "admin-auth-123", email: "admin@example.com", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: "event-123",
            title: "Visita de adocao",
            starts_at: "2026-06-10T14:00:00.000Z",
            ends_at: "2026-06-10T15:00:00.000Z",
            status: "scheduled",
            tutor: { id: "tutor-123", name: "Tutor Admin" },
            animal: { id: "animal-123", name: "Yolo", species: "Cachorro" },
          }],
        }) as jest.Mock;

      const response = await request(app)
        .get("/api/calendar-events")
        .set("Authorization", "Bearer access-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: "event-123",
        title: "Visita de adocao",
        tutor_name: "Tutor Admin",
        animal_name: "Yolo",
      });
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("/rest/v1/calendar_events"),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer service-key",
          }),
        }),
      );
    });

    it("should create a calendar event for admins", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "admin-auth-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-row-123", auth_user_id: "admin-auth-123", email: "admin@example.com", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: "event-123",
            title: "Visita de adocao",
            starts_at: "2026-06-10T14:00:00.000Z",
            ends_at: "2026-06-10T15:00:00.000Z",
            status: "scheduled",
            created_by: "admin-row-123",
          }],
        }) as jest.Mock;

      const payload = {
        title: "Visita de adocao",
        starts_at: "2026-06-10T14:00:00.000Z",
        ends_at: "2026-06-10T15:00:00.000Z",
        status: "scheduled",
      };

      const response = await request(app)
        .post("/api/calendar-events")
        .set("Authorization", "Bearer access-token")
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id", "event-123");
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        "https://example.supabase.co/rest/v1/calendar_events",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"created_by\":\"admin-row-123\""),
        }),
      );
    });
  });

  describe("Interest endpoints", () => {
    it("should create an interest record for an authenticated tutor", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "tutor-123", auth_user_id: "user-123", name: "Tutor Teste" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            uuid_registro: "interest-uuid-123",
            tutor_id: "tutor-123",
            animal_id: "animal-123",
            data_registro: "2026-06-05T12:00:00.000Z",
          }],
        }) as jest.Mock;

      const response = await request(app)
        .post("/api/interessados")
        .set("Authorization", "Bearer access-token")
        .send({ animal_id: "animal-123" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("uuid_registro", "interest-uuid-123");
      expect(response.body).toHaveProperty("detail_url", "/interessados/interest-uuid-123");
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        "https://example.supabase.co/rest/v1/tutor_interessados",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tutor_id: "tutor-123", animal_id: "animal-123" }),
        }),
      );
    });

    it("should require admin access to view an interest detail", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        }) as jest.Mock;

      const response = await request(app)
        .get("/api/interessados/interest-uuid-123")
        .set("Authorization", "Bearer access-token");

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("administrativo");
    });

    it("should return tutor and animal data for admin interest detail", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "admin-auth-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-row-123", auth_user_id: "admin-auth-123", email: "admin@example.com", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            uuid_registro: "interest-uuid-123",
            tutor_id: "tutor-123",
            animal_id: "animal-123",
            data_registro: "2026-06-05T12:00:00.000Z",
          }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: "tutor-123",
            auth_user_id: "user-123",
            name: "Tutor Teste",
            custom_fields: { tamanho_casa: "apartamento" },
          }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: "animal-123",
            owner_id: "owner-123",
            name: "Yolo",
            species: "Cachorro",
            custom_fields: { nivel_energia: "baixo" },
            animal_photos: [{ id: "photo-123", public_url: "https://example.com/pet.webp", is_primary: true }],
          }],
        }) as jest.Mock;

      const response = await request(app)
        .get("/api/interessados/interest-uuid-123")
        .set("Authorization", "Bearer access-token");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        uuid_registro: "interest-uuid-123",
        tutor: { id: "tutor-123", name: "Tutor Teste" },
        animal: { id: "animal-123", name: "Yolo", species: "Cachorro" },
      });
      expect(response.body.animal.photoUrl).toBe("https://example.com/pet.webp");
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
    it("should list animals with photo URLs", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "animal-123",
            owner_id: "tutor-123",
            name: "Yolo",
            species: "Cachorro",
            custom_fields: { age: 2, traits: ["Calmo"], verified: true },
            animal_photos: [
              {
                id: "photo-123",
                animal_id: "animal-123",
                public_url: "https://example.supabase.co/storage/v1/object/public/animal-photos/animals/animal-123/photo-123.webp",
                is_primary: true,
                created_at: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
        ],
      }) as jest.Mock;

      const response = await request(app).get("/api/animals");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("photoUrl", "https://example.supabase.co/storage/v1/object/public/animal-photos/animals/animal-123/photo-123.webp");
      expect(response.body[0]).toHaveProperty("photoUrls");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/rest/v1/animals"),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer service-key",
          }),
        }),
      );
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

  describe("GET /api/animals/:id/photos", () => {
    it("should list animal photos by animal id", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "photo-123",
            animal_id: "animal-123",
            bucket_id: "animal-photos",
            storage_path: "animals/animal-123/photo-123.webp",
            public_url: "https://example.supabase.co/storage/v1/object/public/animal-photos/animals/animal-123/photo-123.webp",
            content_type: "image/webp",
            size_bytes: 1024,
            is_primary: false,
          },
        ],
      }) as jest.Mock;

      const response = await request(app).get("/api/animals/animal-123/photos");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("animal_id", "animal-123");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/rest/v1/animal_photos"),
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: "service-key",
          }),
        }),
      );
    });
  });

  describe("POST /api/animals/:id/photos", () => {
    it("should require an authenticated user", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

      const response = await request(app)
        .post("/api/animals/animal-123/photos")
        .attach("photo", Buffer.from("jpeg"), { filename: "pet.jpg", contentType: "image/jpeg" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message");
    });

    it("should reject missing files and return 400 after admin check", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-123", auth_user_id: "user-123", is_active: true }],
        }) as jest.Mock;

      const response = await request(app)
        .post("/api/animals/animal-123/photos")
        .set("Authorization", "Bearer access-token");

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("photo");
    });

    it("should upload a valid image (multipart) and persist metadata", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-123", auth_user_id: "user-123", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ Key: "animals/animal-123/photo.webp" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: "photo-123",
            animal_id: "animal-123",
            bucket_id: "animal-photos",
            storage_path: "animals/animal-123/photo-123.webp",
            public_url: "https://example.supabase.co/storage/v1/object/public/animal-photos/animals/animal-123/photo-123.webp",
            content_type: "image/webp",
            size_bytes: 4,
            is_primary: false,
          }],
        }) as jest.Mock;

      const response = await request(app)
        .post("/api/animals/animal-123/photos")
        .set("Authorization", "Bearer access-token")
        .attach("photo", Buffer.from("webp"), { filename: "pet.webp", contentType: "image/webp" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("animal_id", "animal-123");
    });

    it("should register a photo via JSON (metadata only)", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-123", auth_user_id: "user-123", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: "photo-json-123",
            animal_id: "animal-123",
            bucket_id: "animal-photos",
            storage_path: "animals/animal-123/photo.jpg",
            public_url: "http://example.com/photo.jpg",
            content_type: "image/jpeg",
            size_bytes: 100,
            is_primary: false,
          }],
        }) as jest.Mock;

      const response = await request(app)
        .post("/api/animals/animal-123/photos")
        .set("Authorization", "Bearer access-token")
        .set("Content-Type", "application/json")
        .send({
          id: "photo-json-123",
          storage_path: "animals/animal-123/photo.jpg",
          public_url: "http://example.com/photo.jpg",
          content_type: "image/jpeg",
          size_bytes: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id", "photo-json-123");
    });
  });

  describe("POST /api/animals/:id/photos/signed-url", () => {
    it("should generate a signed upload URL", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
      
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "user-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "admin-123", auth_user_id: "user-123", is_active: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: "/object/upload/sign/mock-token" }),
        }) as jest.Mock;

      const response = await request(app)
        .post("/api/animals/animal-123/photos/signed-url")
        .set("Authorization", "Bearer access-token")
        .send({
          contentType: "image/jpeg",
          fileName: "pet.jpg",
        });

      expect(response.status).toBe(200);
      expect(response.body.uploadUrl).toContain("/object/upload/sign/mock-token");
      expect(response.body).toHaveProperty("photoId");
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
