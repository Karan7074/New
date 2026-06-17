'use strict';
/* ==================================================================
 * Doge store — zero-dependency Node.js server.
 * Serves the static frontend from /public and a JSON REST API under
 * /api. Run with:  node server.js   (or: npm start)
 * ================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const db = require('./lib/db');
const auth = require('./lib/auth');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

/* ---- one-time admin seed ---- */
(function seedAdmin() {
  if (!db.data.users.some((u) => u.isAdmin)) {
    const { salt, hash } = auth.hashPassword('doge1234');
    db.data.users.push({
      id: 'usr_admin', name: 'Doge Admin', email: 'admin@doge.com',
      salt, hash, isAdmin: true, createdAt: Date.now(),
    });
    db.save();
  }
})();

/* ---- pricing rules (shared with the client copy in cart.html) ---- */
const SHIPPING_THRESHOLD = 50;
const SHIPPING_FEE = 5.99;
const TAX_RATE = 0.08;
const round2 = (n) => Math.round(n * 100) / 100;

/* ---- helpers ---- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) { reject(new Error('payload too large')); req.destroy(); }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function cartView(session) {
  const items = [];
  let subtotal = 0;
  for (const [pid, qty] of Object.entries(session.cart || {})) {
    const p = db.data.products.find((x) => x.id === pid);
    if (!p) continue;
    const lineTotal = round2(p.price * qty);
    subtotal += lineTotal;
    items.push({ id: p.id, name: p.name, emoji: p.emoji, price: p.price, qty, lineTotal, stock: p.stock });
  }
  subtotal = round2(subtotal);
  const shipping = subtotal === 0 || subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + shipping + tax);
  const count = items.reduce((a, i) => a + i.qty, 0);
  return { items, count, subtotal, shipping, tax, total,
           freeShippingThreshold: SHIPPING_THRESHOLD };
}

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* ---- static files ---- */
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  // resolve safely inside PUBLIC_DIR (block path traversal)
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA-ish fallback: unknown non-file path → home
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      return fs.readFile(fallback, (e2, buf) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(404, { 'Content-Type': MIME['.html'] });
        res.end(buf);
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ================== API ================== */
async function handleApi(req, res, pathname, session, user) {
  const method = req.method;
  const seg = pathname.split('/').filter(Boolean); // ['api', ...]

  /* ---- products ---- */
  if (pathname === '/api/products' && method === 'GET') {
    return sendJSON(res, 200, { products: db.data.products });
  }
  if (seg[1] === 'products' && seg[2] && method === 'GET') {
    const p = db.data.products.find((x) => x.id === seg[2]);
    return p ? sendJSON(res, 200, { product: p }) : sendJSON(res, 404, { error: 'Product not found' });
  }

  /* ---- auth ---- */
  if (pathname === '/api/auth/me' && method === 'GET') {
    return sendJSON(res, 200, { user: auth.publicUser(user) });
  }
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { name, email, password } = await readBody(req);
    if (!name || !isEmail(email) || !password || password.length < 6)
      return sendJSON(res, 400, { error: 'Provide a name, valid email, and a 6+ char password.' });
    if (db.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      return sendJSON(res, 409, { error: 'An account with that email already exists.' });
    const { salt, hash } = auth.hashPassword(password);
    const newUser = { id: 'usr_' + crypto.randomBytes(6).toString('hex'), name: String(name).slice(0, 80),
      email, salt, hash, isAdmin: false, createdAt: Date.now() };
    db.data.users.push(newUser);
    session.userId = newUser.id;
    db.save();
    return sendJSON(res, 201, { user: auth.publicUser(newUser) });
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = await readBody(req);
    const u = db.data.users.find((x) => x.email.toLowerCase() === String(email || '').toLowerCase());
    if (!u || !auth.verifyPassword(String(password || ''), u.salt, u.hash))
      return sendJSON(res, 401, { error: 'Invalid email or password.' });
    session.userId = u.id;
    db.save();
    return sendJSON(res, 200, { user: auth.publicUser(u) });
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    session.userId = null;
    db.save();
    return sendJSON(res, 200, { ok: true });
  }

  /* ---- cart ---- */
  if (pathname === '/api/cart' && method === 'GET') {
    return sendJSON(res, 200, cartView(session));
  }
  if (pathname === '/api/cart' && method === 'POST') { // add qty (relative)
    const { productId, qty } = await readBody(req);
    const p = db.data.products.find((x) => x.id === productId);
    if (!p) return sendJSON(res, 404, { error: 'Product not found' });
    const add = Math.max(1, parseInt(qty, 10) || 1);
    const next = (session.cart[productId] || 0) + add;
    if (next > p.stock) return sendJSON(res, 409, { error: `Only ${p.stock} in stock.` });
    session.cart[productId] = next;
    db.save();
    return sendJSON(res, 200, cartView(session));
  }
  if (pathname === '/api/cart' && method === 'PUT') { // set qty (absolute)
    const { productId, qty } = await readBody(req);
    const p = db.data.products.find((x) => x.id === productId);
    if (!p) return sendJSON(res, 404, { error: 'Product not found' });
    const q = parseInt(qty, 10);
    if (isNaN(q) || q <= 0) delete session.cart[productId];
    else if (q > p.stock) return sendJSON(res, 409, { error: `Only ${p.stock} in stock.` });
    else session.cart[productId] = q;
    db.save();
    return sendJSON(res, 200, cartView(session));
  }
  if (pathname === '/api/cart' && method === 'DELETE') { // clear
    session.cart = {};
    db.save();
    return sendJSON(res, 200, cartView(session));
  }
  if (seg[1] === 'cart' && seg[2] && method === 'DELETE') { // remove one
    delete session.cart[seg[2]];
    db.save();
    return sendJSON(res, 200, cartView(session));
  }

  /* ---- orders ---- */
  if (pathname === '/api/orders' && method === 'POST') {
    const body = await readBody(req);
    const c = body.customer || {};
    if (!c.name || !isEmail(c.email) || !c.address || !c.city || !c.zip)
      return sendJSON(res, 400, { error: 'Please complete all shipping fields.' });
    const card = String((body.payment && body.payment.card) || '').replace(/\s/g, '');
    if (card.length < 12) return sendJSON(res, 400, { error: 'Enter a valid card number.' });

    const entries = Object.entries(session.cart || {});
    if (!entries.length) return sendJSON(res, 400, { error: 'Your bag is empty.' });

    // validate stock, then build order
    const lines = [];
    for (const [pid, qty] of entries) {
      const p = db.data.products.find((x) => x.id === pid);
      if (!p) return sendJSON(res, 409, { error: 'A product in your bag is no longer available.' });
      if (qty > p.stock) return sendJSON(res, 409, { error: `Only ${p.stock} of "${p.name}" left.` });
      lines.push({ id: p.id, name: p.name, emoji: p.emoji, price: p.price, qty, lineTotal: round2(p.price * qty) });
    }
    const view = cartView(session);
    // commit: decrement stock
    for (const ln of lines) {
      const p = db.data.products.find((x) => x.id === ln.id);
      p.stock -= ln.qty;
    }
    const order = {
      id: 'DOGE-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      userId: session.userId || null,
      customer: { name: String(c.name).slice(0, 80), email: c.email, address: String(c.address).slice(0, 160),
                  city: String(c.city).slice(0, 80), zip: String(c.zip).slice(0, 20) },
      cardLast4: card.slice(-4),
      items: lines,
      subtotal: view.subtotal, shipping: view.shipping, tax: view.tax, total: view.total,
      status: 'paid', createdAt: Date.now(),
    };
    db.data.orders.push(order);
    session.cart = {};
    db.save();
    return sendJSON(res, 201, { order });
  }
  if (pathname === '/api/orders' && method === 'GET') {
    if (!user) return sendJSON(res, 401, { error: 'Please log in to view your orders.' });
    const mine = db.data.orders.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
    return sendJSON(res, 200, { orders: mine });
  }
  if (seg[1] === 'orders' && seg[2] && method === 'GET') {
    const o = db.data.orders.find((x) => x.id === seg[2]);
    if (!o) return sendJSON(res, 404, { error: 'Order not found' });
    if (o.userId && (!user || (user.id !== o.userId && !user.isAdmin)))
      return sendJSON(res, 403, { error: 'Not your order.' });
    return sendJSON(res, 200, { order: o });
  }

  /* ---- admin ---- */
  if (seg[1] === 'admin') {
    if (!user || !user.isAdmin) return sendJSON(res, 403, { error: 'Admin only.' });

    if (pathname === '/api/admin/orders' && method === 'GET') {
      const orders = [...db.data.orders].sort((a, b) => b.createdAt - a.createdAt);
      return sendJSON(res, 200, { orders });
    }
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const revenue = round2(db.data.orders.reduce((s, o) => s + o.total, 0));
      return sendJSON(res, 200, {
        stats: { orders: db.data.orders.length, revenue, products: db.data.products.length,
                 customers: db.data.users.filter((u) => !u.isAdmin).length },
      });
    }
    if (pathname === '/api/admin/products' && method === 'POST') { // create or update
      const b = await readBody(req);
      if (!b.name || !(b.price >= 0)) return sendJSON(res, 400, { error: 'Name and price are required.' });
      const existing = b.id && db.data.products.find((x) => x.id === b.id);
      if (existing) {
        Object.assign(existing, {
          name: b.name, cat: b.cat || existing.cat, emoji: b.emoji || existing.emoji,
          price: +b.price, stock: b.stock != null ? +b.stock : existing.stock,
          desc: b.desc != null ? b.desc : existing.desc, tag: b.tag || undefined,
        });
        db.save();
        return sendJSON(res, 200, { product: existing });
      }
      const id = (b.id || b.name).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
        || 'item-' + crypto.randomBytes(3).toString('hex');
      if (db.data.products.some((x) => x.id === id)) return sendJSON(res, 409, { error: 'Product id already exists.' });
      const product = { id, name: b.name, cat: b.cat || 'Accessories', emoji: b.emoji || '🐾',
        price: +b.price, rating: 5, reviews: 0, stock: b.stock != null ? +b.stock : 10,
        desc: b.desc || '', tag: b.tag || undefined };
      db.data.products.push(product);
      db.save();
      return sendJSON(res, 201, { product });
    }
    if (seg[2] === 'products' && seg[3] && method === 'DELETE') {
      const i = db.data.products.findIndex((x) => x.id === seg[3]);
      if (i === -1) return sendJSON(res, 404, { error: 'Product not found' });
      const [removed] = db.data.products.splice(i, 1);
      db.save();
      return sendJSON(res, 200, { removed });
    }
  }

  return sendJSON(res, 404, { error: 'Unknown endpoint' });
}

/* ================== server ================== */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    if (pathname.startsWith('/api/')) {
      const { session } = auth.getSession(req, res);
      const user = auth.currentUser(session);
      await handleApi(req, res, pathname, session, user);
    } else {
      serveStatic(req, res, pathname);
    }
  } catch (err) {
    if (!res.headersSent) sendJSON(res, 400, { error: err.message || 'Bad request' });
    else res.end();
  }
});

// '0.0.0.0' so the app is reachable on hosted platforms (Railway, etc.),
// not just the loopback interface.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🐕  Doge store running → http://localhost:${PORT}`);
  console.log(`    Admin login: admin@doge.com / doge1234\n`);
});
