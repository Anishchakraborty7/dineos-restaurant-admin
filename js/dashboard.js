document.addEventListener('DOMContentLoaded', async () => {
  auth.requireAuth();
  await Promise.all([loadAnalytics(), loadPendingOrders()]);
  setInterval(loadPendingOrders, 30000); // refresh orders every 30s
});

async function loadAnalytics() {
  try {
    const res = await api.get('/admin/analytics');
    const d   = res.data;
    const os  = d.order_stats;

    document.getElementById('statOrdersToday').textContent   = os.orders_today   || 0;
    document.getElementById('statRevToday').textContent      = utils.currency(os.revenue_today);
    document.getElementById('statPending').textContent       = os.orders_pending  || 0;
    document.getElementById('statRevMonth').textContent      = utils.currency(os.revenue_month);

    renderRevenueChart(d.daily_revenue);
    renderTopItems(d.top_items);
    renderRecentOrders(d.recent_orders);
  } catch (err) {
    toast.error('Failed to load analytics');
  }
}

function renderRevenueChart(data) {
  const el  = document.getElementById('revenueChart');
  if (!data?.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No data yet</p>'; return; }
  const max = Math.max(...data.map(d => parseFloat(d.revenue))) || 1;
  el.innerHTML = data.map(d => {
    const h   = Math.max(6, Math.round((parseFloat(d.revenue) / max) * 80));
    const rev = utils.currency(d.revenue);
    return `
      <div class="chart-bar-wrap">
        <div class="chart-bar-val">${d.order_count}</div>
        <div class="chart-bar" style="height:${h}px" title="${d.day}: ${rev} / ${d.order_count} orders"></div>
        <div class="chart-bar-label">${d.day}</div>
      </div>`;
  }).join('');
}

function renderTopItems(items) {
  const el = document.getElementById('topItemsList');
  if (!items?.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No order data yet</p>'; return; }
  el.innerHTML = items.map((item, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:24px;height:24px;background:var(--primary-muted);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--primary)">${i+1}</span>
        <span style="font-weight:500;font-size:14px">${item.item_name}</span>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:600">${item.total_qty} sold</div>
        <div style="font-size:12px;color:var(--text-muted)">${utils.currency(item.total_revenue)}</div>
      </div>
    </div>`).join('');
}

async function loadPendingOrders() {
  try {
    const res = await api.get('/admin/orders?status=pending&limit=5');
    renderPendingOrders(res.data);
  } catch (err) { /* silent */ }
}

function renderPendingOrders(orders) {
  const el = document.getElementById('pendingOrdersList');
  if (!orders?.length) {
    el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)">🎉 No pending orders right now</div>';
    return;
  }
  el.innerHTML = orders.map(o => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600">Order #${o.order_number} <span style="font-size:12px;color:var(--text-muted)">${o.order_type}</span></div>
        <div style="font-size:13px;color:var(--text-muted)">${o.customer_name||'Guest'} · ${utils.timeAgo(o.created_at)}</div>
        <div style="font-size:13px;margin-top:4px">${o.items?.map(i => `${i.quantity}× ${i.item_name}`).join(', ')}</div>
      </div>
      <div style="text-align:right;display:flex;flex-direction:column;gap:6px">
        <strong>${utils.currency(o.total_amount)}</strong>
        <button onclick="confirmOrder('${o.order_id}')" class="btn btn-sm" style="background:#6366f1;color:#fff;padding:4px 12px">Confirm</button>
      </div>
    </div>`).join('');
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersBody');
  if (!orders?.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">No orders yet</td></tr>`; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight:600">#${o.order_number}</td>
      <td>${o.customer_name||'Guest'}<br><small style="color:var(--text-muted)">${o.customer_phone||''}</small></td>
      <td>${utils.currency(o.total_amount)}</td>
      <td>${utils.orderStatusBadge(o.status)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${utils.timeAgo(o.created_at)}</td>
    </tr>`).join('');
}

async function confirmOrder(id) {
  try {
    await api.patch(`/admin/orders/${id}/status`, { status: 'confirmed' });
    toast.success('Order confirmed!');
    loadPendingOrders();
    loadAnalytics();
  } catch (err) { toast.error(err.message); }
}