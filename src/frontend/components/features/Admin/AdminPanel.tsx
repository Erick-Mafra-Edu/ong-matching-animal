"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AdminContext, useDataProvider, type DataProvider, type RaRecord } from "react-admin";
import {
  ImageIcon,
  Dog,
  HeartHandshake,
  Calendar,
  Settings,
  ShieldCheck,
  ClipboardCheck,
  Settings2,
  HelpCircle,
  Zap,
  Globe,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Star,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Link as LinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  adminResources,
  createAdminResource,
  createAdminUser,
  deleteAdminResource,
  disconnectCalendarOAuthConnection,
  getAdminMe,
  getCalendarOAuthAuthorizationUrl,
  listAdminResource,
  refreshCalendarOAuthConnection,
  updateAdminResource,
  uploadAnimalPhoto,
  type AdminResource,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { CalendarPage } from "@/components/features/Calendar/CalendarPage";
import { fetchAnimalFallbackPhoto } from "@/lib/animalFallbackPhoto";

type AdminRecord = RaRecord & Record<string, unknown>;
type FieldType = "text" | "email" | "password" | "number" | "boolean" | "select" | "textarea" | "keyValue" | "options" | "slider";
type CustomFieldEntity = "tutor" | "animal";

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  createOnly?: boolean;
  helper?: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  required?: boolean;
  dynamicOptionsFor?: CustomFieldEntity;
  dynamicOptionsSource?: "onboardingQuestions";
  customFieldsFor?: CustomFieldEntity;
}

interface ResourceUiConfig {
  id: AdminResource;
  description: string;
  emptyTitle: string;
  primaryField: string;
  secondaryFields: string[];
  fields: FieldConfig[];
  createDefaults: Record<string, unknown>;
  searchFields: string[];
  readonly?: boolean;
}

type KeyValueRow = { key: string; value: string };
type FormState = Record<string, unknown>;
type CustomFieldRecord = AdminRecord & {
  entity_type?: CustomFieldEntity;
  field_key?: string;
  label?: string;
  field_type?: string;
  options?: unknown;
  source_question_id?: string | null;
  is_active?: boolean;
  sort_order?: number;
};
type CustomFieldDefinition = {
  field_key: string;
  field_type: string;
  label: string;
  options: string[];
  source_question_id?: string | null;
};
type OnboardingQuestionRecord = AdminRecord & {
  id: string;
  label?: string;
  type?: string;
  options?: unknown;
  is_active?: boolean;
  sort_order?: number;
};

const fieldClass =
  "min-h-12 w-full rounded-xl border border-white/5 bg-black/40 px-4 text-sm text-white outline-none transition-all duration-200 focus:border-cyan-400/50 focus:bg-black/60 focus:ring-4 focus:ring-cyan-400/5 disabled:opacity-40 placeholder:text-slate-600";
const animalPhotoMaxSizeBytes = 800 * 1024;
const animalPhotoMaxWidth = 1080;
const animalPhotoMaxHeight = 1920;
const animalPhotoAspectRatio = 9 / 16;
const animalPhotoQualitySteps = [0.75, 0.68, 0.6];
const visibleAdminResources = adminResources.filter((resource) => resource.id !== "animal-photos");

