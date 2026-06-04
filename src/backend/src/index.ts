import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import { config } from "dotenv";
import { randomUUID } from "crypto";
import { initialize } from "express-openapi";
import multer from "multer";
import path from "path";
import swaggerUi from "swagger-ui-express";
import type { MatchResponse } from "@ong-matching-animal/shared/types";
import { apiDoc, openApiOperations } from "./openapi";

config({ path: path.resolve(__dirname, "../../../.env.local") });
const app = express();
const animalPhotosBucket = "animal-photos";
const maxAnimalPhotoSizeBytes = 5 * 1024 * 1024;
const allowedAnimalPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const animalPhotoExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const uploadAnimalPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxAnimalPhotoSizeBytes, files: 1 },
});
const adminTables = {
  "admin-users": {
    table: "admin_users",
    select: "id,auth_user_id,email,is_active,created_by,created_at,updated_at",
    order: "created_at.desc",
    createFields: ["auth_user_id", "email", "is_active", "created_by"],
    updateFields: ["email", "is_active"],
  },
  tutors: {
    table: "tutors",
    select: "id,auth_user_id,name,location,custom_fields,created_at",
    order: "created_at.desc",
    createFields: ["auth_user_id", "name", "location", "custom_fields"],
    updateFields: ["name", "location", "custom_fields"],
  },
  animals: {
    table: "animals",
    select: "id,owner_id,name,species,location,custom_fields,created_at",
    order: "created_at.desc",
    createFields: ["owner_id", "name", "species", "location", "custom_fields"],
    updateFields: ["owner_id", "name", "species", "location", "custom_fields"],
  },
  "animal-photos": {
    table: "animal_photos",
    select: "id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at",
    order: "created_at.desc",
    createFields: ["animal_id", "bucket_id", "storage_path", "public_url", "content_type", "size_bytes", "is_primary"],
    updateFields: ["animal_id", "bucket_id", "storage_path", "public_url", "content_type", "size_bytes", "is_primary"],
  },
  "onboarding-questions": {
    table: "onboarding_questions",
    select: "id,label,description,placeholder,type,options,required,is_active,sort_order,created_at",
    order: "sort_order.asc",
    createFields: ["id", "label", "description", "placeholder", "type", "options", "required", "is_active", "sort_order"],
    updateFields: ["label", "description", "placeholder", "type", "options", "required", "is_active", "sort_order"],
  },
  "matching-rules": {
    table: "matching_rules",
    select: "id,rule_name,tutor_field,animal_field,comparison_operator,weight,is_active,created_at",
    order: "created_at.desc",
    createFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator", "weight", "is_active"],
    updateFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator", "weight", "is_active"],
  },
} as const;

type AdminResource = keyof typeof adminTables;

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
// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/openapi.json", (req: Request, res: Response) => {
  res.json(apiDoc);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(apiDoc, {
  explorer: true,
  swaggerOptions: {
    url: "/api/openapi.json",
  },
}));

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/onboarding-questions", async (req: Request, res: Response) => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/onboarding_questions?select=id,label,description,placeholder,type,options,required&is_active=eq.true&order=sort_order.asc`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel carregar as perguntas", details: body });
      return;
    }

    res.json(body);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

function getSupabaseBackendConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { supabaseUrl, serviceRoleKey };
}

function pickFields(source: Record<string, unknown>, fields: readonly string[]) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) payload[field] = source[field];
    return payload;
  }, {});
}

async function getAuthenticatedUserId(supabaseUrl: string, serviceRoleKey: string, authorization?: string) {
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  const user = await response.json() as { id?: string };
  return user.id ?? null;
}

async function getAuthenticatedAdmin(supabaseUrl: string, serviceRoleKey: string, authorization?: string) {
  const userId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, authorization);
  if (!userId) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/admin_users?select=id,auth_user_id,email,is_active&auth_user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) return null;
  const body = await response.json() as Array<{ id: string; auth_user_id: string; email: string; is_active: boolean }>;
  return body[0] ?? null;
}

async function requireAdmin(req: Request, res: Response) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return null;
  }

  const authorization = req.header("authorization");
  const userId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, authorization);
  if (!userId) {
    res.status(401).json({ message: "Sessao administrativa invalida ou ausente." });
    return null;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/admin_users?select=id,auth_user_id,email,is_active&auth_user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    res.status(403).json({ message: "Acesso administrativo negado." });
    return null;
  }

  const body = await response.json() as Array<{ id: string; auth_user_id: string; email: string; is_active: boolean }>;
  const admin = body[0] ?? null;

  if (!admin) {
    res.status(403).json({ message: "Acesso administrativo necessario." });
    return null;
  }

  return { supabaseUrl, serviceRoleKey, admin };
}

function getAdminTable(resource: string) {
  return adminTables[resource as AdminResource];
}

