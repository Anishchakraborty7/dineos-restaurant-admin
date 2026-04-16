let allCategories = [];
let editItemId = null;
let editCatId  = null;

document.addEventListener('DOMContentLoaded', async () => {
  auth.requireAuth();
  await loadCategories();
  await loadItems();

  document.getElementById('addItemBtn').addEventListener('click', () => openItemModal());
  document.getElementById('addCatBtn').addEventListener('click', () => openCatModal());
  document.getElementById('searchItems').addEventListener('input', utils.debounce(filterItems, 300));
  document.getElementById('filterCat').addEventListener('change', filterItems);
  document.getElementById('filterVeg').addEventListener('change', filterItems);
  document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); if(confirm('Sign out?')) auth.logout(); });
});

async function loadCategories() {
  try {
    const res = await api.get('/admin/menu/categories');
    allCategories = res.data;
    renderCategories();
    // Populate filter dropdown
    const sel = document.getElementById('filterCat');
    sel.innerHTML = '<option value="">All Categories</option>' + allCategories.map(c => `<option value="${c.category_id}">${c.name}</option>`).join('');
    // Populate item form category
    const itemCatSel = document.getElementById('itemCategory');
    itemCatSel.innerHTML = '<option value="">No Category</option>' + allCategories.map(c => `<option value="${c.category_id}">${c.name}</option>`).join('');
  } catch (err) { toast.error('Failed to load categories'); }
}

function renderCategories() {
  const el = document.getElementById('categoriesList');
  el.innerHTML = allCategories.map(c => `
    <div class="card" style="padding:0;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px">
        <div>
          <div style="font-weight:600">${c.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${c.item_count||0} items · ${c.is_active?'Active':'Hidden'}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="openCatModal('${c.category_id}')" class="btn btn-secondary btn-sm">Edit</button>
          <button onclick="deleteCategory('${c.category_id}')" class="btn btn-danger btn-sm">Delete</button>
        </div>
      </div>
    </div>`).join('') || '<p style="color:var(--text-muted);text-align:center;padding:24px">No categories yet. Add one above!</p>';
}

let allItems = [];
async function loadItems() {
  try {
    const res = await api.get('/admin/menu/items');
    allItems = res.data;
    renderItems(allItems);
  } catch (err) { toast.error('Failed to load menu items'); }
}

function filterItems() {
  const q   = document.getElementById('searchItems').value.toLowerCase();
  const cat = document.getElementById('filterCat').value;
  const veg = document.getElementById('filterVeg').value;

  let filtered = allItems;
  if (q)   filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
  if (cat) filtered = filtered.filter(i => i.category_id === cat);
  if (veg  === 'veg')   filtered = filtered.filter(i => i.is_veg);
  if (veg  === 'nonveg') filtered = filtered.filter(i => !i.is_veg);
  renderItems(filtered);
}

function renderItems(items) {
  const el = document.getElementById('menuGrid');
  if (!items?.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted)">No menu items yet. Click "Add Item" to get started!</div>';
    return;
  }
  el.innerHTML = items.map(item => `
    <div class="card" style="${!item.is_available?'opacity:0.6':''};padding:0;transition:0.2s">
      ${item.image_url ? `<div style="height:140px;background:url('${item.image_url}') center/cover;border-radius:12px 12px 0 0"></div>` : `<div style="height:80px;background:var(--surface-2);border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:center;font-size:32px">🍽️</div>`}
      <div style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div style="font-weight:600;font-size:15px">${item.name}</div>
          <div style="width:12px;height:12px;border-radius:50%;border:2px solid ${item.is_veg?'#10b981':'#ef4444'};background:${item.is_veg?'#10b981':'#ef4444'};flex-shrink:0;margin-top:3px"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${item.category_name||'Uncategorized'}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${item.description||''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:16px;color:var(--primary)">₹${item.price}</span>
          <div style="display:flex;gap:6px">
            <button onclick="toggleAvailable('${item.item_id}', ${item.is_available})" class="btn btn-sm ${item.is_available?'btn-secondary':'btn-success'}" title="${item.is_available?'Mark Unavailable':'Mark Available'}">${item.is_available?'✓ On':'✗ Off'}</button>
            <button onclick="openItemModal('${item.item_id}')" class="btn btn-secondary btn-sm">Edit</button>
            <button onclick="deleteItem('${item.item_id}')" class="btn btn-danger btn-sm">✕</button>
          </div>
        </div>
      </div>
    </div>`).join('');
}

