import { config } from "dotenv";
import path from "path";
import { createApp } from "./app";

config({ path: path.resolve(__dirname, "../../../.env.local") });

const app = createApp();

if (process.env.NODE_ENV !== "production" && require.main === module) {
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  app.listen(port, () => {
    console.log(`Servidor Backend rodando na porta ${port}`);
    console.log(`http://localhost:${port}/api/health`);
  });
}

export default app;
