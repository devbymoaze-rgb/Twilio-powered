import { connectDatabase, disconnectDatabase } from "../config/db";
import { seedDemoWorkspace } from "../services/seedDemo";

async function main() {
  await connectDatabase();
  await seedDemoWorkspace();
  await disconnectDatabase();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
