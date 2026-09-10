const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "無法連線至任務服務");
  }
  return response.json();
}

export const issuesApi = {
  list: () => request("/issues"),
  create: (issue) => request("/issues", { method: "POST", body: JSON.stringify(issue) }),
  update: (id, changes) => request(`/issues/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(changes)
  })
};
