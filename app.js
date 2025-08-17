// ===== Config =====
const API_URL = 'https://script.google.com/macros/s/AKfycbzZ6lR1XKvsYj0A6oSK3Z5CQvJkEYYR-eGllQ5sQThOI2QhuzUPt_bOhbFBX_XjyT0R/exec';
const TOKEN   = 'Project1285';

// ===== Elements =====
const form = document.getElementById('projectForm');
const list = document.getElementById('projectList');
const summaryEl = document.getElementById('summary');

// ===== Filter/Sort State =====
let allProjects = []; // master copy from server

// Controls (toolbar)
const searchInput     = document.getElementById('searchInput');
const statusFilter    = document.getElementById('statusFilter');
const sortBySelect    = document.getElementById('sortBy');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// ===== Backend helpers =====
async function deleteProject(row) {
  const query = new URLSearchParams({ token: TOKEN, deleteRow: row }).toString();
  await fetch(`${API_URL}?${query}`);
}

async function updateProject(row, name, priority, status) {
  const query = new URLSearchParams({
    token: TOKEN,
    updateRow: row,
    Name: name,
    Priority: priority,
    Status: status
  }).toString();
  await fetch(`${API_URL}?${query}`);
}

// Parse "Subtasks" which might be an array or a JSON string
function parseSubtasks(raw) {
  try {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    const val = JSON.parse(raw);
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

// Save full subtasks array back to the sheet for a given row
async function saveSubtasks(row, subtasksArray) {
  const query = new URLSearchParams({
    token: TOKEN,
    row: String(row),
    updateSubtasks: JSON.stringify(subtasksArray)
  }).toString();
  await fetch(`${API_URL}?${query}`);
}

// ===== Render a given list of projects (3C) =====
function renderList(projects) {
  list.innerHTML = '';

  projects.forEach((project) => {
    // Map back to the real sheet row (prefer stamped _row; fallback to indexOf)
    const rowIndex = project._row ?? (allProjects.indexOf(project) + 2);

    const li = document.createElement('li');

    // --- Status background colors ---
    const status = String(project.Status || '').trim().toLowerCase();
    const colors = { 'complete':'#d4edda', 'in progress':'#fff3cd', 'not started':'#f8d7da' };
    li.style.backgroundColor = colors[status] || '#ffffff';
    li.style.padding = '8px';
    li.style.marginBottom = '6px';
    li.style.borderRadius = '4px';
    li.style.listStyle = 'none';

    // --- Priority accent (left border) ---
    const priorityNum = Number(String(project.Priority ?? '').trim());
    let accent = '#6c757d';
    if (priorityNum >= 4) accent = '#dc3545';
    else if (priorityNum === 3) accent = '#ffc107';
    else if (priorityNum > 0) accent = '#28a745';
    li.style.borderLeft = `8px solid ${accent}`;
    li.style.outline = `2px solid ${accent}20`;
    li.style.boxShadow = `0 1px 3px 0 #00000022`;

    // ============== Top row (title + actions + toggle) ==============
    const text = document.createElement('span');
    text.className = 'item-left';
    text.textContent = `${project.Name} (Priority: ${project.Priority}, Status: ${project.Status}) `;

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.classList.add('edit-btn');
    editBtn.type = 'button';
    editBtn.onclick = () => renderEditForm(li, project, rowIndex);
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.type = 'button';
    deleteBtn.onclick = async () => {
      await deleteProject(rowIndex);
      loadProjects();
    };
    actions.appendChild(deleteBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'toggle-btn';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.textContent = 'Show subtasks';

    const topRow = document.createElement('div');
    topRow.className = 'top-row';

    const leftStack = document.createElement('div');
    leftStack.style.display = 'flex';
    leftStack.style.alignItems = 'center';
    leftStack.style.gap = '8px';
    leftStack.appendChild(toggleBtn);
    leftStack.appendChild(text);

    topRow.appendChild(leftStack);
    topRow.appendChild(actions);
    li.appendChild(topRow);

   // === Subtasks ===
const subUL = document.createElement('ul');
subUL.className = 'subtasks';

// Function to render existing subtasks
function renderSubtasks() {
  subUL.innerHTML = '';
  subtasks.forEach((subtask, idx) => {
    const subLi = document.createElement('li');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = subtask.done;
    cb.onchange = async () => {
      subtasks[idx].done = cb.checked;
      await saveSubtasks(rowIndex, subtasks);
    };

    const span = document.createElement('span');
    span.textContent = subtask.text;
    if (subtask.done) span.style.textDecoration = 'line-through';

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '✕';
    del.title = 'Delete subtask';
    del.className = 'toggle-btn';
    del.style.padding = '2px 8px';
    del.onclick = async () => {
      subtasks.splice(idx, 1);
      await saveSubtasks(rowIndex, subtasks);
      renderSubtasks();
    };

    subLi.appendChild(cb);
    subLi.appendChild(span);
    subLi.appendChild(del);
    subUL.appendChild(subLi);
  });
}

// Input row for adding a new subtask
const addRow = document.createElement('div');
addRow.style.display = 'flex';
addRow.style.gap = '6px';

const addInput = document.createElement('input');
addInput.type = 'text';
addInput.placeholder = 'New subtask…';
addInput.setAttribute('aria-label', 'New subtask');
addInput.style.flex = '1 1 0%';
addInput.style.padding = '6px 8px';
addInput.style.border = '1px solid rgb(229, 231, 235)';
addInput.style.borderRadius = '8px';

const addBtn = document.createElement('button');
addBtn.type = 'button';
addBtn.textContent = '+';

// Add handler
const add = async () => {
  const val = addInput.value.trim();
  if (!val) return;
  subtasks.push({ text: val, done: false });
  addInput.value = '';
  await saveSubtasks(rowIndex, subtasks);
  renderSubtasks();
};

addBtn.onclick = add;
addInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') add();
});

addRow.appendChild(addInput);
addRow.appendChild(addBtn);
subUL.appendChild(addRow);

// Render everything
renderSubtasks();
li.appendChild(subUL);

// Toggle button for show/hide
toggleBtn.onclick = () => {
  const showing = subUL.classList.toggle('show');
  toggleBtn.setAttribute('aria-expanded', String(showing));
  toggleBtn.textContent = showing ? 'Hide subtasks' : 'Show subtasks';
};

    list.appendChild(li);
  });
}

// ===== Filter/sort and render current view (3D) =====
function applyFiltersAndRender() {
  const q = String(searchInput?.value || '').trim().toLowerCase();
  const statusSelected = String(statusFilter?.value || '');
  const sortBy = String(sortBySelect?.value || 'priority-desc');

  // 1) Filter
  let view = allProjects.filter(p => {
    const name = String(p.Name || '').toLowerCase();
    const matchesText = q ? name.includes(q) : true;
    const matchesStatus = statusSelected
      ? String(p.Status || '') === statusSelected
      : true;
    return matchesText && matchesStatus;
  });

  // 2) Sort
  const statusOrder = { 'Not Started': 0, 'In Progress': 1, 'Complete': 2 };
  view.sort((a, b) => {
    switch (sortBy) {
      case 'priority-asc':
        return Number(a.Priority) - Number(b.Priority);
      case 'status':
        return (statusOrder[a.Status] ?? 99) - (statusOrder[b.Status] ?? 99)
            || String(a.Name || '').localeCompare(String(b.Name || ''));
      case 'name':
        return String(a.Name || '').localeCompare(String(b.Name || ''));
      case 'priority-desc':
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
    const res = await fetch(`${API_URL}?token=${TOKEN}`);
    const data = await res.json();

    // Save master copy (and stamp a _row for robust mapping)
    allProjects = (Array.isArray(data) ? data : []).map((p, i) => ({ ...p, _row: i + 2 }));

    // Summary (+ progress bar)
    const total = allProjects.length;
    const complete = allProjects.filter(
      p => String(p.Status || '').trim().toLowerCase() === 'complete'
    ).length;
    const percent = total > 0 ? (complete / total) * 100 : 0;

    // Ensure summary structure: text + bar
    let summaryText = document.getElementById('summaryText');
    if (!summaryText) {
      summaryEl.innerHTML = ''; // clear once
      summaryText = document.createElement('div');
      summaryText.id = 'summaryText';
      summaryEl.appendChild(summaryText);

      const bar = document.createElement('div');
      bar.className = 'progress';
      bar.id = 'progressBar';

      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.id = 'progressFill';
      bar.appendChild(fill);

      summaryEl.appendChild(bar);
    }

    // Update summary text
    summaryText.textContent =
      `${total} project${total !== 1 ? 's' : ''} · ${complete} complete (${percent.toFixed(1)}%)`;

    // Update progress fill + color thresholds
    const fillEl = document.getElementById('progressFill');
    fillEl.style.width = `${percent}%`;
    if (percent < 34) {
      fillEl.style.background = '#ef4444';   // red
    } else if (percent < 67) {
      fillEl.style.background = '#f59e0b';   // amber
    } else {
      fillEl.style.background = '#22c55e';   // green
    }

    // Render current view
    applyFiltersAndRender();
  } catch (err) {
    console.error('Failed to load projects:', err);
    list.innerHTML = '<li>Error loading projects.</li>';
  }
}

// ===== UI - inline edit =====
function renderEditForm(li, project, rowIndex) {
  li.innerHTML = '';

  // Name
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = project.Name;
  nameInput.id = `edit-name-${rowIndex}-${Date.now()}`;   // unique id
  nameInput.name = `edit-name-${rowIndex}`;               // unique name too
  nameInput.setAttribute('aria-label', 'Project name');
  nameInput.style.marginRight = '6px';

  // Priority
  const priorityInput = document.createElement('input');
  priorityInput.type = 'number';
  priorityInput.value = project.Priority;
  priorityInput.min = 1;
  priorityInput.max = 5;
  priorityInput.id = `edit-priority-${rowIndex}-${Date.now()}`;
  priorityInput.name = `edit-priority-${rowIndex}`;
  priorityInput.setAttribute('aria-label', 'Priority (1–5)');
  priorityInput.style.marginRight = '6px';

  // Status
  const statusSelect = document.createElement('select');
  statusSelect.id = `edit-status-${rowIndex}-${Date.now()}`;
  statusSelect.name = `edit-status-${rowIndex}`;
  statusSelect.setAttribute('aria-label', 'Status');

  ['Not Started', 'In Progress', 'Complete'].forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    if (status === project.Status) option.selected = true;
    statusSelect.appendChild(option);
  });

  // Save
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.type = 'button';
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
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);

  const name = fd.get('name');
  const priority = fd.get('priority');
  const status = fd.get('status');

  const query = new URLSearchParams({
    token: TOKEN,
    Name: name,
    Priority: priority,
    Status: status
  }).toString();

  try {
    await fetch(`${API_URL}?${query}`);
    form.reset();
    loadProjects();
  } catch (err) {
    console.error('Failed to add project:', err);
  }
});

// ===== Clear all projects =====
async function clearAllProjects() {
  const ok = window.confirm('This will delete ALL projects from the sheet. Continue?');
  if (!ok) return;

  const query = new URLSearchParams({ token: TOKEN, clearAll: '1' }).toString();
  try {
    await fetch(`${API_URL}?${query}`);
    loadProjects();
  } catch (err) {
    console.error('Failed to clear all projects:', err);
    alert('Failed to clear all projects. Check console for details.');
  }
}
document.getElementById('clearAllBtn')?.addEventListener('click', clearAllProjects);

// ===== Toolbar events (3D) =====
searchInput?.addEventListener('input', applyFiltersAndRender);
statusFilter?.addEventListener('change', applyFiltersAndRender);
sortBySelect?.addEventListener('change', applyFiltersAndRender);
clearFiltersBtn?.addEventListener('click', () => {
  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = '';
  if (sortBySelect) sortBySelect.value = 'priority-desc';
  applyFiltersAndRender();
});

// ===== Initial load =====
loadProjects();
