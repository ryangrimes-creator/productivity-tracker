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

// ===== Backend helpers =====

// ===== Render a given list of projects =====
function renderList(projects) {
  list.innerHTML = "";
  console.log("Rendering project list:", projects);
  projects.forEach((project) => {
    // Map back to the real sheet row (prefer stamped _row; fallback to indexOf)
    const rowIndex = project._row ?? allProjects.indexOf(project) + 2;

    const li = document.createElement("li");

    // --- Status background colors ---
    const status = String(project.Status || "")
      .trim()
      .toLowerCase();
    const colors = {
      complete: "#d4edda",
      "in progress": "#fff3cd",
      "not started": "#f8d7da",
    };
    li.style.backgroundColor = colors[status] || "#ffffff";
    li.style.padding = "8px";
    li.style.marginBottom = "6px";
    li.style.borderRadius = "4px";
    li.style.listStyle = "none";

    // --- Priority accent (left border) ---
    const priorityNum = Number(String(project.Priority ?? "").trim());
    let accent = "#6c757d";
    if (priorityNum >= 4) accent = "#dc3545";
    else if (priorityNum === 3) accent = "#ffc107";
    else if (priorityNum > 0) accent = "#28a745";
    li.style.borderLeft = `8px solid ${accent}`;
    li.style.outline = `2px solid ${accent}20`;
    li.style.boxShadow = `0 1px 3px 0 #00000022`;

    // ============== Top row (title + actions + toggle) ==============
    const text = document.createElement("span");
    text.className = "item-left";
    text.textContent = `${project.Name} (Priority: ${project.Priority}, Status: ${project.Status}) `;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("edit-btn");
    editBtn.type = "button";
    editBtn.onclick = () => renderEditForm(li, project, rowIndex);
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.type = "button";
    deleteBtn.onclick = async () => {
      await deleteProject(rowIndex);
      loadProjects();
    };
    actions.appendChild(deleteBtn);

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "toggle-btn";
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.textContent = "Show subtasks";

    const topRow = document.createElement("div");
    topRow.className = "top-row";

    const leftStack = document.createElement("div");
    leftStack.style.display = "flex";
    leftStack.style.alignItems = "center";
    leftStack.style.gap = "8px";
    leftStack.appendChild(toggleBtn);
    leftStack.appendChild(text);

    topRow.appendChild(leftStack);
    topRow.appendChild(actions);
    li.appendChild(topRow);

    console.log("[ui] added toggle button for row", rowIndex);

    // === Subtasks ===
    // 0) Source of truth (must be first and in the same scope)
    let subtasks = parseSubtasks(project.Subtasks);

    // 1) Container
    const subUL = document.createElement("ul");
    subUL.className = "subtasks";

    // DEBUG: prove we are here and what we will render
    console.log("[subtasks] row", rowIndex, "items:", subtasks);

    // 2) Renderer
    function renderSubtasks() {
      try {
        subUL.innerHTML = "";

        // Existing subtasks
        (Array.isArray(subtasks) ? subtasks : []).forEach((subtask, idx) => {
          const subLi = document.createElement("li");
          subLi.className = "subtask-item";
          subLi.style.display = "flex";
          subLi.style.alignItems = "center";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = !!subtask?.done;
          cb.style.marginRight = "8px";

          const label = document.createElement("span");
          const textVal =
            typeof subtask === "string" ? subtask : String(subtask?.text ?? "");
          label.textContent = textVal;
          if (cb.checked) label.style.textDecoration = "line-through";

          // inline edit (dblclick)
          label.addEventListener("dblclick", () => {
            const edit = document.createElement("input");
            edit.type = "text";
            edit.value = textVal;
            edit.autocomplete = "off";
            edit.name = `edit-subtask-${rowIndex}-${idx}`;
            edit.style.flex = "1";
            subLi.replaceChild(edit, label);
            edit.focus();
            edit.select();

            const save = async () => {
              const v = edit.value.trim();
              subtasks[idx] = { text: v || textVal, done: cb.checked };
              await saveSubtasks(rowIndex, subtasks);
              renderSubtasks();
            };
            const cancel = () => renderSubtasks();

            edit.addEventListener("keydown", (e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            });
            edit.addEventListener("blur", save);
          });

          cb.onchange = async () => {
            const txt =
              typeof subtask === "string"
                ? subtask
                : String(subtask?.text ?? "");
            subtasks[idx] = { text: txt, done: cb.checked };
            await saveSubtasks(rowIndex, subtasks);
            label.style.textDecoration = cb.checked ? "line-through" : "none";
          };

          const del = document.createElement("button");
          del.type = "button";
          del.textContent = "✕";
          del.title = "Delete subtask";
          del.className = "toggle-btn";
          del.style.padding = "2px 8px";
          del.style.marginLeft = "8px";
          del.onclick = async () => {
            subtasks.splice(idx, 1);
            await saveSubtasks(rowIndex, subtasks);
            renderSubtasks();
          };

          subLi.appendChild(cb);
          subLi.appendChild(label);
          subLi.appendChild(del);
          subUL.appendChild(subLi);
        });

        // Add-subtask row (always appended)
        const addRow = document.createElement("li");
        addRow.className = "subtask-add";
        addRow.style.display = "flex";
        addRow.style.alignItems = "center";
        addRow.style.gap = "6px";
        addRow.style.marginTop = "6px";

        const addInput = document.createElement("input");
        addInput.type = "text";
        addInput.placeholder = "New subtask…";
        addInput.autocomplete = "off";
        addInput.name = `new-subtask-${rowIndex}`;
        addInput.style.flex = "1";
        addInput.style.padding = "6px 8px";
        addInput.style.border = "1px solid #e5e7eb";
        addInput.style.borderRadius = "8px";

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.textContent = "Add";
        addBtn.className = "edit-btn";

        const add = async () => {
          const val = addInput.value.trim();
          if (!val) return;
          subtasks.push({ text: val, done: false });
          addInput.value = "";
          await saveSubtasks(rowIndex, subtasks);
          renderSubtasks();
        };

        addBtn.onclick = add;
        addInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") add();
        });

        addRow.appendChild(addInput);
        addRow.appendChild(addBtn);
        subUL.appendChild(addRow);
      } catch (e) {
        console.error("[subtasks] render error row", rowIndex, e);
        // even on error, try to keep add row visible
        const fallback = document.createElement("li");
        fallback.textContent = "Unable to render subtasks.";
        fallback.style.color = "#b91c1c";
        subUL.appendChild(fallback);
      }
    }

    // initial paint and attach
    renderSubtasks();
    li.appendChild(subUL);

    toggleBtn.onclick = () => {
      const showing = subUL.classList.toggle("show");
      toggleBtn.setAttribute("aria-expanded", String(showing));
      toggleBtn.textContent = showing ? "Hide subtasks" : "Show subtasks";
      // If it just opened and there are no subtasks, focus the add input:
      if (showing && subUL.querySelector(".subtask-add input")) {
        subUL.querySelector(".subtask-add input").focus();
      }
    };

    list.appendChild(li); // if this line isn’t already earlier, keep it here
  }); // <-- closes projects.forEach(...)
} // <-- closes function renderList(projects)

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

