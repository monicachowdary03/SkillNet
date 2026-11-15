// SkillNet — shared utilities

const API = {
  baseURL: '/api',

  getToken() {
    return localStorage.getItem('sn_token') || sessionStorage.getItem('sn_token');
  },

  getUser() {
    const raw = localStorage.getItem('sn_user') || sessionStorage.getItem('sn_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },

  setAuth(token, user) {
    localStorage.setItem('sn_token', token);
    localStorage.setItem('sn_user', JSON.stringify(user));
    // also keep in sessionStorage as backup
    sessionStorage.setItem('sn_token', token);
    sessionStorage.setItem('sn_user', JSON.stringify(user));
  },

  clearAuth() {
    ['sn_token', 'sn_user'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  },

  async request(method, path, data) {
    const token = this.getToken();
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data !== undefined) opts.body = JSON.stringify(data);

    let res;
    try {
      res = await fetch(this.baseURL + path, opts);
    } catch (networkErr) {
      throw new Error('Network error — is the server running?');
    }

    // Handle 401 — token expired/invalid
    if (res.status === 401) {
      this.clearAuth();
      const path = window.location.pathname;
      const publicPages = ['/', '/login', '/register', '/community'];
      const isPublic = publicPages.includes(path) || path.startsWith('/category') || path.startsWith('/question');
      if (!isPublic) {
        showToast('Session expired — please log in again.', 'error');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      }
      const json = await res.json().catch(() => ({ error: 'Session expired' }));
      throw new Error(json.error || 'Session expired');
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  },

  get(path)         { return this.request('GET',    path); },
  post(path, data)  { return this.request('POST',   path, data); },
  put(path, data)   { return this.request('PUT',    path, data); },
  delete(path)      { return this.request('DELETE', path); },
};

// ── Toast notifications ──────────────────────────────────────
function showToast(message, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast${type ? ' toast-' + type : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Time ago ─────────────────────────────────────────────────
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = [
    [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
    [3600,     'hour'], [60,      'minute'], [1, 'second']
  ];
  for (const [secs, unit] of intervals) {
    const val = Math.floor(seconds / secs);
    if (val >= 1) return `${val} ${unit}${val > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// ── Render navbar ────────────────────────────────────────────
async function renderNavUser() {
  const user = API.getUser();
  const navLinks = document.getElementById('nav-user-links');
  if (!navLinks) return;

  if (user) {
    let unreadCount = 0;
    try {
      const me = await API.get('/auth/me');
      // refresh stored user in case role changed
      API.setAuth(API.getToken(), { id: me._id, username: me.username, role: me.role });
      unreadCount = me.unreadNotifications || 0;
    } catch (e) { /* silently skip if /me fails */ }

    navLinks.innerHTML = `
      <a href="/notifications" class="nav-notif-btn" title="Notifications">
        🔔${unreadCount > 0 ? `<span class="notif-badge">${unreadCount}</span>` : ''}
      </a>
      <a href="/profile?id=${user.id}" class="nav-profile-link">
        <div class="nav-avatar">${user.username[0].toUpperCase()}</div>
        <span>${escHtml(user.username)}</span>
      </a>
      ${user.role === 'admin' || user.role === 'moderator'
        ? `<a href="/admin" class="nav-admin-link">⚙️ Admin</a>` : ''}
      <button onclick="logout()" class="btn btn-outline">Log out</button>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="/login"    class="btn btn-outline">Log in</a>
      <a href="/register" class="btn btn-primary">Sign up</a>
    `;
  }
}

async function logout() {
  try { await API.post('/auth/logout'); } catch (e) { /* ignore */ }
  API.clearAuth();
  window.location.href = '/';
}

// ── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function expertiseBadge(level) {
  const map = {
    beginner:     { color: '#10b981', label: 'Beginner' },
    intermediate: { color: '#f59e0b', label: 'Intermediate' },
    advanced:     { color: '#ef4444', label: 'Advanced' },
    expert:       { color: '#7c3aed', label: 'Expert' },
  };
  const { color, label } = map[level] || map.beginner;
  return `<span style="background:${color};color:white;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;">${label.toUpperCase()}</span>`;
}

// ── Static data ──────────────────────────────────────────────
const CATEGORIES = [
  'General', 'Web Development', 'Database', 'Algorithms', 'Data Structures',
  'Machine Learning', 'Mobile Development', 'DevOps', 'Security', 'Mathematics',
  'Computer Networks', 'Operating Systems', 'Software Engineering'
];

const CATEGORY_ICONS = {
  'Web Development':   '🌐',
  'Database':          '🗄️',
  'Algorithms':        '🧮',
  'Data Structures':   '🌲',
  'Machine Learning':  '🤖',
  'Mobile Development':'📱',
  'DevOps':            '⚙️',
  'Security':          '🔐',
  'Mathematics':       '📐',
  'Computer Networks': '🔗',
  'Operating Systems': '💻',
  'Software Engineering':'🏗️',
  'General':           '💬',
};

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', renderNavUser);
