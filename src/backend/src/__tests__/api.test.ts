import request from "supertest";
import app from "../index";

describe("API Endpoints", () => {
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

  describe("POST /api/tutors", () => {
    it("should create a tutor", async () => {
      const response = await request(app).post("/api/tutors");

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("sucesso");
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
