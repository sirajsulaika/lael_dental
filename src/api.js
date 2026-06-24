const BASE = "/api";

async function req(url, opts) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getSchools: () => req("/schools"),
  addSchool: (data) => req("/schools", { method: "POST", body: JSON.stringify(data) }),
  deleteSchool: (id) => req(`/schools/${id}`, { method: "DELETE" }),
  updateSchool: (id, data) => req(`/schools/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  getStudents: () => req("/students"),
  addStudent: (data) => req("/students", { method: "POST", body: JSON.stringify(data) }),
  deleteStudent: (id) => req(`/students/${id}`, { method: "DELETE" }),
  updateStudent: (id, data) => req(`/students/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  getScreenings: () => req("/screenings"),
  addScreening: (data) => req("/screenings", { method: "POST", body: JSON.stringify(data) }),
  deleteScreening: (id) => req(`/screenings/${id}`, { method: "DELETE" }),
  updateScreening: (id, data) => req(`/screenings/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  getDbStatus: () => req("/db-status"),
};
