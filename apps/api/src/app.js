import cors from "cors";
import express from "express";
import { pool, serializeIssue } from "./db.js";

export const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(express.json());
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

function validate(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "invalid body";
  if (!partial && !("title" in body)) return "title is required";
  for (const key of ["title", "description", "assignee"]) {
    if (key in body && (typeof body[key] !== "string" ||
      (key !== "description" && [...body[key].trim()].length > 255))) return `invalid ${key}`;
  }
  if ("title" in body && !body.title.trim()) return "title is required";
  if ("status" in body && !["todo", "in-progress", "done"].includes(body.status)) return "invalid status";
  if ("priority" in body && !["low", "medium", "high"].includes(body.priority)) return "invalid priority";
}

app.get("/health", route(async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res.status(503).json({ ok: false, database: "unavailable" });
  }
}));
app.get("/issues", route(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM issues ORDER BY updated_at DESC, id DESC");
  res.json(rows.map(serializeIssue));
}));
app.post("/issues", route(async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const { title, description = "", priority = "medium", assignee = "我" } = req.body;
  const [result] = await pool.execute(
    "INSERT INTO issues (title, description, priority, assignee, updated_at) VALUES (?, ?, ?, ?, ?)",
    [title.trim(), description.trim(), priority, assignee.trim() || "我", new Date()]
  );
  const [rows] = await pool.execute("SELECT * FROM issues WHERE id = ?", [result.insertId]);
  res.status(201).json(serializeIssue(rows[0]));
}));
app.patch("/issues/:id", route(async (req, res) => {
  if (!/^ISSUE-[1-9]\d*$/.test(req.params.id)) return res.status(404).json({ message: "issue not found" });
  const error = validate(req.body, true);
  if (error) return res.status(400).json({ message: error });
  const fields = [];
  const values = [];
  for (const key of ["title", "description", "priority", "assignee", "status"]) {
    if (key in req.body) {
      fields.push(`${key} = ?`);
      values.push(key === "assignee" ? req.body[key].trim() || "我" : req.body[key].trim());
    }
  }
  fields.push("updated_at = ?");
  values.push(new Date(), req.params.id.slice(6));
  const [result] = await pool.execute(`UPDATE issues SET ${fields.join(", ")} WHERE id = ?`, values);
  if (!result.affectedRows) return res.status(404).json({ message: "issue not found" });
  const [rows] = await pool.execute("SELECT * FROM issues WHERE id = ?", [req.params.id.slice(6)]);
  res.json(serializeIssue(rows[0]));
}));
app.use((error, _req, res, _next) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ message: "invalid JSON" });
  if (error.type === "entity.too.large") return res.status(413).json({ message: "request too large" });
  console.error("API request failed:", error.message);
  res.status(500).json({ message: "資料庫操作失敗，請稍後再試" });
});
