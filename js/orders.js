let currentPage = 1;
let currentFilters = {};
let autoRefreshInterval;

document.addEventListener('DOMContentLoaded', () => {
  auth.requireAuth();
  loadOrders();
  document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); if(confirm('Sign out?')) auth.logout(); });

  // Filters
  document.getElementById('filterStatus').addEventListener('change', () => { currentPage=1; currentFilters.status=document.getElementById('filterStatus').value; loadOrders(); });
  document.getElementById('filterType').addEventListener('change',   () => { currentPage=1; currentFilters.order_type=document.getElementById('filterType').value; loadOrders(); });
  document.getElementById('filterDate').addEventListener('change',   () => { currentPage=1; currentFilters.date=document.getElementById('filterDate').value; loadOrders(); });
  document.getElementById('refreshBtn').addEventListener('click', loadOrders);

  // Auto-refresh every 20s
  autoRefreshInterval = setInterval(loadOrders, 20000);
});

async function loadOrders() {
  const btn = document.getElementById('refreshBtn');
  btn.textContent = '🔄 Refreshing...';
  const params = new URLSearchParams({ page: currentPage, limit: 20, ...currentFilters });
  // Remove empty params
  for (const [k,v] of params.entries()) { if (!v) params.delete(k); }
  try {
    const res = await api.get(`/admin/orders?${params}`);
    renderOrders(res.data);
    renderPagination(res.pagination);
    document.getElementById('orderCount').textContent = `${res.pagination?.total || 0} orders`;
  } catch (err) { toast.error('Failed to load orders'); }
  finally { btn.textContent = '🔄 Refresh'; }
}

function renderOrders(orders) {
  const el = document.getElementById('ordersContainer');
  if (!orders?.length) {
    el.innerHTML = `<div style="text-align:center;padding:64px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:16px">📭</div><p>No orders found matching your filters</p></div>`;
    return;
  }
  el.innerHTML = orders.map(o => `
    <div class="order-card" id="order-${o.order_id}">
      <div class="order-card-header">
        <div>
          <span style="font-weight:700;font-size:16px">#${o.order_number}</span>
          <span style="margin-left:10px;font-size:12px;padding:3px 8px;border-radius:12px;background:var(--surface-2);color:var(--text-secondary)">${o.order_type}</span>
          ${o.table_number ? `<span style="margin-left:6px;font-size:12px;color:var(--text-muted)">Table ${o.table_number}</span>` : ''}
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          ${utils.orderStatusBadge(o.status)}
          <span style="font-size:13px;color:var(--text-muted)">${utils.timeAgo(o.created_at)}</span>
        </div>
      </div>
      <div class="order-card-body">
        <div class="order-customer">
          <div style="font-weight:500">${o.customer_name||'Guest Customer'}</div>
          <div style="font-size:13px;color:var(--text-muted)">${o.customer_phone||''}</div>
          ${o.delivery_address ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">📍 ${o.delivery_address}</div>` : ''}
        </div>
        <div class="order-items-list">
          ${(o.items||[]).map(i => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="font-weight:500">${i.quantity}×</span> ${i.item_name} <span style="float:right;color:var(--text-muted)">₹${i.total_price}</span></div>`).join('')}
        </div>
        <div class="order-footer">
          <div>
            <div style="font-size:12px;color:var(--text-muted)">Total</div>
            <div style="font-weight:700;font-size:18px;color:var(--primary)">₹${o.total_amount}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${getActionButtons(o)}
          </div>
        </div>
        ${o.customer_notes ? `<div style="margin-top:10px;padding:10px;background:rgba(245,158,11,0.08);border-radius:8px;font-size:13px;border-left:3px solid #f59e0b">📝 ${o.customer_notes}</div>` : ''}
      </div>
    </div>`).join('');
}

function getActionButtons(order) {
  const transitions = {
    pending:           ['confirmed', 'cancelled'],
    confirmed:         ['preparing', 'cancelled'],
    preparing:         ['ready'],
    ready:             ['out_for_delivery', 'delivered'],
    out_for_delivery:  ['delivered'],
  };
  const btnColors = {
    confirmed:'#6366f1', preparing:'#8b5cf6', ready:'#06b6d4',
    out_for_delivery:'#0ea5e9', delivered:'#10b981', cancelled:'#ef4444'
  };
  const next = transitions[order.status] || [];
  return next.map(s => `
    <button onclick="updateStatus('${order.order_id}','${s}')"
      style="padding:6px 14px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#fff;background:${btnColors[s]||'#6366f1'}">
      → ${s.replace('_',' ')}
    </button>`).join('');
}

async function updateStatus(orderId, status) {
  try {
    await api.patch(`/admin/orders/${orderId}/status`, { status });
    toast.success(`Order → ${status.replace('_',' ')}`);
    loadOrders();
  } catch (err) { toast.error(err.message); }
}

function renderPagination(pagination) {
  const el = document.getElementById('pagination');
  if (!pagination || pagination.pages <= 1) { el.innerHTML=''; return; }
  el.innerHTML = `
    <div style="display:flex;gap:8px;justify-content:center;margin-top:24px">
      <button class="btn btn-secondary btn-sm" onclick="changePage(${currentPage-1})" ${currentPage<=1?'disabled':''}>← Prev</button>
      <span style="font-size:13px;padding:6px 12px;color:var(--text-secondary)">Page ${pagination.page} of ${pagination.pages}</span>
      <button class="btn btn-secondary btn-sm" onclick="changePage(${currentPage+1})" ${currentPage>=pagination.pages?'disabled':''}>Next →</button>
    </div>`;
}

function changePage(p) { currentPage = p; loadOrders(); }