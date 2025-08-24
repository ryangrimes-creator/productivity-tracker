import {
  fetchProjects,
  addProject,
  updateProject,
  deleteProject,
  clearAllProjects,
  parseSubtasks,
  saveSubtasks,
} from './projects.js';

import {
  initUI,
  setProjects
} from './ui.js';

// ===== Config =====
const API_URL =
  "https://script.google.com/macros/s/AKfycbzZ6lR1XKvsYj0A6oSK3Z5CQvJkEYYR-eGllQ5sQThOI2QhuzUPt_bOhbFBX_XjyT0R/exec";
const TOKEN = "Project1285";

// ===== Elements =====
const form = document.getElementById("projectForm");
const list = document.getElementById("projectList");
const summaryEl = document.getElementById("summary");

// ===== Filter/Sort State =====
let allProjects = []; // master copy from server

// Controls (toolbar)
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sortBySelect = document.getElementById("sortBy");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// ===== Filter/sort and render current view =====
function applyFiltersAndRender() {
  const q = String(searchInput?.value || "")
    .trim()
    .toLowerCase();
  const statusSelected = String(statusFilter?.value || "");
  const sortBy = String(sortBySelect?.value || "priority-desc");

  // 1) Filter
  let view = allProjects.filter((p) => {
    const name = String(p.Name || "").toLowerCase();
    const matchesText = q ? name.includes(q) : true;
    const matchesStatus = statusSelected
      ? String(p.Status || "") === statusSelected
      : true;
    return matchesText && matchesStatus;
  });

  // 2) Sort
  const statusOrder = { "Not Started": 0, "In Progress": 1, Complete: 2 };
  view.sort((a, b) => {
    switch (sortBy) {
      case "priority-asc":
        return Number(a.Priority) - Number(b.Priority);
      case "status":
        return (
          (statusOrder[a.Status] ?? 99) - (statusOrder[b.Status] ?? 99) ||
          String(a.Name || "").localeCompare(String(b.Name || ""))
        );
      case "name":
        return String(a.Name || "").localeCompare(String(b.Name || ""));
      case "priority-desc":
      default:
        return Number(b.Priority) - Number(a.Priority);
    }
  });

  // 3) Render
  renderList(view);
}

// ===== UI - load & summary =====
async function loadProjects() {
  try {
    const projects = await fetchProjects();
    setProjects(projects); // sends to ui.js to handle rendering
  } catch (err) {
    console.error("[load] fetch failed:", err);
    document.getElementById("projectList").innerHTML =
      "<li>Error loading projects. Check console.</li>";
  }
}

// ===== UI - inline edit =====
function renderEditForm(li, project, rowIndex) {
  li.innerHTML = "";

  // Name
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = project.Name;
  nameInput.id = `edit-name-${rowIndex}-${Date.now()}`; // unique id
  nameInput.name = `edit-name-${rowIndex}`; // unique name too
  nameInput.setAttribute("aria-label", "Project name");
  nameInput.style.marginRight = "6px";

  // Priority
  const priorityInput = document.createElement("input");
  priorityInput.type = "number";
  priorityInput.value = project.Priority;
  priorityInput.min = 1;
  priorityInput.max = 5;
  priorityInput.id = `edit-priority-${rowIndex}-${Date.now()}`;
  priorityInput.name = `edit-priority-${rowIndex}`;
  priorityInput.setAttribute("aria-label", "Priority (1–5)");
  priorityInput.style.marginRight = "6px";

  // Status
  const statusSelect = document.createElement("select");
  statusSelect.id = `edit-status-${rowIndex}-${Date.now()}`;
  statusSelect.name = `edit-status-${rowIndex}`;
  statusSelect.setAttribute("aria-label", "Status");

  ["Not Started", "In Progress", "Complete"].forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    if (status === project.Status) option.selected = true;
    statusSelect.appendChild(option);
  });

  // Save
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.type = "button";
  saveBtn.onclick = async () => {
    await updateProject(
      rowIndex,
      nameInput.value,
      priorityInput.value,
      statusSelect.value
    );
    loadProjects();
  };

  li.appendChild(nameInput);
  li.appendChild(priorityInput);
  li.appendChild(statusSelect);
  li.appendChild(saveBtn);
}

// ===== Form submit (use FormData with names) =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);

  const name = fd.get("name");
  const priority = fd.get("priority");
  const status = fd.get("status");

  const query = new URLSearchParams({
    token: TOKEN,
    Name: name,
    Priority: priority,
    Status: status,
  }).toString();

  try {
    await fetch(`${API_URL}?${query}`);
    form.reset();
    loadProjects();
  } catch (err) {
    console.error("Failed to add project:", err);
  }
});

// ===== Clear all projects =====

document
  .getElementById("clearAllBtn")
  ?.addEventListener("click", clearAllProjects);

// ===== Toolbar event handlers =====
document
  .getElementById("clearAllBtn")
  ?.addEventListener("click", async () => {
    await clearAllProjects();
    loadProjects();
  });

// ===== Initialize UI and fetch projects =====
initUI(loadProjects);
loadProjects();