// ---- Item Modal ----
function openItemModal(itemId = null) {
  editItemId = itemId;
  document.getElementById('itemModalTitle').textContent = itemId ? 'Edit Menu Item' : 'Add Menu Item';
  if (!itemId) { document.getElementById('itemForm').reset(); }
  else {
    const item = allItems.find(i => i.item_id === itemId);
    if (!item) return;
    document.getElementById('itemName').value        = item.name;
    document.getElementById('itemDesc').value        = item.description || '';
    document.getElementById('itemPrice').value       = item.price;
    document.getElementById('itemCategory').value    = item.category_id || '';
    document.getElementById('itemImage').value       = item.image_url || '';
    document.getElementById('itemVeg').checked       = item.is_veg;
    document.getElementById('itemFeatured').checked  = item.is_featured;
  }
  document.getElementById('itemModal').classList.add('active');
}

function closeItemModal() { document.getElementById('itemModal').classList.remove('active'); editItemId = null; }

document.getElementById('saveItemBtn')?.addEventListener('click', async () => {
  const payload = {
    name:        document.getElementById('itemName').value.trim(),
    description: document.getElementById('itemDesc').value.trim(),
    price:       parseFloat(document.getElementById('itemPrice').value),
    category_id: document.getElementById('itemCategory').value || null,
    image_url:   document.getElementById('itemImage').value.trim() || null,
    is_veg:      document.getElementById('itemVeg').checked,
    is_featured: document.getElementById('itemFeatured').checked,
  };
  if (!payload.name || !payload.price) { toast.error('Name and price are required.'); return; }
  try {
    if (editItemId) await api.patch(`/admin/menu/items/${editItemId}`, payload);
    else            await api.post('/admin/menu/items', payload);
    toast.success(editItemId ? 'Item updated!' : 'Item added!');
    closeItemModal();
    await loadItems();
  } catch (err) { toast.error(err.message); }
});

// ---- Category Modal ----
function openCatModal(catId = null) {
  editCatId = catId;
  document.getElementById('catModalTitle').textContent = catId ? 'Edit Category' : 'Add Category';
  if (!catId) { document.getElementById('catForm').reset(); }
  else {
    const cat = allCategories.find(c => c.category_id === catId);
    if (!cat) return;
    document.getElementById('catName').value = cat.name;
    document.getElementById('catDesc').value = cat.description || '';
  }
  document.getElementById('catModal').classList.add('active');
}

function closeCatModal() { document.getElementById('catModal').classList.remove('active'); editCatId = null; }

document.getElementById('saveCatBtn')?.addEventListener('click', async () => {
  const payload = { name: document.getElementById('catName').value.trim(), description: document.getElementById('catDesc').value.trim() };
  if (!payload.name) { toast.error('Category name is required.'); return; }
  try {
    if (editCatId) await api.patch(`/admin/menu/categories/${editCatId}`, payload);
    else           await api.post('/admin/menu/categories', payload);
    toast.success(editCatId ? 'Category updated!' : 'Category added!');
    closeCatModal();
    await loadCategories();
    await loadItems();
  } catch (err) { toast.error(err.message); }
});

async function toggleAvailable(id, current) {
  try { await api.patch(`/admin/menu/items/${id}`, { is_available: !current }); await loadItems(); } catch (err) { toast.error(err.message); }
}
async function deleteItem(id) {
  if (!confirm('Delete this menu item?')) return;
  try { await api.del(`/admin/menu/items/${id}`); toast.success('Item deleted.'); await loadItems(); } catch (err) { toast.error(err.message); }
}
async function deleteCategory(id) {
  if (!confirm('Delete this category? Items will become uncategorized.')) return;
  try { await api.del(`/admin/menu/categories/${id}`); toast.success('Category deleted.'); await loadCategories(); await loadItems(); } catch (err) { toast.error(err.message); }
}