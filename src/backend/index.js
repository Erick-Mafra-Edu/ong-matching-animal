const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ATENCAO AQUI: Em vez de usar app.listen(), voce deve exportar o app
// Para testar localmente, voce pode usar uma condicional:
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
}

// Exporta o app para a Vercel transformar em Serverless Function
module.exports = app;
