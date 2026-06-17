/* ============================================================
   Doge store — frontend app (talks to the /api backend)
   Shared across all pages. Renders header/footer, manages the
   server-backed cart, auth state, the cart drawer, and toasts.
   ============================================================ */

const Doge = {
  products: [],
  cart: { items: [], count: 0, subtotal: 0, shipping: 0, tax: 0, total: 0, freeShippingThreshold: 50 },
  user: null,
  activeCat: 'All',
  searchTerm: '',
};
const CATEGORIES = ['All', 'Apparel', 'Pets', 'Home', 'Accessories', 'Toys'];
const TAG_LABEL = { sale: 'Sale', new: 'New', hot: 'Hot' };
const PAGE = (location.pathname.split('/').pop() || 'index.html');

/* ---------- helpers ---------- */
const money = (n) => '$' + Number(n || 0).toFixed(2);
const byId = (id) => Doge.products.find((p) => p.id === id);
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function ratingStars(r) {
  const full = Math.round(r || 0);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}

/* ---------- API ---------- */
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ---------- toast ---------- */
let toastTimer;
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- cart ---------- */
function applyCart(cart) {
  Doge.cart = cart;
  updateCartBadge();
  renderDrawer();
  if (typeof window.onCartChange === 'function') window.onCartChange();
}
async function addToCart(id, qty = 1) {
  try {
    applyCart(await api('POST', '/api/cart', { productId: id, qty }));
    const p = byId(id);
    showToast(`Added “${p ? p.name : 'item'}” — much wow! 🎉`);
  } catch (e) { showToast('⚠️ ' + e.message); }
}
async function setQty(id, qty) {
  try { applyCart(await api('PUT', '/api/cart', { productId: id, qty })); }
  catch (e) { showToast('⚠️ ' + e.message); }
}
async function removeFromCart(id) {
  try { applyCart(await api('DELETE', '/api/cart/' + id)); }
  catch (e) { showToast('⚠️ ' + e.message); }
}
function updateCartBadge() {
  const n = Doge.cart.count || 0;
  document.querySelectorAll('.cart-count').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
}

/* ---------- header / footer (rendered once per page) ---------- */
function renderHeader() {
  const mount = document.getElementById('app-header');
  if (!mount) return;
  const onHome = PAGE === 'index.html' || PAGE === '';
  const active = (f) => (PAGE === f ? 'active' : '');
  mount.innerHTML = `
  <header class="site-header">
    <div class="wrap header-inner">
      <a href="index.html" class="brand"><span class="brand-mark" aria-hidden="true">🐕</span> Do<b>ge</b></a>
      <nav class="main-nav" aria-label="Primary">
        <a href="index.html" class="${active('index.html')}">Home</a>
        <a href="index.html#shop">Shop</a>
        <a href="account.html" class="${active('account.html')}">Account</a>
        <span id="admin-link"></span>
      </nav>
      <div class="header-actions">
        ${onHome ? `<label class="search"><span aria-hidden="true">🔍</span>
          <input id="search-input" type="search" placeholder="Search such products…" aria-label="Search products" /></label>` : ''}
        <span id="auth-area"></span>
        <button class="cart-btn" data-open-cart aria-label="Open cart">🛍️<span class="cart-count" hidden>0</span></button>
      </div>
    </div>
  </header>`;
  wireSearch();
}

function renderAuthArea() {
  const el = document.getElementById('auth-area');
  if (el) {
    el.innerHTML = Doge.user
      ? `<a class="btn btn-ghost btn-sm" href="account.html">👤 ${escapeHtml(Doge.user.name.split(' ')[0])}</a>`
      : `<a class="btn btn-ghost btn-sm" href="account.html">Log in</a>`;
  }
  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    adminLink.innerHTML = (Doge.user && Doge.user.isAdmin)
      ? `<a href="admin.html" class="${PAGE === 'admin.html' ? 'active' : ''}">⚙️ Admin</a>` : '';
  }
}

