import {
  fetchProjects,
  updateProject,
  deleteProject,
  clearAllProjects,
  parseSubtasks,
  saveSubtasks,
} from "./projects.js";

// ====== Local state ======
let allProjects = [];

// ====== Elements ======
const list = document.getElementById("projectList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sortBySelect = document.getElementById("sortBy");

// ====== Render project list ======
function renderList(projects) {
  list.innerHTML = "";

  projects.forEach((project) => {
    const rowIndex = project._row ?? allProjects.indexOf(project) + 2;
    const li = document.createElement("li");

    // Style based on status
    const status = String(project.Status || "").trim().toLowerCase();
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

    // Priority border color
    const priorityNum = Number(String(project.Priority ?? "").trim());
    let accent = "#6c757d";
    if (priorityNum >= 4) accent = "#dc3545";
    else if (priorityNum === 3) accent = "#ffc107";
    else if (priorityNum > 0) accent = "#28a745";
    li.style.borderLeft = `8px solid ${accent}`;
    li.style.outline = `2px solid ${accent}20`;
    li.style.boxShadow = `0 1px 3px 0 #00000022`;

    const text = document.createElement("span");
    text.className = "item-left";
    text.textContent = `${project.Name} (Priority: ${project.Priority}, Status: ${project.Status})`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("edit-btn");
    editBtn.type = "button";
    editBtn.onclick = () => renderEditForm(li, project, rowIndex);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.type = "button";
    deleteBtn.onclick = async () => {
      await deleteProject(rowIndex);
      loadProjects();
    };

    actions.appendChild(editBtn);
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

    // === Subtasks ===
    let subtasks = parseSubtasks(project.Subtasks);
    const subUL = document.createElement("ul");
    subUL.className = "subtasks";

    function renderSubtasks() {
      try {
        subUL.innerHTML = "";
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
          const textVal = typeof subtask === "string" ? subtask : String(subtask?.text ?? "");
          label.textContent = textVal;
          if (cb.checked) label.style.textDecoration = "line-through";

          // inline edit
          label.addEventListener("dblclick", () => {
            const edit = document.createElement("input");
            edit.type = "text";
            edit.value = textVal;
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
            const txt = typeof subtask === "string" ? subtask : String(subtask?.text ?? "");
            subtasks[idx] = { text: txt, done: cb.checked };
            await saveSubtasks(rowIndex, subtasks);
            label.style.textDecoration = cb.checked ? "line-through" : "none";
          };

          const del = document.createElement("button");
          del.type = "button";
          del.textContent = "✕";
          del.className = "toggle-btn";
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

        // add-subtask row
        const addRow = document.createElement("li");
        addRow.className = "subtask-add";
        addRow.style.display = "flex";
        addRow.style.gap = "6px";
        addRow.style.marginTop = "6px";

        const addInput = document.createElement("input");
        addInput.type = "text";
        addInput.placeholder = "New subtask…";
        addInput.name = `new-subtask-${rowIndex}`;
        addInput.style.flex = "1";

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
        console.error("[subtasks] render error", e);
      }
    }

    renderSubtasks();
    li.appendChild(subUL);

    toggleBtn.onclick = () => {
      const showing = subUL.classList.toggle("show");
      toggleBtn.setAttribute("aria-expanded", String(showing));
      toggleBtn.textContent = showing ? "Hide subtasks" : "Show subtasks";
      if (showing && subUL.querySelector(".subtask-add input")) {
        subUL.querySelector(".subtask-add input").focus();
      }
    };

    list.appendChild(li);
  });
}

// ====== Filter, sort, render ======
function applyFiltersAndRender() {
  const q = String(searchInput?.value || "").trim().toLowerCase();
  const statusSelected = String(statusFilter?.value || "");
  const sortBy = String(sortBySelect?.value || "priority-desc");

  const statusOrder = { "Not Started": 0, "In Progress": 1, Complete: 2 };

  let view = allProjects.filter((p) => {
    const name = String(p.Name || "").toLowerCase();
    const matchesText = q ? name.includes(q) : true;
    const matchesStatus = statusSelected ? String(p.Status || "") === statusSelected : true;
    return matchesText && matchesStatus;
  });

  view.sort((a, b) => {
    switch (sortBy) {
      case "priority-asc":
        return Number(a.Priority) - Number(b.Priority);
      case "status":
        return (statusOrder[a.Status] ?? 99) - (statusOrder[b.Status] ?? 99);
      case "name":
        return String(a.Name || "").localeCompare(String(b.Name || ""));
      case "priority-desc":
      default:
        return Number(b.Priority) - Number(a.Priority);
    }
  });

  renderList(view);
}

// ====== Save state ======
function setProjects(projects) {
  allProjects = projects;
  applyFiltersAndRender();
}

// ====== Initialize event listeners ======
function initUI(triggerReload) {
  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "";
    sortBySelect.value = "priority-desc";
    applyFiltersAndRender();
  });

  [searchInput, statusFilter, sortBySelect].forEach((el) => {
    el?.addEventListener("input", applyFiltersAndRender);
  });

  document.getElementById("clearAllBtn")?.addEventListener("click", async () => {
    await clearAllProjects();
    triggerReload();
  });
}

// ====== Fetch and display projects ======
async function loadProjects() {
  try {
    const projects = await fetchProjects();
    setProjects(projects);
  } catch (err) {
    console.error("[load] fetch failed:", err);
    document.getElementById("projectList").innerHTML = "<li>Error loading projects.</li>";
  }
}

// ====== Inline edit form ======
function renderEditForm(li, project, rowIndex) {
  li.innerHTML = "";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = project.Name;

  const priorityInput = document.createElement("input");
  priorityInput.type = "number";
  priorityInput.value = project.Priority;
  priorityInput.min = 1;
  priorityInput.max = 5;

  const statusSelect = document.createElement("select");
  ["Not Started", "In Progress", "Complete"].forEach((status) => {
    const opt = document.createElement("option");
    opt.value = status;
    opt.textContent = status;
    if (status === project.Status) opt.selected = true;
    statusSelect.appendChild(opt);
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.type = "button";
  saveBtn.onclick = async () => {
    await updateProject(rowIndex, nameInput.value, priorityInput.value, statusSelect.value);
    loadProjects();
  };

  li.appendChild(nameInput);
  li.appendChild(priorityInput);
  li.appendChild(statusSelect);
  li.appendChild(saveBtn);
}

// ====== Exports ======
export {
  renderList,
  applyFiltersAndRender,
  initUI,
  setProjects,
  renderEditForm,
  loadProjects
};
