"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, isSameMonth, setHours, setMinutes, setSeconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown, List, CalendarDays, Search, Trash2, User, Dog } from "lucide-react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEventInput,
  type CalendarEventRecord,
  type CalendarEventStatus,
} from "@/lib/calendar";
import { listAdminResource, getAdminMe } from "@/lib/admin";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Calendar } from "@/components/ui/Calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  status: CalendarEventStatus;
  tutor_id: string;
  animal_id: string;
  interest_id: string;
  provider: "" | "google" | "microsoft";
  external_event_id: string;
  external_event_url: string;
};

type InterviewDraft = {
  uuid_registro?: string;
  tutor_id?: string;
  animal_id?: string;
  tutor_name?: string;
  animal_name?: string;
};

const emptyFormState: FormState = {
  title: "",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
  status: "scheduled",
  tutor_id: "",
  animal_id: "",
  interest_id: "",
  provider: "",
  external_event_id: "",
  external_event_url: "",
};

const fieldClass =
  "min-h-11 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-cyan-200 disabled:opacity-40";

export function CalendarPage({ 
  standalone = true,
  skipAuthCheck = false
}: { 
  standalone?: boolean;
  skipAuthCheck?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRecord | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [statusFilter, setStatusFilter] = useState<"all" | CalendarEventStatus>("all");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "denied">("loading");
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Modals state
  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [tutors, setTutors] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);

  const filteredEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return statusFilter === "all" ? sorted : sorted.filter((event) => event.status === statusFilter);
  }, [events, statusFilter]);

  const groupedEvents = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);
  
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter(event => isSameDay(new Date(event.starts_at), selectedDate));
  }, [filteredEvents, selectedDate]);

  const isBusy = status === "loading" || status === "saving";

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await listCalendarEvents());
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível carregar o calendário.";
      if (msg.includes("Sessão ausente")) {
        router.push("/login?redirect=/calendario");
        return;
      }
      setMessage(msg);
    }
  }, [router]);

  const loadSelectionData = useCallback(async () => {
    try {
      const [tutorsData, animalsData, interestsData] = await Promise.all([
        listAdminResource("tutors"),
        listAdminResource("animals"),
        listAdminResource("tutor-interessados"),
      ]);
      setTutors(tutorsData);
      setAnimals(animalsData);
      setInterests(interestsData);
    } catch (error) {
      console.error("Erro ao carregar dados de seleção:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!skipAuthCheck) {
        await getAdminMe();
      }
      await Promise.all([loadEvents(), loadSelectionData()]);
    };

    run()
      .then(() => {
        if (mounted) setStatus("ready");
      })
      .catch((error) => {
        if (!mounted) return;
        const errorMessage = error instanceof Error ? error.message : "";

        if (errorMessage.includes("Sessão ausente")) {
          router.push("/login?redirect=/calendario");
          return;
        }

        if (errorMessage.includes("administrativo")) {
          setStatus("denied");
        } else {
          setMessage(errorMessage || "Não foi possível carregar o calendário.");
          setStatus("ready");
        }
      });

    return () => {
      mounted = false;
    };
  }, [router, skipAuthCheck, loadEvents, loadSelectionData]);

  useEffect(() => {
    if (status !== "ready" || draftApplied || searchParams.get("draft") !== "interview") return;

    const rawDraft = sessionStorage.getItem("calendarInterviewDraft");
    if (!rawDraft) {
      setDraftApplied(true);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as InterviewDraft;
      if (!draft.tutor_id || !draft.animal_id) {
        setDraftApplied(true);
        return;
      }

      const slot = findNextFreeTutorDay(events, draft.tutor_id);
      const title = `Entrevista com interessado ${draft.tutor_name || "tutor"} no animal ${draft.animal_name || "animal"}`;
      const interestUrl = draft.uuid_registro ? `${window.location.origin}/interessados/${draft.uuid_registro}` : "";
      setSelectedEvent(null);
      setSelectedDate(slot.start);
      setFormState({
        ...emptyFormState,
        title,
        description: title,
        starts_at: toDatetimeLocalValue(slot.start.toISOString()),
        ends_at: toDatetimeLocalValue(slot.end.toISOString()),
        tutor_id: draft.tutor_id,
        animal_id: draft.animal_id,
        interest_id: draft.uuid_registro ?? "",
        external_event_url: interestUrl,
      });
      setMessage("Formulário de entrevista preenchido. Revise os dados e clique em Criar para salvar o evento.");
      sessionStorage.removeItem("calendarInterviewDraft");
      router.replace("/calendario");
    } catch {
      setMessage("Não foi possível abrir o rascunho da entrevista.");
    } finally {
      setDraftApplied(true);
    }
  }, [draftApplied, events, router, searchParams, status]);

  // Backend search debounced
  useEffect(() => {
    if (!searchQuery) return;
    
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (isTutorModalOpen) {
          const results = await listAdminResource("tutors", searchQuery);
          setTutors(results);
        } else if (isAnimalModalOpen) {
          const results = await listAdminResource("animals", searchQuery);
          setAnimals(results);
        } else if (isInterestModalOpen) {
          const results = await listAdminResource("tutor-interessados", searchQuery);
          setInterests(results);
        }
      } catch (error) {
        console.error("Erro na busca:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, isTutorModalOpen, isAnimalModalOpen, isInterestModalOpen]);

  const updateTutor = (tutorId: string) => {
    const matchingInterest = interests.find(i => 
      (i.tutor_id === tutorId && i.animal_id === formState.animal_id) ||
      (i.tutor_id === tutorId && formState.animal_id === "")
    );

    setFormState(prev => ({ 
      ...prev, 
      tutor_id: tutorId,
      interest_id: (prev.animal_id && matchingInterest?.animal_id === prev.animal_id) ? matchingInterest.id : ""
    }));
  };

  const updateAnimal = (animalId: string) => {
    const matchingInterest = interests.find(i => 
      (i.animal_id === animalId && i.tutor_id === formState.tutor_id) ||
      (i.animal_id === animalId && formState.tutor_id === "")
    );

    setFormState(prev => ({ 
      ...prev, 
      animal_id: animalId,
      interest_id: (prev.tutor_id && matchingInterest?.tutor_id === prev.tutor_id) ? matchingInterest.id : ""
    }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const start = setSeconds(setMinutes(setHours(date, 0), 0), 0);
      const end = setSeconds(setMinutes(setHours(date, 23), 59), 0);
      
      setFormState(prev => ({
        ...prev,
        starts_at: toDatetimeLocalValue(start.toISOString()),
        ends_at: toDatetimeLocalValue(end.toISOString())
      }));
    }
  };

  function selectEvent(event: CalendarEventRecord) {
    setSelectedEvent(event);
    setFormState(recordToFormState(event));
    setMessage("");
  }

  function startCreate() {
    setSelectedEvent(null);
    setFormState(emptyFormState);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage(selectedEvent ? "Atualizando evento..." : "Criando evento...");

    try {
      const payload = formStateToPayload(formState);
      if (selectedEvent) {
        await updateCalendarEvent(selectedEvent.id, payload);
      } else {
        await createCalendarEvent(payload);
      }
      await loadEvents();
      startCreate();
      setMessage(selectedEvent ? "Evento atualizado." : "Evento criado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o evento.");
    } finally {
      setStatus("ready");
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    setStatus("saving");
    setMessage("Removendo evento...");

    try {
      await deleteCalendarEvent(selectedEvent.id);
      await loadEvents();
      startCreate();
      setMessage("Evento removido.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o evento.");
    } finally {
      setStatus("ready");
    }
  }

  if (status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0e0e12] p-5 text-white">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Acesso negado</h1>
          <p className="text-slate-400">Você não tem permissão para acessar o calendário administrativo.</p>
          <Link className="inline-block text-cyan-200 hover:underline" href="/discover">Voltar para a home</Link>
        </div>
      </main>
    );
  }

  const filteredTutors = tutors;
  const filteredAnimals = animals;
  const filteredInterests = interests;

  const content = (
    <div className={cn("flex flex-col gap-6", standalone && "mx-auto max-w-7xl")}>
      {standalone && (
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="text-sm font-semibold text-cyan-200 hover:text-cyan-100" href="/admin">Voltar ao admin</Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Calendário</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Agenda de visitas, conversas com tutores e retornos do processo de adoção.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "scheduled", "completed", "cancelled"] as const).map((item) => (
              <button
                className={`min-h-10 rounded-md border px-4 text-sm font-semibold transition ${statusFilter === item ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"}`}
                key={item}
                onClick={() => setStatusFilter(item)}
                type="button"
              >
                {statusLabel(item)}
              </button>
            ))}
          </div>
        </header>
      )}

      {!standalone && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "scheduled", "completed", "cancelled"] as const).map((item) => (
              <button
                className={`min-h-9 rounded-full border px-4 text-[10px] font-bold uppercase tracking-wider transition ${statusFilter === item ? "border-cyan-400 bg-cyan-400/10 text-cyan-400" : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/20"}`}
                key={item}
                onClick={() => setStatusFilter(item)}
                type="button"
              >
                {statusLabel(item)}
              </button>
            ))}
          </div>
        </div>
      )}

      {message && <p className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{message}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 min-h-[600px]">
          <Tabs defaultValue="list" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-black/20 p-1">
                <TabsTrigger value="list" className="gap-2 px-4">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="month" className="gap-2 px-4">
                  <CalendarIcon className="h-4 w-4" />
                  Mês
                </TabsTrigger>
                <TabsTrigger value="week" className="gap-2 px-4">
                  <CalendarDays className="h-4 w-4" />
                  Semana
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-0">
              {status === "loading" ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => <div className="h-24 animate-pulse rounded-xl bg-white/5" key={item} />)}
                </div>
              ) : groupedEvents.length ? (
                <div className="space-y-8">
                  {groupedEvents.map((group) => (
                    <div key={group.dateKey}>
                      <h2 className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 border-l-2 border-cyan-400/30 pl-3">{group.label}</h2>
                      <div className="space-y-3">
                        {group.events.map((event) => (
                          <EventCard 
                            key={event.id} 
                            event={event} 
                            isSelected={selectedEvent?.id === event.id} 
                            onClick={() => selectEvent(event)} 
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                   <CalendarIcon className="h-10 w-10 text-slate-700 mb-4" />
                   <p className="text-sm font-medium text-slate-500">Nenhum evento agendado.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="month" className="mt-0">
              <div className="grid gap-8 md:grid-cols-[auto_1fr]">
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 self-start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={ptBR}
                    className="rounded-md"
                    modifiers={{
                      hasEvent: (date) => events.some(e => isSameDay(new Date(e.starts_at), date))
                    }}
                    modifiersClassNames={{
                      hasEvent: "after:content-[''] after:block after:w-1 after:h-1 after:bg-cyan-400 after:rounded-full after:mx-auto after:mt-1"
                    }}
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-200/70 border-b border-white/5 pb-2">
                    {selectedDate ? format(selectedDate, "eeee, dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                  </h3>
                  <div className="space-y-3">
                    {dayEvents.length ? (
                      dayEvents.map(event => (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          isSelected={selectedEvent?.id === event.id} 
                          onClick={() => selectEvent(event)} 
                        />
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                        <List className="h-8 w-8 mb-2" />
                        <p className="text-xs font-medium">Sem compromissos</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="week" className="mt-0">
              <div className="space-y-8">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), i);
                  const eventsOnDay = filteredEvents.filter(e => isSameDay(new Date(e.starts_at), date));
                  
                  return (
                    <div key={i} className={cn("space-y-3", !isSameMonth(date, new Date()) && "opacity-40")}>
                      <h3 className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] border-l-2 pl-3",
                        isSameDay(date, new Date()) ? "text-cyan-400 border-cyan-400" : "text-slate-500 border-white/10"
                      )}>
                        {format(date, "eeee, dd/MM", { locale: ptBR })}
                        {isSameDay(date, new Date()) && " (Hoje)"}
                      </h3>
                      <div className="space-y-2">
                        {eventsOnDay.length ? (
                          eventsOnDay.map(event => (
                            <EventCard 
                              key={event.id} 
                              event={event} 
                              isSelected={selectedEvent?.id === event.id} 
                              onClick={() => selectEvent(event)} 
                            />
                          ))
                        ) : (
                          <div className="h-12 flex items-center px-5 rounded-xl border border-white/5 bg-white/[0.01] text-[10px] font-bold uppercase tracking-widest text-slate-700 italic">
                            Vazio
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-5 self-start sticky top-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-md font-bold text-white tracking-tight">{selectedEvent ? "Editar evento" : "Novo evento"}</h2>
            <Button className="h-9 px-4 text-[10px]" disabled={isBusy} onClick={startCreate} type="button" variant="outline">Limpar</Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Título" required>
              <input className={fieldClass} disabled={isBusy} required value={formState.title} onChange={(event) => setFormState({ ...formState, title: event.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Início" required>
                <input className={fieldClass} disabled={isBusy} required type="datetime-local" value={formState.starts_at} onChange={(event) => setFormState({ ...formState, starts_at: event.target.value })} />
              </Field>
              <Field label="Fim" required>
                <input className={fieldClass} disabled={isBusy} required type="datetime-local" value={formState.ends_at} onChange={(event) => setFormState({ ...formState, ends_at: event.target.value })} />
              </Field>
            </div>
            <Field label="Status">
              <div className="relative">
                <select className={cn(fieldClass, "appearance-none")} disabled={isBusy} value={formState.status} onChange={(event) => setFormState({ ...formState, status: event.target.value as CalendarEventStatus })}>
                  <option value="scheduled">Agendado</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              </div>
            </Field>
            <Field label="Local">
              <input className={fieldClass} disabled={isBusy} value={formState.location} onChange={(event) => setFormState({ ...formState, location: event.target.value })} />
            </Field>
            <Field label="Descrição">
              <textarea className={`${fieldClass} min-h-24 resize-y py-3`} disabled={isBusy} value={formState.description} onChange={(event) => setFormState({ ...formState, description: event.target.value })} />
            </Field>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tutor">
                <div className="flex gap-2">
                  <input 
                    className={cn(fieldClass, "bg-white/5 cursor-default truncate text-[11px]")} 
                    disabled 
                    value={tutors.find(t => t.id === formState.tutor_id)?.name || "Selecione..."} 
                  />
                  <Dialog open={isTutorModalOpen} onOpenChange={(open) => { setIsTutorModalOpen(open); setSearchQuery(""); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-11 w-11 p-0 shrink-0" type="button"><Search className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-[#16161a] border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-white">Selecionar Tutor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input 
                            className={cn(fieldClass, "pl-10 h-12 bg-black/40 border-white/5 focus:border-cyan-400/50")} 
                            placeholder="Pesquisar tutor..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                          {filteredTutors.map(t => (
                            <button
                              key={t.id}
                              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 text-left transition"
                              onClick={() => {
                                updateTutor(t.id);
                                setIsTutorModalOpen(false);
                                setSearchQuery("");
                              }}
                            >
                              <div className="h-8 w-8 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-bold text-slate-200">{t.name}</span>
                            </button>
                          ))}
                          {!filteredTutors.length && !isSearching && <p className="text-center py-8 text-sm text-slate-600">Nenhum tutor encontrado.</p>}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </Field>

              <Field label="Animal">
                <div className="flex gap-2">
                  <input 
                    className={cn(fieldClass, "bg-white/5 cursor-default truncate text-[11px]")} 
                    disabled 
                    value={animals.find(a => a.id === formState.animal_id)?.name || "Selecione..."} 
                  />
                  <Dialog open={isAnimalModalOpen} onOpenChange={(open) => { setIsAnimalModalOpen(open); setSearchQuery(""); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-11 w-11 p-0 shrink-0" type="button"><Search className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-[#16161a] border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-white">Selecionar Animal</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input 
                            className={cn(fieldClass, "pl-10 h-12 bg-black/40 border-white/5 focus:border-cyan-400/50")} 
                            placeholder="Pesquisar animal..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                          {filteredAnimals.map(a => (
                            <button
                              key={a.id}
                              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 text-left transition"
                              onClick={() => {
                                updateAnimal(a.id);
                                setIsAnimalModalOpen(false);
                                setSearchQuery("");
                              }}
                            >
                              <div className="h-8 w-8 rounded-full bg-pink-400/10 flex items-center justify-center text-pink-400">
                                <Dog className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-bold text-slate-200">{a.name} <span className="text-[10px] font-medium opacity-50 uppercase ml-1">({a.species})</span></span>
                            </button>
                          ))}
                          {!filteredAnimals.length && !isSearching && <p className="text-center py-8 text-sm text-slate-600">Nenhum animal encontrado.</p>}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </Field>
            </div>

            <Field label="Interesse">
              <div className="flex gap-2">
                <input 
                  className={cn(fieldClass, "bg-white/5 cursor-default truncate text-[11px]")} 
                  disabled 
                  value={(() => {
                    const i = interests.find(i => i.id === formState.interest_id);
                    if (!i) return "Vincular a um interesse...";
                    const t = tutors.find(t => t.id === i.tutor_id);
                    const a = animals.find(a => a.id === i.animal_id);
                    return `${t?.name || "?"} + ${a?.name || "?"}`;
                  })()} 
                />
                <Dialog open={isInterestModalOpen} onOpenChange={(open) => { setIsInterestModalOpen(open); setSearchQuery(""); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-11 w-11 p-0 shrink-0" type="button"><Search className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-[#16161a] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-white">Selecionar Interesse</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input 
                          className={cn(fieldClass, "pl-10 h-12 bg-black/40 border-white/5 focus:border-cyan-400/50")} 
                          placeholder="Pesquisar por tutor ou animal..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                        {filteredInterests.map(i => {
                           const tutorName = i.tutor_name || i.tutorName;
                           const animalName = i.animal_name || i.animalName;
                           return (
                          <button
                            key={i.id}
                            className="w-full grid grid-cols-2 gap-4 p-4 rounded-xl hover:bg-white/5 text-left transition border border-transparent hover:border-white/5"
                            onClick={() => {
                              setFormState({ 
                                ...formState, 
                                interest_id: i.id,
                                tutor_id: i.tutor_id,
                                animal_id: i.animal_id
                              });
                              setIsInterestModalOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-cyan-200" />
                              <span className="text-xs font-bold text-slate-200 truncate">{tutorName || "Tutor desconhecido"}</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                              <Dog className="h-3 w-3 text-pink-400" />
                              <span className="text-xs font-bold text-slate-200 truncate">{animalName || "Animal desconhecido"}</span>
                            </div>
                          </button>
                        );})}
                        {!filteredInterests.length && !isSearching && <p className="text-center py-8 text-sm text-slate-600">Nenhum interesse encontrado.</p>}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Field>

            <Field label="Link de Reunião / URL">
              <input className={fieldClass} placeholder="https://..." disabled={isBusy} value={formState.external_event_url} onChange={(event) => setFormState({ ...formState, external_event_url: event.target.value })} />
            </Field>
            <div className="flex gap-2 pt-4 border-t border-white/5">
              <Button className="flex-1 shadow-lg shadow-cyan-400/10" disabled={isBusy} type="submit">{selectedEvent ? "Salvar Alterações" : "Criar Evento"}</Button>
              {selectedEvent && (
                 <Button className="w-12 h-11 p-0 shrink-0" disabled={isBusy} onClick={handleDelete} type="button" variant="danger">
                    <Trash2 className="h-4 w-4" />
                 </Button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </div>
  );

  if (!standalone) return content;

  return (
    <main className="min-h-screen bg-[#0e0e12] px-5 py-6 text-white sm:px-8">
      {content}
    </main>
  );
}

function EventCard({ event, isSelected, onClick }: { event: CalendarEventRecord, isSelected: boolean, onClick: () => void }) {
  return (
    <button
      className={cn(
        "group relative grid w-full gap-4 rounded-xl border p-4 text-left transition-all duration-200 md:grid-cols-[140px_1fr_auto]",
        isSelected ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      )}
      onClick={onClick}
      type="button"
    >
      {isSelected && <div className="absolute left-0 top-0 h-full w-1 bg-cyan-400" />}
      <div className="flex flex-col justify-center border-r border-white/5 pr-2">
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Horário</span>
         <span className={cn("text-xs font-bold tracking-tighter", isSelected ? "text-cyan-200" : "text-slate-300")}>{formatTimeRange(event)}</span>
      </div>
      <div className="min-w-0">
        <span className={cn("block font-bold text-sm tracking-tight truncate", isSelected ? "text-white" : "text-slate-200 group-hover:text-white")}>{event.title}</span>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{eventSubtitle(event)}</span>
      </div>
      <div className="flex items-center justify-end">
        <Badge className={cn(
          "bg-transparent border border-white/10 font-black uppercase tracking-widest text-[9px]",
          event.status === "scheduled" && "text-amber-400 border-amber-400/20",
          event.status === "completed" && "text-cyan-400 border-cyan-400/20",
          event.status === "cancelled" && "text-slate-500 border-slate-500/20"
        )}>
          {statusLabel(event.status)}
        </Badge>
      </div>
    </button>
  );
}

function Field({ children, label, required = false }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
        {required && <span className="text-cyan-400 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

function recordToFormState(event: CalendarEventRecord): FormState {
  return {
    title: event.title ?? "",
    description: event.description ?? "",
    location: event.location ?? "",
    starts_at: toDatetimeLocalValue(event.starts_at),
    ends_at: toDatetimeLocalValue(event.ends_at),
    status: event.status,
    tutor_id: event.tutor_id ?? "",
    animal_id: event.animal_id ?? "",
    interest_id: event.interest_id ?? "",
    provider: event.provider ?? "",
    external_event_id: event.external_event_id ?? "",
    external_event_url: event.external_event_url ?? "",
  };
}

function formStateToPayload(state: FormState): CalendarEventInput {
  return {
    title: state.title,
    description: emptyToNull(state.description),
    location: emptyToNull(state.location),
    starts_at: new Date(state.starts_at).toISOString(),
    ends_at: new Date(state.ends_at).toISOString(),
    status: state.status,
    tutor_id: emptyToNull(state.tutor_id),
    animal_id: emptyToNull(state.animal_id),
    interest_id: emptyToNull(state.interest_id),
    provider: state.provider || null,
    external_event_id: emptyToNull(state.external_event_id),
    external_event_url: emptyToNull(state.external_event_url),
    metadata: {},
  };
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function groupEventsByDate(events: CalendarEventRecord[]) {
  const groups = new Map<string, CalendarEventRecord[]>();
  events.forEach((event) => {
    const key = new Date(event.starts_at).toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });

  return Array.from(groups.entries()).map(([dateKey, groupEvents]) => ({
    dateKey,
    label: new Date(`${dateKey}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
    events: groupEvents,
  }));
}

function formatTimeRange(event: CalendarEventRecord) {
  const start = new Date(event.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const end = new Date(event.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${start} - ${end}`;
}

function eventSubtitle(event: CalendarEventRecord) {
  return [event.animal_name, event.tutor_name, event.location].filter(Boolean).join(" · ") || "Sem vínculo definido";
}

function statusLabel(status: "all" | CalendarEventStatus) {
  const labels = {
    all: "Todos",
    scheduled: "Agendado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };

  return labels[status];
}

function toDatetimeLocalValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function findNextFreeTutorDay(events: CalendarEventRecord[], tutorId: string) {
  const occupiedDays = new Set(events
    .filter((event) => event.tutor_id === tutorId && event.status === "scheduled")
    .map((event) => formatLocalDayKey(new Date(event.starts_at))));

  for (let offset = 1; offset <= 45; offset += 1) {
    const start = new Date();
    start.setDate(start.getDate() + offset);
    start.setHours(9, 0, 0, 0);

    if (occupiedDays.has(formatLocalDayKey(start))) continue;

    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    return { start, end };
  }

  const fallbackStart = new Date();
  fallbackStart.setDate(fallbackStart.getDate() + 1);
  fallbackStart.setHours(9, 0, 0, 0);
  const fallbackEnd = new Date(fallbackStart);
  fallbackEnd.setHours(10, 0, 0, 0);
  return { start: fallbackStart, end: fallbackEnd };
}

function formatLocalDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
