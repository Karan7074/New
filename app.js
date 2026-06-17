/* ============================================================
   Doge store — catalog, cart, and UI logic
   Vanilla JS, no build step. Cart persists in localStorage.
   ============================================================ */

/* ---------- Product catalog ---------- */
const PRODUCTS = [
  { id: 'doge-plush',   name: 'Classic Doge Plush',        cat: 'Toys',      emoji: '🧸', price: 24.99, was: 29.99, rating: 4.9, reviews: 1287, tag: 'sale',
    desc: 'Such soft. Much hug. A huggable Shiba plush stitched from premium fluff — the goodest boy for your shelf, desk, or bed.' },
  { id: 'wow-hoodie',   name: '"Much Wow" Hoodie',         cat: 'Apparel',   emoji: '🧥', price: 49.0,  rating: 4.8, reviews: 642, tag: 'new',
    desc: 'Heavyweight 400gsm fleece hoodie with an embroidered Doge crest. Cozy enough for very winter, stylish enough for wow.' },
  { id: 'shiba-mug',    name: 'Shiba Sunrise Mug',         cat: 'Home',      emoji: '☕', price: 16.5,  rating: 4.7, reviews: 410,
    desc: '350ml ceramic mug that reveals a smiling Shiba when you pour something hot. Microwave & dishwasher safe.' },
  { id: 'sticker-pack', name: 'Doge Sticker Pack (24)',    cat: 'Accessories', emoji: '✨', price: 9.99, rating: 4.9, reviews: 980, tag: 'hot',
    desc: '24 weatherproof vinyl stickers of every Doge mood. Stick them on laptops, bottles, bumpers — much decorate.' },
  { id: 'treat-box',    name: 'Premium Treat Box',          cat: 'Pets',      emoji: '🦴', price: 21.0,  rating: 4.8, reviews: 533,
    desc: 'Grain-free, vet-approved treats for real-life goodest boys. Made with single-source protein and zero filler.' },
  { id: 'snapback',     name: 'Doge Snapback Cap',         cat: 'Apparel',   emoji: '🧢', price: 27.0,  rating: 4.6, reviews: 221,
    desc: 'Structured 6-panel cap with a 3D-embroidered Shiba and adjustable snap. One size fits most very heads.' },
  { id: 'dog-bed',      name: 'Cloud Comfort Dog Bed',     cat: 'Pets',      emoji: '🛏️', price: 64.0, was: 79.0, rating: 4.9, reviews: 376, tag: 'sale',
    desc: 'Orthopedic memory-foam bed with a machine-washable cover. Such comfort your pup will refuse to leave.' },
  { id: 'phone-case',   name: 'Doge Phone Case',           cat: 'Accessories', emoji: '📱', price: 19.99, rating: 4.5, reviews: 298,
    desc: 'Shock-absorbing case with a glossy Doge print. Raised edges protect screen and camera. Many models supported.' },
  { id: 'enamel-pin',   name: 'Gold Doge Enamel Pin',      cat: 'Accessories', emoji: '📌', price: 8.5, rating: 4.8, reviews: 154, tag: 'new',
    desc: 'Hard-enamel pin with a polished gold finish and a double-clutch back so your good boy never falls off.' },
  { id: 'tote-bag',     name: 'Very Tote Bag',             cat: 'Accessories', emoji: '👜', price: 14.0, rating: 4.7, reviews: 187,
    desc: 'Heavy 12oz cotton canvas tote with reinforced straps. Carries groceries, books, and an unreasonable amount of treats.' },
  { id: 'socks',        name: 'Doge Crew Socks (3-pack)',  cat: 'Apparel',   emoji: '🧦', price: 15.0, rating: 4.6, reviews: 264,
    desc: 'Combed-cotton crew socks with a knit Shiba pattern. Three colorways for maximum daily wow.' },
  { id: 'mousepad',     name: 'XL Doge Desk Mat',          cat: 'Home',      emoji: '🖱️', price: 22.5, rating: 4.8, reviews: 342, tag: 'hot',
    desc: '900×400mm stitched-edge desk mat with a non-slip base. Smooth tracking for gaming and very productivity.' },
];

const CATEGORIES = ['All', 'Apparel', 'Pets', 'Home', 'Accessories', 'Toys'];

/* ---------- Helpers ---------- */
const money = (n) => '$' + n.toFixed(2);
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const TAG_LABEL = { sale: 'Sale', new: 'New', hot: 'Hot' };

function ratingStars(r) {
  const full = Math.round(r);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}

/* ---------- Cart (localStorage) ---------- */
const CART_KEY = 'doge_cart_v1';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  renderDrawer();
}
function addToCart(id, qty = 1) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
  const p = byId(id);
  showToast(`Added “${p.name}” — much wow! 🎉`);
}
function setQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
}
function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
}
function cartCount() {
  return Object.values(getCart()).reduce((a, b) => a + b, 0);
}
function cartSubtotal() {
  const cart = getCart();
  return Object.entries(cart).reduce((sum, [id, q]) => {
    const p = byId(id);
    return p ? sum + p.price * q : sum;
  }, 0);
}

function updateCartBadge() {
  const n = cartCount();
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = n;
    el.hidden = n === 0;
  });
}

