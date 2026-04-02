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

### 1.5 — How to set JWT_SECRET in DigitalOcean
1. Log into [DigitalOcean](https://cloud.digitalocean.com)
2. Go to your App (or Droplet — see whichever you use)
3. **If using App Platform:** Go to your app → Settings → App-Level Environment Variables → Add `JWT_SECRET` with a long random value (50+ characters, mix of letters and numbers)
4. **If using a Droplet:** SSH into it, open `/opt/timeclock/.env` (or wherever it lives), add the line: `JWT_SECRET=your_long_random_value_here`
5. Redeploy / restart the app after saving

> **What value to use for JWT_SECRET?** Just mash your keyboard for a long string, like: `xK9mP2qR8nL5vW3jT7cA4bE6hY1uI0oS`. The longer and more random, the better. Never share this with anyone.

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
