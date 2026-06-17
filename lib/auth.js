'use strict';
/* ------------------------------------------------------------------
 * Auth & session helpers. Zero dependencies (Node crypto only).
 * Passwords: scrypt with a per-user random salt.
 * Sessions: opaque random token stored server-side, sent as an
 * HttpOnly cookie. Sessions also hold the (guest or user) cart.
 * ----------------------------------------------------------------- */
const crypto = require('crypto');
const db = require('./db');

const SID_COOKIE = 'doge_sid';
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

/* ---- passwords ---- */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---- cookies ---- */
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

/* ---- sessions ---- */
function newSession() {
  const sid = crypto.randomBytes(24).toString('hex');
  db.data.sessions[sid] = { userId: null, cart: {}, createdAt: Date.now() };
  return sid;
}

// Returns { sid, session }, creating one if needed. Sets the cookie via res.
function getSession(req, res) {
  const cookies = parseCookies(req);
  let sid = cookies[SID_COOKIE];
  let session = sid && db.data.sessions[sid];

  // expire stale sessions
  if (session && Date.now() - session.createdAt > SESSION_TTL) {
    delete db.data.sessions[sid];
    session = null;
  }
  if (!session) {
    sid = newSession();
    session = db.data.sessions[sid];
    db.save();
  }
  res.setHeader('Set-Cookie',
    `${SID_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}`);
  return { sid, session };
}

function currentUser(session) {
  if (!session || !session.userId) return null;
  return db.data.users.find((u) => u.id === session.userId) || null;
}

// strip secrets before sending a user to the client
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, isAdmin: !!u.isAdmin, createdAt: u.createdAt };
}

module.exports = {
  SID_COOKIE, hashPassword, verifyPassword, parseCookies,
  getSession, currentUser, publicUser,
};
