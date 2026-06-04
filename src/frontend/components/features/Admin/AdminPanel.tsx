"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AdminContext, useDataProvider, type DataProvider, type RaRecord } from "react-admin";
import {
  adminResources,
  createAdminResource,
  createAdminUser,
  deleteAdminResource,
  getAdminMe,
  listAdminResource,
  updateAdminResource,
  uploadAnimalPhoto,
  type AdminResource,
} from "@/lib/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type AdminRecord = RaRecord & Record<string, unknown>;
type FieldType = "text" | "email" | "password" | "number" | "boolean" | "select" | "textarea" | "keyValue" | "options";

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  createOnly?: boolean;
  helper?: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  required?: boolean;
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
}

type KeyValueRow = { key: string; value: string };
type FormState = Record<string, unknown>;

const fieldClass =
  "min-h-11 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-cyan-200 disabled:opacity-40";
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
  tutors: {
    id: "tutors",
    description: "Perfis de tutores cadastrados e dados usados no matching.",
    emptyTitle: "Nenhum tutor cadastrado.",
    primaryField: "name",
    secondaryFields: ["location", "created_at"],
    searchFields: ["name", "location", "auth_user_id"],
    createDefaults: { auth_user_id: "", name: "", location: "", custom_fields: [] },
    fields: [
      { name: "auth_user_id", label: "ID do usuario Auth", type: "text", createOnly: true, required: true },
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "location", label: "Localizacao", type: "text" },
      { name: "custom_fields", label: "Campos personalizados", type: "keyValue", helper: "Use pares de nome e valor para preferencias, rotina e outros dados." },
    ],
  },
  animals: {
    id: "animals",
    description: "Animais disponiveis para adocao e atributos exibidos no matching.",
    emptyTitle: "Nenhum animal cadastrado.",
    primaryField: "name",
    secondaryFields: ["species", "location"],
    searchFields: ["name", "species", "location", "owner_id"],
    createDefaults: { owner_id: "", name: "", species: "", location: "", custom_fields: [] },
    fields: [
      { name: "owner_id", label: "ID da ONG responsavel", type: "text", required: true },
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "species", label: "Especie", type: "text", required: true },
      { name: "location", label: "Localizacao", type: "text" },
      { name: "custom_fields", label: "Campos personalizados", type: "keyValue", helper: "Adicione idade, porte, energia, necessidades especiais e outros atributos." },
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
      animal_id: "",
      bucket_id: "animal-photos",
      storage_path: "",
      public_url: "",
      content_type: "image/webp",
      size_bytes: 1,
      is_primary: false,
    },
    fields: [
      { name: "animal_id", label: "ID do animal", type: "text", required: true },
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
      { name: "id", label: "Identificador", type: "text", createOnly: true, required: true, helper: "Use um nome curto, sem espacos. Ex.: tipo_moradia." },
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
          { label: "Multiplas escolhas", value: "multi_select" },
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
    secondaryFields: ["comparison_operator", "weight"],
    searchFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator"],
    createDefaults: {
      rule_name: "",
      tutor_field: "",
      animal_field: "",
      comparison_operator: "=",
      weight: 10,
      is_active: true,
    },
    fields: [
      { name: "rule_name", label: "Nome da regra", type: "text", required: true },
      { name: "tutor_field", label: "Campo do tutor", type: "text", required: true, placeholder: "custom_fields.moradia" },
      { name: "animal_field", label: "Campo do animal", type: "text", required: true, placeholder: "custom_fields.porte" },
      {
        name: "comparison_operator",
        label: "Comparacao",
        type: "select",
        options: [
          { label: "Igual", value: "=" },
          { label: "Diferente", value: "!=" },
          { label: "Contem", value: "contains" },
          { label: "Maior ou igual", value: ">=" },
          { label: "Menor ou igual", value: "<=" },
        ],
      },
      { name: "weight", label: "Peso", type: "number" },
      { name: "is_active", label: "Regra ativa", type: "boolean" },
    ],
  },
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

export function AdminPanel() {
  return (
    <AdminContext dataProvider={adminDataProvider as DataProvider}>
      <AdminWorkspace />
    </AdminContext>
  );
}

