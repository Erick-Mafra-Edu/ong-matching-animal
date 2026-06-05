"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, isSameMonth, startOfMonth, endOfMonth, endOfWeek, setHours, setMinutes, setSeconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, List, CalendarDays, Search, User, Dog } from "lucide-react";
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

export function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRecord | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [statusFilter, setStatusFilter] = useState<"all" | CalendarEventStatus>("all");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "denied">("loading");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<string>("list");
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

  async function loadEvents() {
    try {
      setEvents(await listCalendarEvents());
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Nao foi possivel carregar o calendario.";
      if (msg.includes("Sessao ausente")) {
        router.push("/login?redirect=/calendario");
        return;
      }
      setMessage(msg);
    }
  }

  async function loadSelectionData() {
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
      console.error("Erro ao carregar dados de selecao:", error);
    }
  }

  useEffect(() => {
    let mounted = true;

    getAdminMe()
      .then(() => Promise.all([loadEvents(), loadSelectionData()]))
      .then(() => {
        if (mounted) setStatus("ready");
      })
      .catch((error) => {
        if (!mounted) return;
        const errorMessage = error instanceof Error ? error.message : "";

        if (errorMessage.includes("Sessao ausente")) {
          router.push("/login?redirect=/calendario");
          return;
        }

        if (errorMessage.includes("administrativo")) {
          setStatus("denied");
        } else {
          setMessage(errorMessage || "Nao foi possivel carregar o calendario.");
          setStatus("ready");
        }
      });

    return () => {
      mounted = false;
    };
  }, [router]);

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
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o evento.");
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
      setMessage(error instanceof Error ? error.message : "Nao foi possivel remover o evento.");
    } finally {
      setStatus("ready");
    }
  }

  if (status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0e0e12] p-5 text-white">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Acesso negado</h1>
          <p className="text-slate-400">Voce nao tem permissao para acessar o calendario administrativo.</p>
          <Link className="inline-block text-cyan-200 hover:underline" href="/discover">Voltar para a home</Link>
        </div>
      </main>
    );
  }

  const filteredTutors = tutors;
  const filteredAnimals = animals;
  const filteredInterests = interests;

  return (
    <main className="min-h-screen bg-[#0e0e12] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="text-sm font-semibold text-cyan-200 hover:text-cyan-100" href="/admin">Voltar ao admin</Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Calendario</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Agenda de visitas, conversas com tutores e retornos do processo de adocao.</p>
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

        {message && <p className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{message}</p>}

        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <section className="flex flex-col gap-4 rounded-md border border-white/10 bg-black/20 p-4 min-h-[600px]">
            <Tabs defaultValue="list" className="w-full" onValueChange={setView}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    Lista
                  </TabsTrigger>
                  <TabsTrigger value="month" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Mês
                  </TabsTrigger>
                  <TabsTrigger value="week" className="gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Semana
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="list" className="mt-0">
                {status === "loading" ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((item) => <div className="h-24 animate-pulse rounded-md bg-white/10" key={item} />)}
                  </div>
                ) : groupedEvents.length ? (
                  <div className="space-y-5">
                    {groupedEvents.map((group) => (
                      <div key={group.dateKey}>
                        <h2 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{group.label}</h2>
                        <div className="space-y-2">
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
                  <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">Nenhum evento encontrado.</div>
                )}
              </TabsContent>

              <TabsContent value="month" className="mt-0">
                <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                  <div className="rounded-md border border-white/10 bg-white/[0.02] p-2">
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
                        hasEvent: "after:content-[''] after:block after:w-1 after:h-1 after:bg-cyan-200 after:rounded-full after:mx-auto after:mt-1"
                      }}
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400">
                      {selectedDate ? format(selectedDate, "eeee, dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                    </h3>
                    <div className="space-y-2">
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
                        <p className="text-sm text-slate-500">Sem compromissos para este dia.</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="week" className="mt-0">
                <div className="space-y-6">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), i);
                    const eventsOnDay = filteredEvents.filter(e => isSameDay(new Date(e.starts_at), date));
                    
                    return (
                      <div key={i} className={cn("space-y-2", !isSameMonth(date, new Date()) && "opacity-50")}>
                        <h3 className={cn(
                          "text-xs font-black uppercase tracking-[0.18em]",
                          isSameDay(date, new Date()) ? "text-cyan-200" : "text-slate-500"
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
                            <div className="h-10 flex items-center px-4 rounded-md border border-white/5 bg-white/[0.01] text-xs text-slate-600 italic">
                              Sem eventos
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

          <aside className="rounded-md border border-white/10 bg-black/20 p-4 self-start sticky top-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{selectedEvent ? "Editar evento" : "Novo evento"}</h2>
              <Button className="min-h-10 px-3" disabled={isBusy} onClick={startCreate} type="button" variant="outline">Novo</Button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <Field label="Titulo" required>
                <input className={fieldClass} disabled={isBusy} required value={formState.title} onChange={(event) => setFormState({ ...formState, title: event.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Inicio" required>
                  <input className={fieldClass} disabled={isBusy} required type="datetime-local" value={formState.starts_at} onChange={(event) => setFormState({ ...formState, starts_at: event.target.value })} />
                </Field>
                <Field label="Fim" required>
                  <input className={fieldClass} disabled={isBusy} required type="datetime-local" value={formState.ends_at} onChange={(event) => setFormState({ ...formState, ends_at: event.target.value })} />
                </Field>
              </div>
              <Field label="Status">
                <select className={fieldClass} disabled={isBusy} value={formState.status} onChange={(event) => setFormState({ ...formState, status: event.target.value as CalendarEventStatus })}>
                  <option value="scheduled">Agendado</option>
                  <option value="completed">Concluido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </Field>
              <Field label="Local">
                <input className={fieldClass} disabled={isBusy} value={formState.location} onChange={(event) => setFormState({ ...formState, location: event.target.value })} />
              </Field>
              <Field label="Descricao">
                <textarea className={`${fieldClass} min-h-24 resize-y py-3`} disabled={isBusy} value={formState.description} onChange={(event) => setFormState({ ...formState, description: event.target.value })} />
              </Field>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tutor">
                  <div className="flex gap-2">
                    <input 
                      className={cn(fieldClass, "bg-white/5 cursor-default")} 
                      disabled 
                      value={tutors.find(t => t.id === formState.tutor_id)?.name || "Nenhum tutor selecionado"} 
                    />
                    <Dialog open={isTutorModalOpen} onOpenChange={(open) => { setIsTutorModalOpen(open); setSearchQuery(""); }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="px-3" type="button"><Search className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Selecionar Tutor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input 
                              className={cn(fieldClass, "pl-10")} 
                              placeholder="Pesquisar tutor..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-cyan-200 border-t-transparent rounded-full animate-spin" />}
                          </div>
                          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
                            {filteredTutors.map(t => (
                              <button
                                key={t.id}
                                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 text-left transition"
                                onClick={() => {
                                  updateTutor(t.id);
                                  setIsTutorModalOpen(false);
                                  setSearchQuery("");
                                }}
                              >
                                <User className="h-4 w-4 text-cyan-200" />
                                <span className="text-sm text-white">{t.name}</span>
                              </button>
                            ))}
                            {!filteredTutors.length && !isSearching && <p className="text-center py-4 text-sm text-slate-500">Nenhum tutor encontrado.</p>}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Field>

                <Field label="Animal">
                  <div className="flex gap-2">
                    <input 
                      className={cn(fieldClass, "bg-white/5 cursor-default")} 
                      disabled 
                      value={animals.find(a => a.id === formState.animal_id)?.name || "Nenhum animal selecionado"} 
                    />
                    <Dialog open={isAnimalModalOpen} onOpenChange={(open) => { setIsAnimalModalOpen(open); setSearchQuery(""); }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="px-3" type="button"><Search className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Selecionar Animal</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input 
                              className={cn(fieldClass, "pl-10")} 
                              placeholder="Pesquisar animal..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-cyan-200 border-t-transparent rounded-full animate-spin" />}
                          </div>
                          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
                            {filteredAnimals.map(a => (
                              <button
                                key={a.id}
                                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 text-left transition"
                                onClick={() => {
                                  updateAnimal(a.id);
                                  setIsAnimalModalOpen(false);
                                  setSearchQuery("");
                                }}
                              >
                                <Dog className="h-4 w-4 text-pink-400" />
                                <span className="text-sm text-white">{a.name} ({a.species})</span>
                              </button>
                            ))}
                            {!filteredAnimals.length && !isSearching && <p className="text-center py-4 text-sm text-slate-500">Nenhum animal encontrado.</p>}
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
                    className={cn(fieldClass, "bg-white/5 cursor-default")} 
                    disabled 
                    value={(() => {
                      const i = interests.find(i => i.id === formState.interest_id);
                      if (!i) return "Nenhum interesse selecionado";
                      const t = tutors.find(t => t.id === i.tutor_id);
                      const a = animals.find(a => a.id === i.animal_id);
                      return `${t?.name || "?"} + ${a?.name || "?"}`;
                    })()} 
                  />
                  <Dialog open={isInterestModalOpen} onOpenChange={(open) => { setIsInterestModalOpen(open); setSearchQuery(""); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="px-3" type="button"><Search className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Selecionar Interesse</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input 
                            className={cn(fieldClass, "pl-10")} 
                            placeholder="Pesquisar por tutor ou animal..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-cyan-200 border-t-transparent rounded-full animate-spin" />}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
                          {filteredInterests.map(i => {
                             const tutorName = i.tutor_name || i.tutorName;
                             const animalName = i.animal_name || i.animalName;
                             return (
                            <button
                              key={i.id}
                              className="w-full grid grid-cols-2 gap-4 p-3 rounded-md hover:bg-white/5 text-left transition"
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
                                <span className="text-sm text-white truncate">{tutorName || "Tutor desconhecido"}</span>
                              </div>
                              <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                                <Dog className="h-3 w-3 text-pink-400" />
                                <span className="text-sm text-white truncate">{animalName || "Animal desconhecido"}</span>
                              </div>
                            </button>
                          );})}
                          {!filteredInterests.length && !isSearching && <p className="text-center py-4 text-sm text-slate-500">Nenhum interesse encontrado.</p>}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </Field>

              <Field label="URL externa">
                <input className={fieldClass} disabled={isBusy} value={formState.external_event_url} onChange={(event) => setFormState({ ...formState, external_event_url: event.target.value })} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button disabled={isBusy} type="submit">{selectedEvent ? "Salvar" : "Criar"}</Button>
                {selectedEvent && <Button disabled={isBusy} onClick={handleDelete} type="button" variant="danger">Excluir</Button>}
              </div>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}

function EventCard({ event, isSelected, onClick }: { event: CalendarEventRecord, isSelected: boolean, onClick: () => void }) {
  return (
    <button
      className={cn(
        "grid w-full gap-3 rounded-md border p-4 text-left transition md:grid-cols-[120px_1fr_auto]",
        isSelected ? "border-cyan-200 bg-cyan-200/[0.08]" : "border-white/10 bg-white/[0.03] hover:border-white/25"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="text-sm font-semibold text-cyan-100">{formatTimeRange(event)}</span>
      <span>
        <span className="block font-semibold text-white">{event.title}</span>
        <span className="mt-1 block text-sm text-slate-400">{eventSubtitle(event)}</span>
      </span>
      <span className="flex items-start justify-end">
        <Badge>{statusLabel(event.status)}</Badge>
      </span>
    </button>
  );
}

function Field({ children, label, required = false }: { children: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-100">{label}{required && <span className="text-cyan-200"> *</span>}</span>
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
  return [event.animal_name, event.tutor_name, event.location].filter(Boolean).join(" · ") || "Sem vinculo definido";
}

function statusLabel(status: "all" | CalendarEventStatus) {
  const labels = {
    all: "Todos",
    scheduled: "Agendado",
    completed: "Concluido",
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
