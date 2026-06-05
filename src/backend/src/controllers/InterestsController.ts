import { Request, Response } from "express";
import { normalizeAnimal, normalizeTutor, requireAdmin, requireAuthenticated } from "./apiSupport";

export class InterestsController {
  create = async (req: Request, res: Response) => {
    const { animal_id } = req.body as { animal_id?: string };
    if (!animal_id) {
      res.status(400).json({ message: "Informe animal_id." });
      return;
    }

    try {
      const context = await requireAuthenticated(req, res);
      if (!context) return;

      const tutorResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name&auth_user_id=eq.${encodeURIComponent(context.userId)}&limit=1`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const tutorBody = await tutorResponse.json();

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel localizar o tutor.", details: tutorBody });
        return;
      }

      const tutor = Array.isArray(tutorBody) ? tutorBody[0] : null;
      if (!tutor?.id) {
        res.status(404).json({ message: "Complete o cadastro de tutor antes de registrar interesse." });
        return;
      }

      const insertResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutor_interessados`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify({ tutor_id: tutor.id, animal_id }),
      });
      const insertBody = await insertResponse.json();

      if (!insertResponse.ok) {
        res.status(insertResponse.status).json({ message: "Nao foi possivel registrar o interesse.", details: insertBody });
        return;
      }

      const interest = Array.isArray(insertBody) ? insertBody[0] : insertBody;
      res.status(201).json({ ...interest, detail_url: `/interessados/${interest.uuid_registro}` });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel registrar o interesse.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  getDetail = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const interestResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutor_interessados?select=uuid_registro,tutor_id,animal_id,data_registro&uuid_registro=eq.${encodeURIComponent(req.params.uuid_registro)}&limit=1`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const interestBody = await interestResponse.json();

      if (!interestResponse.ok) {
        res.status(interestResponse.status).json({ message: "Nao foi possivel carregar o registro de interesse.", details: interestBody });
        return;
      }

      const interest = Array.isArray(interestBody) ? interestBody[0] : null;
      if (!interest) {
        res.status(404).json({ message: "Registro de interesse nao encontrado." });
        return;
      }

      const [tutorResponse, animalResponse] = await Promise.all([
        fetch(`${context.supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name,location,custom_fields,created_at&id=eq.${encodeURIComponent(interest.tutor_id)}&limit=1`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${context.serviceRoleKey}`,
          },
        }),
        fetch(`${context.supabaseUrl}/rest/v1/animals?select=id,owner_id,name,species,custom_fields,created_at,animal_photos(id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at)&id=eq.${encodeURIComponent(interest.animal_id)}&limit=1`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${context.serviceRoleKey}`,
          },
        }),
      ]);

      const tutorBody = await tutorResponse.json();
      const animalBody = await animalResponse.json();

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel carregar o tutor.", details: tutorBody });
        return;
      }

      if (!animalResponse.ok) {
        res.status(animalResponse.status).json({ message: "Nao foi possivel carregar o animal.", details: animalBody });
        return;
      }

      res.json({
        ...interest,
        tutor: normalizeTutor(Array.isArray(tutorBody) ? tutorBody[0] : {}),
        animal: normalizeAnimal(Array.isArray(animalBody) ? animalBody[0] : {}),
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel carregar o registro de interesse.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };
}