function AdminWorkspace() {
  const router = useRouter();
  const dataProvider = useDataProvider();
  const [activeResource, setActiveResource] = useState<AdminResource>("admin-users");
  const [rows, setRows] = useState<AdminRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [formState, setFormState] = useState<FormState>(() => createInitialState(resourceUiConfigs["admin-users"]));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResourceLoading, setIsResourceLoading] = useState(false);

  const activeConfig = resourceUiConfigs[activeResource];
  const selectedRow = useMemo(
    () => rows.find((row) => String(row.id) === selectedId) ?? null,
    [rows, selectedId],
  );
  const filteredRows = useMemo(() => filterRows(rows, activeConfig.searchFields, query), [activeConfig.searchFields, query, rows]);

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
      .then(() => loadResource(activeResource))
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
  }, [activeResource, loadResource, router]);

  function changeResource(resource: AdminResource) {
    setIsResourceLoading(true);
    setActiveResource(resource);
    setQuery("");
    setRows([]);
    setSelectedId(null);
    setMode("edit");
    setFormState(createInitialState(resourceUiConfigs[resource]));
  }

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    setMessage("");
    setFormState(createInitialState(activeConfig));
  }

  function selectRow(row: AdminRecord) {
    setMode("edit");
    setSelectedId(String(row.id));
    setMessage("");
    setFormState(recordToFormState(row, activeConfig));
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
      setMessage(mode === "create" ? "Registro criado." : "Alteracoes salvas.");
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
      setMessage("Registro removido.");
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
          <Link className="text-sm font-semibold text-slate-300 hover:text-white" href="/discover">Voltar para adocao</Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            {visibleAdminResources.map((resource) => (
              <button
                aria-current={resource.id === activeResource ? "page" : undefined}
                className={`block w-full rounded-md border px-4 py-3 text-left transition disabled:cursor-wait disabled:opacity-65 ${resource.id === activeResource ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/10 bg-white/[0.035] text-slate-200 hover:bg-white/[0.07]"}`}
                disabled={isResourceLoading}
                key={resource.id}
                onClick={() => changeResource(resource.id)}
                type="button"
              >
                <span className="block text-sm font-semibold">{resource.label}</span>
                <span className={`mt-1 block text-xs ${resource.id === activeResource ? "text-slate-800" : "text-slate-500"}`}>
                  {resourceUiConfigs[resource.id].description}
                </span>
              </button>
            ))}
          </aside>

          <section className="min-w-0 space-y-5">
            <ResourceHeader config={activeConfig} count={rows.length} isLoading={isResourceLoading} onCreate={startCreate} />

            {message && <p className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{message}</p>}

            {isResourceLoading ? (
              <MenuLoadingPanel label={adminResources.find((resource) => resource.id === activeResource)?.label ?? "menu"} />
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(300px,420px)_1fr]">
                <RecordList
                  config={activeConfig}
                  query={query}
                  rows={filteredRows}
                  selectedId={selectedId}
                  total={rows.length}
                  onQueryChange={setQuery}
                  onSelect={selectRow}
                />

                <RecordForm
                  config={activeConfig}
                  disabled={isSaving || (mode === "edit" && !selectedRow)}
                  formState={formState}
                  mode={mode}
                  selectedRow={selectedRow}
                  onChange={setFormState}
                  onDelete={handleDelete}
                  onRefresh={(nextSelectedId) => loadResource(activeResource, nextSelectedId)}
                  onSubmit={handleSubmit}
                />
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
    <main className="min-h-screen bg-[#0e0e12] px-4 py-6 text-white md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[1500px]">{children}</div>
    </main>
  );
}

function ResourceHeader({ config, count, isLoading, onCreate }: { config: ResourceUiConfig; count: number; isLoading: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-white">{adminResources.find((resource) => resource.id === config.id)?.label}</h2>
          <Badge>{isLoading ? "carregando" : `${count} registros`}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-400">{config.description}</p>
      </div>
      <Button className="shrink-0" disabled={isLoading} onClick={onCreate} type="button">Novo registro</Button>
    </div>
  );
}