async function readJsonResponse(response: globalThis.Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toPublicStorageUrl(supabaseUrl: string, bucket: string, storagePath: string) {
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function normalizeAnimal(rawAnimal: any) {
  const photos = Array.isArray(rawAnimal.animal_photos) ? rawAnimal.animal_photos : [];
  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });
  const photoUrls = sortedPhotos.map((photo) => photo.public_url).filter(Boolean);
  const customFields = rawAnimal.custom_fields && typeof rawAnimal.custom_fields === "object" ? rawAnimal.custom_fields : {};
  const ageValue = customFields.age ?? customFields.idade ?? customFields.idade_meses;
  const ageNumber = typeof ageValue === "number" ? ageValue : Number(ageValue) || 0;
  const traitsValue = customFields.traits ?? customFields.caracteristicas ?? [
    customFields.raca,
    customFields.tamanho,
    customFields.nivel_energia,
  ];

  return {
    id: rawAnimal.id,
    owner_id: rawAnimal.owner_id,
    name: rawAnimal.name,
    species: rawAnimal.species,
    custom_fields: customFields,
    created_at: rawAnimal.created_at,
    age: ageNumber,
    verified: Boolean(customFields.verified ?? customFields.verificado ?? true),
    traits: Array.isArray(traitsValue) ? traitsValue.filter(Boolean).map(String) : [],
    photoUrl: photoUrls[0] ?? "",
    photoUrls,
    photos: sortedPhotos,
  };
}

app.get("/api/admin/me", async (req: Request, res: Response) => {
  try {
    const context = await requireAdmin(req, res);
    if (!context) return;

    res.json(context.admin);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel validar o administrador.",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.get("/api/admin/:resource", async (req: Request, res: Response) => {
  const config = getAdminTable(req.params.resource);
  if (!config) {
    res.status(404).json({ message: "Recurso administrativo nao encontrado." });
    return;
  }

  try {
    const context = await requireAdmin(req, res);
    if (!context) return;

    const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}?select=${config.select}&order=${config.order}`, {
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
      },
    });
    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel listar o recurso.", details: body });
      return;
    }

    res.json(Array.isArray(body) && req.params.resource === "animals" ? body.map(normalizeAnimal) : body);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.post("/api/admin/admin-users", async (req: Request, res: Response) => {
  try {
    const context = await requireAdmin(req, res);
    if (!context) return;

    const { email, password, full_name, is_active = true } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      is_active?: boolean;
    };

    if (!email || !password || password.length < 8) {
      res.status(400).json({ message: "Informe email e uma senha temporaria com pelo menos 8 caracteres." });
      return;
    }

    const authResponse = await fetch(`${context.supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name ?? email.split("@")[0], role: "admin" },
      }),
    });
    const authBody = await readJsonResponse(authResponse) as { id?: string; user?: { id?: string } } | null;

    if (!authResponse.ok) {
      res.status(authResponse.status).json({ message: "Nao foi possivel criar a conta no Supabase Auth.", details: authBody });
      return;
    }

    const authUserId = authBody?.id ?? authBody?.user?.id;
    if (!authUserId) {
      res.status(502).json({ message: "Supabase Auth nao retornou o id do usuario criado." });
      return;
    }

    const insertResponse = await fetch(`${context.supabaseUrl}/rest/v1/admin_users`, {
      method: "POST",
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify({
        auth_user_id: authUserId,
        email,
        is_active,
        created_by: context.admin.auth_user_id,
      }),
    });
    const insertBody = await insertResponse.json();

    if (!insertResponse.ok) {
      res.status(insertResponse.status).json({ message: "Conta criada, mas nao foi possivel marcar como administradora.", details: insertBody });
      return;
    }

    res.status(201).json(Array.isArray(insertBody) ? insertBody[0] : insertBody);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel criar o administrador.",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.post("/api/admin/:resource", async (req: Request, res: Response) => {
  const config = getAdminTable(req.params.resource);
  if (!config || req.params.resource === "admin-users") {
    res.status(404).json({ message: "Recurso administrativo nao encontrado." });
    return;
  }

  try {
    const context = await requireAdmin(req, res);
    if (!context) return;

    const payload = pickFields(req.body ?? {}, config.createFields);
    const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}`, {
      method: "POST",
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel criar o recurso.", details: body });
      return;
    }

    res.status(201).json(Array.isArray(body) ? body[0] : body);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.put("/api/admin/:resource/:id", async (req: Request, res: Response) => {
  const config = getAdminTable(req.params.resource);
  if (!config) {
    res.status(404).json({ message: "Recurso administrativo nao encontrado." });
    return;
  }

  try {
    const context = await requireAdmin(req, res);
    if (!context) return;

    const payload = pickFields(req.body ?? {}, config.updateFields);
    if (req.params.resource === "admin-users") payload.updated_at = new Date().toISOString();

    const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}?id=eq.${encodeURIComponent(req.params.id)}`, {
      method: "PATCH",
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel atualizar o recurso.", details: body });
      return;
    }

    res.json(Array.isArray(body) ? body[0] : body);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.delete("/api/admin/:resource/:id", async (req: Request, res: Response) => {
  const config = getAdminTable(req.params.resource);
  if (!config) {
    res.status(404).json({ message: "Recurso administrativo nao encontrado." });
    return;
  }

  try {
    const context = await requireAdmin(req, res);
    if (!context) return;

    const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}?id=eq.${encodeURIComponent(req.params.id)}`, {
      method: "DELETE",
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
        prefer: "return=representation",
      },
    });
    const body = await readJsonResponse(response);

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel remover o recurso.", details: body });
      return;
    }

    res.status(200).json({ deleted: true, rows: body });
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Endpoints de Tutores
app.post("/api/tutors", async (req: Request, res: Response) => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return;
  }

  const { auth_user_id, name, custom_fields } = req.body as {
    auth_user_id?: string;
    name?: string;
    custom_fields?: Record<string, unknown>;
  };

  if (!auth_user_id || !name || !custom_fields || typeof custom_fields !== "object") {
    res.status(400).json({ message: "Informe auth_user_id, name e custom_fields." });
    return;
  }

  try {
    const authenticatedUserId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));

    if (!authenticatedUserId) {
      res.status(401).json({ message: "Sessao invalida ou ausente." });
      return;
    }

    if (authenticatedUserId !== auth_user_id) {
      res.status(403).json({ message: "Nao e permitido salvar perfil de outro usuario." });
      return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/tutors?on_conflict=auth_user_id`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({ auth_user_id, name, custom_fields }),
    });

    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel salvar o tutor", details: body });
      return;
    }

    res.status(201).json(Array.isArray(body) ? body[0] : body);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.get("/api/tutors/me/onboarding-status", async (req: Request, res: Response) => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return;
  }

  try {
    const authenticatedUserId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));

    if (!authenticatedUserId) {
      res.status(401).json({ message: "Sessao invalida ou ausente." });
      return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/tutors?select=custom_fields&auth_user_id=eq.${encodeURIComponent(authenticatedUserId)}&limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel carregar o status de onboarding", details: body });
      return;
    }

    const profile = Array.isArray(body) ? body[0] : null;
    const customFields = profile?.custom_fields && typeof profile.custom_fields === "object" ? profile.custom_fields : {};
    res.json({ onboarding_complete: customFields.onboarding_complete === true });
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.get("/api/tutors/:id", (req: Request, res: Response) => {
  res.json({ message: "Implementar carregamento de tutor do Supabase" });
});

