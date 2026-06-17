# 🚀 Deploying Doge to Railway

The repo is already configured for Railway — `railway.json`, a `Procfile`, and a
pinned Node version are all in place, and the server listens on Railway's
`PORT`. You just need to connect it to your Railway account.

## Steps (about 2 minutes)

1. **Go to [railway.com](https://railway.com)** and sign in with **GitHub**
   (free — authorize Railway to see your repos).

2. Click **New Project → Deploy from GitHub repo**.

3. Select the **`Karan7074/New`** repository.
   - Railway may ask you to grant access to the repo first — approve it.

4. **Pick the branch** to deploy: **`claude/bold-goldberg-85ibcc`**.
   - In the service: **Settings → Source → Branch** → choose the branch above.
   - (Or merge that branch into `main` first and deploy `main`.)

5. Railway auto-detects Node, runs **`npm start`** (`node server.js`), and builds.
   You don't need to set any environment variables — `PORT` is provided
   automatically.

6. **Get your public URL:** open the service → **Settings → Networking →
   Generate Domain**. Railway gives you a URL like
   `https://doge-production-xxxx.up.railway.app`.

7. **Open that URL** — your Doge store is live! 🎉
   - Admin login: **`admin@doge.com`** / **`doge1234`**

## Good to know

- **Data resets on redeploy.** The store uses a JSON file (`data/db.json`) on
  Railway's ephemeral disk, so any accounts/orders created live are wiped when
  you redeploy. The seed catalog + demo admin are recreated automatically.
  - To keep data across deploys: add a **Railway Volume** mounted at
    `/app/data`, or switch to a managed database (Postgres).
- **Auto-deploys:** once connected, every push to the selected branch triggers
  a new Railway deployment automatically.
- **Cost:** Railway offers trial credits to start; sustained hosting runs on
  their Hobby plan. Check current pricing at railway.com.

## Alternative: deploy with the Railway CLI

If you prefer the terminal:

```bash
npm i -g @railway/cli
railway login
railway init          # create/link a project
railway up            # deploy the current directory
railway domain        # generate a public URL
```
