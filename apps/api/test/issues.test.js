import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { pool, initializeDatabase } from "../src/db.js";

test("MySQL API integration", async () => {
  const ids = [];
  let server;
  try {
    await initializeDatabase();
    server = app.listen(0);
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, method = "GET", body) => fetch(base + path, {
      method, headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    assert.equal((await request("/health")).status, 200);
    const created = await Promise.all(Array.from({ length: 5 }, async () => {
      const response = await request("/issues", "POST", { title: "測試 ' 中文 🚀" });
      assert.equal(response.status, 201);
      const issue = await response.json();
      ids.push(Number(issue.id.slice(6)));
      return issue;
    }));
    assert.equal(new Set(ids).size, 5);
    const issue = created[0];
    const updated = await request(`/issues/${issue.id}`, "PATCH", { status: "done" });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).status, "done");
    const [rows] = await pool.execute("SELECT status, title FROM issues WHERE id = ?", [ids[0]]);
    assert.equal(rows[0].status, "done");
    assert.equal(rows[0].title, "測試 ' 中文 🚀");
    const listed = await (await request("/issues")).json();
    assert.equal(listed.find(row => row.id === issue.id).status, "done");
    for (const body of [{ title: 1 }, { title: " " }, { title: "test", priority: "wrong" }, { title: "test", assignee: null }]) {
      assert.equal((await request("/issues", "POST", body)).status, 400);
    }
    assert.equal((await request(`/issues/${issue.id}`, "PATCH", { status: "wrong" })).status, 400);
    assert.equal((await request("/issues/invalid", "PATCH", { status: "done" })).status, 404);
    assert.equal((await request("/issues/ISSUE-4294967295", "PATCH", { status: "done" })).status, 404);
  } finally {
    if (ids.length) await pool.query("DELETE FROM issues WHERE id IN (?)", [ids]);
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