function renderFooter() {
  const mount = document.getElementById('app-footer');
  if (!mount) return;
  mount.innerHTML = `
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <div class="brand" style="color:#fff;margin-bottom:10px"><span class="brand-mark" aria-hidden="true">🐕</span> Do<b style="color:var(--brand)">ge</b></div>
          <p>Such shop. Much wow. Premium goods for good boys and the humans who love them.</p>
        </div>
        <div><h4>Shop</h4><a href="index.html#shop">Apparel</a><a href="index.html#shop">Pet supplies</a><a href="index.html#shop">Accessories</a><a href="index.html#shop">Home</a></div>
        <div><h4>Support</h4><a href="#">Shipping</a><a href="#">Returns</a><a href="account.html">Track order</a><a href="#">Contact</a></div>
        <div><h4>Account</h4><a href="account.html">Sign in</a><a href="account.html">Register</a><a href="account.html">My orders</a></div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Doge Store. All wows reserved.</span>
        <span>Made with 💛 and many treats.</span>
      </div>
    </div>
  </footer>`;
}

/* ---------- auth actions ---------- */
async function logout() {
  try { await api('POST', '/api/auth/logout'); } catch {}
  Doge.user = null;
  showToast('Logged out. Such bye 👋');
  setTimeout(() => (location.href = 'index.html'), 500);
}

/* ---------- product cards ---------- */
function productCardHTML(p) {
  const tag = p.tag ? `<span class="product-tag tag-${p.tag}">${TAG_LABEL[p.tag] || p.tag}</span>` : '';
  const was = p.was ? `<span class="was">${money(p.was)}</span>` : '';
  const out = p.stock === 0;
  return `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-thumb" aria-label="${escapeHtml(p.name)}">
        ${tag}${out ? `<span class="product-tag tag-sale" style="left:auto;right:12px;background:var(--muted)">Sold out</span>` : ''}
        <span aria-hidden="true">${p.emoji}</span>
      </a>
      <div class="product-body">
        <span class="product-cat">${escapeHtml(p.cat)}</span>
        <a class="product-name" href="product.html?id=${p.id}">${escapeHtml(p.name)}</a>
        <span class="product-rating">${ratingStars(p.rating)} <span class="count">(${p.reviews})</span></span>
        <div class="product-foot">
          <span class="price">${was}${money(p.price)}</span>
          ${out ? `<button class="btn btn-ghost btn-sm" disabled>Sold out</button>`
                : `<button class="btn btn-primary btn-sm" data-add="${p.id}">Add</button>`}
        </div>
      </div>
    </article>`;
}

