function DiscoverLoadingSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-r bg-white/[0.03] md:max-w-[430px] md:rounded">
      <div className="h-[58vh] min-h-[420px] animate-pulse bg-[linear-gradient(120deg,rgba(255,255,255,0.04),rgba(255,255,255,0.09),rgba(255,255,255,0.04))] bg-[length:200%_100%] md:h-[72vh] md:min-h-[560px]" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen overflow-hidden bg-surface-bg text-surface-text" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] px-0 md:grid-cols-[minmax(360px,430px)_1fr] md:items-center md:gap-16 md:px-10 lg:gap-24 lg:px-16">
        <DiscoverLoadingSkeleton />
        <section className="hidden max-w-[620px] space-y-6 md:block">
          <div className="h-8 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-16 w-64 animate-pulse rounded bg-white/10" />
          <div className="flex flex-wrap gap-3">
            <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="flex gap-4 pt-6">
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
            <div className="h-11 w-36 animate-pulse rounded-full bg-white/10" />
            <div className="h-11 w-36 animate-pulse rounded-full bg-white/10" />
          </div>
        </section>
      </div>
    </main>
  );
}