// Endpoints de Animais
app.get("/api/animals", async (req: Request, res: Response) => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/animals?select=id,owner_id,name,species,custom_fields,created_at,animal_photos(id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at)&order=created_at.desc`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel listar os animais", details: body });
      return;
    }

    res.json(Array.isArray(body) ? body.map(normalizeAnimal) : []);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.post("/api/animals", (req: Request, res: Response) => {
  res.status(201).json({ message: "Animal criado com sucesso" });
});

app.post("/api/animals/:id/photos/signed-url", async (req: Request, res: Response) => {
  try {
    const context = await requireAdmin(req, res);
    if (!context) return;

    const { contentType, fileName } = req.body as { contentType?: string; fileName?: string };
    if (!contentType) {
      res.status(400).json({ message: "Informe o contentType da imagem." });
      return;
    }

    const photoId = randomUUID();
    const extension = fileName?.split(".").pop() || animalPhotoExtensions[contentType] || "bin";
    const storagePath = `animals/${req.params.id}/${photoId}.${extension}`;
    const publicUrl = toPublicStorageUrl(context.supabaseUrl, animalPhotosBucket, storagePath);

    const supabaseResponse = await fetch(`${context.supabaseUrl}/storage/v1/object/upload/sign/${animalPhotosBucket}/${storagePath}`, {
      method: "POST",
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    });

    const supabaseBody = await supabaseResponse.json() as { url?: string };

    if (!supabaseResponse.ok) {
      res.status(supabaseResponse.status).json({ message: "Nao foi possivel gerar a URL assinada", details: supabaseBody });
      return;
    }

    const uploadUrl = `${context.supabaseUrl}/storage/v1${supabaseBody.url}`;

    res.json({
      uploadUrl,
      photoId,
      storagePath,
      publicUrl,
      contentType,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao gerar URL assinada.",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.get("/api/animals/:id/photos", async (req: Request, res: Response) => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/animal_photos?select=id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at&animal_id=eq.${encodeURIComponent(req.params.id)}&order=is_primary.desc,created_at.asc`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel listar as fotos do animal", details: body });
      return;
    }

    res.json(Array.isArray(body) ? body : []);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

