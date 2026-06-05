import express from "express";
import cors, { CorsOptions } from "cors";
import { config } from "dotenv";
import { initialize } from "express-openapi";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { apiDoc, openApiOperations } from "./openapi";
import { createApiRouter } from "./routes/apiRouter";

config({ path: path.resolve(__dirname, "../../../.env.local") });

function normalizeOrigin(origin?: string) {
  if (!origin) return undefined;

  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

const allowedOrigins = [
  process.env.NEXT_PUBLIC_FRONTEND_URL,
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
]
  .map(normalizeOrigin)
  .filter((origin): origin is string => Boolean(origin));

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, allowedOrigins.length === 0 || allowedOrigins.includes(normalizeOrigin(origin) ?? origin));
  },
  optionsSuccessStatus: 200,
};

export function createApp() {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json());

  app.get("/api/openapi.json", (_req, res) => {
    res.json(apiDoc);
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(apiDoc, {
    explorer: true,
    swaggerOptions: {
      url: "/api/openapi.json",
    },
  }));

  app.use("/api", createApiRouter());

  void initialize({
    app,
    apiDoc: apiDoc as any,
    operations: openApiOperations,
    exposeApiDocs: false,
    validateApiDoc: true,
  }).catch((error) => {
    console.error("Erro ao inicializar express-openapi:", error);
  });

  return app;
}

const app = createApp();

export default app;