const resourceUiConfigs: Record<AdminResource, ResourceUiConfig> = {
  "admin-users": {
    id: "admin-users",
    description: "Controle quem pode acessar e operar o painel administrativo.",
    emptyTitle: "Nenhum administrador encontrado.",
    primaryField: "email",
    secondaryFields: ["is_active", "created_at"],
    searchFields: ["email", "auth_user_id"],
    createDefaults: { email: "", password: "", full_name: "", is_active: true },
    fields: [
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Senha temporaria", type: "password", createOnly: true, helper: "Minimo de 8 caracteres.", required: true },
      { name: "full_name", label: "Nome", type: "text", createOnly: true },
      { name: "is_active", label: "Administrador ativo", type: "boolean" },
    ],
  },
  "service-configs": {
    id: "service-configs",
    description: "Configure credenciais de servicos externos como Google e Microsoft.",
    emptyTitle: "Nenhum servico configurado.",
    primaryField: "provider",
    secondaryFields: ["service_type", "is_active"],
    searchFields: ["id", "service_type", "provider"],
    createDefaults: { service_type: "calendar", provider: "google", config: [], is_active: true },
    fields: [
      {
        name: "service_type",
        label: "Tipo de servico",
        type: "select",
        required: true,
        options: [{ label: "Calendario", value: "calendar" }],
      },
      {
        name: "provider",
        label: "Provedor",
        type: "select",
        required: true,
        options: [
          { label: "Google", value: "google" },
          { label: "Microsoft", value: "microsoft" },
        ],
      },
      { name: "config", label: "Configuracoes (JSON)", type: "keyValue", helper: "Credenciais e IDs necessarios para integracao." },
      { name: "is_active", label: "Ativo", type: "boolean" },
    ],
  },
  "ong-settings": {
    id: "ong-settings",
    description: "Configure os dados de contato e a mensagem usada quando um tutor quer adotar.",
    emptyTitle: "Nenhuma configuracao da ONG encontrada.",
    primaryField: "ong_name",
    secondaryFields: ["contact_email", "whatsapp_phone", "is_active"],
    searchFields: ["ong_name", "contact_email", "contact_phone", "whatsapp_phone"],
    createDefaults: {
      ong_name: "ONG Matching Animal",
      contact_email: "",
      contact_phone: "",
      whatsapp_phone: "",
      website_url: "",
      address_line: "",
      city: "",
      state: "",
      postal_code: "",
      social_links: [],
      business_hours: [],
      adoption_message_template: "Estou com interesse de adotar {nomeDoAnimal}. O link do interesse e {linkInteresse}.\n\nObservacoes:",
      settings: [],
      is_active: true,
    },
    fields: [
      { name: "ong_name", label: "Nome da ONG", type: "text", required: true },
      { name: "contact_email", label: "Email de contato", type: "email" },
      { name: "contact_phone", label: "Telefone", type: "text" },
      { name: "whatsapp_phone", label: "WhatsApp", type: "text", helper: "Use DDI e DDD. Ex.: 5511999999999." },
      { name: "website_url", label: "Site", type: "text" },
      { name: "address_line", label: "Endereco", type: "text" },
      { name: "city", label: "Cidade", type: "text" },
      { name: "state", label: "Estado", type: "text" },
      { name: "postal_code", label: "CEP", type: "text" },
      { name: "adoption_message_template", label: "Mensagem de adocao", type: "textarea", helper: "Use {nomeDoAnimal} e {linkInteresse} para preencher automaticamente." },
      { name: "social_links", label: "Redes sociais", type: "keyValue" },
      { name: "business_hours", label: "Horario de atendimento", type: "keyValue" },
      { name: "settings", label: "Configuracoes extras", type: "keyValue" },
      { name: "is_active", label: "Configuracao ativa", type: "boolean" },
    ],
  },
  tutors: {
    id: "tutors",
    description: "Perfis de tutores cadastrados e dados usados no matching.",
    emptyTitle: "Nenhum tutor cadastrado.",
    primaryField: "name",
    secondaryFields: ["location", "created_at"],
    searchFields: ["name", "location", "auth_user_id"],
    createDefaults: { name: "", location: "", custom_fields: [] },
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "location", label: "Localizacao", type: "text" },
      { name: "custom_fields", label: "Campos personalizados", type: "keyValue", customFieldsFor: "tutor", helper: "Use os campos cadastrados para preferencias, rotina e outros dados." },
    ],
  },
  animals: {
    id: "animals",
    description: "Animais disponiveis para adocao e atributos exibidos no matching.",
    emptyTitle: "Nenhum animal cadastrado.",
    primaryField: "name",
    secondaryFields: ["species", "location"],
    searchFields: ["name", "species", "location", "owner_id"],
    createDefaults: { name: "", species: "", location: "", custom_fields: [] },
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "species", label: "Especie", type: "text", required: true },
      { name: "location", label: "Localizacao", type: "text" },
      { name: "custom_fields", label: "Campos personalizados", type: "keyValue", customFieldsFor: "animal", helper: "Use os campos cadastrados para idade, porte, energia e outros atributos." },
    ],
  },
  "custom-fields": {
    id: "custom-fields",
    description: "Catalogo de campos usados nos cadastros e nas regras de matching.",
    emptyTitle: "Nenhum campo customizado cadastrado.",
    primaryField: "label",
    secondaryFields: ["entity_type", "field_key", "field_type"],
    searchFields: ["label", "field_key", "entity_type", "field_type"],
    createDefaults: {
      entity_type: "tutor",
      field_key: "",
      label: "",
      field_type: "text",
      source_question_id: "",
      options: [],
      is_active: true,
      sort_order: 0,
    },
    fields: [
      {
        name: "entity_type",
        label: "Serve para",
        type: "select",
        required: true,
        helper: "Define se este campo aparecera nos dados de tutores ou de animais.",
        options: [
          { label: "Para tutor", value: "tutor" },
          { label: "Para animal", value: "animal" },
        ],
      },
      { name: "field_key", label: "Chave do campo", type: "text", required: true, helper: "Use letras minusculas, numeros e underscore. Ex.: nivel_energia." },
      { name: "label", label: "Descrição do campo", type: "text", required: true },
      {
        name: "source_question_id",
        label: "Pergunta que preenche",
        type: "select",
        dynamicOptionsSource: "onboardingQuestions",
        helper: "Obrigatorio para campos de tutor. Em campos de animal, deixe vazio.",
      },
      {
        name: "field_type",
        label: "Tipo do campo",
        type: "select",
        required: true,
        options: [
          { label: "Texto", value: "text" },
          { label: "Numero", value: "number" },
          { label: "Sim ou nao", value: "boolean" },
          { label: "Lista", value: "select" },
          { label: "Lista multipla", value: "multiselect" },
        ],
      },
      { name: "options", label: "Opcoes da lista", type: "options", helper: "Uma opcao por linha para campos do tipo lista." },
      { name: "sort_order", label: "Ordem", type: "number" },
      { name: "is_active", label: "Campo ativo", type: "boolean" },
    ],
  },
  "tutor-interessados": {
    id: "tutor-interessados",
    description: "Registros criados quando um tutor clica em adotar um animal.",
    emptyTitle: "Nenhum interesse registrado.",
    primaryField: "animal_name",
    secondaryFields: ["tutor_name", "animal_species", "data_registro"],
    searchFields: ["uuid_registro", "tutor_id", "animal_id", "tutor_name", "animal_name", "animal_species"],
    createDefaults: { tutor_id: "", animal_id: "" },
    readonly: true,
    fields: [
      { name: "tutor_name", label: "Tutor", type: "text" },
      { name: "animal_name", label: "Animal", type: "text" },
      { name: "animal_species", label: "Especie", type: "text" },
      { name: "data_registro", label: "Data do registro", type: "text" },
    ],
  },
  "calendar-events": {
    id: "calendar-events",
    description: "Agenda administrativa de visitas, conversas e retornos de adocao.",
    emptyTitle: "Nenhum evento cadastrado.",
    primaryField: "title",
    secondaryFields: ["starts_at", "status", "animal_name"],
    searchFields: ["title", "description", "location", "tutor_name", "animal_name", "status"],
    createDefaults: {
      title: "",
      description: "",
      location: "",
      starts_at: "",
      ends_at: "",
      status: "scheduled",
      provider: "",
      external_event_url: "",
      metadata: [],
    },
    fields: [
      { name: "title", label: "Titulo", type: "text", required: true },
      { name: "starts_at", label: "Inicio", type: "text", required: true, placeholder: "2026-06-10T14:00:00-03:00" },
      { name: "ends_at", label: "Fim", type: "text", required: true, placeholder: "2026-06-10T15:00:00-03:00" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Agendado", value: "scheduled" },
          { label: "Concluido", value: "completed" },
          { label: "Cancelado", value: "cancelled" },
        ],
      },
      { name: "location", label: "Local", type: "text" },
      { name: "description", label: "Descricao", type: "textarea" },
      {
        name: "provider",
        label: "Calendario externo",
        type: "select",
        options: [
          { label: "Nenhum", value: "" },
          { label: "Google", value: "google" },
          { label: "Microsoft", value: "microsoft" },
        ],
      },
      { name: "external_event_url", label: "URL externa", type: "text" },
      { name: "metadata", label: "Metadados", type: "keyValue" },
    ],
  },
  "calendar-oauth-connections": {
    id: "calendar-oauth-connections",
    description: "Conexoes OAuth de calendario para Google e Microsoft.",
    emptyTitle: "Nenhuma conexao OAuth configurada.",
    primaryField: "provider",
    secondaryFields: ["calendar_id", "account_email", "is_active"],
    searchFields: ["provider", "calendar_id", "account_email", "tenant_id"],
    readonly: true,
    createDefaults: {
      provider: "google",
      calendar_id: "primary",
      account_email: "",
      tenant_id: "",
      access_token: "",
      refresh_token: "",
      token_type: "Bearer",
      scope: "",
      expires_at: "",
      metadata: [],
      is_active: true,
    },
    fields: [
      { name: "provider", label: "Provider", type: "select", options: [{ label: "Google", value: "google" }, { label: "Microsoft", value: "microsoft" }], required: true },
      { name: "calendar_id", label: "Calendar ID", type: "text" },
      { name: "account_email", label: "Conta", type: "text" },
      { name: "tenant_id", label: "Tenant", type: "text" },
      { name: "scope", label: "Scopes", type: "textarea" },
      { name: "expires_at", label: "Expira em", type: "text" },
      { name: "is_active", label: "Ativa", type: "boolean" },
    ],
  },
  "animal-photos": {
    id: "animal-photos",
    description: "Metadados de fotos publicas vinculadas aos animais.",
    emptyTitle: "Nenhuma foto cadastrada.",
    primaryField: "storage_path",
    secondaryFields: ["content_type", "is_primary"],
    searchFields: ["animal_id", "storage_path", "public_url", "content_type"],
    createDefaults: {
      bucket_id: "animal-photos",
      storage_path: "",
      public_url: "",
      content_type: "image/webp",
      size_bytes: 1,
      is_primary: false,
    },
    fields: [
      { name: "bucket_id", label: "Bucket", type: "text", required: true },
      { name: "storage_path", label: "Caminho no storage", type: "text", required: true },
      { name: "public_url", label: "URL publica", type: "text", required: true },
      {
        name: "content_type",
        label: "Formato",
        type: "select",
        options: [
          { label: "WebP", value: "image/webp" },
          { label: "JPEG", value: "image/jpeg" },
          { label: "PNG", value: "image/png" },
          { label: "AVIF", value: "image/avif" },
        ],
      },
      { name: "size_bytes", label: "Tamanho em bytes", type: "number" },
      { name: "is_primary", label: "Foto principal", type: "boolean" },
    ],
  },
  "onboarding-questions": {
    id: "onboarding-questions",
    description: "Perguntas que montam o perfil do tutor durante o onboarding.",
    emptyTitle: "Nenhuma pergunta cadastrada.",
    primaryField: "label",
    secondaryFields: ["type", "sort_order"],
    searchFields: ["id", "label", "description", "placeholder"],
    createDefaults: {
      label: "",
      description: "",
      placeholder: "",
      type: "text",
      options: [],
      required: true,
      is_active: true,
      sort_order: 0,
    },
    fields: [
      { name: "label", label: "Pergunta", type: "text", required: true },
      { name: "description", label: "Descricao", type: "textarea" },
      { name: "placeholder", label: "Texto de apoio", type: "text" },
      {
        name: "type",
        label: "Tipo de resposta",
        type: "select",
        options: [
          { label: "Texto", value: "text" },
          { label: "Numero", value: "number" },
          { label: "Escolha unica", value: "select" },
          { label: "Multiplas escolhas", value: "multiselect" },
          { label: "Opcoes em radio", value: "radio" },
          { label: "Sim ou nao", value: "boolean" },
        ],
      },
      { name: "options", label: "Opcoes", type: "options", helper: "Uma opcao por linha, usada em perguntas de escolha." },
      { name: "required", label: "Resposta obrigatoria", type: "boolean" },
      { name: "is_active", label: "Pergunta ativa", type: "boolean" },
      { name: "sort_order", label: "Ordem", type: "number" },
    ],
  },
  "matching-rules": {
    id: "matching-rules",
    description: "Regras que comparam campos do tutor com campos do animal.",
    emptyTitle: "Nenhuma regra cadastrada.",
    primaryField: "rule_name",
    secondaryFields: ["comparison_operator", "weight", "is_dealbreaker"],
    searchFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator"],
    createDefaults: {
      rule_name: "",
      tutor_field: "",
      animal_field: "",
      comparison_operator: "=",
      weight: 50,
      is_dealbreaker: false,
      is_active: true,
    },
    fields: [
      { name: "rule_name", label: "Nome da regra", type: "text", required: true },
      { name: "tutor_field", label: "Campo do tutor", type: "select", required: true, dynamicOptionsFor: "tutor" },
      {
        name: "comparison_operator",
        label: "Condicao",
        type: "select",
        options: [
          { label: "Deve ser igual a", value: "=" },
          { label: "Deve ser diferente de", value: "!=" },
          { label: "Deve conter", value: "contains" },
          { label: "Deve ser maior ou igual a", value: ">=" },
          { label: "Deve ser menor ou igual a", value: "<=" },
        ],
      },
      { name: "animal_field", label: "Campo do animal", type: "select", required: true, dynamicOptionsFor: "animal" },
      { name: "weight", label: "Impacto na pontuacao", type: "slider", helper: "0 baixo impacto, 50 medio, 100 alto." },
      { name: "is_dealbreaker", label: "Regra eliminatoria", type: "boolean", helper: "Se falhar, o animal nao aparece para esse tutor." },
      { name: "is_active", label: "Regra ativa", type: "boolean" },
    ],
  },
};

const resourceIconMap: Record<AdminResource, any> = {
  "admin-users": ShieldCheck,
  "service-configs": Globe,
  "calendar-oauth-connections": Globe,
  "ong-settings": Settings,
  tutors: HeartHandshake,
  animals: Dog,
  "custom-fields": Settings2,
  "tutor-interessados": ClipboardCheck,
  "calendar-events": Calendar,
  "animal-photos": ImageIcon,
  "onboarding-questions": HelpCircle,
  "matching-rules": Zap,
};

