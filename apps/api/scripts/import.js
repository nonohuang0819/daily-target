import { readFile } from "node:fs/promises";
import { pool, initializeDatabase } from "../src/db.js";
import { seedIssues } from "../src/seed.js";

let connection;
try {
  await initializeDatabase();
  let issues;
  try {
    issues = JSON.parse(await readFile(new URL("../data/issues.json", import.meta.url), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    issues = seedIssues;
  }
  if (!Array.isArray(issues)) throw new Error("Expected an array of issues");
  connection = await pool.getConnection();
  await connection.beginTransaction();
  for (const issue of issues) {
    if (!/^ISSUE-[1-9]\d*$/.test(issue.id)) throw new Error(`Invalid issue ID: ${issue.id}`);
    await connection.execute(
      `INSERT INTO issues (id, title, description, status, priority, assignee, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = issues.id`,
      [Number(issue.id.slice(6)), issue.title, issue.description, issue.status,
        issue.priority, issue.assignee, new Date(issue.updatedAt)]
    );
  }
  await connection.commit();
  console.log(`Import complete (${issues.length} source issues); existing IDs preserved.`);
} catch (error) {
  if (connection) await connection.rollback();
  console.error("Import failed:", error.message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool.end();
}
