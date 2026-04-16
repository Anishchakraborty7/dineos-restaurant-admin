const CONFIG = {
  // Auto-detects: uses production URL in production, localhost in local dev
  API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://dineos-api.onrender.com',
  TOKEN_KEY:      'dineos_admin_token',
  API_KEY_STORE:  'dineos_admin_apikey',
  RESTAURANT_KEY: 'dineos_admin_restaurant',
};

// ============================================================
// API Helper — sends X-API-Key + JWT Bearer on every request
// ============================================================
const api = {
  _getToken()  { return localStorage.getItem(CONFIG.TOKEN_KEY); },
  _getApiKey() { return localStorage.getItem(CONFIG.API_KEY_STORE); },

  _headers(extra = {}) {
    const token  = this._getToken();
    const apiKey = this._getApiKey();
    return {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      ...(token  ? { Authorization: `Bearer ${token}` } : {}),
      ...extra
    };
  },

  async request(method, path, body = null) {
    const opts = { method, headers: this._headers() };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res  = await fetch(`${CONFIG.API_BASE}${path}`, opts);
      const data = await res.json();
      if (res.status === 401 && !path.includes('/login')) { auth.logout(); return null; }
      if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status, data);
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Network error. Is the server running?', 0);
    }
  },

  get(path)         { return this.request('GET', path); },
  post(path, body)  { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path)         { return this.request('DELETE', path); },
};

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message); this.status = status; this.data = data;
  }
}

// ============================================================
// Auth Helper
// ============================================================
const auth = {
  getToken()      { return localStorage.getItem(CONFIG.TOKEN_KEY); },
  getApiKey()     { return localStorage.getItem(CONFIG.API_KEY_STORE); },
  getRestaurant() { const d = localStorage.getItem(CONFIG.RESTAURANT_KEY); return d ? JSON.parse(d) : null; },
  getUser()       { const d = localStorage.getItem('dineos_admin_user'); return d ? JSON.parse(d) : null; },

  setSession(token, user, restaurant, apiKey) {
    localStorage.setItem(CONFIG.TOKEN_KEY,      token);
    localStorage.setItem(CONFIG.API_KEY_STORE,  apiKey);
    localStorage.setItem(CONFIG.RESTAURANT_KEY, JSON.stringify(restaurant));
    localStorage.setItem('dineos_admin_user',   JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.API_KEY_STORE);
    localStorage.removeItem(CONFIG.RESTAURANT_KEY);
    localStorage.removeItem('dineos_admin_user');
    window.location.href = 'index.html';
  },

  requireAuth() {
    if (!this.getToken() || !this.getApiKey()) {
      window.location.href = 'index.html';
      return null;
    }
    return this.getUser();
  }
};

// ============================================================
// Toast Notifications
// ============================================================
const toast = {
  _container: null,
  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },
  show(message, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', info: '💡', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||'💡'}</span><span class="toast-msg">${message}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
    this._getContainer().appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 10);
    setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 300); }, duration);
  },
  success(msg, d) { this.show(msg, 'success', d); },
  error(msg, d)   { this.show(msg, 'error', d||6000); },
  info(msg, d)    { this.show(msg, 'info', d); },
};

// ============================================================
// Utilities
// ============================================================
const utils = {
  formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); },
  formatDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); },
  timeAgo(d) {
    if (!d) return '—';
    const s = Math.floor((new Date() - new Date(d)) / 1000);
    for (const [sec, unit] of [[86400,'day'],[3600,'hr'],[60,'min']]) {
      const n = Math.floor(s / sec); if (n >= 1) return `${n}${unit} ago`;
    }
    return 'Just now';
  },
  currency(n) { return '₹' + parseFloat(n||0).toLocaleString('en-IN'); },
  initials(name='') { return name.split(' ').map(w=>w[0]).join('').toUpperCase().substring(0,2)||'R'; },
  statusColor(status) {
    const map = {
      pending:'#f59e0b', confirmed:'#6366f1', preparing:'#8b5cf6',
      ready:'#06b6d4', out_for_delivery:'#0ea5e9', delivered:'#10b981', cancelled:'#ef4444'
    };
    return map[status] || '#6b7280';
  },
  orderStatusBadge(status) {
    return `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${this.statusColor(status)}22;color:${this.statusColor(status)};border:1px solid ${this.statusColor(status)}44">${status?.replace('_',' ').toUpperCase()}</span>`;
  },
  debounce(fn, ms=300) { let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); }; },
};

// ============================================================
// Apply restaurant branding from stored config
// ============================================================
function applyBranding() {
  const restaurant = auth.getRestaurant();
  if (!restaurant) return;
  const root = document.documentElement;
  if (restaurant.primary_color)   root.style.setProperty('--primary',       restaurant.primary_color);
  if (restaurant.secondary_color) root.style.setProperty('--secondary',     restaurant.secondary_color);
  const nameEl = document.getElementById('sidebarRestaurantName');
  if (nameEl) nameEl.textContent = restaurant.name || 'Restaurant';
  const avatarEl = document.getElementById('sidebarAvatar');
  if (avatarEl) avatarEl.textContent = utils.initials(restaurant.name);
  const nameEl2 = document.getElementById('sidebarName');
  const user = auth.getUser();
  if (nameEl2 && user) nameEl2.textContent = user.name || 'Admin';
}

// ============================================================
// Sidebar active highlight
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  applyBranding();
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item[href]').forEach(item => {
    const href = item.getAttribute('href');
    if (href && path.includes(href.replace('.html',''))) item.classList.add('active');
  });
});