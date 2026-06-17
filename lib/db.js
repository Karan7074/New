'use strict';
/* ------------------------------------------------------------------
 * Tiny JSON-file database. Zero dependencies.
 * Loads the whole DB into memory and persists synchronously on write.
 * Fine for a single-process demo store; swap for Postgres at scale.
 * ----------------------------------------------------------------- */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ---- Seed catalog (used only on first run) ---- */
const SEED_PRODUCTS = [
  { id: 'doge-plush',   name: 'Classic Doge Plush',        cat: 'Toys',        emoji: '🧸', price: 24.99, was: 29.99, rating: 4.9, reviews: 1287, stock: 40, tag: 'sale',
    desc: 'Such soft. Much hug. A huggable Shiba plush stitched from premium fluff — the goodest boy for your shelf, desk, or bed.' },
  { id: 'wow-hoodie',   name: '"Much Wow" Hoodie',         cat: 'Apparel',     emoji: '🧥', price: 49.0,  rating: 4.8, reviews: 642, stock: 25, tag: 'new',
    desc: 'Heavyweight 400gsm fleece hoodie with an embroidered Doge crest. Cozy enough for very winter, stylish enough for wow.' },
  { id: 'shiba-mug',    name: 'Shiba Sunrise Mug',         cat: 'Home',        emoji: '☕', price: 16.5,  rating: 4.7, reviews: 410, stock: 80,
    desc: '350ml ceramic mug that reveals a smiling Shiba when you pour something hot. Microwave & dishwasher safe.' },
  { id: 'sticker-pack', name: 'Doge Sticker Pack (24)',    cat: 'Accessories', emoji: '✨', price: 9.99,  rating: 4.9, reviews: 980, stock: 200, tag: 'hot',
    desc: '24 weatherproof vinyl stickers of every Doge mood. Stick them on laptops, bottles, bumpers — much decorate.' },
  { id: 'treat-box',    name: 'Premium Treat Box',         cat: 'Pets',        emoji: '🦴', price: 21.0,  rating: 4.8, reviews: 533, stock: 60,
    desc: 'Grain-free, vet-approved treats for real-life goodest boys. Made with single-source protein and zero filler.' },
  { id: 'snapback',     name: 'Doge Snapback Cap',         cat: 'Apparel',     emoji: '🧢', price: 27.0,  rating: 4.6, reviews: 221, stock: 35,
    desc: 'Structured 6-panel cap with a 3D-embroidered Shiba and adjustable snap. One size fits most very heads.' },
  { id: 'dog-bed',      name: 'Cloud Comfort Dog Bed',     cat: 'Pets',        emoji: '🛏️', price: 64.0, was: 79.0, rating: 4.9, reviews: 376, stock: 18, tag: 'sale',
    desc: 'Orthopedic memory-foam bed with a machine-washable cover. Such comfort your pup will refuse to leave.' },
  { id: 'phone-case',   name: 'Doge Phone Case',           cat: 'Accessories', emoji: '📱', price: 19.99, rating: 4.5, reviews: 298, stock: 90,
    desc: 'Shock-absorbing case with a glossy Doge print. Raised edges protect screen and camera. Many models supported.' },
  { id: 'enamel-pin',   name: 'Gold Doge Enamel Pin',      cat: 'Accessories', emoji: '📌', price: 8.5,  rating: 4.8, reviews: 154, stock: 150, tag: 'new',
    desc: 'Hard-enamel pin with a polished gold finish and a double-clutch back so your good boy never falls off.' },
  { id: 'tote-bag',     name: 'Very Tote Bag',             cat: 'Accessories', emoji: '👜', price: 14.0, rating: 4.7, reviews: 187, stock: 70,
    desc: 'Heavy 12oz cotton canvas tote with reinforced straps. Carries groceries, books, and an unreasonable amount of treats.' },
  { id: 'socks',        name: 'Doge Crew Socks (3-pack)',  cat: 'Apparel',     emoji: '🧦', price: 15.0, rating: 4.6, reviews: 264, stock: 110,
    desc: 'Combed-cotton crew socks with a knit Shiba pattern. Three colorways for maximum daily wow.' },
  { id: 'mousepad',     name: 'XL Doge Desk Mat',          cat: 'Home',        emoji: '🖱️', price: 22.5, rating: 4.8, reviews: 342, stock: 55, tag: 'hot',
    desc: '900×400mm stitched-edge desk mat with a non-slip base. Smooth tracking for gaming and very productivity.' },
];

function defaultData() {
  return { products: SEED_PRODUCTS, users: [], sessions: {}, orders: [] };
}

let data;

function load() {
  try {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // make sure every collection exists even if the file predates a field
    const def = defaultData();
    for (const k of Object.keys(def)) if (data[k] === undefined) data[k] = def[k];
  } catch {
    data = defaultData();
    save();
  }
  return data;
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// load eagerly on require
load();

module.exports = { get data() { return data; }, save, load, SEED_PRODUCTS };
