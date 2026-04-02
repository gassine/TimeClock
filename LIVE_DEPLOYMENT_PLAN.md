# Live Deployment Plan
**App:** TimeClock — Fire Department Staff Portal
**Goal:** Harden the application for production use on DigitalOcean
**Legend:** ✅ Done · 🔧 Needs code work · 👤 You need to do this in DigitalOcean

---

## Phase 1 — Critical Security (Auth & Secrets)
> These must be done before the app goes live. An unprotected API means anyone who knows your URL can read or change your data.

| # | Item | Who | Status |
|---|------|-----|--------|
| 1.1 | Create central auth helper (`src/lib/auth.ts`) | Code | ✅ |
| 1.2 | Create API middleware — every API route now requires a valid login session | Code | ✅ |
| 1.3 | Remove hardcoded JWT fallback secret from `login/route.ts` and `logger.ts` | Code | ✅ |
| 1.4 | Fix cookie security — `secure` flag always on in production, no extra env var needed | Code | ✅ |
| 1.5 | **Set `JWT_SECRET` in DigitalOcean** — see instructions below | **You** | 🔲 |
| 1.6 | **Change the default admin PIN** — log in with the default PIN and change it immediately | **You** | 🔲 |

### 1.5 — How to set JWT_SECRET on a DigitalOcean Droplet (Ubuntu 24.04)

**What is JWT_SECRET?**
When someone logs in, the server creates a digital badge (called a JWT) that proves who they are. The `JWT_SECRET` is used to sign and verify that badge. Without it set properly, anyone could forge a badge and pretend to be an admin. The app will refuse to start if this is missing.

**Step 1 — SSH into your server**
Open PowerShell (Windows) or Terminal (Mac) and run:
```
ssh root@YOUR_DROPLET_IP
```
Type your password when asked.

**Step 2 — Find where the app lives**
```
find / -name "docker-compose.yml" 2>/dev/null
```
It will print something like `/root/timeclock/docker-compose.yml`. Navigate to that folder:
```
cd /root/timeclock
```
(use whatever folder the above command printed, minus the `/docker-compose.yml` part)

**Step 3 — Generate a secure secret**
```
openssl rand -hex 64
```
This prints a long random string. Copy the entire output.

**Step 4 — Save the secret to the server's .env file**
```
echo 'JWT_SECRET=PASTE_YOUR_SECRET_HERE' > .env
```
Replace `PASTE_YOUR_SECRET_HERE` with what you copied. Example:
```
echo 'JWT_SECRET=a3f8c2d19e4b76a1f0293c85d642e7b910...' > .env
```

**Step 5 — Restart the app**
```
docker compose down && docker compose up -d
```

**Step 6 — Verify it worked**
```
docker compose exec timeclock printenv JWT_SECRET
```
This should print your secret back. If it prints nothing, re-check Step 4.

Also test from a browser — go to `http://YOUR_DROPLET_IP:3000/api/firefighters`. You should see `{"error":"Unauthorized"}`. If you see real data, something went wrong.

> **Keep a copy of your JWT_SECRET somewhere safe** (like a password manager). If you ever lose it and need to reinstall, you'll need to generate a new one — existing logged-in sessions will be invalidated and everyone will need to log in again, which is fine.

---

## Phase 2 — File & Upload Security

| # | Item | Who | Status |
|---|------|-----|--------|
| 2.1 | Block dangerous file types on upload (only allow images, PDFs, docs, videos) | Code | ✅ |
| 2.2 | Require admin login to delete images and training files | Code | ✅ |

---

## Phase 3 — Security Headers & Build Config

| # | Item | Who | Status |
|---|------|-----|--------|
| 3.1 | Add HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.) | Code | ✅ |
| 3.2 | Remove suppression of TypeScript build errors (fix them properly) | Code | ✅ |
| 3.3 | Update `docker-compose.yml` with `JWT_SECRET` placeholder and healthcheck | Code | ✅ |

---

## Phase 4 — Database Performance

| # | Item | Who | Status |
|---|------|-----|--------|
| 4.1 | Add database indexes for commonly queried fields (faster lookups as data grows) | Code | ✅ |
| 4.2 | **Set up automated database backups in DigitalOcean** — see instructions below | **You** | 🔲 |

### 4.2 — How to set up backups in DigitalOcean (Droplet)
Your database is a single file (`prod.db`). Backing it up is critical — if the server dies without a backup, all data is lost.

**Option A — DigitalOcean Droplet Backups (easiest):**
1. Go to your Droplet in DigitalOcean
2. Click **Backups** in the left menu
3. Enable **Automated Backups** — this backs up the whole server weekly (small fee, usually ~$2/mo)

**Option B — DigitalOcean Spaces (more reliable, backs up just the DB file):**
- This requires some terminal work. Let me know if you want step-by-step help setting this up.

---

## Phase 5 — Database Engine (Optional but Recommended Long-Term)

| # | Item | Who | Status |
|---|------|-----|--------|
| 5.1 | **Consider migrating from SQLite to PostgreSQL** | Future | 🔲 |

