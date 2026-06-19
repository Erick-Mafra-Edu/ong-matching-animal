import { AdminController } from "./controllers/AdminController";
import { AnimalsController } from "./controllers/AnimalsController";
import { AuthController } from "./controllers/AuthController";
import { CalendarEventsController } from "./controllers/CalendarEventsController";
import { CalendarOAuthController } from "./controllers/CalendarOAuthController";
import { InterestsController } from "./controllers/InterestsController";
import { SystemController } from "./controllers/SystemController";
import { TutorsController } from "./controllers/TutorsController";
import { animalDefinitions } from "./docs/definitions/animals";
import { adminDefinitions } from "./docs/definitions/admin";
import { calendarDefinitions } from "./docs/definitions/calendar";
import { commonDefinitions } from "./docs/definitions/common";
import { interestDefinitions } from "./docs/definitions/interests";
import { matchingDefinitions } from "./docs/definitions/matching";
import { onboardingDefinitions } from "./docs/definitions/onboarding";
import { ongDefinitions } from "./docs/definitions/ong";
import { tutorDefinitions } from "./docs/definitions/tutors";
import { animalPaths } from "./docs/paths/animals";
import { adminPaths } from "./docs/paths/admin";
import { calendarPaths } from "./docs/paths/calendar";
import { healthPaths } from "./docs/paths/health";
import { interestPaths } from "./docs/paths/interests";
import { matchingPaths } from "./docs/paths/matching";
import { onboardingPaths } from "./docs/paths/onboarding";
import { oauthPaths } from "./docs/paths/oauth";
import { ongPaths } from "./docs/paths/ong";
import { tutorPaths } from "./docs/paths/tutors";

const adminController = new AdminController();
const animalsController = new AnimalsController();
const authController = new AuthController();
const calendarEventsController = new CalendarEventsController();
const calendarOAuthController = new CalendarOAuthController();
const interestsController = new InterestsController();
const systemController = new SystemController();
const tutorsController = new TutorsController();

export const apiDoc = {
  swagger: "2.0",
  basePath: "/api",
  info: {
    title: "ONG Matching Animal API",
    version: "0.1.0",
    description: "API para cadastro de tutores, perguntas de onboarding, animais e matching.",
  },
  schemes: ["http", "https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Token Supabase no formato: Bearer <access_token>",
    },
  },
  tags: [
    { name: "Health" },
    { name: "Onboarding" },
    { name: "ONG Settings" },
    { name: "Tutors" },
    { name: "Animals" },
    { name: "Matching" },
    { name: "Interests" },
    { name: "Calendar" },
    { name: "Calendar OAuth" },
    { name: "Admin" },
  ],
  definitions: {
    ...commonDefinitions,
    ...onboardingDefinitions,
    ...ongDefinitions,
    ...tutorDefinitions,
    ...animalDefinitions,
    ...calendarDefinitions,
    ...interestDefinitions,
    ...adminDefinitions,
    ...matchingDefinitions,
  },
  paths: {
    ...healthPaths,
    ...onboardingPaths,
    ...ongPaths,
    ...tutorPaths,
    ...animalPaths,
    ...calendarPaths,
    ...oauthPaths,
    ...interestPaths,
    ...adminPaths,
    ...matchingPaths,
  },
};

export const openApiOperations = {
  getHealth: systemController.getHealth,
  getOngSettings: systemController.getOngSettings,
  listOnboardingQuestions: systemController.listOnboardingQuestions,
  validateOnboardingEligibility: systemController.validateOnboardingEligibility,
  upsertTutor: tutorsController.create,
  getTutorMe: tutorsController.getMe,
  updateTutorMe: tutorsController.updateMe,
  getDiscoverAccess: tutorsController.getDiscoverAccess,
  getOnboardingStatus: tutorsController.getOnboardingStatus,
  getTutorById: tutorsController.getById,
  requestPasswordRecovery: authController.requestPasswordRecovery,
  changePassword: authController.changePassword,
  listAnimals: animalsController.list,
  createAnimal: animalsController.create,
  listAnimalPhotos: animalsController.listPhotos,
  uploadAnimalPhoto: animalsController.uploadPhoto,
  getAnimalPhotoSignedUrl: animalsController.createSignedPhotoUrl,
  listCalendarEvents: calendarEventsController.list,
  createCalendarEvent: calendarEventsController.create,
  updateCalendarEvent: calendarEventsController.update,
  deleteCalendarEvent: calendarEventsController.delete,
  startCalendarOAuth: calendarOAuthController.start,
  callbackCalendarOAuth: calendarOAuthController.callback,
  refreshCalendarOAuth: calendarOAuthController.refresh,
  disconnectCalendarOAuth: calendarOAuthController.disconnect,
  getCalendarOAuthStatus: calendarOAuthController.status,
  startCalendarOAuthAlias: calendarOAuthController.start,
  callbackCalendarOAuthAlias: calendarOAuthController.callback,
  listMineInterests: interestsController.listMine,
  createInterest: interestsController.create,
  getInterestDetail: interestsController.getDetail,
  getAdminMe: adminController.getMe,
  getAdminBootstrap: adminController.getBootstrap,
  listAdminResource: adminController.listResource,
  createAdminUser: adminController.createAdminUser,
  createAdminResource: adminController.createResource,
  updateAdminResource: adminController.updateResource,
  deleteAdminResource: adminController.deleteResource,
  matchTutor: systemController.match,
};
