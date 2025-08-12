    const API_URL = 'https://script.google.com/macros/s/AKfycbzZ6lR1XKvsYj0A6oSK3Z5CQvJkEYYR-eGllQ5sQThOI2QhuzUPt_bOhbFBX_XjyT0R/exec';
    const TOKEN = 'Project1285'; // Use the same token as in your Apps Script

    const form = document.getElementById('projectForm');
    const list = document.getElementById('projectList');

// Delete project row from Google Sheets
async function deleteProject(row) {
  const query = new URLSearchParams({
    token: TOKEN,
    deleteRow: row
  }).toString();

  console.log('Attempting to delete row:', row); 

  try {
    await fetch(`${API_URL}?${query}`);
  } catch (err) {
    console.error('Failed to update project:', err);
  }
}

  // update project in google sheets  
async function updateProject(row, name, priority, status) {
  const query = new URLSearchParams({
    token: TOKEN,
    updateRow: row,
    Name: name,
    Priority: priority,
    Status: status
  }).toString();

  try {
    await fetch(`${API_URL}?${query}`);
  } catch (err) {
    console.error('Failed to update project:', err);
  }
}

// Load projects and render with Delete buttons
async function loadProjects() {
  try {
    const res = await fetch(`${API_URL}?token=${TOKEN}`);
    const data = await res.json();
    console.log('Fetched project data:', data);
    
    list.innerHTML = '';
    
// --- Progress summary (robust) ---
let summaryEl = document.getElementById('summary');
if (!summaryEl) {
  // If the div wasn't added, create it and insert above the list
  summaryEl = document.createElement('div');
  summaryEl.id = 'summary';
  summaryEl.style.marginTop = '10px';
  summaryEl.style.fontWeight = 'bold';
  list.parentNode.insertBefore(summaryEl, list); // put it above the <ul>
}

const total = data.length;
const complete = data.filter(
  p => String(p.Status || '').trim().toLowerCase() === 'complete'
).length;
const percent = total > 0 ? ((complete / total) * 100).toFixed(1) : 0;

summaryEl.textContent =
  `${total} project${total !== 1 ? 's' : ''} · ${complete} complete (${percent}%)`;

      
    data.forEach((project, index) => {
      const li = document.createElement('li');
      const rowIndex = index + 2; // skip header row

// Add background color based on status (normalize first)
const statusRaw = String(project.Status || '');
console.log('status raw:', `[${statusRaw}]`); // debug
const status = statusRaw.trim().toLowerCase();

const colors = {
  'complete': '#d4edda',      // light green
  'in progress': '#fff3cd',   // light yellow
  'not started': '#f8d7da'    // light red
};

li.style.backgroundColor = colors[status] || '#ffffff';
li.style.padding = '8px';
li.style.marginBottom = '6px';
li.style.borderRadius = '4px';
li.style.listStyle = 'none'; // optional, cleaner bullets

// Priority-based accent (normalize first)
const priorityRaw = String(project.Priority ?? '');
const priority = Number(priorityRaw.trim());
console.log('priority raw:', `[${priorityRaw}]`, '→ parsed:', priority);

// Pick a bold accent color
let accent = '#6c757d'; // default gray
if (priority >= 4) accent = '#dc3545';       // high (red)
else if (priority === 3) accent = '#ffc107'; // medium (yellow)
else if (priority > 0) accent = '#28a745';   // low (green)

// Make it obvious: thick left border + outline
li.style.borderLeft = `8px solid ${accent}`;
li.style.outline = `2px solid ${accent}20`;   // translucent outline for contrast
li.style.boxShadow = `0 1px 3px 0 #00000022`;


      
      // Add project text (wrapped so it can flex)
      const text = document.createElement('span');
      text.className = 'item-left';
      text.textContent = `${project.Name} (Priority: ${project.Priority}, Status: ${project.Status}) `;
      li.appendChild(text);


     // Create Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('delete-btn'); // NEW
    deleteBtn.onclick = async () => {
    await deleteProject(index + 2); // Adjust for headers
    loadProjects();
    };

    // Add button to <li>
    li.appendChild(deleteBtn);

    // Create Edit Button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.classList.add('edit-btn'); // NEW
    editBtn.onclick = () => {
    renderEditForm(li, project, rowIndex);
    };
    // Add button to <li>
    li.appendChild(editBtn);
      
    // Add <li> to the list
    list.appendChild(li);
  });

  } catch (err) {
    console.error('Failed to load projects:', err);
    list.innerHTML = '<li>Error loading projects.</li>';
  }
}

    function renderEditForm(li, project, rowIndex) {
      li.innerHTML = '';

    const nameInput = document.createElement('input');
    nameInput.value = project.Name;

    const priorityInput = document.createElement('input');
    priorityInput.type = 'number';
    priorityInput.value = project.Priority;
    priorityInput.min = 1;
    priorityInput.max = 5;

    const statusSelect = document.createElement('select');
    ['Not Started', 'In Progress', 'Complete'].forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      if (status === project.Status) option.selected = true;
      statusSelect.appendChild(option);
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = async () => {
      await updateProject(rowIndex, nameInput.value, priorityInput.value, statusSelect.value);
      loadProjects();
    };

    li.appendChild(nameInput);
    li.appendChild(priorityInput);
    li.appendChild(statusSelect);
    li.appendChild(saveBtn);
  }


    // Add project via POST
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const priority = document.getElementById('priority').value;
      const status = document.getElementById('status').value;

      const payload = {
        token: TOKEN,
        Name: name,
        Priority: priority,
        Status: status
      };

      try {
        const query = new URLSearchParams({
          token: TOKEN,
          Name: name,
          Priority: priority,
          Status: status
        }).toString();

        await fetch(`${API_URL}?${query}`);


        form.reset();
        loadProjects(); // Refresh list
      } catch (err) {
        console.error('Failed to add project:', err);
      }
    });

    // Initial load
    loadProjects();
