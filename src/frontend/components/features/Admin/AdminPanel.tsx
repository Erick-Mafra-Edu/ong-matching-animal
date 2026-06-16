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
  getAdminBootstrap,
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
type MatchingRuleRecord = AdminRecord & {
  rule_name?: string;
  tutor_field?: string;
  animal_field?: string;
  comparison_operator?: string;
  weight?: number;
  is_dealbreaker?: boolean;
  is_active?: boolean;
};
type RuleSimulationDetail = {
  rule: MatchingRuleRecord;
  matched: boolean;
  score: number;
  tutorValue: unknown;
  animalValue: unknown;
  expression: string;
  reason: string;
};
type RuleSimulationResult = {
  animal: AdminRecord;
  details: RuleSimulationDetail[];
  disqualified: boolean;
  failedDealbreakers: RuleSimulationDetail[];
  score: number;
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
      id: "",
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
      { name: "id", label: "Identificador", type: "text", createOnly: true, required: true, helper: "Use apenas letras minusculas, numeros e underscore. Ex.: preferred_energy." },
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
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [bootstrappedResource, setBootstrappedResource] = useState<AdminResource | null>(null);

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

  const hydrateResourceState = useCallback((resource: AdminResource, data: AdminRecord[], nextSelectedId?: string) => {
    setRows(data);

    const resolvedId = nextSelectedId && data.some((row) => String(row.id) === String(nextSelectedId))
      ? nextSelectedId
      : data[0]?.id
        ? String(data[0].id)
        : null;

    setSelectedId(resolvedId);
    setMode(resolvedId ? "edit" : "create");
    setFormState(
      resolvedId
        ? recordToFormState(data.find((row) => String(row.id) === resolvedId) ?? null, resourceUiConfigs[resource])
        : createInitialState(resourceUiConfigs[resource]),
    );
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
      hydrateResourceState(resource, data, nextSelectedId);
    } finally {
      setIsResourceLoading(false);
    }
  }, [dataProvider, hydrateResourceState]);

  useEffect(() => {
    let mounted = true;

    setStatus("loading");
    getAdminBootstrap("admin-users")
      .then((payload) => {
        if (!mounted) return;
        setCustomFields(payload.custom_fields.map(toRaRecord) as CustomFieldRecord[]);
        setOnboardingQuestions(payload.onboarding_questions.map(toRaRecord) as OnboardingQuestionRecord[]);
        hydrateResourceState("admin-users", payload.rows.map(toRaRecord) as AdminRecord[]);
        setBootstrappedResource("admin-users");
        setIsBootstrapped(true);
        setStatus("ready");
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
  }, [hydrateResourceState, router]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (bootstrappedResource === activeResource) {
      setBootstrappedResource(null);
      return;
    }

    let mounted = true;
    loadResource(activeResource)
      .catch((error) => {
        if (!mounted) return;
        const errorMessage = error instanceof Error ? error.message : "";

        if (errorMessage.includes("Sessao ausente")) {
          router.push("/login?redirect=/admin");
          return;
        }

        setStatus(errorMessage.includes("administrativo") ? "denied" : "error");
        setMessage(errorMessage || "Nao foi possivel carregar o painel.");
      })
      .then(() => {
        if (mounted) setStatus("ready");
      });

    return () => {
      mounted = false;
    };
  }, [activeResource, bootstrappedResource, isBootstrapped, loadResource, router]);

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

  function shouldOpenMobileForm() {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(min-width: 1024px)").matches;
  }

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setMessage("");
    setFormState(createInitialState(activeConfig));
    setIsMobileFormOpen(shouldOpenMobileForm());
  }

  function selectRow(row: AdminRecord) {
    setMode("edit");
    setSelectedId(String(row.id));
    setMessage("");
    setFormState(recordToFormState(row, activeConfig));
    setIsMobileFormOpen(shouldOpenMobileForm());
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
            ) : activeResource === "matching-rules" ? (
              <RuleEngineWorkspace
                customFieldDefinitions={customFieldDefinitions}
                customFieldOptions={customFieldOptions}
                disabled={isSaving || (mode === "edit" && !selectedRow)}
                formState={formState}
                mode={mode}
                onboardingQuestionOptions={onboardingQuestionOptions}
                onChange={setFormState}
                onDelete={handleDelete}
                onRefresh={(nextSelectedId) => loadResource(activeResource, nextSelectedId)}
                onSelect={selectRow}
                onSubmit={handleSubmit}
                query={query}
                rows={filteredRows}
                selectedId={selectedId}
                selectedRow={selectedRow}
                total={rows.length}
                onQueryChange={setQuery}
              />
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

function RuleEngineWorkspace({
  customFieldDefinitions,
  customFieldOptions,
  disabled,
  formState,
  mode,
  onboardingQuestionOptions,
  onChange,
  onDelete,
  onRefresh,
  onSelect,
  onSubmit,
  query,
  rows,
  selectedId,
  selectedRow,
  total,
  onQueryChange,
}: {
  customFieldDefinitions: Record<CustomFieldEntity, CustomFieldDefinition[]>;
  customFieldOptions: Record<CustomFieldEntity, Array<{ label: string; value: string }>>;
  disabled: boolean;
  formState: FormState;
  mode: "create" | "edit";
  onboardingQuestionOptions: Array<{ label: string; value: string }>;
  onChange: (state: FormState) => void;
  onDelete: () => void;
  onRefresh: (nextSelectedId?: string) => Promise<void>;
  onSelect: (row: AdminRecord) => void;
  onSubmit: (event: FormEvent) => void;
  query: string;
  rows: AdminRecord[];
  selectedId: string | null;
  selectedRow: AdminRecord | null;
  total: number;
  onQueryChange: (value: string) => void;
}) {
  const [tutors, setTutors] = useState<AdminRecord[]>([]);
  const [animals, setAnimals] = useState<AdminRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const loadSimulatorData = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const [tutorRows, animalRows] = await Promise.all([
        listAdminResource("tutors"),
        listAdminResource("animals"),
      ]);
      setTutors(tutorRows.map(toRaRecord));
      setAnimals(animalRows.map(toRaRecord));
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar dados do simulador.");
    }
  }, []);

  useEffect(() => {
    void loadSimulatorData();
  }, [loadSimulatorData]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111116]">
        <div className="grid gap-5 border-b border-white/10 bg-black/30 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-cyan-400/10 text-cyan-200">Motor de Regras</Badge>
              <Badge className="border-none bg-amber-400/10 text-amber-200">Maturidade: regras auditaveis</Badge>
            </div>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">Construa, teste e audite o matching</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Cada regra abaixo alimenta o simulador: dealbreakers cortam animais da fila, regras de score somam pontos quando a comparacao passa.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <RuleEngineMetric label="Regras ativas" value={String(rows.filter((rule) => rule.is_active !== false).length)} tone="cyan" />
            <RuleEngineMetric label="Dealbreakers" value={String(rows.filter((rule) => rule.is_dealbreaker).length)} tone="red" />
            <RuleEngineMetric label="Campos" value={String(customFieldOptions.tutor.length + customFieldOptions.animal.length)} tone="green" />
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(300px,400px)_1fr]">
          <MatchingRuleQueue
            onQueryChange={onQueryChange}
            onRefresh={onRefresh}
            onSelect={onSelect}
            query={query}
            rows={rows as MatchingRuleRecord[]}
            selectedId={selectedId}
            total={total}
          />

          <RecordForm
            config={resourceUiConfigs["matching-rules"]}
            customFieldDefinitions={customFieldDefinitions}
            customFieldOptions={customFieldOptions}
            disabled={disabled}
            formState={formState}
            mode={mode}
            onboardingQuestionOptions={onboardingQuestionOptions}
            onChange={onChange}
            onDelete={onDelete}
            onRefresh={onRefresh}
            onSubmit={onSubmit}
            selectedRow={selectedRow}
          />
        </div>
      </section>

      <RuleSimulatorPanel
        animals={animals}
        customFieldDefinitions={customFieldDefinitions}
        loadStatus={status}
        message={message}
        rules={rows as MatchingRuleRecord[]}
        tutors={tutors}
        onReload={loadSimulatorData}
      />
    </div>
  );
}

