document.addEventListener('DOMContentLoaded', async () => {
  const user = auth.requireAuth();
  if (!user) return;
  document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); if(confirm('Sign out?')) auth.logout(); });

  // Sidebar info
  document.getElementById('sidebarName').textContent = user.name;
  document.getElementById('sidebarAvatar').textContent = user.name.charAt(0);

  try {
    // We check the plan_limits/features to see if they can use it
    const profile = await api.get('/admin/profile');
    document.getElementById('sidebarRestaurantName').textContent = profile.data.name;
    
    // We also need config or profile.plan to figure out if it's pro
    if (profile.data.plan === 'basic') {
      document.querySelector('.card').style.display = 'none';
      document.querySelector('.header-actions').style.display = 'none';
      document.getElementById('featureLocked').style.display = 'block';
    } else {
      loadEvents();
    }
  } catch (err) {
    console.error(err);
  }
});

async function loadEvents() {
  try {
    const res = await api.get('/admin/events');
    const tbody = document.getElementById('eventsListBody');
    if (!res.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">No events found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = res.data.map(e => `
      <tr>
        <td>${new Date(e.event_date).toLocaleDateString()} <br><small>${e.start_time}</small></td>
        <td style="font-weight:600">${e.title}</td>
        <td><span class="badge" style="background:#e0e7ff;color:#4338ca">${e.event_type.replace('_',' ')}</span></td>
        <td>₹${e.cover_charge}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewRegs('${e.event_id}', '${e.title}')">
            ${e.registration_count || 0} Regs
          </button>
        </td>
        <td><span class="badge ${e.status === 'scheduled'?'success':'warning'}">${e.status}</span></td>
        <td>
          <button class="btn btn-sm btn-ghost">Edit</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    alert('Failed to load events');
  }
}

function showCreateModal() {
  document.getElementById('createEventModal').classList.add('active');
}

function closeCreateModal() {
  document.getElementById('createEventModal').classList.remove('active');
}

async function submitEvent() {
  const payload = {
    title: document.getElementById('evTitle').value,
    event_date: document.getElementById('evDate').value,
    start_time: document.getElementById('evTime').value,
    event_type: document.getElementById('evType').value,
    cover_charge: document.getElementById('evCover').value
  };
  
  if(!payload.title || !payload.event_date || !payload.start_time) return alert("Fill required fields");

  try {
    await api.post('/admin/events', payload);
    closeCreateModal();
    loadEvents();
  } catch(err) {
    alert(err.message || "Error");
  }
}

let activeRegEventId = null;

async function viewRegs(eventId, title) {
  activeRegEventId = eventId;
  document.getElementById('regsSubtitle').textContent = title;
  document.getElementById('regsModal').classList.add('active');
  const tbody = document.getElementById('regsBody');
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  
  try {
    const res = await api.get(`/admin/events/${eventId}/registrations`);
    if (!res.data.length) {
      tbody.innerHTML = '<tr><td colspan="5">No registrations yet.</td></tr>';
      return;
    }
    
    tbody.innerHTML = res.data.map(r => `
      <tr>
        <td>${r.guest_name}<br><small>${r.guest_phone}</small></td>
        <td>${r.role}</td>
        <td>${r.performance_type || '-'}</td>
        <td><span class="badge ${r.status==='approved'?'success':r.status==='rejected'?'error':'warning'}">${r.status}</span></td>
        <td>
          ${r.status === 'pending' ? `
            <button class="btn btn-sm" style="background:var(--success);color:#fff" onclick="updateReg('${r.registration_id}', 'approved')">Approve</button>
            <button class="btn btn-sm btn-secondary" onclick="updateReg('${r.registration_id}', 'rejected')">Reject</button>
          ` : '-'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Failed to load</td></tr>';
  }
}

function closeRegsModal() {
  document.getElementById('regsModal').classList.remove('active');
}

async function updateReg(regId, status) {
  try {
    await api.patch(`/admin/events/registrations/${regId}/status`, { status });
    viewRegs(activeRegEventId, document.getElementById('regsSubtitle').textContent);
  } catch (err) {
    alert("Error updating status");
  }
}