function MenuLoadingPanel({ label }: { label: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(300px,420px)_1fr]" role="status" aria-live="polite">
      <section className="min-h-[520px] rounded-md border border-white/10 bg-white/[0.035] p-4">
        <div className="h-11 animate-pulse rounded-md bg-white/10" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <div className="rounded-md border border-white/5 bg-white/[0.025] p-3" key={item}>
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-semibold text-cyan-100">Carregando {label}...</p>
        <p className="mt-1 text-sm text-slate-500">Buscando registros e preparando os formularios.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div className="space-y-2" key={item}>
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="h-11 animate-pulse rounded-md bg-white/5" />
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
  query,
  rows,
  selectedId,
  total,
}: {
  config: ResourceUiConfig;
  onQueryChange: (value: string) => void;
  onSelect: (row: AdminRecord) => void;
  query: string;
  rows: AdminRecord[];
  selectedId: string | null;
  total: number;
}) {
  return (
    <section className="min-h-[520px] rounded-md border border-white/10 bg-white/[0.035]">
      <div className="border-b border-white/10 p-4">
        <label className="text-xs font-semibold uppercase text-slate-400" htmlFor="admin-search">Buscar</label>
        <input
          className={`${fieldClass} mt-2`}
          id="admin-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filtrar registros"
          value={query}
        />
      </div>
      <div className="max-h-[620px] overflow-auto">
        {rows.map((row) => (
          <button
            className={`block w-full border-b border-white/5 px-4 py-3 text-left text-sm transition hover:bg-white/5 ${String(row.id) === selectedId ? "bg-cyan-200/10 text-cyan-100" : "text-slate-300"}`}
            key={String(row.id)}
            onClick={() => onSelect(row)}
            type="button"
          >
            <span className="block truncate font-semibold">{getRecordTitle(row, config)}</span>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {config.secondaryFields.map((field) => (
                <span className="rounded bg-white/5 px-2 py-1 text-[11px] text-slate-400" key={field}>{formatValue(row[field])}</span>
              ))}
            </span>
          </button>
        ))}
        {!rows.length && (
          <p className="px-4 py-6 text-sm text-slate-400">
            {query && total > 0 ? "Nenhum registro encontrado para a busca." : config.emptyTitle}
          </p>
        )}
      </div>
    </section>
  );
}