function RuleEngineMetric({ label, tone, value }: { label: string; tone: "cyan" | "green" | "red"; value: string }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    red: "border-red-400/20 bg-red-400/10 text-red-100",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-75">{label}</p>
    </div>
  );
}

function MatchingRuleQueue({
  onQueryChange,
  onRefresh,
  onSelect,
  query,
  rows,
  selectedId,
  total,
}: {
  onQueryChange: (value: string) => void;
  onRefresh: (nextSelectedId?: string) => Promise<void>;
  onSelect: (row: AdminRecord) => void;
  query: string;
  rows: MatchingRuleRecord[];
  selectedId: string | null;
  total: number;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleRuleStatus(rule: MatchingRuleRecord) {
    const id = String(rule.id);
    setBusyId(id);
    try {
      await updateAdminResource("matching-rules", id, { is_active: rule.is_active === false });
      await onRefresh(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 bg-white/[0.01] p-5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="rule-search">
          Buscar em {total} regras
        </label>
        <input
          className={`${fieldClass} mt-2 h-12 border-white/5 bg-black/40`}
          id="rule-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Pesquisar por nome, campo ou operador..."
          value={query}
        />
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        {rows.map((rule) => {
          const isSelected = String(rule.id) === selectedId;
          const isDealbreaker = Boolean(rule.is_dealbreaker);
          const isActive = rule.is_active !== false;

          return (
            <article
              className={`border-b border-white/5 p-4 transition-all ${isSelected ? "bg-cyan-400/10" : "hover:bg-white/[0.03]"}`}
              key={String(rule.id)}
            >
              <button className="w-full text-left" onClick={() => onSelect(rule)} type="button">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className={`truncate text-sm font-bold ${isSelected ? "text-cyan-100" : "text-white"}`}>
                      {rule.rule_name || "Regra sem nome"}
                    </h4>
                    <p className="mt-1 text-[11px] font-mono text-slate-500">{buildRuleExpression(rule)}</p>
                  </div>
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className={`border-none font-bold uppercase tracking-wider ${isDealbreaker ? "bg-red-500/10 text-red-200" : "bg-emerald-400/10 text-emerald-200"}`}>
                    {isDealbreaker ? "Dealbreaker" : `+${Number(rule.weight ?? 0)} pts`}
                  </Badge>
                  <Badge className={`border-none font-bold uppercase tracking-wider ${isActive ? "bg-cyan-400/10 text-cyan-200" : "bg-slate-700 text-slate-300"}`}>
                    {isActive ? "Ativa" : "Pausada"}
                  </Badge>
                </div>
              </button>
              <button
                className={`mt-4 w-full rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                  isActive
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
                    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                }`}
                disabled={busyId === String(rule.id)}
                onClick={() => toggleRuleStatus(rule)}
                type="button"
              >
                {busyId === String(rule.id) ? "Atualizando..." : isActive ? "Pausar para teste A/B" : "Reativar regra"}
              </button>
            </article>
          );
        })}
        {!rows.length && (
          <div className="px-6 py-12 text-center">
            <Zap className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-4 text-sm font-medium text-slate-400">
              {query ? "Nenhuma regra encontrada para sua busca." : "Nenhuma regra cadastrada."}
            </p>
          </div>
        )}
      </div>
    </section>
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
    if (config.id !== "custom-fields" && config.id !== "onboarding-questions") {
      onChange({ ...formState, [field.name]: value });
      return;
    }

    if (config.id === "custom-fields" && field.name === "field_key") {
      onChange({ ...formState, field_key: sanitizeAdminIdentifier(String(value ?? "")) });
      return;
    }

    if (config.id === "onboarding-questions" && field.name === "id") {
      onChange({ ...formState, id: sanitizeAdminIdentifier(String(value ?? "")) });
      return;
    }

    if (field.name === "label") {
      const nextState: FormState = { ...formState, label: value };
      if (config.id === "custom-fields" && !String(formState.field_key ?? "").trim()) {
        nextState.field_key = sanitizeAdminIdentifier(String(value ?? ""));
      }
      if (config.id === "onboarding-questions" && !String(formState.id ?? "").trim()) {
        nextState.id = sanitizeAdminIdentifier(String(value ?? ""));
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
            {config.id === "matching-rules" ? (
              <RuleBuilderControls
                animalOptions={customFieldOptions.animal}
                disabled={formDisabled}
                formState={formState}
                onChange={onChange}
                tutorOptions={customFieldOptions.tutor}
              />
            ) : (
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

function RuleBuilderControls({
  animalOptions,
  disabled,
  formState,
  onChange,
  tutorOptions,
}: {
  animalOptions: Array<{ label: string; value: string }>;
  disabled: boolean;
  formState: FormState;
  onChange: (state: FormState) => void;
  tutorOptions: Array<{ label: string; value: string }>;
}) {
  const isDealbreaker = Boolean(formState.is_dealbreaker);
  const isActive = formState.is_active !== false;
  const weight = Number(formState.weight ?? 0);

  function patch(next: Partial<FormState>) {
    onChange({ ...formState, ...next });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400" htmlFor="rule-name">
            Nome da regra<span className="ml-1 text-cyan-400">*</span>
          </label>
          <input
            className={fieldClass}
            disabled={disabled}
            id="rule-name"
            onChange={(event) => patch({ rule_name: event.target.value })}
            placeholder="Ex.: Espaco minimo para porte grande"
            required
            value={String(formState.rule_name ?? "")}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
          <button
            className={`h-11 min-w-[160px] rounded-full border px-4 text-xs font-black uppercase tracking-widest transition ${
              isActive
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : "border-slate-500/30 bg-slate-700/40 text-slate-300"
            }`}
            disabled={disabled}
            onClick={() => patch({ is_active: !isActive })}
            type="button"
          >
            {isActive ? "Regra ativa" : "Regra pausada"}
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Logica de comparacao</p>
            <h4 className="mt-1 text-lg font-bold text-white">Construtor logico visual</h4>
          </div>
          <Badge className="border-none bg-white/5 font-mono text-slate-300">{buildRuleExpression(formState)}</Badge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px_1fr]">
          <HumanSelect
            disabled={disabled}
            label="Se o"
            options={tutorOptions}
            value={String(formState.tutor_field ?? "")}
            onChange={(value) => patch({ tutor_field: value })}
          />
          <HumanSelect
            disabled={disabled}
            label="For"
            options={[
              { label: "Igual a", value: "=" },
              { label: "Diferente de", value: "!=" },
              { label: "Maior ou igual a", value: ">=" },
              { label: "Menor ou igual a", value: "<=" },
              { label: "Contiver", value: "contains" },
            ]}
            value={String(formState.comparison_operator ?? "=")}
            onChange={(value) => patch({ comparison_operator: value })}
          />
          <HumanSelect
            disabled={disabled}
            label="Do que"
            options={animalOptions}
            value={String(formState.animal_field ?? "")}
            onChange={(value) => patch({ animal_field: value })}
          />
        </div>
      </section>

      <section
        className={`rounded-xl border p-5 transition-all ${
          isDealbreaker
            ? "border-red-400/30 bg-red-500/[0.07] shadow-[0_0_24px_rgba(248,113,113,0.08)]"
            : "border-emerald-400/25 bg-emerald-400/[0.06] shadow-[0_0_24px_rgba(52,211,153,0.07)]"
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isDealbreaker ? "text-red-200" : "text-emerald-200"}`}>
              Chaveador de impacto
            </p>
            <h4 className="mt-1 text-lg font-bold text-white">
              {isDealbreaker ? "Dealbreaker: falhou, sai da fila" : "Score: passou, soma pontos"}
            </h4>
          </div>
          <button
            className={`relative h-12 w-[190px] rounded-full border p-1 text-xs font-black uppercase tracking-widest transition ${
              isDealbreaker
                ? "border-red-300/40 bg-red-500/20 text-red-100"
                : "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
            }`}
            disabled={disabled}
            onClick={() => patch({ is_dealbreaker: !isDealbreaker })}
            type="button"
          >
            <span
              className={`absolute top-1 h-10 w-[88px] rounded-full bg-white transition-all ${isDealbreaker ? "left-[96px]" : "left-1"}`}
            />
            <span className="relative grid grid-cols-2">
              <span className={isDealbreaker ? "text-white/70" : "text-slate-950"}>Score</span>
              <span className={isDealbreaker ? "text-slate-950" : "text-white/70"}>Corte</span>
            </span>
          </button>
        </div>

        {isDealbreaker ? (
          <div className="mt-5 flex gap-3 rounded-xl border border-red-400/25 bg-black/20 p-4 text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">
              Se essa comparacao falhar, o pet sera excluido dos resultados do tutor antes da pontuacao final.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
            <label className="text-[11px] font-black uppercase tracking-widest text-emerald-100" htmlFor="rule-weight">
              Pontos somados
            </label>
            <div className="rounded-xl border border-emerald-400/20 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-100">{impactLabel(weight)}</span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-black text-emerald-100">+{weight || 0}</span>
              </div>
              <input
                className="w-full accent-emerald-300"
                disabled={disabled}
                id="rule-weight"
                max={100}
                min={0}
                onChange={(event) => patch({ weight: Number(event.target.value) })}
                step={5}
                type="range"
                value={Number.isFinite(weight) ? Math.min(Math.max(weight, 0), 100) : 0}
              />
            </div>
          </div>
        )}
      </section>

      <RuleComparisonPreview animalOptions={animalOptions} formState={formState} tutorOptions={tutorOptions} />
    </div>
  );
}

function HumanSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const uniqueOptions = dedupeOptionsByValue(options);

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <div className="relative">
        <select
          className={`${fieldClass} appearance-none bg-black/50`}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          required
          value={value}
        >
          <option value="">Selecione</option>
          {uniqueOptions.map((option) => (
            <option key={option.value} value={option.value}>{cleanOptionLabel(option.label)}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
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
  const tutorLabel = cleanOptionLabel(findOptionLabel(tutorOptions, formState.tutor_field)) || "campo do tutor";
  const animalLabel = cleanOptionLabel(findOptionLabel(animalOptions, formState.animal_field)) || "campo do pet";
  const conditionLabel = comparisonOperatorLabel(String(formState.comparison_operator ?? ""));
  const weight = Number(formState.weight ?? 0);
  const isDealbreaker = Boolean(formState.is_dealbreaker);

  return (
    <div className={`rounded-xl border p-4 ${isDealbreaker ? "border-red-400/20 bg-red-500/[0.04]" : "border-emerald-400/20 bg-emerald-400/[0.04]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-300">Preview da regra</p>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
          <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-slate-200">{buildRuleExpression(formState)}</span>
          <span className={`rounded-full px-3 py-1 ${isDealbreaker ? "bg-red-400/15 text-red-100" : "bg-emerald-400/15 text-emerald-100"}`}>
            {isDealbreaker ? "Eliminatoria" : impactLabel(weight)}
          </span>
        </div>
      </div>
      <div className="mt-3 grid items-center gap-3 text-sm md:grid-cols-[1fr_auto_1fr]">
        <div className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-100">
          <span className="block text-[11px] uppercase text-slate-500">Perfil do tutor</span>
          <span className="font-semibold">{tutorLabel}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center font-semibold text-cyan-100">
          {conditionLabel}
        </div>
        <div className="min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-100">
          <span className="block text-[11px] uppercase text-slate-500">Atributo do animal</span>
          <span className="font-semibold">{animalLabel}</span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {isDealbreaker ? (
          <>Quando essa frase for falsa, o animal e removido dos resultados desse tutor.</>
        ) : (
          <>Quando essa frase for verdadeira, o animal recebe <span className="font-bold text-emerald-100">+{weight || 0} pontos</span>.</>
        )}
      </p>
    </div>
  );
}

function RuleSimulatorPanel({
  animals,
  customFieldDefinitions,
  loadStatus,
  message,
  onReload,
  rules,
  tutors,
}: {
  animals: AdminRecord[];
  customFieldDefinitions: Record<CustomFieldEntity, CustomFieldDefinition[]>;
  loadStatus: "loading" | "ready" | "error";
  message: string;
  onReload: () => Promise<void>;
  rules: MatchingRuleRecord[];
  tutors: AdminRecord[];
}) {
  const [sandboxEnabled, setSandboxEnabled] = useState(false);
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [activeTab, setActiveTab] = useState<"score" | "dealbreakers">("score");
  const [sandboxFields, setSandboxFields] = useState<Record<string, unknown>>({});
  const tutorSandboxFieldDefinitions = useMemo(
    () => dedupeCustomFieldDefinitionsByKey(customFieldDefinitions.tutor),
    [customFieldDefinitions.tutor],
  );

  useEffect(() => {
    if (!selectedTutorId && tutors[0]?.id) setSelectedTutorId(String(tutors[0].id));
  }, [selectedTutorId, tutors]);

  useEffect(() => {
    setSandboxFields((current) => {
      const next = { ...current };
      for (const field of tutorSandboxFieldDefinitions) {
        if (!(field.field_key in next)) next[field.field_key] = defaultCustomFieldValue(field);
      }
      return next;
    });
  }, [tutorSandboxFieldDefinitions]);

  const selectedTutor = tutors.find((tutor) => String(tutor.id) === selectedTutorId) ?? tutors[0] ?? null;
  const tutorFields = sandboxEnabled ? sandboxFields : normalizeCustomFields(selectedTutor?.custom_fields);
  const activeRules = rules.filter((rule) => rule.is_active !== false);
  const results = useMemo(
    () => simulateRules(tutorFields, animals, activeRules),
    [activeRules, animals, tutorFields],
  );
  const matches = results.filter((result) => !result.disqualified && result.score > 0).sort((a, b) => b.score - a.score);
  const rejected = results.filter((result) => result.disqualified);
  const selectedResult = matches.find((result) => String(result.animal.id) === selectedAnimalId) ?? matches[0] ?? null;
  const dealbreakerCount = activeRules.filter((rule) => rule.is_dealbreaker).length;

  useEffect(() => {
    if (matches[0]?.animal.id && !matches.some((result) => String(result.animal.id) === selectedAnimalId)) {
      setSelectedAnimalId(String(matches[0].animal.id));
    }
  }, [matches, selectedAnimalId]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 bg-black/20 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Simulador conectado</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-white">Resultado em tempo real</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Use tutores reais ou monte um cenario sandbox para validar como as regras afetam score e cortes.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(220px,320px)_auto]">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Tutor de entrada</span>
              <div className="relative">
                <select
                  className={`${fieldClass} appearance-none`}
                  disabled={sandboxEnabled || loadStatus !== "ready"}
                  onChange={(event) => setSelectedTutorId(event.target.value)}
                  value={selectedTutorId}
                >
                  {tutors.map((tutor) => (
                    <option key={String(tutor.id)} value={String(tutor.id)}>{String(tutor.name ?? tutor.id)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </label>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Modo</span>
              <button
                className={`h-12 min-w-[170px] rounded-full border px-4 text-xs font-black uppercase tracking-widest transition ${
                  sandboxEnabled
                    ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
                    : "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                }`}
                onClick={() => setSandboxEnabled((current) => !current)}
                type="button"
              >
                {sandboxEnabled ? "Sandbox ativo" : "Tutor real"}
              </button>
            </div>
          </div>
        </div>

        {sandboxEnabled && (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-amber-100">Formulario sandbox</p>
              <Badge className="border-none bg-amber-400/10 text-amber-100">Nao altera o banco</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tutorSandboxFieldDefinitions.map((field) => (
                <SandboxFieldControl
                  definition={field}
                  key={field.field_key}
                  value={sandboxFields[field.field_key]}
                  onChange={(value) => setSandboxFields((current) => ({ ...current, [field.field_key]: value }))}
                />
              ))}
            </div>
          </div>
        )}

        {loadStatus === "error" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-100">{message}</p>
            <Button className="h-9 min-h-0 px-4 text-[10px]" onClick={() => void onReload()} type="button" variant="danger-outline">
              Recarregar
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(300px,420px)_1fr]">
        <section className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-white">Fila de matches</h4>
                <p className="mt-1 text-xs text-slate-500">{matches.length} animais com score positivo</p>
              </div>
              <Badge className="border-none bg-emerald-400/10 text-emerald-100">Score</Badge>
            </div>
          </div>
          <div className="max-h-[520px] overflow-auto custom-scrollbar">
            {loadStatus === "loading" ? (
              <div className="p-5 text-sm text-slate-400">Carregando tutores e animais...</div>
            ) : matches.length ? (
              matches.map((result, index) => (
                <button
                  className={`w-full border-b border-white/5 p-4 text-left transition ${selectedResult?.animal.id === result.animal.id ? "bg-emerald-400/10" : "hover:bg-white/[0.04]"}`}
                  key={String(result.animal.id)}
                  onClick={() => setSelectedAnimalId(String(result.animal.id))}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">#{index + 1}</p>
                      <h5 className="truncate text-base font-bold text-white">{String(result.animal.name ?? result.animal.id)}</h5>
                      <p className="mt-1 text-xs text-slate-500">{String(result.animal.species ?? "Animal")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-emerald-100">{result.score}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/70">pontos</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-300/70" />
                <p className="mt-4 text-sm font-medium text-slate-300">Nenhum match com score positivo.</p>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <div className="border-b border-white/10 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Raio-X do resultado</h4>
                <p className="mt-1 text-xs text-slate-500">
                  {dealbreakerCount} dealbreakers ativos podem remover pets antes da soma de pontos.
                </p>
              </div>
              <div className="grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
                <button
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${activeTab === "score" ? "bg-emerald-400 text-slate-950" : "text-slate-400"}`}
                  onClick={() => setActiveTab("score")}
                  type="button"
                >
                  Score
                </button>
                <button
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${activeTab === "dealbreakers" ? "bg-red-400 text-slate-950" : "text-slate-400"}`}
                  onClick={() => setActiveTab("dealbreakers")}
                  type="button"
                >
                  Cortes
                </button>
              </div>
            </div>
          </div>

          {activeTab === "score" ? (
            <ScoreBreakdown result={selectedResult} />
          ) : (
            <DealbreakerAudit rejected={rejected} />
          )}
        </section>
      </div>
    </section>
  );
}

function SandboxFieldControl({
  definition,
  onChange,
  value,
}: {
  definition: CustomFieldDefinition;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{definition.label}</span>
      {definition.field_type === "boolean" ? (
        <select className={`${fieldClass} appearance-none`} onChange={(event) => onChange(event.target.value === "true")} value={String(Boolean(value))}>
          <option value="true">Sim</option>
          <option value="false">Nao</option>
        </select>
      ) : (definition.field_type === "select" || definition.field_type === "multiselect") && definition.options.length ? (
        <select className={`${fieldClass} appearance-none`} onChange={(event) => onChange(event.target.value)} value={String(value ?? "")}>
          {definition.options.map((option) => (
            <option key={option} value={option}>{humanizeFieldKey(option)}</option>
          ))}
        </select>
      ) : (
        <input
          className={fieldClass}
          onChange={(event) => onChange(definition.field_type === "number" ? Number(event.target.value) : event.target.value)}
          type={definition.field_type === "number" ? "number" : "text"}
          value={String(value ?? "")}
        />
      )}
    </label>
  );
}

function ScoreBreakdown({ result }: { result: RuleSimulationResult | null }) {
  if (!result) {
    return (
      <div className="p-8 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8 text-slate-600" />
        <p className="mt-4 text-sm text-slate-400">Selecione um animal com match para ver o detalhamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Resumo</p>
            <h5 className="mt-1 text-xl font-bold text-white">{String(result.animal.name ?? result.animal.id)}</h5>
          </div>
          <p className="text-3xl font-black text-emerald-100">{result.score} pts</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Gatilho: regras pausadas nao entram no calculo; regras de corte aprovadas apenas liberam a soma, sem adicionar pontos.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {result.details.map((detail) => (
          <article
            className={`rounded-xl border p-4 ${
              detail.rule.is_dealbreaker
                ? detail.matched
                  ? "border-cyan-400/20 bg-cyan-400/[0.04]"
                  : "border-red-400/20 bg-red-500/[0.06]"
                : detail.matched
                  ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                  : "border-white/10 bg-white/[0.02]"
            }`}
            key={String(detail.rule.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h6 className="text-sm font-bold text-white">{String(detail.rule.rule_name ?? "Regra")}</h6>
                <p className="mt-1 text-[11px] font-mono text-slate-500">{detail.expression}</p>
              </div>
              <Badge className={`shrink-0 border-none ${detail.score > 0 ? "bg-emerald-400/10 text-emerald-100" : detail.rule.is_dealbreaker ? "bg-cyan-400/10 text-cyan-100" : "bg-white/5 text-slate-400"}`}>
                {detail.score > 0 ? `+${detail.score} pts` : detail.rule.is_dealbreaker ? "Liberou" : "+0 pts"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{detail.reason}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function DealbreakerAudit({ rejected }: { rejected: RuleSimulationResult[] }) {
  return (
    <div className="space-y-4 p-5">
      {rejected.length ? (
        rejected.map((result) => (
          <article className="rounded-xl border border-red-400/25 bg-red-500/[0.06] p-4" key={String(result.animal.id)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Excluido da fila</p>
                <h5 className="mt-1 text-lg font-bold text-white">{String(result.animal.name ?? result.animal.id)}</h5>
              </div>
              <Badge className="border-none bg-red-400/15 text-red-100">{result.failedDealbreakers.length} bloqueio(s)</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {result.failedDealbreakers.map((detail) => (
                <div className="rounded-xl border border-red-400/15 bg-black/20 p-3" key={String(detail.rule.id)}>
                  <p className="text-sm font-bold text-red-100">{String(detail.rule.rule_name ?? "Regra eliminatoria")}</p>
                  <p className="mt-1 text-[11px] font-mono text-red-100/70">{detail.expression}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{detail.reason}</p>
                </div>
              ))}
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-emerald-200" />
          <p className="mt-4 text-sm font-medium text-emerald-100">Nenhum animal foi cortado por dealbreaker neste cenario.</p>
        </div>
      )}
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
    tutor: dedupeCustomFieldDefinitionsByKey([
      ...activeFields
      .filter((field) => field.entity_type === "tutor")
      .filter((field) => hasActiveSourceQuestion(field, onboardingQuestions))
      .map(toCustomFieldDefinition),
      ...onboardingQuestions
        .filter((question) => question.is_active !== false && question.id)
        .map(toQuestionCustomFieldDefinition),
    ]),
    animal: dedupeCustomFieldDefinitionsByKey(activeFields
      .filter((field) => field.entity_type === "animal")
      .map(toCustomFieldDefinition),
    ),
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

function cleanOptionLabel(label: string) {
  return label.replace(/\s\([^)]+\)$/, "");
}

function dedupeOptionsByValue(options: Array<{ label: string; value: string }>) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

function dedupeCustomFieldDefinitionsByKey(definitions: CustomFieldDefinition[]) {
  const seen = new Set<string>();
  return definitions.filter((definition) => {
    if (seen.has(definition.field_key)) return false;
    seen.add(definition.field_key);
    return true;
  });
}

function buildRuleExpression(rule: Pick<MatchingRuleRecord, "tutor_field" | "animal_field" | "comparison_operator"> | FormState) {
  const tutorField = String(rule.tutor_field ?? "tutor_field");
  const animalField = String(rule.animal_field ?? "animal_field");
  const operator = String(rule.comparison_operator ?? "=");
  return `${tutorField || "tutor_field"} ${operatorSymbol(operator)} ${animalField || "animal_field"}`;
}

function operatorSymbol(operator: string) {
  const labels: Record<string, string> = {
    "=": "=",
    "!=": "!=",
    contains: "contains",
    ">=": ">=",
    "<=": "<=",
  };

  return labels[operator] ?? operator;
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

function simulateRules(tutorFields: Record<string, unknown>, animals: AdminRecord[], rules: MatchingRuleRecord[]): RuleSimulationResult[] {
  return animals.map((animal) => {
    const animalFields = normalizeCustomFields(animal.custom_fields);
    const details = rules.map((rule) => evaluateRuleForPreview(rule, tutorFields, animalFields));
    const failedDealbreakers = details.filter((detail) => detail.rule.is_dealbreaker && !detail.matched);
    const disqualified = failedDealbreakers.length > 0;
    const score = disqualified
      ? 0
      : details.reduce((total, detail) => total + detail.score, 0);

    return {
      animal,
      details,
      disqualified,
      failedDealbreakers,
      score,
    };
  });
}

function evaluateRuleForPreview(
  rule: MatchingRuleRecord,
  tutorFields: Record<string, unknown>,
  animalFields: Record<string, unknown>,
): RuleSimulationDetail {
  const tutorValue = tutorFields[String(rule.tutor_field ?? "")];
  const animalValue = animalFields[String(rule.animal_field ?? "")];
  const matched = tutorValue !== undefined && animalValue !== undefined
    ? compareRuleValues(tutorValue, animalValue, String(rule.comparison_operator ?? "="))
    : false;
  const score = matched && !rule.is_dealbreaker ? Number(rule.weight ?? 0) : 0;
  const expression = buildRuleExpression(rule);

  return {
    rule,
    matched,
    score,
    tutorValue,
    animalValue,
    expression,
    reason: describeRuleEvaluation(rule, matched, tutorValue, animalValue),
  };
}

function compareRuleValues(tutorValue: unknown, animalValue: unknown, operator: string) {
  if (operator === "=") return tutorValue === animalValue;
  if (operator === "!=") return tutorValue !== animalValue;
  if (operator === ">=") return valueRank(tutorValue) >= valueRank(animalValue);
  if (operator === "<=") return valueRank(tutorValue) <= valueRank(animalValue);
  if (operator === "contains") {
    if (Array.isArray(animalValue)) {
      return Array.isArray(tutorValue)
        ? tutorValue.some((item) => animalValue.includes(item))
        : animalValue.includes(tutorValue);
    }
    if (Array.isArray(tutorValue)) {
      return tutorValue.some((item) => typeof animalValue === "string" && animalValue.includes(String(item)));
    }
    if (typeof tutorValue === "string" && typeof animalValue === "string") {
      return animalValue.includes(tutorValue);
    }
  }
  return false;
}

function valueRank(value: unknown) {
  const rankMap: Record<string, number> = {
    baixo: 1,
    medio: 2,
    alto: 3,
    apartamento: 1,
    casa_quintal_pequeno: 2,
    casa_quintal_grande: 3,
  };

  if (typeof value === "number") return value;
  if (typeof value === "string") return rankMap[value] ?? (Number(value) || 0);
  return 0;
}

function describeRuleEvaluation(rule: MatchingRuleRecord, matched: boolean, tutorValue: unknown, animalValue: unknown) {
  const tutorText = formatComparableValue(tutorValue);
  const animalText = formatComparableValue(animalValue);
  const operator = String(rule.comparison_operator ?? "=");

  if (operator === ">=" || operator === "<=") {
    return `${matched ? "Passou" : "Falhou"}: exige rank ${valueRank(animalValue)}, tutor tem rank ${valueRank(tutorValue)}. Valores: tutor ${tutorText}, pet ${animalText}.`;
  }

  if (operator === "contains") {
    return `${matched ? "Passou" : "Falhou"}: o valor do pet precisa conter a preferencia do tutor. Tutor ${tutorText}; pet ${animalText}.`;
  }

  return `${matched ? "Passou" : "Falhou"}: tutor ${tutorText} ${operatorSymbol(operator)} pet ${animalText}.`;
}

function formatComparableValue(value: unknown): string {
  if (value === undefined) return "sem valor";
  if (Array.isArray(value)) return value.map(formatComparableValue).join(", ");
  if (typeof value === "boolean") return value ? "sim" : "nao";
  if (value === null || value === "") return "sem valor";
  return humanizeFieldKey(String(value));
}

function normalizeCustomFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function defaultCustomFieldValue(field: CustomFieldDefinition) {
  if (field.field_type === "boolean") return false;
  if (field.field_type === "number") return 0;
  if ((field.field_type === "select" || field.field_type === "multiselect") && field.options.length) return field.options[0];
  return "";
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

function sanitizeAdminIdentifier(value: string) {
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