> **Should you do this now?** For a fire department with under 100 staff, SQLite works fine for daily use. The main risk is data corruption if two people submit data at the exact same second. That's rare but possible. For now, keep SQLite and add backups (Phase 4). We can migrate to PostgreSQL later if needed.
>
> **If you want PostgreSQL:**
> 1. Go to DigitalOcean → Databases → Create Database → PostgreSQL
> 2. Copy the connection string it gives you
> 3. Tell me, and I'll handle the Prisma migration

---

## Phase 6 — Hardening (After Launch, Lower Priority)

| # | Item | Who | Status |
|---|------|-----|--------|
| 6.1 | Add rate limiting to login endpoint (prevent brute-force attacks) | Code | 🔲 |
| 6.2 | Add input length validation on all form fields | Code | 🔲 |
| 6.3 | Add per-resource ownership checks (users can only edit their own data) | Code | 🔲 |
| 6.4 | **Set up a firewall in DigitalOcean** — block all ports except 80/443 | **You** | 🔲 |
| 6.5 | **Set up SSL/HTTPS** — get a free certificate via DigitalOcean's managed SSL | **You** | 🔲 |

### 6.4 — How to set up a Firewall in DigitalOcean
1. Go to DigitalOcean → Networking → Firewalls → Create Firewall
2. Add **Inbound Rules**: Allow TCP on port 80 (HTTP) and port 443 (HTTPS). Delete any rule that allows all ports.
3. Assign the firewall to your Droplet

### 6.5 — How to set up HTTPS (free SSL)
If you're using a custom domain name pointing to your Droplet:
1. Make sure your domain's DNS A record points to your Droplet's IP address
2. Install Certbot: SSH into your server and run `sudo apt install certbot` then `sudo certbot --nginx` (or `--apache`)
3. It will ask for your domain name and email and set everything up automatically
4. HTTPS will renew automatically every 90 days

If you're using DigitalOcean App Platform, HTTPS is already included — no action needed.

---

## Environment Variables Reference

These need to be set on your production server. Never commit real values to git.

```
# REQUIRED — must be set or the app will not start
JWT_SECRET=          # Long random string, 50+ characters. Generate one and keep it secret.
DATABASE_URL=        # file:/app/db/prod.db  (SQLite, already configured in docker-compose)

# OPTIONAL
NODE_ENV=production  # Already set in docker-compose
```

---

## Quick Pre-Launch Checklist

Before telling users to log in, verify these:

- [ ] `JWT_SECRET` is set in your DigitalOcean environment (Phase 1.5)
- [ ] Default admin PIN has been changed (Phase 1.6)
- [ ] App loads without errors at your URL
- [ ] You can log in as admin
- [ ] You can log in as a regular user
- [ ] Backups are configured (Phase 4.2)
- [ ] App is accessible over HTTPS (green padlock in browser)

---

## Fresh Install from Scratch (Complete Guide)

Use this if you ever need to set up the app on a new server or rebuild from zero.

### Prerequisites
- A DigitalOcean Droplet running **Ubuntu 24.04**
- At least **1 GB RAM** (2 GB recommended)
- Docker and Docker Compose installed on the server

### Step 1 — Install Docker on the server
SSH in and run:
```bash
curl -fsSL https://get.docker.com | sh
```

### Step 2 — Copy the app to the server
On your **local machine** (not the server), run:
```bash
scp -r /path/to/TimeClock root@YOUR_DROPLET_IP:/root/timeclock
```
Or use Git if the code is in a repository:
```bash
git clone YOUR_REPO_URL /root/timeclock
```

### Step 3 — SSH into the server and go to the app folder
```bash
ssh root@YOUR_DROPLET_IP
cd /root/timeclock
```

### Step 4 — Create the secrets file (CRITICAL — do not skip)
```bash
# Generate a secure secret
openssl rand -hex 64

# Copy the output, then create the .env file:
echo 'JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE' > .env
```

### Step 5 — Create the required folders
```bash
mkdir -p db uploads
```

### Step 6 — Build and start the app
```bash
docker compose up -d --build
```
This will take a few minutes the first time. When done:
```bash
docker compose logs --tail=30
```
Look for a line that says the server is running on port 3000.

### Step 7 — Verify everything works
```bash
# Check JWT_SECRET is loaded
docker compose exec timeclock printenv JWT_SECRET

# Check the API is protected (should return {"error":"Unauthorized"})
curl http://localhost:3000/api/firefighters
```

### Step 8 — Log in and change the default admin PIN
- Go to `http://YOUR_DROPLET_IP:3000`
- Log in with PIN `0000`
- Go to Admin → manage your account → change your PIN immediately

### Step 9 — Enable DigitalOcean automated backups
- In the DigitalOcean dashboard, go to your Droplet → Backups → Enable

### Notes for reinstalls
- If you have an existing database you want to keep, copy `prod.db` to `/root/timeclock/db/prod.db` **before** starting the app in Step 6
- If you lose your `JWT_SECRET`, you can generate a new one — all users will be logged out once and will need to log in again, but no data is lost
- The `uploads/` folder contains all uploaded images and files — copy it over from the old server if migrating
