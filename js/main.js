import {
  addProject,
  clearAllProjects,
} from './projects.js';

import {
  initUI,
  loadProjects
} from './ui.js';

// ===== Config =====
const form = document.getElementById("projectForm");

// ===== Form Submission =====
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);

  const name = fd.get("name");
  const priority = fd.get("priority");
  const status = fd.get("status");

  if (!name || !priority || !status) {
    alert("Please fill out all fields.");
    return;
  }

  try {
    await addProject(name, priority, status);
    form.reset();
    loadProjects();
  } catch (err) {
    console.error("Failed to add project:", err);
    alert("Failed to add project. See console for details.");
  }
});

// ===== Initialize UI =====
initUI(loadProjects);

// ===== Initial Load =====
loadProjects();
