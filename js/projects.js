// projects.js

export const API_URL = 'https://script.google.com/macros/s/AKfycbzZ6lR1XKvsYj0A6oSK3Z5CQvJkEYYR-eGllQ5sQThOI2QhuzUPt_bOhbFBX_XjyT0R/exec';
export const TOKEN   = 'Project1285';

// ==== Fetch all projects from backend ====
export async function fetchProjects() {
  const res = await fetch(`${API_URL}?token=${TOKEN}`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((p, i) => ({ ...p, _row: i + 2 }));
}

// ==== Add a new project ====
export async function addProject(name, priority, status) {
  const query = new URLSearchParams({
    token: TOKEN,
    Name: name,
    Priority: priority,
    Status: status
  }).toString();

  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`Add failed: ${res.status} ${res.statusText}`);
}

// ==== Update an existing project ====
export async function updateProject(row, name, priority, status) {
  const query = new URLSearchParams({
    token: TOKEN,
    update: "1",
    row: String(row),
    Name: name,
    Priority: priority,
    Status: status
  }).toString();

  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`Update failed: ${res.status} ${res.statusText}`);
}

// ==== Delete a project ====
export async function deleteProject(row) {
  const query = new URLSearchParams({ token: TOKEN, delete: "1", row: String(row) }).toString();
  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`Delete failed: ${res.status} ${res.statusText}`);
}

// ==== Clear all projects ====
export async function clearAllProjects() {
  const query = new URLSearchParams({ token: TOKEN, clearAll: '1' }).toString();
  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`Clear failed: ${res.status} ${res.statusText}`);
}

// ==== Parse subtasks safely ====
export function parseSubtasks(raw) {
  try {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    const val = JSON.parse(raw);
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

// ==== Save subtasks for a given row ====
export async function saveSubtasks(row, subtasksArray) {
  const query = new URLSearchParams({
    token: TOKEN,
    updateSubtasks: "1",
    row: String(row),
    subtasks: JSON.stringify(subtasksArray)
  }).toString();

  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`Save subtasks failed: ${res.status} ${res.statusText}`);
}


