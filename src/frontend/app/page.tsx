export default function Home() {
  return (
    <main>
      <h1>ONG Matching Animal</h1>
      <p>Sistema de matchmaking dinâmico de animais para adoção</p>
      <section style={{ marginTop: "2rem" }}>
        <h2>Status do Backend</h2>
        <HealthCheck />
      </section>
    </main>
  );
}

function HealthCheck() {
  return (
    <div style={{ marginTop: "1rem" }}>
      <p>Verificando conexão com servidor...</p>
    </div>
  );
}