/* ---------- home / listing ---------- */
function renderCatPills() {
  const host = document.getElementById('cat-pills');
  if (!host) return;
  host.innerHTML = CATEGORIES.map(
    (c) => `<button class="cat-pill ${c === Doge.activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
}
function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  let list = Doge.products;
  if (Doge.activeCat !== 'All') list = list.filter((p) => p.cat === Doge.activeCat);
  if (Doge.searchTerm) {
    const q = Doge.searchTerm.toLowerCase();
    list = list.filter((p) => (p.name + ' ' + p.cat + ' ' + p.desc).toLowerCase().includes(q));
  }
  grid.innerHTML = list.length
    ? list.map(productCardHTML).join('')
    : `<div class="empty-state" style="grid-column:1/-1"><span class="emo">🐾</span>No products match. Try another search — much patience.</div>`;
}
function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  grid.innerHTML = Doge.products.filter((p) => p.tag).slice(0, 4).map(productCardHTML).join('');
}
function wireSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    Doge.searchTerm = input.value.trim();
    Doge.activeCat = 'All';
    renderCatPills();
    renderProducts();
  });
}

/* ---------- cart drawer ---------- */
function ensureDrawer() {
  if (document.getElementById('cart-drawer')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="drawer-overlay" id="drawer-overlay"></div>
    <aside class="drawer" id="cart-drawer" aria-label="Shopping cart" aria-hidden="true">
      <div class="drawer-head"><h3>Your Bag 🛍️</h3><button class="drawer-close" id="drawer-close" aria-label="Close cart">×</button></div>
      <div class="drawer-body" id="drawer-body"></div>
      <div class="drawer-foot" id="drawer-foot"></div>
    </aside>`);
  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
}
function renderDrawer() {
  const body = document.getElementById('drawer-body');
  const foot = document.getElementById('drawer-foot');
  if (!body || !foot) return;
  const items = Doge.cart.items || [];
  if (!items.length) {
    body.innerHTML = `<div class="empty-state"><span class="emo">🐶</span>Your bag is empty.<br>Such void. Add something wow!</div>`;
    foot.innerHTML = `<a href="index.html#shop" class="btn btn-ghost btn-block">Browse products</a>`;
    return;
  }
  body.innerHTML = items.map((it) => `
    <div class="cart-line">
      <div class="cart-line-thumb" aria-hidden="true">${it.emoji}</div>
      <div class="cart-line-info">
        <div class="cart-line-name">${escapeHtml(it.name)}</div>
        <div class="cart-line-price">${money(it.price)}</div>
        <div class="cart-line-bottom">
          <div class="qty-mini">
            <button data-dec="${it.id}" aria-label="Decrease quantity">−</button>
            <span>${it.qty}</span>
            <button data-inc="${it.id}" aria-label="Increase quantity">+</button>
          </div>
          <button class="link-remove" data-remove="${it.id}">Remove</button>
        </div>
      </div>
    </div>`).join('');
  foot.innerHTML = `
    <div class="drawer-subtotal"><span>Subtotal</span><span>${money(Doge.cart.subtotal)}</span></div>
    <p class="drawer-note">Shipping & taxes calculated at checkout.</p>
    <a href="cart.html" class="btn btn-primary btn-block">Checkout →</a>`;
}
function openDrawer() {
  ensureDrawer(); renderDrawer();
  document.getElementById('drawer-overlay').classList.add('open');
  const d = document.getElementById('cart-drawer');
  d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
}
function closeDrawer() {
  const ov = document.getElementById('drawer-overlay');
  const d = document.getElementById('cart-drawer');
  if (ov) ov.classList.remove('open');
  if (d) { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); }
}

/* ---------- global event delegation ---------- */
document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');     if (add) return addToCart(add.dataset.add);
  const open = e.target.closest('[data-open-cart]'); if (open) { e.preventDefault(); return openDrawer(); }
  const inc = e.target.closest('[data-inc]');     if (inc) { const it = (Doge.cart.items || []).find((x) => x.id === inc.dataset.inc); return setQty(inc.dataset.inc, (it ? it.qty : 0) + 1); }
  const dec = e.target.closest('[data-dec]');     if (dec) { const it = (Doge.cart.items || []).find((x) => x.id === dec.dataset.dec); return setQty(dec.dataset.dec, (it ? it.qty : 0) - 1); }
  const rm = e.target.closest('[data-remove]');   if (rm) return removeFromCart(rm.dataset.remove);
  const lo = e.target.closest('[data-logout]');   if (lo) { e.preventDefault(); return logout(); }
  const pill = e.target.closest('[data-cat]');
  if (pill) {
    Doge.activeCat = pill.dataset.cat; Doge.searchTerm = '';
    renderCatPills(); renderProducts();
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  renderHeader();
  renderFooter();
  ensureDrawer();
  try {
    // establish session first (sets cookie), then load the rest in parallel
    const me = await api('GET', '/api/auth/me');
    Doge.user = me.user;
    const [prod, cart] = await Promise.all([api('GET', '/api/products'), api('GET', '/api/cart')]);
    Doge.products = prod.products;
    Doge.cart = cart;
  } catch (e) {
    showToast('⚠️ Could not reach the server. Is it running?');
  }
  updateCartBadge();
  renderAuthArea();
  renderCatPills();
  renderFeatured();
  renderProducts();
  renderDrawer();
  if (typeof window.onDogeReady === 'function') window.onDogeReady();
});
