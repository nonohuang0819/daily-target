"use client";

import { useEffect, useState, useTransition } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const columns = [
  { key: "todo", label: "待辦事項", hint: "準備開始的任務" },
  { key: "in-progress", label: "進行中", hint: "目前專注處理中" },
  { key: "done", label: "完成", hint: "已交付或已收尾" }
];

const priorityTone = {
  high: "高",
  medium: "中",
  low: "低"
};

const emptyIssue = {
  title: "",
  description: "",
  priority: "medium",
  assignee: "我"
};

export default function HomePage() {
  const [issues, setIssues] = useState([]);
  const [form, setForm] = useState(emptyIssue);
  const [draggingId, setDraggingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/issues`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("無法讀取任務列表");
      }

      const data = await response.json();
      setIssues(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function createIssue(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error("建立任務失敗");
      }

      const issue = await response.json();
      setIssues((current) => [issue, ...current]);
      setForm(emptyIssue);
    } catch (createError) {
      setError(createError.message);
    }
  }

  function issuesByStatus(status) {
    return issues.filter((issue) => issue.status === status);
  }

  function handleDrop(nextStatus) {
    if (!draggingId) {
      return;
    }

    const currentIssue = issues.find((issue) => issue.id === draggingId);

    if (!currentIssue || currentIssue.status === nextStatus) {
      setDraggingId(null);
      return;
    }

    const previousIssues = issues;
    const updatedIssues = issues.map((issue) =>
      issue.id === draggingId ? { ...issue, status: nextStatus } : issue
    );

    setIssues(updatedIssues);
    setDraggingId(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/issues/${draggingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status: nextStatus })
        });

        if (!response.ok) {
          throw new Error("更新任務狀態失敗");
        }

        const updatedIssue = await response.json();
        setIssues((current) =>
          current.map((issue) => (issue.id === updatedIssue.id ? updatedIssue : issue))
        );
      } catch (updateError) {
        setIssues(previousIssues);
        setError(updateError.message);
      }
    });
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Daily Target</p>
          <h1>像 JIRA 一樣管理你每天要推進的事情</h1>
          <p className="hero-copy">
            把想做的事丟進待辦，開始處理就拖到進行中，做完再丟到完成。前端與後端分離，之後要接資料庫或登入也很自然。
          </p>
        </div>
        <button className="ghost-button" onClick={loadIssues} disabled={loading || isPending}>
          {loading ? "讀取中..." : "重新整理"}
        </button>
      </section>

      <section className="composer-card">
        <div className="composer-header">
          <div>
            <p className="section-label">建立新任務</p>
            <h2>快速新增一張 issue</h2>
          </div>
          <span className="status-pill">{isPending ? "同步中" : "已連線"}</span>
        </div>

        <form className="composer-form" onSubmit={createIssue}>
          <input
            className="text-input title-input"
            placeholder="例如：整理專案提案、寫完報告第一版"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
          />
          <textarea
            className="text-input"
            placeholder="補充描述、下一步、提醒事項..."
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <div className="form-row">
            <label>
              優先度
              <select
                className="text-input"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priority: event.target.value }))
                }
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>
            <label>
              負責人
              <input
                className="text-input"
                value={form.assignee}
                onChange={(event) =>
                  setForm((current) => ({ ...current, assignee: event.target.value }))
                }
              />
            </label>
            <button className="primary-button" type="submit">
              新增 Issue
            </button>
          </div>
        </form>

        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      <section className="board-grid">
        {columns.map((column) => {
          const columnIssues = issuesByStatus(column.key);

          return (
            <div
              key={column.key}
              className="board-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(column.key)}
            >
              <div className="column-header">
                <div>
                  <h3>{column.label}</h3>
                  <p>{column.hint}</p>
                </div>
                <span>{columnIssues.length}</span>
              </div>

              <div className="column-body">
                {loading ? <p className="placeholder-card">載入任務中...</p> : null}
                {!loading && columnIssues.length === 0 ? (
                  <p className="placeholder-card">把任務拖進這裡。</p>
                ) : null}

                {columnIssues.map((issue) => (
                  <article
                    key={issue.id}
                    className="issue-card"
                    draggable
                    onDragStart={() => setDraggingId(issue.id)}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <div className="issue-meta">
                      <span>{issue.id}</span>
                      <span>優先度 {priorityTone[issue.priority] || "中"}</span>
                    </div>
                    <h4>{issue.title}</h4>
                    <p>{issue.description || "沒有補充描述。"}</p>
                    <div className="issue-footer">
                      <span>{issue.assignee}</span>
                      <span>{new Date(issue.updatedAt).toLocaleDateString("zh-TW")}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
