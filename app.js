// ===== Config =====
const API_URL = 'https://script.google.com/macros/s/AKfycbzZ6lR1XKvsYj0A6oSK3Z5CQvJkEYYR-eGllQ5sQThOI2QhuzUPt_bOhbFBX_XjyT0R/exec';
const TOKEN   = 'Project1285';

// ===== Elements =====
const form = document.getElementById('projectForm');
const list = document.getElementById('projectList');
const summaryEl = document.getElementById('summary');

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

// ===== UI - load & render =====
async function loadProjects() {
  try {
    const res = await fetch(`${API_URL}?token=${TOKEN}`);
    const data = await res.json();

    // Summary
    const total = data.length;
    const complete = data.filter(
      p => String(p.Status || '').trim().toLowerCase() === 'complete'
    ).length;
    const percent = total > 0 ? ((complete / total) * 100).toFixed(1) : 0;
    summaryEl.textContent = `${total} project${total !== 1 ? 's' : ''} · ${complete} complete (${percent}%)`;

    // List
    list.innerHTML = '';
    data.forEach((project, index) => {
      const li = document.createElement('li');
      const rowIndex = index + 2; // sheet row (skip header)

      // --- status background ---
      const status = String(project.Status || '').trim().toLowerCase();
      const colors = {
        'complete': '#d4edda',
        'in progress': '#fff3cd',
        'not started': '#f8d7da'
      };
      li.style.backgroundColor = colors[status] || '#ffffff';
      li.style.padding = '8px';
      li.style.marginBottom = '6px';
      li.style.borderRadius = '4px';
      li.style.listStyle = 'none';

      // --- priority accent ---
      const priorityNum = Number(String(project.Priority ?? '').trim());
      let accent = '#6c757d';
      if (priorityNum >= 4) accent = '#dc3545';
      else if (priorityNum === 3) accent = '#ffc107';
      else if (priorityNum > 0) accent = '#28a745';
      li.style.borderLeft = `8px solid ${accent}`;
      li.style.outline = `2px solid ${accent}20`;
      li.style.boxShadow = `0 1px 3px 0 #00000022`;

      // Left text (wrap in span for layout)
      const text = document.createElement('span');
      text.className = 'item-left';
      text.textContent = `${project.Name} (Priority: ${project.Priority}, Status: ${project.Status}) `;
      li.appendChild(text);

      // Actions container
      const actions = document.createElement('div');
      actions.className = 'item-actions';

      // Edit
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.classList.add('edit-btn');
      editBtn.type = 'button';
      editBtn.onclick = () => renderEditForm(li, project, rowIndex);
      actions.appendChild(editBtn);

      // Delete
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.classList.add('delete-btn');
      deleteBtn.type = 'button';
      deleteBtn.onclick = async () => {
        await deleteProject(rowIndex);
        loadProjects();
      };
      actions.appendChild(deleteBtn);

      li.appendChild(actions);
      list.appendChild(li);
    });

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
  nameInput.id = `edit-name-${rowIndex}`;
  nameInput.name = 'edit-name';          // add name to clear the warning
  nameInput.setAttribute('aria-label', 'Project name');
  nameInput.style.marginRight = '6px';

  // Priority
  const priorityInput = document.createElement('input');
  priorityInput.type = 'number';
  priorityInput.value = project.Priority;
  priorityInput.min = 1;
  priorityInput.max = 5;
  priorityInput.id = `edit-priority-${rowIndex}`;
  priorityInput.name = 'edit-priority';  // add name
  priorityInput.setAttribute('aria-label', 'Priority (1–5)');
  priorityInput.style.marginRight = '6px';

  // Status
  const statusSelect = document.createElement('select');
  statusSelect.id = `edit-status-${rowIndex}`;
  statusSelect.name = 'edit-status';     // add name
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

// ===== Initial load =====
loadProjects();
