import { randomUUID } from "crypto";
import { Request, Response } from "express";
import multer from "multer";
import {
  adminTables,
  allowedAnimalPhotoTypes,
  animalPhotoExtensions,
  animalPhotosBucket,
  getRouteParam,
  getSupabaseBackendConfig,
  maxAnimalPhotoSizeBytes,
  normalizeAnimal,
  pickFields,
  readJsonResponse,
  requireAuthenticated,
  requireAdmin,
  toPublicStorageUrl,
} from "./apiSupport";

const animalSelect = "id,owner_id,name,species,custom_fields,created_at,animal_photos(id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at)";

export class AnimalsController {
  private readonly uploadAnimalPhoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxAnimalPhotoSizeBytes, files: 1 },
  });

  list = async (req: Request, res: Response) => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    const limit = parseBoundedInteger(req.query.limit, 12, 1, 50);
    const offset = parseBoundedInteger(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const supabaseLimit = limit + 1;
    const tutorId = typeof req.query.tutor_id === "string" ? req.query.tutor_id.trim() : "";

    try {
      const response = tutorId
        ? await this.listCachedMatches(req, res, {
          tutorId,
          supabaseUrl,
          serviceRoleKey,
          limit,
          offset,
          supabaseLimit,
        })
        : await fetch(`${supabaseUrl}/rest/v1/animals?select=${animalSelect}&order=created_at.desc&limit=${supabaseLimit}&offset=${offset}`, {
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
          },
        });

      if (!response) return;
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel listar os animais", details: body });
        return;
      }

      const rows = Array.isArray(body) ? body : [];
      const items = rows.slice(0, limit).map((row) => normalizeAnimal(row.animal ?? row));
      const hasMore = rows.length > limit;

      res.json({
        items,
        pagination: {
          limit,
          offset,
          nextOffset: hasMore ? offset + items.length : null,
          hasMore,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  private async listCachedMatches(
    req: Request,
    res: Response,
    options: {
      tutorId: string;
      supabaseUrl: string;
      serviceRoleKey: string;
      limit: number;
      offset: number;
      supabaseLimit: number;
    },
  ) {
    const context = await requireAuthenticated(req, res);
    if (!context) return null;

    const tutorResponse = await fetch(`${options.supabaseUrl}/rest/v1/tutors?select=id&auth_user_id=eq.${encodeURIComponent(context.userId)}&id=eq.${encodeURIComponent(options.tutorId)}&limit=1`, {
      headers: {
        apikey: options.serviceRoleKey,
        authorization: `Bearer ${options.serviceRoleKey}`,
      },
    });
    const tutorBody = await tutorResponse.json();

    if (!tutorResponse.ok) {
      res.status(tutorResponse.status).json({ message: "Nao foi possivel validar o tutor do discover.", details: tutorBody });
      return null;
    }

    if (!Array.isArray(tutorBody) || tutorBody.length === 0) {
      res.status(403).json({ message: "Nao e permitido listar matches de outro tutor." });
      return null;
    }

    return fetch(`${options.supabaseUrl}/rest/v1/tutor_animal_matches?select=compatibility_score,animal:animals(${animalSelect})&tutor_id=eq.${encodeURIComponent(options.tutorId)}&order=compatibility_score.desc,animal_id.asc&limit=${options.supabaseLimit}&offset=${options.offset}`, {
        headers: {
          apikey: options.serviceRoleKey,
          authorization: `Bearer ${options.serviceRoleKey}`,
        },
      });
  }

  create = (_req: Request, res: Response) => {
    res.status(201).json({ message: "Animal criado com sucesso" });
  };

  createSignedPhotoUrl = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const { contentType, fileName } = req.body as { contentType?: string; fileName?: string };
      const animalId = getRouteParam(req.params.id);
      if (!contentType) {
        res.status(400).json({ message: "Informe o contentType da imagem." });
        return;
      }
      if (!animalId) {
        res.status(400).json({ message: "Identificador do animal invalido." });
        return;
      }

      const photoId = randomUUID();
      const extension = fileName?.split(".").pop() || animalPhotoExtensions[contentType] || "bin";
      const storagePath = `animals/${animalId}/${photoId}.${extension}`;
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

      res.json({
        uploadUrl: `${context.supabaseUrl}/storage/v1${supabaseBody.url}`,
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
  };

  listPhotos = async (req: Request, res: Response) => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    try {
      const animalId = getRouteParam(req.params.id);
      if (!animalId) {
        res.status(400).json({ message: "Identificador do animal invalido." });
        return;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/animal_photos?select=id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at&animal_id=eq.${encodeURIComponent(animalId)}&order=is_primary.desc,created_at.asc`, {
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
  };

  uploadPhoto = async (req: Request, res: Response) => {
    if (req.header("content-type")?.includes("application/json")) {
      await this.registerPhotoMetadata(req, res);
      return;
    }

    this.uploadAnimalPhoto.single("photo")(req, res, async (uploadError) => {
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
      if (!context) return;

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

      const animalId = getRouteParam(req.params.id);
      if (!animalId) {
        res.status(400).json({ message: "Identificador do animal invalido." });
        return;
      }

      const photoId = randomUUID();
      const extension = animalPhotoExtensions[file.mimetype];
      const storagePath = `animals/${animalId}/${photoId}.${extension}`;
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

        await this.persistPhotoMetadata(req, res, {
          id: photoId,
          animal_id: animalId,
          bucket_id: animalPhotosBucket,
          storage_path: storagePath,
          public_url: publicUrl,
          content_type: file.mimetype,
          size_bytes: file.size,
        }, context);
      } catch (error) {
        res.status(500).json({
          message: "Nao foi possivel conectar ao Supabase",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    });
  };

  private async registerPhotoMetadata(req: Request, res: Response) {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const rawPayload = req.body ?? {};
      const payload = pickFields(rawPayload, adminTables["animal-photos"].createFields);
      const animalId = getRouteParam(req.params.id);

      if (!animalId || !payload.id || !payload.storage_path || !payload.content_type) {
        res.status(400).json({ message: "Dados da foto incompletos para registro." });
        return;
      }

      // Garante que o animal_id seja o da rota e gera public_url no servidor
      payload.animal_id = animalId;
      payload.bucket_id = animalPhotosBucket;
      payload.public_url = toPublicStorageUrl(context.supabaseUrl, animalPhotosBucket, String(payload.storage_path));

      await this.persistPhotoMetadata(req, res, payload, context);
    } catch (error) {
      res.status(500).json({
        message: "Erro ao registrar metadados da foto.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  private async persistPhotoMetadata(_req: Request, res: Response, metadata: Record<string, unknown>, context: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>) {
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
  }
}

function parseBoundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
