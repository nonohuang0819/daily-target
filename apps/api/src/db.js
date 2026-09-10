import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "daily_target",
  password: process.env.DB_PASSWORD || "daily_target_dev",
  database: process.env.DB_NAME || "daily_target",
  charset: "utf8mb4",
  timezone: "Z",
  connectionLimit: 10,
  waitForConnections: true
});

export async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS issues (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description MEDIUMTEXT NOT NULL,
    status ENUM('todo', 'in-progress', 'done') NOT NULL DEFAULT 'todo',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    assignee VARCHAR(255) NOT NULL DEFAULT '我',
    updated_at DATETIME(3) NOT NULL,
    INDEX issues_updated_at (updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=101`);
}

export function serializeIssue(row) {
  return {
    id: `ISSUE-${row.id}`, title: row.title, description: row.description,
    status: row.status, priority: row.priority, assignee: row.assignee,
    updatedAt: row.updated_at.toISOString()
  };
}