const adminDataProvider = {
  getList: async (resource: string) => {
    const data = await listAdminResource(resource as AdminResource);
    return { data: data.map(toRaRecord), total: data.length };
  },
  getOne: async (resource: string, params: { id: string | number }) => {
    const data = await listAdminResource(resource as AdminResource);
    const record = data.find((item) => String(item.id) === String(params.id));
    if (!record) throw new Error("Registro nao encontrado.");
    return { data: toRaRecord(record) };
  },
  create: async (resource: string, params: { data: Record<string, unknown> }) => {
    if (resource === "admin-users") {
      const data = await createAdminUser(params.data as any);
      return { data: toRaRecord(data) };
    }

    const data = await createAdminResource(resource as AdminResource, params.data as Record<string, unknown>);
    return { data: toRaRecord(data) };
  },
  update: async (resource: string, params: { id: string | number; data: Record<string, unknown> }) => {
    const data = await updateAdminResource(resource as AdminResource, String(params.id), params.data as Record<string, unknown>);
    return { data: toRaRecord(data) };
  },
  delete: async (resource: string, params: { id: string | number; previousData?: RaRecord }) => {
    await deleteAdminResource(resource as AdminResource, String(params.id));
    return { data: params.previousData ?? ({ id: params.id } as RaRecord) };
  },
  getMany: async (resource: string, params: { ids: Array<string | number> }) => {
    const data = await listAdminResource(resource as AdminResource);
    return { data: data.filter((item) => params.ids.map(String).includes(String(item.id))).map(toRaRecord) };
  },
  getManyReference: async (resource: string) => {
    const data = await listAdminResource(resource as AdminResource);
    return { data: data.map(toRaRecord), total: data.length };
  },
  updateMany: async (resource: string, params: { ids: Array<string | number>; data: Record<string, unknown> }) => {
    await Promise.all(params.ids.map((id) => updateAdminResource(resource as AdminResource, String(id), params.data as Record<string, unknown>)));
    return { data: params.ids };
  },
  deleteMany: async (resource: string, params: { ids: Array<string | number> }) => {
    await Promise.all(params.ids.map((id) => deleteAdminResource(resource as AdminResource, String(id))));
    return { data: params.ids };
  },
};

function toRaRecord(record: Record<string, unknown>): AdminRecord {
  return { ...record, id: String(record.id) };
}

export function AdminPanel({ showCalendarConfig = false }: { showCalendarConfig?: boolean }) {
  return (
    <AdminContext dataProvider={adminDataProvider as DataProvider}>
      <AdminWorkspace showCalendarConfig={showCalendarConfig} />
    </AdminContext>
  );
}

