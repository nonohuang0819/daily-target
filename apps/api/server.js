import { app } from "./src/app.js";
import { pool, initializeDatabase } from "./src/db.js";

try {
  await initializeDatabase();
  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close(async () => {
      await pool.end();
      process.exit(0);
    }));
  }
} catch (error) {
  console.error("Failed to start API. Check MySQL and apps/api/.env:", error.message);
  await pool.end();
  process.exitCode = 1;
}