/* ---------- Toast ---------- */
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
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Product card markup ---------- */
function productCardHTML(p) {
  const tag = p.tag ? `<span class="product-tag tag-${p.tag}">${TAG_LABEL[p.tag] || p.tag}</span>` : '';
  const was = p.was ? `<span class="was">${money(p.was)}</span>` : '';
  return `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-thumb" aria-label="${p.name}">
        ${tag}
        <span aria-hidden="true">${p.emoji}</span>
      </a>
      <div class="product-body">
        <span class="product-cat">${p.cat}</span>
        <a class="product-name" href="product.html?id=${p.id}">${p.name}</a>
        <span class="product-rating">${ratingStars(p.rating)} <span class="count">(${p.reviews})</span></span>
        <div class="product-foot">
          <span class="price">${was}${money(p.price)}</span>
          <button class="btn btn-primary btn-sm" data-add="${p.id}">Add</button>
        </div>
      </div>
    </article>`;
}

/* ---------- Home / listing render ---------- */
let activeCat = 'All';
let searchTerm = '';

function renderCatPills() {
  const host = document.getElementById('cat-pills');
  if (!host) return;
  host.innerHTML = CATEGORIES.map(
    (c) => `<button class="cat-pill ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  let list = PRODUCTS;
  if (activeCat !== 'All') list = list.filter((p) => p.cat === activeCat);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter((p) => (p.name + ' ' + p.cat + ' ' + p.desc).toLowerCase().includes(q));
  }
  grid.innerHTML = list.length
    ? list.map(productCardHTML).join('')
    : `<div class="empty-state" style="grid-column:1/-1"><span class="emo">🐾</span>No products match. Try another search — much patience.</div>`;
}

function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const featured = PRODUCTS.filter((p) => p.tag).slice(0, 4);
  grid.innerHTML = featured.map(productCardHTML).join('');
}

/* ---------- Cart drawer ---------- */
function ensureDrawer() {
  if (document.getElementById('cart-drawer')) return;
  const html = `
    <div class="drawer-overlay" id="drawer-overlay"></div>
    <aside class="drawer" id="cart-drawer" aria-label="Shopping cart" aria-hidden="true">
      <div class="drawer-head">
        <h3>Your Bag 🛍️</h3>
        <button class="drawer-close" id="drawer-close" aria-label="Close cart">×</button>
      </div>
      <div class="drawer-body" id="drawer-body"></div>
      <div class="drawer-foot" id="drawer-foot"></div>
    </aside>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
}

function renderDrawer() {
  const body = document.getElementById('drawer-body');
  const foot = document.getElementById('drawer-foot');
  if (!body || !foot) return;
  const cart = getCart();
  const ids = Object.keys(cart);
  if (!ids.length) {
    body.innerHTML = `<div class="empty-state"><span class="emo">🐶</span>Your bag is empty.<br>Such void. Add something wow!</div>`;
    foot.innerHTML = `<a href="index.html#shop" class="btn btn-ghost btn-block">Browse products</a>`;
    return;
  }
  body.innerHTML = ids.map((id) => {
    const p = byId(id); const q = cart[id];
    return `
      <div class="cart-line">
        <div class="cart-line-thumb" aria-hidden="true">${p.emoji}</div>
        <div class="cart-line-info">
          <div class="cart-line-name">${p.name}</div>
          <div class="cart-line-price">${money(p.price)}</div>
          <div class="cart-line-bottom">
            <div class="qty-mini">
              <button data-dec="${id}" aria-label="Decrease quantity">−</button>
              <span>${q}</span>
              <button data-inc="${id}" aria-label="Increase quantity">+</button>
            </div>
            <button class="link-remove" data-remove="${id}">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');
  foot.innerHTML = `
    <div class="drawer-subtotal"><span>Subtotal</span><span>${money(cartSubtotal())}</span></div>
    <p class="drawer-note">Shipping & taxes calculated at checkout.</p>
    <a href="cart.html" class="btn btn-primary btn-block">Checkout →</a>`;
}

function openDrawer() {
  ensureDrawer();
  renderDrawer();
  document.getElementById('drawer-overlay').classList.add('open');
  const d = document.getElementById('cart-drawer');
  d.classList.add('open');
  d.setAttribute('aria-hidden', 'false');
}
function closeDrawer() {
  const ov = document.getElementById('drawer-overlay');
  const d = document.getElementById('cart-drawer');
  if (ov) ov.classList.remove('open');
  if (d) { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); }
}

/* ---------- Global event delegation ---------- */
document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) { addToCart(add.dataset.add); return; }

  const open = e.target.closest('[data-open-cart]');
  if (open) { e.preventDefault(); openDrawer(); return; }

  const inc = e.target.closest('[data-inc]');
  if (inc) { setQty(inc.dataset.inc, (getCart()[inc.dataset.inc] || 0) + 1); return; }
  const dec = e.target.closest('[data-dec]');
  if (dec) { setQty(dec.dataset.dec, (getCart()[dec.dataset.dec] || 0) - 1); return; }
  const rm = e.target.closest('[data-remove]');
  if (rm) { removeFromCart(rm.dataset.remove); return; }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

/* ---------- Category & search wiring ---------- */
document.addEventListener('click', (e) => {
  const pill = e.target.closest('[data-cat]');
  if (pill) {
    activeCat = pill.dataset.cat;
    renderCatPills();
    renderProducts();
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

function wireSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    searchTerm = input.value.trim();
    activeCat = 'All';
    renderCatPills();
    renderProducts();
  });
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderCatPills();
  renderFeatured();
  renderProducts();
  wireSearch();
  ensureDrawer();
  // page-specific hooks
  if (typeof window.onDogeReady === 'function') window.onDogeReady();
});
