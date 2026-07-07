import express from "express";
import cors, { CorsOptions } from "cors";
import { config } from "dotenv";
import { initialize } from "express-openapi";
import { IncomingHttpHeaders } from "http";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import helmet from "helmet";
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

function resolveTrustProxySetting() {
  const configuredValue = process.env.EXPRESS_TRUST_PROXY?.trim();
  if (!configuredValue) {
    return process.env.NODE_ENV === "production" ? 1 : false;
  }

  if (configuredValue === "true") {
    return 1;
  }

  if (configuredValue === "false") {
    return false;
  }

  const hopCount = Number.parseInt(configuredValue, 10);
  if (Number.isInteger(hopCount) && hopCount >= 0) {
    return hopCount;
  }

  return configuredValue;
}

function firstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function stripWrappingCharacters(value: string) {
  return value.trim().replace(/^"+|"+$/g, "").replace(/^\[|\]$/g, "");
}

function stripPortIfPresent(value: string) {
  const normalizedValue = stripWrappingCharacters(value);
  if (!normalizedValue) return normalizedValue;

  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(normalizedValue)) {
    return normalizedValue.replace(/:\d+$/, "");
  }

  return normalizedValue;
}

function parseForwardedHeader(value: string | string[] | undefined) {
  const headerValue = firstHeaderValue(value);
  if (!headerValue) return null;

  for (const entry of headerValue.split(",")) {
    for (const segment of entry.split(";")) {
      const [rawKey, rawValue] = segment.split("=", 2);
      if (!rawKey || !rawValue || rawKey.trim().toLowerCase() !== "for") continue;

      const candidate = stripPortIfPresent(rawValue);
      if (candidate && candidate.toLowerCase() !== "unknown") {
        return candidate;
      }
    }
  }

  return null;
}

export function resolveRateLimitIp(headers: IncomingHttpHeaders, requestIp?: string, remoteAddress?: string) {
  const forwardedFor = firstHeaderValue(headers["x-forwarded-for"]);
  if (forwardedFor) {
    const candidate = stripPortIfPresent(forwardedFor.split(",")[0] ?? "");
    if (candidate) {
      return candidate;
    }
  }

  const forwardedHeaderIp = parseForwardedHeader(headers.forwarded);
  if (forwardedHeaderIp) {
    return forwardedHeaderIp;
  }

  const requestIpCandidate = stripPortIfPresent(requestIp ?? "");
  if (requestIpCandidate) {
    return requestIpCandidate;
  }

  const remoteAddressCandidate = stripPortIfPresent(remoteAddress ?? "");
  if (remoteAddressCandidate) {
    return remoteAddressCandidate;
  }

  return "127.0.0.1";
}

function createRateLimitKeyGenerator() {
  return (req: express.Request) => ipKeyGenerator(resolveRateLimitIp(req.headers, req.ip, req.socket.remoteAddress));
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

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: createRateLimitKeyGenerator(),
  message: { message: "Muitas requisicoes vindas deste IP, tente novamente mais tarde." },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: createRateLimitKeyGenerator(),
  message: { message: "Limite de tentativas excedido. Tente novamente em uma hora." },
});

export function createApp() {
  const app = express();

  const isDevelopment = process.env.NODE_ENV === "development";
  const docsContentSecurityPolicyDirectives = {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    fontSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
  };

  app.set("trust proxy", resolveTrustProxySetting());

  app.use(helmet({
    hsts: !isDevelopment, // Habilitar HSTS apenas em producao
  }));
  app.use(globalLimiter);
  app.use(cors(corsOptions));
  app.use(express.json());

  app.use("/api/match", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    keyGenerator: createRateLimitKeyGenerator(),
    message: { message: "Muitas solicitacoes de matching. Tente novamente em breve." },
  }));

  app.post("/api/admin/admin-users", strictLimiter);
  app.use("/api/auth/password-recovery", strictLimiter);
  app.use("/api/auth/change-password", strictLimiter);

  app.get("/api/openapi.json", (_req, res) => {
    res.json(apiDoc);
  });

  app.use("/api/docs", helmet({
    contentSecurityPolicy: {
      directives: docsContentSecurityPolicyDirectives,
    },
    hsts: !isDevelopment,
  }));

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
