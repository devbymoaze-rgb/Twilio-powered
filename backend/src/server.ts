import { createApp } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { startScheduler } from "./jobs/scheduler";
import { seedDemoWorkspace } from "./services/seedDemo";

async function main() {
  await connectDatabase();
  await seedDemoWorkspace();
  const app = createApp();
  startScheduler();
  const server = app.listen(env.port, "0.0.0.0", () => {
    console.log(`TextPulse API listening on ${env.port}`);
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${env.port} is already in use. Stop the other process or change PORT in backend/.env.`);
      process.exit(1);
    }
    throw error;
  });
}

main().catch((error) => {
  console.error("Failed to start TextPulse API", error);
  process.exit(1);
});
