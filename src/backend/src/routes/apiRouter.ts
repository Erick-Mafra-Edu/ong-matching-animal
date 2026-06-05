import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { AnimalsController } from "../controllers/AnimalsController";
import { CalendarEventsController } from "../controllers/CalendarEventsController";
import { InterestsController } from "../controllers/InterestsController";
import { SystemController } from "../controllers/SystemController";
import { TutorsController } from "../controllers/TutorsController";

export function createApiRouter() {
  const router = Router();
  const admin = new AdminController();
  const animals = new AnimalsController();
  const calendarEvents = new CalendarEventsController();
  const interests = new InterestsController();
  const system = new SystemController();
  const tutors = new TutorsController();

  router.get("/health", system.getHealth);
  router.get("/onboarding-questions", system.listOnboardingQuestions);

  router.get("/admin/me", admin.getMe);
  router.get("/admin/:resource", admin.listResource);
  router.post("/admin/admin-users", admin.createAdminUser);
  router.post("/admin/:resource", admin.createResource);
  router.put("/admin/:resource/:id", admin.updateResource);
  router.delete("/admin/:resource/:id", admin.deleteResource);

  router.get("/calendar-events", calendarEvents.list);
  router.post("/calendar-events", calendarEvents.create);
  router.put("/calendar-events/:id", calendarEvents.update);
  router.delete("/calendar-events/:id", calendarEvents.delete);

  router.post("/interessados", interests.create);
  router.get("/interessados/:uuid_registro", interests.getDetail);

  router.post("/tutors", tutors.create);
  router.get("/tutors/me/onboarding-status", tutors.getOnboardingStatus);
  router.get("/tutors/:id", tutors.getById);

  router.get("/animals", animals.list);
  router.post("/animals", animals.create);
  router.post("/animals/:id/photos/signed-url", animals.createSignedPhotoUrl);
  router.get("/animals/:id/photos", animals.listPhotos);
  router.post("/animals/:id/photos", animals.uploadPhoto);

  router.post("/match", system.match);

  return router;
}
