import cors from "cors";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "issues.json");

const STATUSES = ["todo", "in-progress", "done"];
const PORT = process.env.PORT || 4000;

const seedIssues = [
  {
    id: "ISSUE-101",
    title: "規劃這週最重要的任務",
    description: "把本週最有影響力的 3 件事拆成可執行步驟。",
    status: "todo",
    priority: "high",
    assignee: "我",
    updatedAt: new Date().toISOString()
  },
  {
    id: "ISSUE-102",
    title: "處理進行中的專案項目",
    description: "持續更新目前正在進行的工作，讓看板能反映真實狀態。",
    status: "in-progress",
    priority: "medium",
    assignee: "我",
    updatedAt: new Date().toISOString()
  },
  {
    id: "ISSUE-103",
    title: "回顧已完成事項",
    description: "整理完成內容，避免漏掉已交付的成果。",
    status: "done",
    priority: "low",
    assignee: "我",
    updatedAt: new Date().toISOString()
  }
];

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000"
  })
);
app.use(express.json());

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(seedIssues, null, 2));
  }
}

async function readIssues() {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");
  return JSON.parse(raw);
}

async function writeIssues(issues) {
  await fs.writeFile(dataFile, JSON.stringify(issues, null, 2));
}

function validateStatus(status) {
  return STATUSES.includes(status);
}

function nextIssueId(issues) {
  const maxId = issues.reduce((max, issue) => {
    const number = Number(issue.id.replace("ISSUE-", ""));
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 100);

  return `ISSUE-${maxId + 1}`;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/issues", async (_req, res) => {
  const issues = await readIssues();
  res.json(issues.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
});

app.post("/issues", async (req, res) => {
  const { title, description = "", priority = "medium", assignee = "我" } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ message: "title is required" });
  }

  const issues = await readIssues();
  const issue = {
    id: nextIssueId(issues),
    title: title.trim(),
    description: description.trim(),
    status: "todo",
    priority,
    assignee: assignee.trim() || "我",
    updatedAt: new Date().toISOString()
  };

  issues.unshift(issue);
  await writeIssues(issues);
  res.status(201).json(issue);
});

app.patch("/issues/:id", async (req, res) => {
  const { id } = req.params;
  const { status, title, description, priority, assignee } = req.body;

  if (status && !validateStatus(status)) {
    return res.status(400).json({ message: "invalid status" });
  }

  const issues = await readIssues();
  const index = issues.findIndex((issue) => issue.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "issue not found" });
  }

  const current = issues[index];
  issues[index] = {
    ...current,
    title: typeof title === "string" ? title.trim() || current.title : current.title,
    description: typeof description === "string" ? description.trim() : current.description,
    priority: typeof priority === "string" ? priority : current.priority,
    assignee: typeof assignee === "string" ? assignee.trim() || current.assignee : current.assignee,
    status: status || current.status,
    updatedAt: new Date().toISOString()
  };

  await writeIssues(issues);
  res.json(issues[index]);
});

ensureStore()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start API", error);
    process.exit(1);
  });