function AdminWorkspace({ showCalendarConfig }: { showCalendarConfig: boolean }) {
  const router = useRouter();
  const dataProvider = useDataProvider();
  const [activeResource, setActiveResource] = useState<AdminResource>("admin-users");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  const visibleResources = useMemo(() => {
    return visibleAdminResources.filter(r => {
      if (r.id === "calendar-events" || r.id === "calendar-oauth-connections" || r.id === "service-configs") {
        return showCalendarConfig;
      }
      return true;
    });
  }, [showCalendarConfig]);
  const [rows, setRows] = useState<AdminRecord[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeResource === "animals" && rows.length > 0) {
      listAdminResource("animal-photos").then(photos => {
        const map: Record<string, string> = {};
        photos.forEach(p => {
          if (p.is_primary && p.animal_id && p.public_url) {
            map[String(p.animal_id)] = String(p.public_url);
          }
        });
        setPhotoMap(map);
      });
    }
  }, [activeResource, rows]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [formState, setFormState] = useState<FormState>(() => createInitialState(resourceUiConfigs["admin-users"]));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResourceLoading, setIsResourceLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFieldRecord[]>([]);
  const [onboardingQuestions, setOnboardingQuestions] = useState<OnboardingQuestionRecord[]>([]);

  const activeConfig = resourceUiConfigs[activeResource];
  const selectedRow = useMemo(
    () => rows.find((row) => String(row.id) === selectedId) ?? null,
    [rows, selectedId],
  );
  const filteredRows = useMemo(() => filterRows(rows, activeConfig.searchFields, query), [activeConfig.searchFields, query, rows]);
  const onboardingQuestionOptions = useMemo(() => buildOnboardingQuestionOptions(onboardingQuestions), [onboardingQuestions]);
  const customFieldOptions = useMemo(() => buildCustomFieldOptions(customFields, onboardingQuestions), [customFields, onboardingQuestions]);
  const customFieldDefinitions = useMemo(() => buildCustomFieldDefinitions(customFields, onboardingQuestions), [customFields, onboardingQuestions]);

  const loadCustomFields = useCallback(async () => {
    const data = await listAdminResource("custom-fields");
    setCustomFields(data.map(toRaRecord) as CustomFieldRecord[]);
  }, []);

  const loadOnboardingQuestions = useCallback(async () => {
    const data = await listAdminResource("onboarding-questions");
    setOnboardingQuestions(data.map(toRaRecord) as OnboardingQuestionRecord[]);
  }, []);

  const loadResource = useCallback(async (resource: AdminResource, nextSelectedId?: string) => {
    setMessage("");
    setIsResourceLoading(true);

    try {
      const response = await dataProvider.getList(resource, {
        pagination: { page: 1, perPage: 250 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      const data = response.data as AdminRecord[];
      setRows(data);

      const resolvedId = nextSelectedId && data.some((row) => String(row.id) === String(nextSelectedId))
        ? nextSelectedId
        : data[0]?.id
          ? String(data[0].id)
          : null;

      setSelectedId(resolvedId);
      setMode(resolvedId ? "edit" : "create");
      setFormState(resolvedId ? recordToFormState(data.find((row) => String(row.id) === resolvedId) ?? null, activeConfig) : createInitialState(activeConfig));
    } finally {
      setIsResourceLoading(false);
    }
  }, [activeConfig, dataProvider]);

  useEffect(() => {
    let mounted = true;

    getAdminMe()
      .then(() => Promise.all([loadCustomFields(), loadOnboardingQuestions(), loadResource(activeResource)]))
      .then(() => {
        if (mounted) setStatus("ready");
      })
      .catch((error) => {
        if (!mounted) return;
        const errorMessage = error instanceof Error ? error.message : "";

        if (errorMessage.includes("Sessao ausente")) {
          router.push("/login?redirect=/admin");
          return;
        }

        setStatus(errorMessage.includes("administrativo") ? "denied" : "error");
        setMessage(errorMessage || "Nao foi possivel carregar o painel.");
      });

    return () => {
      mounted = false;
    };
  }, [activeResource, loadCustomFields, loadOnboardingQuestions, loadResource, router]);

  function changeResource(resource: AdminResource) {
    setIsResourceLoading(true);
    setActiveResource(resource);
    setQuery("");
    setRows([]);
    setSelectedId(null);
    setMode("edit");
    setFormState(createInitialState(resourceUiConfigs[resource]));
    setIsMobileMenuOpen(false);
    setIsMobileFormOpen(false);
  }

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setMessage("");
    setFormState(createInitialState(activeConfig));
    setIsMobileFormOpen(true);
  }

  function selectRow(row: AdminRecord) {
    setMode("edit");
    setSelectedId(String(row.id));
    setMessage("");
    setFormState(recordToFormState(row, activeConfig));
    setIsMobileFormOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(mode === "create" ? "Criando registro..." : "Salvando alteracoes...");

    try {
      const payload = formStateToPayload(formState, activeConfig, mode);
      const response = mode === "create"
        ? await dataProvider.create(activeResource, { data: payload })
        : selectedId
          ? await dataProvider.update(activeResource, { id: selectedId, data: payload, previousData: selectedRow ?? undefined })
          : null;

      await loadResource(activeResource, response?.data?.id ? String(response.data.id) : selectedId ?? undefined);
      if (activeResource === "custom-fields") await loadCustomFields();
      if (activeResource === "onboarding-questions") await loadOnboardingQuestions();
      setMessage(mode === "create" ? "Registro criado." : "Alteracoes salvas.");
      setIsMobileFormOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || !selectedRow) return;
    setIsSaving(true);
    setMessage("Removendo registro...");

    try {
      await dataProvider.delete(activeResource, { id: selectedId, previousData: selectedRow });
      await loadResource(activeResource);
      if (activeResource === "custom-fields") await loadCustomFields();
      if (activeResource === "onboarding-questions") await loadOnboardingQuestions();
      setMessage("Registro removido.");
      setIsMobileFormOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel remover.");
    } finally {
      setIsSaving(false);
    }
  }

  if (status === "loading") {
    return <AdminShell><p className="text-sm text-slate-300">Carregando painel administrativo...</p></AdminShell>;
  }

  if (status === "denied") {
    return (
      <AdminShell>
        <div className="max-w-xl space-y-4">
          <h1 className="text-2xl font-semibold text-white">Acesso administrativo</h1>
          <p className="text-sm leading-6 text-slate-300">Sua sessao nao possui permissao administrativa ativa.</p>
          <Link className="text-sm font-semibold text-cyan-200 hover:text-cyan-100" href="/discover">Voltar</Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-200">Administracao</p>
            <h1 className="text-3xl font-semibold text-white">Painel administrativo</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DialogTrigger asChild>
                <Button className="lg:hidden" type="button" variant="outline">
                  <Menu className="h-4 w-4" />
                  Menu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-hidden border-white/10 bg-[#101014] p-0 text-white sm:max-w-lg lg:hidden">
                <DialogHeader className="border-b border-white/10 px-5 py-4">
                  <DialogTitle>Menu administrativo</DialogTitle>
                  <DialogDescription>Escolha qual area do painel deseja gerenciar.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-4 custom-scrollbar">
                  <div className="grid gap-2">
                    {visibleResources.map((resource) => {
                      const Icon = resourceIconMap[resource.id as AdminResource] || Settings;
                      const isActive = resource.id === activeResource;

                      return (
                        <button
                          aria-current={isActive ? "page" : undefined}
                          className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-200 disabled:cursor-wait disabled:opacity-65 ${
                            isActive
                              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-50"
                              : "border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]"
                          }`}
                          disabled={isResourceLoading}
                          key={resource.id}
                          onClick={() => changeResource(resource.id)}
                          type="button"
                        >
                          <div className={`shrink-0 rounded-lg p-2 transition-colors ${isActive ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-500 group-hover:text-slate-300"}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <span className={`block text-sm font-bold tracking-tight ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}`}>{resource.label}</span>
                            <span className={`mt-0.5 block text-[11px] font-medium ${isActive ? "text-cyan-200/70" : "text-slate-500"}`}>
                              {resourceUiConfigs[resource.id as AdminResource].description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {showCalendarConfig && (
              <Link className="text-sm font-semibold text-cyan-200 hover:text-cyan-100" href="/calendario">Abrir calendario</Link>
            )}
            <Link className="text-sm font-semibold text-slate-300 hover:text-white" href="/discover">Voltar para adocao</Link>
          </div>
        </div>

        <div className={`grid gap-6 transition-all duration-300 ${isSidebarCollapsed ? "xl:grid-cols-[80px_1fr]" : "xl:grid-cols-[280px_1fr]"}`}>
          <aside className="relative hidden space-y-2 lg:block">
            <button
              className="absolute -right-3 top-0 z-10 hidden xl:flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#16161a] text-slate-400 hover:text-white"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              type="button"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>

            {visibleResources.map((resource) => {
              const Icon = resourceIconMap[resource.id as AdminResource] || Settings;
              const isActive = resource.id === activeResource;

              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex w-full items-center gap-4 rounded-xl border px-3 py-3 text-left transition-all duration-200 disabled:cursor-wait disabled:opacity-65 ${
                    isActive
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                      : "border-transparent bg-transparent text-slate-400 hover:bg-white/[0.04]"
                  } ${isSidebarCollapsed ? "justify-center px-3" : "px-4"}`}
                  disabled={isResourceLoading}
                  key={resource.id}
                  onClick={() => changeResource(resource.id)}
                  title={isSidebarCollapsed ? resource.label : undefined}
                  type="button"
                >
                  <div className={`shrink-0 rounded-lg p-2 transition-colors ${isActive ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-500 group-hover:text-slate-300"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0">
                      <span className={`block text-sm font-bold tracking-tight ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}`}>{resource.label}</span>
                      <span className={`mt-0.5 block truncate text-[11px] font-medium ${isActive ? "text-cyan-200/70" : "text-slate-500"}`}>
                        {resourceUiConfigs[resource.id as AdminResource].description}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </aside>

          <section className="min-w-0 space-y-5">
            <ResourceHeader config={activeConfig} count={rows.length} isLoading={isResourceLoading} onCreate={startCreate} />

            {message && <p className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{message}</p>}

            {isResourceLoading ? (
              <MenuLoadingPanel label={adminResources.find((resource) => resource.id === activeResource)?.label ?? "menu"} />
            ) : activeResource === "calendar-events" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CalendarPage skipAuthCheck standalone={false} />
              </div>
            ) : activeResource === "service-configs" ? (
              <ServiceConfigsPanel onRefresh={() => loadResource(activeResource)} rows={rows} />
            ) : activeResource === "calendar-oauth-connections" ? (
              <CalendarOAuthPanel onRefresh={() => loadResource(activeResource)} rows={rows} />
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(300px,420px)_1fr]">
                <RecordList
                  config={activeConfig}
                  photoMap={photoMap}
                  query={query}
                  rows={filteredRows}
                  selectedId={selectedId}
                  total={rows.length}
                  onQueryChange={setQuery}
                  onSelect={selectRow}
                />

                <div className="hidden lg:block">
                  <RecordForm
                    config={activeConfig}
                    disabled={isSaving || (mode === "edit" && !selectedRow)}
                    formState={formState}
                    mode={mode}
                    selectedRow={selectedRow}
                    customFieldDefinitions={customFieldDefinitions}
                    customFieldOptions={customFieldOptions}
                    onboardingQuestionOptions={onboardingQuestionOptions}
                    onChange={setFormState}
                    onDelete={handleDelete}
                    onRefresh={(nextSelectedId) => loadResource(activeResource, nextSelectedId)}
                    onSubmit={handleSubmit}
                  />
                </div>

                <Dialog open={isMobileFormOpen} onOpenChange={setIsMobileFormOpen}>
                  <DialogContent className="max-h-[92vh] overflow-hidden border-white/10 bg-[#101014] p-0 text-white sm:max-w-2xl lg:hidden">
                    <DialogHeader className="border-b border-white/10 px-5 py-4">
                      <DialogTitle>{mode === "create" ? "Novo registro" : "Editar registro"}</DialogTitle>
                      <DialogDescription>
                        {mode === "create" ? "Preencha os dados e salve o novo registro." : "Altere os dados do registro selecionado ou feche para voltar a lista."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[calc(92vh-88px)] overflow-y-auto custom-scrollbar">
                      <RecordForm
                        config={activeConfig}
                        disabled={isSaving || (mode === "edit" && !selectedRow)}
                        formState={formState}
                        mode={mode}
                        selectedRow={selectedRow}
                        customFieldDefinitions={customFieldDefinitions}
                        customFieldOptions={customFieldOptions}
                        onboardingQuestionOptions={onboardingQuestionOptions}
                        onChange={setFormState}
                        onDelete={handleDelete}
                        onRefresh={(nextSelectedId) => loadResource(activeResource, nextSelectedId)}
                        onSubmit={handleSubmit}
                        onClose={() => setIsMobileFormOpen(false)}
                        variant="modal"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-[#0a0a0c] to-[#0a0a0c] px-4 py-8 text-white md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[1600px] animate-state-enter">{children}</div>
    </main>
  );
}

function ResourceHeader({ config, count, isLoading, onCreate }: { config: ResourceUiConfig; count: number; isLoading: boolean; onCreate: () => void }) {
  const Icon = resourceIconMap[config.id as AdminResource] || Settings;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">{adminResources.find((resource) => resource.id === config.id)?.label}</h2>
            <Badge className="bg-white/5 text-slate-400 border-none font-bold uppercase tracking-wider text-[10px]">
              {isLoading ? "Buscando..." : `${count} itens`}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 truncate">{config.description}</p>
        </div>
      </div>
      {!config.readonly && (
        <Button className="shrink-0 h-11 px-6 shadow-lg shadow-cyan-400/5" disabled={isLoading} onClick={onCreate} type="button">
          Adicionar Novo
        </Button>
      )}
    </div>
  );
}

function MenuLoadingPanel({ label }: { label: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,420px)_1fr]" role="status" aria-live="polite">
      <section className="min-h-[520px] rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="h-12 animate-pulse rounded-xl bg-white/5" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2, 3, 4].map((item) => (
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4" key={item}>
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
              <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-white/[0.03]" />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-8 flex flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
            <Settings className="h-8 w-8 animate-spin-slow" />
          </div>
        </div>
        <h3 className="mt-6 text-lg font-bold text-white tracking-tight">Preparando {label}</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-xs">Buscando registros e configurando formulários dinâmicos...</p>
        <div className="mt-10 grid w-full gap-6 md:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div className="space-y-3" key={item}>
              <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
              <div className="h-12 animate-pulse rounded-xl bg-white/[0.02]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RecordList({
  config,
  onQueryChange,
  onSelect,
  photoMap = {},
  query,
  rows,
  selectedId,
  total,
}: {
  config: ResourceUiConfig;
  onQueryChange: (value: string) => void;
  onSelect: (row: AdminRecord) => void;
  photoMap?: Record<string, string>;
  query: string;
  rows: AdminRecord[];
  selectedId: string | null;
  total: number;
}) {
  const [fallbackPhotoMap, setFallbackPhotoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config.id !== "animals") return;

    let mounted = true;
    const missingPhotoIds = rows
      .map((row) => String(row.id))
      .filter((id) => !photoMap[id] && !fallbackPhotoMap[id]);

    if (!missingPhotoIds.length) return;

    Promise.all(missingPhotoIds.map(async (id) => [id, await fetchAnimalFallbackPhoto()] as const))
      .then((entries) => {
        if (!mounted) return;
        setFallbackPhotoMap((current) => ({ ...current, ...Object.fromEntries(entries) }));
      });

    return () => {
      mounted = false;
    };
  }, [config.id, fallbackPhotoMap, photoMap, rows]);

  return (
    <section className="flex flex-col min-h-[520px] rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="border-b border-white/10 p-5 bg-white/[0.01]">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="admin-search">Buscar em {total} registros</label>
        <div className="relative mt-2">
          <input
            className={`${fieldClass} pl-10 h-12 border-white/5 focus:border-cyan-400/50 bg-black/40`}
            id="admin-search"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={`Pesquisar por ${config.searchFields.join(", ")}...`}
            value={query}
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        {rows.map((row) => {
          const isSelected = String(row.id) === selectedId;
          const photoUrl = config.id === "animals" ? photoMap[String(row.id)] ?? fallbackPhotoMap[String(row.id)] : null;

          return (
            <button
              className={`group relative block w-full border-b border-white/5 px-5 py-4 text-left transition-all hover:bg-white/[0.04] ${
                isSelected ? "bg-cyan-400/10" : ""
              }`}
              key={String(row.id)}
              onClick={() => onSelect(row)}
              type="button"
            >
              {isSelected && <div className="absolute left-0 top-0 h-full w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />}
              <div className="flex items-center gap-3">
                {config.id === "animals" && (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={photoUrl} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <Dog className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`block truncate text-sm font-bold tracking-tight transition-colors ${isSelected ? "text-cyan-200" : "text-white group-hover:text-cyan-100"}`}>
                      {getRecordTitle(row, config)}
                    </span>
                    {("is_active" in row || "status" in row) && (
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full shadow-sm ${
                        row.is_active === false || row.status === "cancelled" ? "bg-slate-600" :
                        row.status === "scheduled" ? "bg-amber-400" : "bg-cyan-400"
                      }`} />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {config.secondaryFields.map((field) => {
                      const val = row[field];
                      if (val === null || val === undefined || val === "") return null;
                      return (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            isSelected ? "bg-cyan-400/10 text-cyan-300/70" : "bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-400"
                          }`}
                          key={field}
                        >
                          {formatValue(val)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {!rows.length && (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-full bg-white/5 p-4 text-slate-600">
              <ImageIcon className="h-8 w-8" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-400">
              {query && total > 0 ? `Nenhum ${config.id === "animals" ? "animal" : "registro"} encontrado para sua busca.` : config.emptyTitle}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function RecordForm({
  config,
  customFieldDefinitions,
  customFieldOptions,
  disabled,
  formState,
  mode,
  onboardingQuestionOptions,
  onChange,
  onDelete,
  onRefresh,
  onSubmit,
  selectedRow,
  onClose,
  variant = "panel",
}: {
  config: ResourceUiConfig;
  customFieldDefinitions: Record<CustomFieldEntity, CustomFieldDefinition[]>;
  customFieldOptions: Record<CustomFieldEntity, Array<{ label: string; value: string }>>;
  disabled: boolean;
  formState: FormState;
  mode: "create" | "edit";
  onboardingQuestionOptions: Array<{ label: string; value: string }>;
  onChange: (state: FormState) => void;
  onDelete: () => void;
  onRefresh: (nextSelectedId?: string) => Promise<void>;
  onSubmit: (event: FormEvent) => void;
  selectedRow: AdminRecord | null;
  onClose?: () => void;
  variant?: "panel" | "modal";
}) {
  const visibleFields = config.fields.filter((field) => mode === "create" || !field.createOnly);
  const formDisabled = disabled || config.readonly === true;
  const isModal = variant === "modal";

  function handleFieldChange(field: FieldConfig, value: unknown) {
    if (config.id !== "custom-fields") {
      onChange({ ...formState, [field.name]: value });
      return;
    }

    if (field.name === "field_key") {
      onChange({ ...formState, field_key: sanitizeCustomFieldKey(String(value ?? "")) });
      return;
    }

    if (field.name === "label") {
      const nextState: FormState = { ...formState, label: value };
      if (!String(formState.field_key ?? "").trim()) {
        nextState.field_key = sanitizeCustomFieldKey(String(value ?? ""));
      }
      onChange(nextState);
      return;
    }

    onChange({ ...formState, [field.name]: value });
  }

  return (
    <div className={isModal ? "bg-white/[0.02]" : "rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"}>
      <form onSubmit={onSubmit}>
        <div className={`flex flex-col gap-4 border-b border-white/10 bg-white/[0.01] p-5 sm:flex-row sm:items-center sm:justify-between ${isModal ? "hidden" : ""}`}>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white tracking-tight">{mode === "create" ? "Novo Registro" : "Editar Registro"}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500 truncate">
              {mode === "create" ? `Adicionando em ${config.id}` : selectedRow ? `ID: ${selectedRow.id}` : "Selecione um item"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {config.id === "tutor-interessados" && selectedRow?.uuid_registro && (
              <Link className="rounded-full bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-400 transition hover:bg-cyan-400/20" href={`/interessados/${String(selectedRow.uuid_registro)}`}>
                Ver Detalhes
              </Link>
            )}
            {mode === "edit" && !config.readonly && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="h-9 px-4 text-[10px]" disabled={formDisabled} type="button" variant="danger">
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center">Confirmar exclusão?</DialogTitle>
                    <DialogDescription className="text-center">
                      Esta ação não pode ser desfeita. O registro <span className="font-bold text-white">&quot;{selectedRow ? getRecordTitle(selectedRow, config) : "este item"}&quot;</span> será removido permanentemente.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4 gap-2 sm:justify-center">
                    <Button className="flex-1" onClick={onDelete} type="button" variant="danger">Sim, excluir</Button>
                    <DialogClose asChild>
                      <Button className="flex-1" type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

          <div className={`flex-1 p-6 ${isModal ? "pb-28" : "pb-24"}`}>
            <div className="grid gap-6 md:grid-cols-2">
              {visibleFields.map((field) => (
                <FieldInput
                  disabled={formDisabled}
                  field={field}
                  key={field.name}
                  customFieldDefinitions={field.customFieldsFor ? customFieldDefinitions[field.customFieldsFor] : undefined}
                  dynamicOptions={field.dynamicOptionsFor ? customFieldOptions[field.dynamicOptionsFor] : field.dynamicOptionsSource === "onboardingQuestions" ? onboardingQuestionOptions : undefined}
                  value={formState[field.name]}
                  onChange={(value) => handleFieldChange(field, value)}
                />
              ))}
            </div>

            {config.id === "matching-rules" && (
              <RuleComparisonPreview
                animalOptions={customFieldOptions.animal}
                formState={formState}
                tutorOptions={customFieldOptions.tutor}
              />
            )}

            {config.id === "animals" && mode === "edit" && selectedRow && (
              <div className="mt-8 border-t border-white/10 bg-white/[0.01] p-6 rounded-xl">
                <AnimalImagesPanel animal={selectedRow} disabled={disabled} onRefresh={() => onRefresh(String(selectedRow.id))} />
              </div>
            )}
          </div>

          {!config.readonly && (
            <div className={`sticky bottom-0 z-20 flex gap-3 border-t border-white/10 bg-[#16161a]/90 p-4 backdrop-blur-md ${isModal ? "justify-between" : "justify-end"}`}>
              {isModal && (
                <Button className="flex-1" onClick={onClose} type="button" variant="outline">
                  Fechar registro
                </Button>
              )}
              <Button className="min-w-[160px] shadow-xl shadow-cyan-400/10" disabled={formDisabled} type="submit">
                {mode === "create" ? "Criar Registro" : "Salvar Alterações"}
              </Button>
            </div>
          )}
      </form>
    </div>
  );
}

function RuleComparisonPreview({
  animalOptions,
  formState,
  tutorOptions,
}: {
  animalOptions: Array<{ label: string; value: string }>;
  formState: FormState;
  tutorOptions: Array<{ label: string; value: string }>;
}) {
  const tutorLabel = findOptionLabel(tutorOptions, formState.tutor_field) || "campo_tutor";
  const animalLabel = findOptionLabel(animalOptions, formState.animal_field) || "campo_animal";
  const conditionLabel = comparisonOperatorLabel(String(formState.comparison_operator ?? ""));
  const weight = Number(formState.weight ?? 0);
  const isDealbreaker = Boolean(formState.is_dealbreaker);

  return (
    <div className="mt-5 rounded-md border border-cyan-200/20 bg-cyan-200/[0.06] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-cyan-100">Construtor visual da regra</p>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
          <span className="rounded-full bg-cyan-200/15 px-3 py-1 text-cyan-100">{impactLabel(weight)}</span>
          {isDealbreaker && <span className="rounded-full bg-pink-400/15 px-3 py-1 text-pink-200">Eliminatoria</span>}
        </div>
      </div>
      <div className="mt-3 grid items-center gap-3 text-sm md:grid-cols-[1fr_auto_1fr]">
        <div className="min-h-11 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-slate-100">
          <span className="block text-[11px] uppercase text-slate-500">Perfil do tutor</span>
          <span className="font-semibold">{tutorLabel}</span>
        </div>
        <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-center font-semibold text-cyan-100">
          {conditionLabel}
        </div>
        <div className="min-h-11 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-slate-100">
          <span className="block text-[11px] uppercase text-slate-500">Atributo do animal</span>
          <span className="font-semibold">{animalLabel}</span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Quando essa frase for verdadeira, o animal recebe <span className="font-bold text-cyan-100">{weight || 0} pontos</span>.
        {isDealbreaker && " Se for falsa, o animal sera removido dos resultados desse tutor."}
      </p>
    </div>
  );
}

function AnimalImagesPanel({ animal, disabled, onRefresh }: { animal: AdminRecord; disabled: boolean; onRefresh: () => Promise<void> }) {
  const [photos, setPhotos] = useState<AdminRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const animalId = String(animal.id);

  const loadPhotos = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const data = await listAdminResource("animal-photos");
      const filtered = data.filter((photo) => String(photo.animal_id) === animalId).map(toRaRecord);
      setPhotos(filtered);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar as fotos.");
    } finally {
      setStatus("ready");
    }
  }, [animalId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  async function handleUpload(file: File) {
    if (!file) return;

    setStatus("saving");
    setUploadProgress(0);
    setMessage("Recortando e compactando imagem...");
    try {
      const optimizedFile = await cropAndCompressAnimalPhoto(file);
      setMessage(`Imagem otimizada: ${formatFileSize(optimizedFile.size)}. Enviando...`);

      const newPhoto = await uploadAnimalPhoto(animalId, optimizedFile, (percent) => {
        setUploadProgress(percent);
        setMessage(`Enviando imagem: ${percent}%`);
      });
      await makePrimary(String(newPhoto.id), false);
      await loadPhotos();
      await onRefresh();
      setMessage(`Imagem enviada em WebP 9:16 (${formatFileSize(optimizedFile.size)}) e definida como principal.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel enviar a imagem.");
    } finally {
      setStatus("ready");
      setUploadProgress(null);
    }
  }

  async function makePrimary(photoId: string, reload = true) {
    setStatus("saving");
    setMessage("Atualizando foto principal...");
    try {
      await Promise.all(photos.filter((photo) => String(photo.id) !== photoId).map((photo) => updateAdminResource("animal-photos", String(photo.id), { is_primary: false })));
      await updateAdminResource("animal-photos", photoId, { is_primary: true });
      if (reload) {
        await loadPhotos();
        await onRefresh();
        setMessage("Foto principal atualizada.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel alterar a foto principal.");
    } finally {
      setStatus("ready");
    }
  }

  async function deletePhoto(photoId: string) {
    setStatus("saving");
    setMessage("Removendo foto...");
    try {
      await deleteAdminResource("animal-photos", photoId);
      await loadPhotos();
      await onRefresh();
      setMessage("Foto removida.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel remover a foto.");
    } finally {
      setStatus("ready");
    }
  }

  const isBusy = disabled || status === "loading" || status === "saving";

  return (
    <section className="mt-6 border-t border-white/10 pt-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Fotos do Animal</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">Adicione imagens e gerencie a visualização principal do card.</p>
        </div>
      </div>

      <div className="mt-5">
        <FileUpload
          accept="image/avif,image/jpeg,image/png,image/webp"
          disabled={isBusy}
          onFileSelect={handleUpload}
        />
      </div>

      {uploadProgress !== null && (
        <div className="mt-4 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-1.5 bg-cyan-400 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {message && <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs font-medium text-slate-400 leading-relaxed">{message}</p>}

      {status === "loading" ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div className="aspect-[3/4] animate-pulse rounded-xl bg-white/5" key={item} />
          ))}
        </div>
      ) : photos.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {photos.map((photo) => (
            <article className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-black/40" key={String(photo.id)}>
              {photo.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-110" src={String(photo.public_url)} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-600">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}

              {/* Overlays */}
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />

              {photo.is_primary && (
                <div className="absolute left-2 top-2 rounded-full bg-cyan-400 p-1.5 text-slate-950 shadow-lg">
                  <Star className="h-3 w-3 fill-current" />
                </div>
              )}

              <div className="absolute right-2 top-2 flex flex-col gap-2 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                <button
                  className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-lg transition-all ${
                    photo.is_primary
                      ? "border-cyan-400/50 bg-cyan-400 text-slate-950"
                      : "border-white/20 bg-black/60 text-white hover:border-cyan-400 hover:text-cyan-400"
                  }`}
                  disabled={isBusy || Boolean(photo.is_primary)}
                  onClick={() => makePrimary(String(photo.id))}
                  title="Tornar principal"
                  type="button"
                >
                  <Star className={`h-3.5 w-3.5 ${photo.is_primary ? "fill-current" : ""}`} />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition-all hover:border-red-500 hover:text-red-500"
                  disabled={isBusy}
                  onClick={() => deletePhoto(String(photo.id))}
                  title="Excluir foto"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="absolute bottom-2 left-2 right-2 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                <div className="rounded-lg bg-black/60 px-2 py-1 text-center backdrop-blur-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">
                    {formatValue(photo.content_type).replace("image/", "")}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.01] py-12 text-slate-500">
          <ImageIcon className="h-10 w-10 opacity-20" />
          <p className="mt-4 text-sm font-medium">Nenhuma foto enviada para este animal.</p>
        </div>
      )}
    </section>
  );
}

async function cropAndCompressAnimalPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem valido.");
  }

  const image = await loadImage(file);
  const crop = getCenteredAspectCrop(image.naturalWidth, image.naturalHeight, animalPhotoAspectRatio);
  let targetWidth = Math.min(crop.width, animalPhotoMaxWidth);
  let targetHeight = targetWidth / animalPhotoAspectRatio;

  if (targetHeight > animalPhotoMaxHeight) {
    targetHeight = animalPhotoMaxHeight;
    targetWidth = targetHeight * animalPhotoAspectRatio;
  }

  const attempts = [1, 0.85, 0.7];
  let smallestBlob: Blob | null = null;

  for (const scale of attempts) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(targetWidth * scale));
    canvas.height = Math.max(1, Math.round(targetHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Nao foi possivel preparar a imagem para upload.");

    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    for (const quality of animalPhotoQualitySteps) {
      const blob = await canvasToWebpBlob(canvas, quality);
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= animalPhotoMaxSizeBytes) {
        return new File([blob], toWebpFileName(file.name), { type: "image/webp", lastModified: Date.now() });
      }
    }
  }

  throw new Error(
    `A imagem ficou com ${formatFileSize(smallestBlob?.size ?? file.size)} apos a compactacao. Use uma imagem menor para ficar abaixo de ${formatFileSize(animalPhotoMaxSizeBytes)}.`,
  );
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel ler a imagem selecionada."));
    };
    image.src = objectUrl;
  });
}

function getCenteredAspectCrop(width: number, height: number, aspectRatio: number) {
  const sourceAspectRatio = width / height;
  const cropWidth = sourceAspectRatio > aspectRatio ? height * aspectRatio : width;
  const cropHeight = sourceAspectRatio > aspectRatio ? height : width / aspectRatio;

  return {
    x: Math.max(0, (width - cropWidth) / 2),
    y: Math.max(0, (height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Nao foi possivel converter a imagem para WebP."));
        return;
      }

      if (blob.type !== "image/webp") {
        reject(new Error("Este navegador nao suportou a conversao para WebP."));
        return;
      }

      resolve(blob);
    }, "image/webp", quality);
  });
}

function toWebpFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `${baseName || "animal-photo"}.webp`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldInput({
  customFieldDefinitions,
  disabled,
  dynamicOptions,
  field,
  onChange,
  value,
}: {
  customFieldDefinitions?: CustomFieldDefinition[];
  disabled: boolean;
  dynamicOptions?: Array<{ label: string; value: string }>;
  field: FieldConfig;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const id = `admin-${field.name}`;
  const options = dynamicOptions ?? field.options ?? [];

  if (field.type === "boolean") {
    return (
      <div>
        <FieldLabel field={field} htmlFor={id} />
        <select
          className={fieldClass}
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.value === "true")}
          required={field.required}
          value={toBooleanSelectValue(value)}
        >
          <option value="true">Sim</option>
          <option value="false">Nao</option>
        </select>
      </div>
    );
  }

  if (field.type === "keyValue") {
    return (
      <div className="md:col-span-2">
        <FieldLabel field={field} htmlFor={id} />
        <KeyValueEditor customFieldDefinitions={customFieldDefinitions} disabled={disabled} rows={normalizeKeyValueRows(value)} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "options") {
    return (
      <div className="md:col-span-2">
        <FieldLabel field={field} htmlFor={id} />
        <OptionsEditor disabled={disabled} options={normalizeOptions(value)} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "slider") {
    const numericValue = Number(value ?? 0);
    const safeValue = Number.isFinite(numericValue) ? Math.min(Math.max(numericValue, 0), 100) : 0;
    return (
      <div>
        <FieldLabel field={field} htmlFor={id} />
        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-cyan-100">{impactLabel(safeValue)}</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-white">{safeValue}</span>
          </div>
          <input
            className="w-full accent-cyan-200"
            disabled={disabled}
            id={id}
            max={100}
            min={0}
            onChange={(event) => onChange(Number(event.target.value))}
            step={5}
            type="range"
            value={safeValue}
          />
          <div className="mt-2 flex justify-between text-[11px] uppercase text-slate-500">
            <span>Baixo</span>
            <span>Medio</span>
            <span>Alto</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={field.type === "textarea" ? "md:col-span-2" : "relative"}>
      <FieldLabel field={field} htmlFor={id} />
      {field.type === "select" ? (
        <div className="relative">
          <select
            className={`${fieldClass} appearance-none`}
            disabled={disabled}
            id={id}
            onChange={(event) => onChange(event.target.value)}
            required={field.required}
            value={String(value ?? "")}
          >
            {(field.dynamicOptionsFor || field.dynamicOptionsSource) && <option value="">{field.dynamicOptionsFor ? "Selecione um campo" : "Selecione uma pergunta"}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      ) : field.type === "textarea" ? (
        <textarea
          className={`${fieldClass} min-h-[112px] resize-y py-3`}
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          value={String(value ?? "")}
        />
      ) : (
        <input
          className={fieldClass}
          disabled={disabled}
          id={id}
          min={field.name === "size_bytes" ? 0 : undefined}
          onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          type={field.type}
          value={field.type === "number" ? Number(value ?? 0) : String(value ?? "")}
        />
      )}
    </div>
  );
}

function FieldLabel({ field, htmlFor }: { field: FieldConfig; htmlFor: string }) {
  return (
    <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400" htmlFor={htmlFor}>
      {field.label}
      {field.required && <span className="ml-1 text-cyan-400">*</span>}
      {field.helper && <span className="mt-1 block text-[10px] font-medium leading-relaxed text-slate-500 normal-case tracking-normal">{field.helper}</span>}
    </label>
  );
}

function KeyValueEditor({
  customFieldDefinitions = [],
  disabled,
  onChange,
  rows,
}: {
  customFieldDefinitions?: CustomFieldDefinition[];
  disabled: boolean;
  onChange: (value: KeyValueRow[]) => void;
  rows: KeyValueRow[];
}) {
  function updateRow(index: number, patch: Partial<KeyValueRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row, index) => (
          <div className="group relative rounded-xl border border-white/5 bg-white/[0.01] p-4 transition-all hover:border-white/10 hover:bg-white/[0.03]" key={index}>
            <div className="grid gap-3">
              {customFieldDefinitions.length ? (
                <div className="relative">
                  <select
                    className={`${fieldClass} appearance-none h-10 min-h-[40px] px-3 text-xs`}
                    disabled={disabled}
                    onChange={(event) => updateRow(index, { key: event.target.value, value: "" })}
                    value={row.key}
                  >
                    <option value="">Selecione o campo</option>
                    {customFieldDefinitions.map((field) => (
                      <option key={field.field_key} value={field.field_key}>{field.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                </div>
              ) : (
                <input
                  className={`${fieldClass} h-10 min-h-[40px] px-3 text-xs`}
                  disabled={disabled}
                  onChange={(event) => updateRow(index, { key: event.target.value })}
                  placeholder="Nome do campo"
                  value={row.key}
                />
              )}
              <CustomFieldValueInput
                definition={customFieldDefinitions.find((field) => field.field_key === row.key)}
                disabled={disabled}
                value={row.value}
                onChange={(value) => updateRow(index, { value })}
              />
            </div>
            <button
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-red-500/20 bg-[#16161a] text-slate-500 opacity-0 shadow-lg transition-all hover:border-red-500/50 hover:text-red-500 group-hover:opacity-100 disabled:pointer-events-none"
              disabled={disabled}
              onClick={() => removeRow(index)}
              title="Remover campo"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <Button
        className="h-10 px-5 text-[10px] tracking-widest"
        disabled={disabled}
        onClick={() => onChange([...rows, { key: "", value: "" }])}
        type="button"
        variant="outline"
      >
        + Adicionar novo campo
      </Button>
    </div>
  );
}

function CustomFieldValueInput({
  definition,
  disabled,
  onChange,
  value,
}: {
  definition?: CustomFieldDefinition;
  disabled: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const inputBaseClass = `${fieldClass} h-10 min-h-[40px] px-3 text-xs`;

  if (definition?.field_type === "boolean") {
    return (
      <div className="relative">
        <select className={`${inputBaseClass} appearance-none`} disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
          <option value="">Valor</option>
          <option value="true">Sim</option>
          <option value="false">Nao</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
      </div>
    );
  }

  if ((definition?.field_type === "select" || definition?.field_type === "multiselect") && definition.options.length) {
    return (
      <div className="relative">
        <select className={`${inputBaseClass} appearance-none`} disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
          <option value="">Valor</option>
          {definition.options.map((option) => (
            <option key={option} value={option}>{humanizeFieldKey(option)}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
      </div>
    );
  }

  return (
    <input
      className={inputBaseClass}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Valor"
      type={definition?.field_type === "number" ? "number" : "text"}
      value={value}
    />
  );
}

function OptionsEditor({ disabled, onChange, options }: { disabled: boolean; onChange: (value: string[]) => void; options: string[] }) {
  function updateOption(index: number, value: string) {
    onChange(options.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div className="grid gap-2 md:grid-cols-[1fr_auto]" key={index}>
          <input className={fieldClass} disabled={disabled} onChange={(event) => updateOption(index, event.target.value)} placeholder="Opcao" value={option} />
          <Button className="min-h-11 px-4" disabled={disabled} onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))} type="button" variant="outline">Remover</Button>
        </div>
      ))}
      <Button className="mt-1" disabled={disabled} onClick={() => onChange([...options, ""])} type="button" variant="outline">Adicionar opcao</Button>
    </div>
  );
}

function createInitialState(config: ResourceUiConfig) {
  return recordToFormState(config.createDefaults, config);
}

function recordToFormState(record: Record<string, unknown> | null, config: ResourceUiConfig): FormState {
  const source = record ?? config.createDefaults;
  return config.fields.reduce<FormState>((state, field) => {
    const value = source[field.name] ?? config.createDefaults[field.name];

    if (field.type === "keyValue") {
      state[field.name] = objectToKeyValueRows(value);
    } else if (field.type === "options") {
      state[field.name] = normalizeOptions(value);
    } else {
      state[field.name] = value ?? "";
    }

    return state;
  }, {});
}

function formStateToPayload(state: FormState, config: ResourceUiConfig, mode: "create" | "edit") {
  return config.fields.reduce<Record<string, unknown>>((payload, field) => {
    if (mode === "edit" && field.createOnly) return payload;
    const value = state[field.name];

    if (field.type === "keyValue") {
      payload[field.name] = keyValueRowsToObject(normalizeKeyValueRows(value));
    } else if (field.type === "options") {
      const options = normalizeOptions(value).map((option) => option.trim()).filter(Boolean);
      payload[field.name] = options.length
        ? config.id === "onboarding-questions"
          ? options.map((option) => ({ label: humanizeFieldKey(option), value: option }))
          : options
        : null;
    } else if (field.type === "number" || field.type === "slider") {
      payload[field.name] = Number(value) || 0;
    } else if (field.name === "source_question_id") {
      payload[field.name] = value ? String(value) : null;
    } else {
      payload[field.name] = value;
    }

    return payload;
  }, {});
}

function objectToKeyValueRows(value: unknown): KeyValueRow[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({ key, value: formatEditableValue(item) }));
}

function keyValueRowsToObject(rows: KeyValueRow[]) {
  return rows.reduce<Record<string, unknown>>((object, row) => {
    const key = row.key.trim();
    if (!key) return object;
    object[key] = coerceEditableValue(row.value);
    return object;
  }, {});
}

function normalizeKeyValueRows(value: unknown): KeyValueRow[] {
  if (Array.isArray(value)) return value.filter((row): row is KeyValueRow => Boolean(row) && typeof row === "object" && "key" in row && "value" in row);
  return objectToKeyValueRows(value);
}

function normalizeOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((option) => {
      if (option && typeof option === "object" && "value" in option) return String((option as { value: unknown }).value);
      return String(option);
    });
  }
  if (typeof value === "string" && value.trim()) return value.split("\n").map((option) => option.trim()).filter(Boolean);
  return [];
}

function coerceEditableValue(value: string) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return value;
}

function formatEditableValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function toBooleanSelectValue(value: unknown) {
  if (value === "false") return "false";
  if (value === "true") return "true";
  return String(Boolean(value));
}

function filterRows(rows: AdminRecord[], fields: string[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter((row) => fields.some((field) => String(row[field] ?? "").toLowerCase().includes(normalizedQuery)));
}

function getRecordTitle(row: AdminRecord, config: ResourceUiConfig) {
  return String(row[config.primaryField] ?? row.email ?? row.name ?? row.label ?? row.rule_name ?? row.id);
}

function buildOnboardingQuestionOptions(onboardingQuestions: OnboardingQuestionRecord[]) {
  return onboardingQuestions
    .filter((question) => question.is_active !== false && question.id)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || String(a.label ?? "").localeCompare(String(b.label ?? "")))
    .map((question) => ({ label: `${question.label ?? question.id} (${question.id})`, value: String(question.id) }));
}

function buildCustomFieldOptions(customFields: CustomFieldRecord[], onboardingQuestions: OnboardingQuestionRecord[] = []) {
  const activeFields = customFields
    .filter((field) => field.is_active !== false && field.field_key)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || String(a.label ?? "").localeCompare(String(b.label ?? "")));

  return {
    tutor: [
      ...activeFields
      .filter((field) => field.entity_type === "tutor")
      .filter((field) => hasActiveSourceQuestion(field, onboardingQuestions))
      .map((field) => ({ label: `${field.label ?? field.field_key} (${field.field_key})`, value: String(field.field_key) })),
      ...buildOnboardingQuestionOptions(onboardingQuestions).map((question) => ({ ...question, label: `Resposta: ${question.label}` })),
    ],
    animal: activeFields
      .filter((field) => field.entity_type === "animal")
      .map((field) => ({ label: `${field.label ?? field.field_key} (${field.field_key})`, value: String(field.field_key) })),
  };
}

function buildCustomFieldDefinitions(customFields: CustomFieldRecord[], onboardingQuestions: OnboardingQuestionRecord[] = []) {
  const activeFields = customFields
    .filter((field) => field.is_active !== false && field.field_key)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || String(a.label ?? "").localeCompare(String(b.label ?? "")));

  return {
    tutor: [
      ...activeFields
      .filter((field) => field.entity_type === "tutor")
      .filter((field) => hasActiveSourceQuestion(field, onboardingQuestions))
      .map(toCustomFieldDefinition),
      ...onboardingQuestions
        .filter((question) => question.is_active !== false && question.id)
        .map(toQuestionCustomFieldDefinition),
    ],
    animal: activeFields
      .filter((field) => field.entity_type === "animal")
      .map(toCustomFieldDefinition),
  };
}

function toCustomFieldDefinition(field: CustomFieldRecord): CustomFieldDefinition {
  return {
    field_key: String(field.field_key),
    field_type: String(field.field_type ?? "text"),
    label: String(field.label ?? field.field_key),
    options: normalizeOptions(field.options),
    source_question_id: field.source_question_id ?? null,
  };
}

function toQuestionCustomFieldDefinition(question: OnboardingQuestionRecord): CustomFieldDefinition {
  return {
    field_key: String(question.id),
    field_type: question.type === "radio" ? "select" : String(question.type ?? "text"),
    label: `Resposta: ${question.label ?? question.id}`,
    options: normalizeOptions(question.options),
    source_question_id: String(question.id),
  };
}

function hasActiveSourceQuestion(field: CustomFieldRecord, onboardingQuestions: OnboardingQuestionRecord[]) {
  if (field.entity_type !== "tutor") return true;
  const sourceQuestionId = String(field.source_question_id ?? "");
  return Boolean(sourceQuestionId) && onboardingQuestions.some((question) => question.is_active !== false && question.id === sourceQuestionId);
}

function findOptionLabel(options: Array<{ label: string; value: string }>, value: unknown) {
  return options.find((option) => option.value === String(value ?? ""))?.label ?? "";
}

function comparisonOperatorLabel(operator: string) {
  const labels: Record<string, string> = {
    "=": "Deve ser igual a",
    "!=": "Deve ser diferente de",
    contains: "Deve conter",
    ">=": "Deve ser maior ou igual a",
    "<=": "Deve ser menor ou igual a",
  };

  return labels[operator] ?? "condicao";
}

function impactLabel(weight: number) {
  if (weight >= 70) return "Alto impacto";
  if (weight >= 35) return "Medio impacto";
  return "Baixo impacto";
}

function ServiceConfigsPanel({ onRefresh, rows }: { onRefresh: () => Promise<void>; rows: AdminRecord[] }) {
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const services = [
    {
      id: "google_calendar",
      provider: "google",
      service_type: "calendar",
      label: "Google Calendar",
      description: "Sincronize visitas e entrevistas diretamente na agenda do Google.",
      icon: Globe,
    },
    {
      id: "microsoft_calendar",
      provider: "microsoft",
      service_type: "calendar",
      label: "Microsoft Outlook",
      description: "Integre agendamentos com sua conta Microsoft Office 365.",
      icon: Globe,
    },
  ];

  async function handleToggleStatus(config: AdminRecord) {
    setIsSaving(true);
    try {
      await updateAdminResource("service-configs", String(config.id), { is_active: !config.is_active });
      await onRefresh();
      setMessage(`Integração ${config.is_active ? "desativada" : "ativada"}.`);
    } catch (error) {
      setMessage("Erro ao alterar status.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(config: AdminRecord) {
    if (!confirm("Tem certeza que deseja remover esta conexão?")) return;
    setIsSaving(true);
    try {
      await deleteAdminResource("service-configs", String(config.id));
      await onRefresh();
      setMessage("Conexão removida.");
    } catch (error) {
      setMessage("Erro ao remover conexão.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const config = rows.find((r) => r.provider === service.provider && r.service_type === service.service_type);
          const isConnected = !!config;
          const isActive = config?.is_active !== false;

          return (
            <article
              className={cn(
                "group flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300",
                isConnected
                  ? "border-cyan-400/20 bg-cyan-400/[0.02] shadow-[0_0_25px_rgba(34,211,238,0.05)]"
                  : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
              )}
              key={service.id}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                      isConnected ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-500"
                    )}
                  >
                    <service.icon className="h-6 w-6" />
                  </div>
                  <Badge
                    className={cn(
                      "border-none px-3 py-1 font-black uppercase tracking-widest text-[9px]",
                      isConnected
                        ? isActive
                          ? "bg-cyan-400/10 text-cyan-400"
                          : "bg-amber-400/10 text-amber-400"
                        : "bg-white/5 text-slate-600"
                    )}
                  >
                    {isConnected ? (isActive ? "Conectado" : "Pausado") : "Disponível"}
                  </Badge>
                </div>

                <div className="mt-5">
                  <h3 className="text-lg font-bold text-white tracking-tight">{service.label}</h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{service.description}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                {isConnected ? (
                  <>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-10 text-[10px]"
                        onClick={() => setIsConfiguring(service.id)}
                        variant="outline"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Configurar
                      </Button>
                      <Button
                        className="h-10 px-4"
                        disabled={isSaving}
                        onClick={() => handleToggleStatus(config)}
                        variant="outline"
                        title={isActive ? "Pausar integração" : "Ativar integração"}
                      >
                        {isActive ? <Zap className="h-3.5 w-3.5 text-cyan-400" /> : <Zap className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <button
                      className="text-[10px] font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors py-2"
                      disabled={isSaving}
                      onClick={() => handleRemove(config)}
                    >
                      Remover Conexão
                    </button>
                  </>
                ) : (
                  <Button
                    className="w-full h-11 text-[10px] shadow-lg shadow-cyan-400/10"
                    onClick={() => setIsConfiguring(service.id)}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Conectar Agora
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {message && (
        <p className="inline-block rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2 text-xs font-medium text-slate-400">
          {message}
        </p>
      )}

      {/* Modal de Configuração Específica */}
      <Dialog open={!!isConfiguring} onOpenChange={(open) => !open && setIsConfiguring(null)}>
        <ServiceConfigModal
          onClose={() => setIsConfiguring(null)}
          onRefresh={onRefresh}
          service={services.find((s) => s.id === isConfiguring) || null}
          existingConfig={rows.find((r) => r.provider === services.find((s) => s.id === isConfiguring)?.provider)}
        />
      </Dialog>
    </div>
  );
}

function CalendarOAuthPanel({ onRefresh, rows }: { onRefresh: () => Promise<void>; rows: AdminRecord[] }) {
  const [isWorking, setIsWorking] = useState<"google" | "microsoft" | null>(null);
  const [message, setMessage] = useState("");
  const providers: Array<"google" | "microsoft"> = ["google", "microsoft"];

  async function connect(provider: "google" | "microsoft") {
    setIsWorking(provider);
    setMessage("");
    try {
      const authorizationUrl = await getCalendarOAuthAuthorizationUrl(provider);
      window.location.assign(authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel iniciar a conexao.");
    } finally {
      setIsWorking(null);
    }
  }

  async function refresh(provider: "google" | "microsoft") {
    setIsWorking(provider);
    setMessage("");
    try {
      await refreshCalendarOAuthConnection(provider);
      await onRefresh();
      setMessage("Token renovado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel renovar a conexao.");
    } finally {
      setIsWorking(null);
    }
  }

  async function disconnect(provider: "google" | "microsoft") {
    if (!confirm("Desconectar esta conta do calendario?")) return;
    setIsWorking(provider);
    setMessage("");
    try {
      await disconnectCalendarOAuthConnection(provider);
      await onRefresh();
      setMessage("Conexao removida.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel desconectar.");
    } finally {
      setIsWorking(null);
    }
  }

  const connectedRows = rows.filter((row) => row.provider === "google" || row.provider === "microsoft");

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-5 sm:grid-cols-2">
        {providers.map((provider) => {
          const current = connectedRows.find((row) => row.provider === provider && row.is_active !== false) ?? null;
          const isConnected = Boolean(current);
          return (
            <article key={provider} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{provider === "google" ? "Google Calendar" : "Microsoft Outlook"}</h3>
                  <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{isConnected ? "Conectado" : "Desconectado"}</p>
                </div>
                <Badge className={cn("border-none px-3 py-1 font-black uppercase tracking-widest text-[9px]", isConnected ? "bg-cyan-400/10 text-cyan-400" : "bg-white/5 text-slate-600")}>
                  {isConnected ? "Ativo" : "Sem conexao"}
                </Badge>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                <p>Conta: {current?.account_email ? String(current.account_email) : "nao informada"}</p>
                <p>Calendar ID: {current?.calendar_id ? String(current.calendar_id) : "primary"}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="flex-1" disabled={isWorking === provider} onClick={() => connect(provider)} variant="outline">
                  {isConnected ? "Reconectar" : "Conectar"}
                </Button>
                <Button className="flex-1" disabled={!isConnected || isWorking === provider} onClick={() => refresh(provider)} variant="outline">
                  Renovar
                </Button>
                <Button className="flex-1" disabled={!isConnected || isWorking === provider} onClick={() => disconnect(provider)} variant="danger">
                  Desconectar
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {message && <p className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{message}</p>}
    </div>
  );
}

function ServiceConfigModal({
  onClose,
  onRefresh,
  service,
  existingConfig,
}: {
  onClose: () => void;
  onRefresh: () => Promise<void>;
  service: any;
  existingConfig?: AdminRecord;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const configObj = existingConfig?.config as Record<string, any> || {};
    return {
      calendar_id: configObj.calendar_id || "",
      api_key: configObj.api_key || "",
      client_email: configObj.client_email || "",
    };
  });

  if (!service) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        id: existingConfig?.id || `${service.provider}_${Date.now()}`,
        service_type: service.service_type,
        provider: service.provider,
        config: formData,
        is_active: true,
      };

      if (existingConfig) {
        await updateAdminResource("service-configs", String(existingConfig.id), payload);
      } else {
        await createAdminResource("service-configs", payload);
      }
      await onRefresh();
      onClose();
    } catch (error) {
      alert("Erro ao salvar configuração.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-md bg-[#16161a] border-white/10">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
            <Settings2 className="h-5 w-5" />
          </div>
          Configurar {service.label}
        </DialogTitle>
        <DialogDescription>Preencha os campos abaixo para estabelecer a conexão.</DialogDescription>
      </DialogHeader>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">ID do Calendário</label>
            <input
              className={fieldClass}
              placeholder="primary ou email"
              required
              value={formData.calendar_id}
              onChange={(e) => setFormData({ ...formData, calendar_id: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Email do Cliente (Service Account)</label>
            <input
              className={fieldClass}
              placeholder="ex: app@project.iam.gserviceaccount.com"
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Chave Privada / API Key</label>
            <textarea
              className={cn(fieldClass, "min-h-[100px] py-3")}
              placeholder="Cole aqui sua chave ou token..."
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3 sm:justify-between border-t border-white/5 pt-6">
          <DialogClose asChild>
            <Button className="flex-1" type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button className="flex-1 shadow-lg shadow-cyan-400/10" disabled={isSaving} type="submit">
            {isSaving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function humanizeFieldKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sanitizeCustomFieldKey(value: string) {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!sanitized) return "";
  return /^[a-z]/.test(sanitized) ? sanitized : `campo_${sanitized}`;
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "ativo" : "inativo";
  if (value === "tutor") return "para tutor";
  if (value === "animal") return "para animal";
  if (!value) return "sem valor";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString("pt-BR");
  return String(value);
}