function RecordForm({
  config,
  disabled,
  formState,
  mode,
  onChange,
  onDelete,
  onRefresh,
  onSubmit,
  selectedRow,
}: {
  config: ResourceUiConfig;
  disabled: boolean;
  formState: FormState;
  mode: "create" | "edit";
  onChange: (state: FormState) => void;
  onDelete: () => void;
  onRefresh: (nextSelectedId?: string) => Promise<void>;
  onSubmit: (event: FormEvent) => void;
  selectedRow: AdminRecord | null;
}) {
  const visibleFields = config.fields.filter((field) => mode === "create" || !field.createOnly);

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <form onSubmit={onSubmit}>
        <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{mode === "create" ? "Criar registro" : "Editar registro"}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {mode === "create" ? "Preencha os campos abaixo para adicionar um item." : selectedRow ? `Selecionado: ${getRecordTitle(selectedRow, config)}` : "Selecione um item na lista."}
            </p>
          </div>
          {mode === "edit" && (
            <Button className="shrink-0" disabled={disabled} onClick={onDelete} type="button" variant="danger">Excluir</Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleFields.map((field) => (
            <FieldInput
              disabled={disabled}
              field={field}
              key={field.name}
              value={formState[field.name]}
              onChange={(value) => onChange({ ...formState, [field.name]: value })}
            />
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button disabled={disabled} type="submit">{mode === "create" ? "Criar" : "Salvar"}</Button>
        </div>
      </form>

      {config.id === "animals" && mode === "edit" && selectedRow && (
        <AnimalImagesPanel animal={selectedRow} disabled={disabled} onRefresh={() => onRefresh(String(selectedRow.id))} />
      )}
    </div>
  );
}

function AnimalImagesPanel({ animal, disabled, onRefresh }: { animal: AdminRecord; disabled: boolean; onRefresh: () => Promise<void> }) {
  const [photos, setPhotos] = useState<AdminRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const animalId = String(animal.id);

  const loadPhotos = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const data = await listAdminResource("animal-photos");
      setPhotos(data.filter((photo) => String(photo.animal_id) === animalId).map(toRaRecord));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar as fotos.");
    } finally {
      setStatus("ready");
    }
  }, [animalId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!selectedFile) {
      setMessage("Selecione uma imagem para enviar.");
      return;
    }

    setStatus("saving");
    setUploadProgress(0);
    setMessage("Preparando upload...");
    try {
      const newPhoto = await uploadAnimalPhoto(animalId, selectedFile, (percent) => {
        setUploadProgress(percent);
        setMessage(`Enviando imagem: ${percent}%`);
      });
      await makePrimary(String(newPhoto.id), false);
      setSelectedFile(null);
      await loadPhotos();
      await onRefresh();
      setMessage("Imagem enviada e definida como principal.");
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
          <h3 className="text-lg font-semibold text-white">Imagens do animal</h3>
          <p className="mt-1 text-sm text-slate-400">Adicione uma imagem ou escolha qual aparece como principal no card de adocao.</p>
        </div>
      </div>

      <form className="mt-4 grid gap-3 rounded-md border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto]" onSubmit={handleUpload}>
        <input
          accept="image/avif,image/jpeg,image/png,image/webp"
          className={fieldClass}
          disabled={isBusy}
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        <Button disabled={isBusy || !selectedFile} type="submit">Enviar imagem</Button>
      </form>

      {uploadProgress !== null && (
        <div className="mt-4 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-2 bg-cyan-400 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {message && <p className="mt-3 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{message}</p>}

      {status === "loading" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="aspect-[4/3] animate-pulse rounded-md bg-white/10" key={item} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {photos.map((photo) => (
            <article className="overflow-hidden rounded-md border border-white/10 bg-black/20" key={String(photo.id)}>
              {typeof photo.public_url === "string" && photo.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={`Foto de ${String(animal.name ?? "animal")}`} className="aspect-[4/3] w-full object-cover" src={photo.public_url} />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-white/5 text-xs text-slate-500">Sem preview</div>
              )}
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-400">{formatValue(photo.content_type)}</span>
                  {Boolean(photo.is_primary) && <Badge>principal</Badge>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button className="min-h-10 px-3" disabled={isBusy || Boolean(photo.is_primary)} onClick={() => makePrimary(String(photo.id))} type="button" variant="outline">Principal</Button>
                  <Button className="min-h-10 px-3" disabled={isBusy} onClick={() => deletePhoto(String(photo.id))} type="button" variant="danger">Excluir</Button>
                </div>
              </div>
            </article>
          ))}
          {!photos.length && <p className="text-sm text-slate-500">Nenhuma imagem cadastrada para este animal.</p>}
        </div>
      )}
    </section>
  );
}

function FieldInput({
  disabled,
  field,
  onChange,
  value,
}: {
  disabled: boolean;
  field: FieldConfig;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const id = `admin-${field.name}`;

  if (field.type === "boolean") {
    return (
      <label className="flex min-h-[76px] items-center justify-between gap-4 rounded-md border border-white/10 bg-black/20 px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-slate-100">{field.label}</span>
          {field.helper && <span className="mt-1 block text-xs text-slate-500">{field.helper}</span>}
        </span>
        <input
          checked={Boolean(value)}
          className="h-5 w-5 accent-cyan-200"
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
      </label>
    );
  }

  if (field.type === "keyValue") {
    return (
      <div className="md:col-span-2">
        <FieldLabel field={field} htmlFor={id} />
        <KeyValueEditor disabled={disabled} rows={normalizeKeyValueRows(value)} onChange={onChange} />
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

  return (
    <div className={field.type === "textarea" ? "md:col-span-2" : undefined}>
      <FieldLabel field={field} htmlFor={id} />
      {field.type === "select" ? (
        <select
          className={fieldClass}
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={String(value ?? "")}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
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
    <label className="mb-2 block text-sm font-semibold text-slate-100" htmlFor={htmlFor}>
      {field.label}
      {field.required && <span className="text-cyan-200"> *</span>}
      {field.helper && <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{field.helper}</span>}
    </label>
  );
}

function KeyValueEditor({ disabled, onChange, rows }: { disabled: boolean; onChange: (value: KeyValueRow[]) => void; rows: KeyValueRow[] }) {
  function updateRow(index: number, patch: Partial<KeyValueRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div className="grid gap-2 md:grid-cols-[minmax(140px,220px)_1fr_auto]" key={index}>
          <input className={fieldClass} disabled={disabled} onChange={(event) => updateRow(index, { key: event.target.value })} placeholder="Campo" value={row.key} />
          <input className={fieldClass} disabled={disabled} onChange={(event) => updateRow(index, { value: event.target.value })} placeholder="Valor" value={row.value} />
          <Button className="min-h-11 px-4" disabled={disabled} onClick={() => removeRow(index)} type="button" variant="outline">Remover</Button>
        </div>
      ))}
      <Button className="mt-1" disabled={disabled} onClick={() => onChange([...rows, { key: "", value: "" }])} type="button" variant="outline">Adicionar campo</Button>
    </div>
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
      payload[field.name] = options.length ? options : null;
    } else if (field.type === "number") {
      payload[field.name] = Number(value) || 0;
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
  if (Array.isArray(value)) return value.map(String);
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

function filterRows(rows: AdminRecord[], fields: string[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter((row) => fields.some((field) => String(row[field] ?? "").toLowerCase().includes(normalizedQuery)));
}

function getRecordTitle(row: AdminRecord, config: ResourceUiConfig) {
  return String(row[config.primaryField] ?? row.email ?? row.name ?? row.label ?? row.rule_name ?? row.id);
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "ativo" : "inativo";
  if (!value) return "sem valor";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString("pt-BR");
  return String(value);
}