app.post("/api/animals/:id/photos", async (req: Request, res: Response) => {
  // Suporte a registro via JSON (URLs assinadas)
  if (req.header("content-type")?.includes("application/json")) {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const { id, storage_path, public_url, content_type, size_bytes, is_primary = false } = req.body;

      if (!id || !storage_path || !public_url || !content_type) {
        res.status(400).json({ message: "Dados da foto incompletos para registro." });
        return;
      }

      const metadata = {
        id,
        animal_id: req.params.id,
        bucket_id: animalPhotosBucket,
        storage_path,
        public_url,
        content_type,
        size_bytes: size_bytes || 0,
        is_primary,
      };

      const metadataResponse = await fetch(`${context.supabaseUrl}/rest/v1/animal_photos`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify(metadata),
      });

      const metadataBody = await metadataResponse.json();

      if (!metadataResponse.ok) {
        res.status(metadataResponse.status).json({ message: "Nao foi possivel registrar a foto do animal", details: metadataBody });
        return;
      }

      res.status(201).json(Array.isArray(metadataBody) ? metadataBody[0] : metadataBody);
    } catch (error) {
      res.status(500).json({
        message: "Erro ao registrar metadados da foto.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
    return;
  }

  // Fallback para multipart (Multer)
  uploadAnimalPhoto.single("photo")(req, res, async (uploadError) => {
    if (uploadError instanceof multer.MulterError) {
      res.status(400).json({
        message: uploadError.code === "LIMIT_FILE_SIZE"
          ? `A imagem deve ter no maximo ${maxAnimalPhotoSizeBytes} bytes.`
          : "Nao foi possivel receber a imagem.",
      });
      return;
    }

    if (uploadError) {
      res.status(400).json({ message: "Nao foi possivel receber a imagem." });
      return;
    }

    const context = await requireAdmin(req, res);
    if (!context) {
      return;
    }

    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "Envie uma imagem no campo photo." });
      return;
    }

    if (!allowedAnimalPhotoTypes.has(file.mimetype)) {
      res.status(400).json({ message: "Formato invalido. Envie JPEG, PNG, WebP ou AVIF. GIF nao e permitido." });
      return;
    }

    if (file.size > maxAnimalPhotoSizeBytes) {
      res.status(400).json({ message: `A imagem deve ter no maximo ${maxAnimalPhotoSizeBytes} bytes.` });
      return;
    }

    const photoId = randomUUID();
    const extension = animalPhotoExtensions[file.mimetype];
    const storagePath = `animals/${req.params.id}/${photoId}.${extension}`;
    const publicUrl = toPublicStorageUrl(context.supabaseUrl, animalPhotosBucket, storagePath);

    try {
      const storageResponse = await fetch(`${context.supabaseUrl}/storage/v1/object/${animalPhotosBucket}/${storagePath}`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": file.mimetype,
          "cache-control": "3600",
        },
        body: file.buffer,
      });

      const storageBody = await readJsonResponse(storageResponse);

      if (!storageResponse.ok) {
        res.status(storageResponse.status).json({ message: "Nao foi possivel salvar a imagem no Storage", details: storageBody });
        return;
      }

      const metadata = {
        id: photoId,
        animal_id: req.params.id,
        bucket_id: animalPhotosBucket,
        storage_path: storagePath,
        public_url: publicUrl,
        content_type: file.mimetype,
        size_bytes: file.size,
      };

      const metadataResponse = await fetch(`${context.supabaseUrl}/rest/v1/animal_photos`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify(metadata),
      });

      const metadataBody = await metadataResponse.json();

      if (!metadataResponse.ok) {
        res.status(metadataResponse.status).json({ message: "Nao foi possivel registrar a foto do animal", details: metadataBody });
        return;
      }

      res.status(201).json(Array.isArray(metadataBody) ? metadataBody[0] : metadataBody);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
});

// Placeholder para endpoint de Matching
app.post("/api/match", (req: Request, res: Response) => {
  const { tutor_id } = req.body;
  
  const response: MatchResponse = {
    tutor_id,
    tutor_name: "Placeholder",
    total_animals_evaluated: 0,
    matches: [],
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

void initialize({
  app,
  apiDoc: apiDoc as any,
  operations: openApiOperations,
  exposeApiDocs: false,
  validateApiDoc: true,
}).catch((error) => {
  console.error("Erro ao inicializar express-openapi:", error);
});

// ATENCAO AQUI: Em vez de usar app.listen(), voce deve exportar o app
// Para testar localmente, voce pode usar uma condicional:
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  app.listen(port, () => {
    console.log(`🚀 Servidor Backend rodando na porta ${port}`);
    console.log(`📍 http://localhost:${port}/api/health`);
  });
}

// Exporta o app para a Vercel transformar em Serverless Function
export default app;
