// projects.js

export const API_URL = 'https://script.google.com/macros/s/AKfycbzZ6lR1XKvsYj0A6oSK3Z5CQvJkEYYR-eGllQ5sQThOI2QhuzUPt_bOhbFBX_XjyT0R/exec';
export const TOKEN   = 'Project1285';

// Fetch all projects from the backend
export async function fetchProjects() {
  const res = await fetch(`${API_URL}?token=${TOKEN}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((p, i) => ({ ...p, _row: i + 2 }));
}

// Add a new project
export async function addProject(name, priority, status) {
  const query = new URLSearchParams({
    token: TOKEN,
    Name: name,
    Priority: priority,
    Status: status
  }).toString();

  return fetch(`${API_URL}?${query}`);
}

// Update an existing project
export async function updateProject(row, name, priority, status) {
  const query = new URLSearchParams({
    token: TOKEN,
    updateRow: row,
    Name: name,
    Priority: priority,
    Status: status
  }).toString();

  return fetch(`${API_URL}?${query}`);
}

// Delete a project
export async function deleteProject(row) {
  const query = new URLSearchParams({ token: TOKEN, deleteRow: row }).toString();
  return fetch(`${API_URL}?${query}`);
}

// Clear all projects
export async function clearAllProjects() {
  const query = new URLSearchParams({ token: TOKEN, clearAll: '1' }).toString();
  return fetch(`${API_URL}?${query}`);
}

// Parse subtasks safely
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

// Save subtasks for a given row
export async function saveSubtasks(row, subtasksArray) {
  const query = new URLSearchParams({
    token: TOKEN,
    row: String(row),
    updateSubtasks: JSON.stringify(subtasksArray)
  }).toString();

  return fetch(`${API_URL}?${query}`);
}

