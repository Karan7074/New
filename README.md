# 🐕 Doge Store

A **full-stack e-commerce web app** — _such shop, much wow_. Built with **zero npm dependencies**: just Node.js built-ins (`http`, `fs`, `crypto`) on the backend and vanilla HTML/CSS/JS on the frontend. No build step, no install, no native modules.

## Features

- 🛍️ **Storefront** — hero, featured drops, category filtering, live search, product detail pages
- 🧺 **Server-side cart** — persists per session (guest or logged-in) via an HttpOnly cookie; slide-in cart drawer on every page
- 👤 **Accounts** — register / log in / log out with `scrypt`-hashed passwords and server sessions
- 💳 **Checkout** — validates stock, computes shipping + tax, creates a real order, decrements inventory
- 📦 **Order history** — logged-in users can view their past orders
- ⚙️ **Admin panel** — dashboard stats, create/edit/delete products, review all orders
- 🗃️ **JSON-file database** — data persists in `data/db.json` (auto-seeded on first run)

## Run it

```bash
node server.js        # or: npm start
```

Then open **http://localhost:3000**.

Set a custom port with `PORT=8080 node server.js`.

### Demo admin account

```
email:    admin@doge.com
password: doge1234
```

(Seeded automatically on first launch. Log in, then the **⚙️ Admin** link appears in the nav.)

## Project structure

```
server.js          # HTTP server: static files + JSON REST API
lib/db.js          # tiny JSON-file database + seed catalog
lib/auth.js        # password hashing, sessions, cookies
public/
  index.html       # storefront home
  product.html     # product detail (?id=)
  cart.html        # bag + checkout
  account.html     # login / register / order history
  admin.html       # admin dashboard
  styles.css       # shared design system
  app.js           # frontend app (renders header/footer, talks to /api)
data/db.json       # runtime database (git-ignored, auto-created)
```

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/products` | list products |
| `GET` | `/api/products/:id` | single product |
| `POST` | `/api/auth/register` · `/login` · `/logout` | auth |
| `GET` | `/api/auth/me` | current user |
| `GET` | `/api/cart` | current cart |
| `POST`/`PUT`/`DELETE` | `/api/cart` (+ `/:id`) | add / set qty / clear / remove |
| `POST` | `/api/orders` | checkout |
| `GET` | `/api/orders` · `/api/orders/:id` | order history / one order |
| `GET` | `/api/admin/stats` · `/api/admin/orders` | admin (auth required) |
| `POST` | `/api/admin/products` | create / update product |
| `DELETE` | `/api/admin/products/:id` | delete product |

> ⚠️ This is a demo: the checkout does **not** process real payments, and the JSON-file DB is meant for a single process. Swap in Postgres + a real payment provider (e.g. Stripe) for production.
