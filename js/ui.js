import {
  deleteProject,
  updateProject,
  saveSubtasks,
  parseSubtasks
} from './projects.js';

let allProjects = [];
let listEl, summaryEl, searchInput, statusFilter, sortBySelect;

export function initUI(config) {
  listEl = config.list;
  summaryEl = config.summary;
  searchInput = config.searchInput;
  statusFilter = config.statusFilter;
  sortBySelect = config.sortBySelect;
  allProjects = config.allProjects;
}

export function setProjects(projects) {
  allProjects = projects;
  applyFiltersAndRender();
}

export function applyFiltersAndRender() {
  const q = String(searchInput?.value || "").trim().toLowerCase();
  const statusSelected = String(statusFilter?.value || "");
  const sortBy = String(sortBySelect?.value || "priority-desc");

  let view = allProjects.filter((p) => {
    const name = String(p.Name || "").toLowerCase();
    const matchesText = q ? name.includes(q) : true;
    const matchesStatus = statusSelected
      ? String(p.Status || "") === statusSelected
      : true;
    return matchesText && matchesStatus;
  });

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

  renderList(view);
}

export function renderList(projects) {
  const list = document.getElementById('projectList');
  if (!list) {
    console.error('[renderList] Missing element: #projectList');
    return;
  }
  list.innerHTML = '';


  projects.forEach((project) => {
    const rowIndex = project._row ?? allProjects.indexOf(project) + 2;

    const li = document.createElement("li");
    li.style.backgroundColor = "#ffffff";
    li.style.padding = "8px";
    li.style.marginBottom = "6px";
    li.style.borderRadius = "4px";
    li.style.listStyle = "none";

    const status = String(project.Status || "").trim().toLowerCase();
    const colors = {
      complete: "#d4edda",
      "in progress": "#fff3cd",
      "not started": "#f8d7da",
    };
    li.style.backgroundColor = colors[status] || "#ffffff";

    const priorityNum = Number(String(project.Priority ?? "").trim());
    let accent = "#6c757d";
    if (priorityNum >= 4) accent = "#dc3545";
    else if (priorityNum === 3) accent = "#ffc107";
    else if (priorityNum > 0) accent = "#28a745";
    li.style.borderLeft = `8px solid ${accent}`;

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
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.type = "button";
    deleteBtn.onclick = async () => {
      await deleteProject(rowIndex);
      location.reload(); // optional, or re-call fetch
    };
    actions.appendChild(deleteBtn);

    const topRow = document.createElement("div");
    topRow.className = "top-row";
    topRow.appendChild(text);
    topRow.appendChild(actions);

    li.appendChild(topRow);

    listEl.appendChild(li);
  });
}

export function renderEditForm(li, project, rowIndex) {
  li.innerHTML = "";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = project.Name;

  const priorityInput = document.createElement("input");
  priorityInput.type = "number";
  priorityInput.value = project.Priority;

  const statusSelect = document.createElement("select");
  ["Not Started", "In Progress", "Complete"].forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    if (status === project.Status) option.selected = true;
    statusSelect.appendChild(option);
  });

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
    location.reload(); // or re-call fetch
  };

  li.appendChild(nameInput);
  li.appendChild(priorityInput);
  li.appendChild(statusSelect);
  li.appendChild(saveBtn);
}

