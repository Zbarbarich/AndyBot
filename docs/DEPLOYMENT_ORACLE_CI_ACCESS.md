# Oracle Free Tier: Deployment, CI/CD, and Accessibility

Detailed step-by-step plans for hosting A.N.D.Y. (19th Chamber Integrated) on Oracle Cloud Free Tier with HTTPS/SSL, a domain, GitHub Actions CI/CD, and access from phones and PCs.

---

## A. Oracle Cloud Free Tier setup (step-by-step)

### A.1 Create Oracle Cloud account

1. Go to [cloud.oracle.com](https://cloud.oracle.com) and click **Start for free**.
2. Choose your country, enter email, and create a password. You will need a credit card for identity verification; Oracle does **not** charge you if you stay within Always Free resources.
3. After sign-up, choose your **Home Region** (e.g. Phoenix or Ashburn for US). You will create the VM in this region.

### A.2 Create a compute instance (VPS)

1. In the Oracle Cloud Console, open the **hamburger menu** → **Compute** → **Instances**.
2. Click **Create instance**.
3. **Name:** e.g. `nineteenth-chamber-app`.
4. **Placement:** leave default (your chosen region/AD).
5. **Image and shape:**
   - **Image:** Pick **Oracle Linux** or **Ubuntu** (e.g. Ubuntu 22.04) — both work with Docker.
   - **Shape:** Click **Change shape**. Under **Always free-eligible**, choose:
     - **Ampere** (ARM): 1 OCPU, 6 GB memory, or
     - **AMD** (VM.Standard.E2.1.Micro): 1 OCPU, 1 GB memory (tight but enough for light use).
   - Confirm the shape is **Always Free**.
6. **Networking:** Create new VCN (Virtual Cloud Network) if prompted, or use existing. Ensure **Assign a public IPv4 address** is checked so the instance gets a public IP.
7. **Add SSH keys:** Upload your public SSH key (e.g. `~/.ssh/id_rsa.pub`) or let Oracle generate a key pair and download the private key. You need this to SSH into the VPS later.
8. Click **Create**. Wait until the instance state is **Running**. Note the **Public IP address** (e.g. `129.146.x.x`).

### A.3 Open ports 22, 80, 443 (security list)

By default Oracle only allows SSH (22) from your IP. You must allow HTTP (80) and HTTPS (443) from anywhere so Caddy and browsers can work.

1. In the console, go to **Networking** → **Virtual cloud networks** → click your VCN.
2. Click your **Subnet** (e.g. public subnet).
3. Under **Security Lists**, click the default security list (e.g. **Default Security List**).
4. **Ingress Rules** → **Add Ingress Rules** (add two rules if not present):

| Source CIDR | IP Protocol | Destination Port Range | Description                    |
| ----------- | ---------- | ---------------------- | ------------------------------ |
| 0.0.0.0/0   | TCP        | 80                     | HTTP (Let's Encrypt + redirect) |
| 0.0.0.0/0   | TCP        | 443                    | HTTPS                          |

- **Source:** 0.0.0.0/0 (anywhere). Optionally restrict SSH (22) to your home/office IP later for security.
5. Save. Give it a minute to apply.

### A.4 Optional: Reserve a static public IP

Free-tier instances can lose their public IP on stop/start. To avoid that:

1. **Networking** → **IP Management** → **Reserved Public IPs** → **Reserve Public IP** (assign to your VCN).
2. After the instance is created, **Compute** → **Instances** → your instance → **Attached VNICs** → **Primary VNIC** → **IPv4 Addresses** → **Edit** → assign the reserved IP.

Alternatively, use a dynamic IP and update your domain's A record after any restart (or use Oracle's reserved IP from the start).

---

## B. Domain and DNS

### B.1 Get a domain

- **Paid (~$10–14/year):** Namecheap, Google Domains, Cloudflare Registrar, Porkbun. Register any name (e.g. `yourbusiness.com` or `app.yourbusiness.com`).
- **Free (subdomain):** DuckDNS, No-IP, or a free subdomain from a registrar (e.g. `yourapp.duckdns.org`). No cost but the name is less "branded."

### B.2 Point domain to your VPS

1. In your domain provider's DNS settings, add an **A record**:
   - **Host / Name:** `@` (root domain) or `app` (for `app.yourdomain.com`). Use `@` for root.
   - **Value / Points to:** Your Oracle instance **public IP** (e.g. `129.146.x.x`).
   - **TTL:** 300 or default.
2. If you use a subdomain (e.g. `app.yourdomain.com`), add a CNAME to the same IP or an A record with host `app`.
3. Wait 5–60 minutes for DNS to propagate. Check with `nslookup yourdomain.com` or [dnschecker.org](https://dnschecker.org).

You will use this domain in the Caddyfile so Caddy can get a Let's Encrypt certificate (HTTPS).

---

## C. SSL / HTTPS (Caddy + Let's Encrypt)

SSL is handled entirely by **Caddy** on the VPS — no manual cert steps.

1. In your **Caddyfile** (in the repo at e.g. `deploy/Caddyfile`, mounted into the Caddy container), use your real domain:

   ```caddyfile
   yourdomain.com {
       encode gzip
       root * /srv/frontend
       file_server
       handle /api/* {
           reverse_proxy api-gateway:3000
       }
       handle {
           try_files {path} /index.html
           file_server
       }
   }
   ```

2. Caddy will:
   - Listen on 80 and 443.
   - Request a certificate from Let's Encrypt for `yourdomain.com` (HTTP-01 challenge over port 80).
   - Serve HTTPS on 443 and redirect HTTP → HTTPS.
   - Serve the frontend from `/srv/frontend` (or wherever the frontend static files are mounted) and proxy `/api/*` to the API gateway.

3. **No extra cost:** Let's Encrypt certs are free. Renewal is automatic (Caddy handles it).

4. **Firewall:** Ports 80 and 443 must be open (done in section A.3).

---

## D. Deployment on the VPS (first-time and after CI/CD)

### D.1 One-time: Prepare the server

1. **SSH into the instance:**

   ```bash
   ssh -i /path/to/your-private-key opc@<PUBLIC_IP>
   ```

   (Use `ubuntu@<PUBLIC_IP>` if you chose Ubuntu; `opc` for Oracle Linux.)

2. **Install Docker and Docker Compose:**

   Ubuntu example:

   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   sudo apt-get install -y ca-certificates curl gnupg
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg
   echo "deb [arch=$(dpkg --print-architecture)] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   sudo usermod -aG docker $USER
   ```

   Log out and back in (or `newgrp docker`) so `docker` runs without `sudo`.

3. **Clone the repo** (or create a directory that CI/CD will fill):

   ```bash
   cd ~
   git clone https://github.com/YOUR_USERNAME/theNineteenthChamber.git
   cd theNineteenthChamber
   ```

   Or create `~/theNineteenthChamber` and let the GitHub Action deploy by `git pull` from here (see section E).

4. **Create production `.env`** (do **not** commit this):

   - Copy from `deploy/.env.example` (or the example you add in the repo).
   - Set at least: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, and any `DB_*` / service URLs used by the app. Use the same DB credentials for all services and postgres.

5. **Run database migrations once** (before first `docker compose up`):

   - **Option A — From your laptop** (SSH tunnel to DB):

     ```bash
     # Terminal 1: tunnel
     ssh -i your-key -L 5432:localhost:5432 opc@<PUBLIC_IP>
     # Terminal 2: from repo, set DB_* in backend/auth-service/.env to localhost:5432, then:
     cd backend/auth-service && npm install
     node ../scripts/run-migration-006.js
     node ../scripts/run-migration-008.js
     node ../scripts/run-migration-009.js
     node ../scripts/run-migration-010.js
     node ../scripts/run-migration-011.js
     # 012 and 013: run SQL with psql or add small runners
     ```

   - **Option B — On the VPS:** Start only Postgres first, then run a one-off container or script that runs the migration SQL files (`backend/shared/schema/001_*.sql` through `013_*.sql`) in order. Document the exact command in `deploy/README.md`.

6. **Build and start everything:**

   - **If the instance has only 1 GB RAM (e.g. AMD VM.Standard.E2.1.Micro):** add swap first or the parallel build can freeze (OOM). Run once: `sudo bash deploy/add-swap.sh`. See `deploy/README.md` → [Build issues on small instances](deploy/README.md#build-issues-on-small-instances).

   ```bash
   docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
   ```

   (Adjust paths if you put `docker-compose.yml` in the repo root.)

7. **Check:** `docker compose ps` — all services should be Up. Open `https://yourdomain.com` in a browser; you should see the app and HTTPS.

### D.2 Caddyfile and compose placement

- **Caddyfile:** In repo at e.g. `deploy/Caddyfile` with your real domain. Compose mounts it into the Caddy container.
- **Frontend static files:** Built by the frontend Docker image; Caddy serves them (e.g. via a volume or by proxying to the frontend container that serves `dist/`). The exact layout is defined in `docker-compose.yml`; Caddyfile must match (e.g. `root * /srv/frontend` and that path is the volume mount).

---

## E. GitHub Actions CI/CD setup (detailed)

### E.1 Workflow file

Create **`.github/workflows/deploy.yml`** in the repo:

```yaml
name: Deploy to Oracle VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            set -e
            cd ${{ secrets.DEPLOY_PATH || '~/theNineteenthChamber' }}
            git fetch origin && git reset --hard origin/main
            docker compose -f deploy/docker-compose.yml --env-file deploy/.env build --no-cache
            docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d
            docker image prune -f
```

- **Trigger:** Every push to `main`. Optionally change to `branches: [deploy]` if you use a separate branch.
- **No registry:** Build happens on the VPS to keep cost and complexity minimal. The runner only SSHs and runs `git pull`, `docker compose build`, `docker compose up -d`.

**Note:** If `DEPLOY_PATH` is not set, the script uses `~/theNineteenthChamber`. The `appleboy/ssh-action` does not expand `~` in a secret; if you set `DEPLOY_PATH`, use an absolute path (e.g. `/home/opc/theNineteenthChamber`).

### E.2 Required GitHub secrets

In the repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add:

| Secret name       | Description |
| ----------------- | ----------- |
| `SSH_HOST`        | Oracle instance public IP (e.g. `129.146.x.x`). |
| `SSH_USER`        | SSH user: `opc` (Oracle Linux) or `ubuntu` (Ubuntu). |
| `SSH_PRIVATE_KEY` | Full contents of the **private** SSH key you use to log in (e.g. `cat ~/.ssh/id_rsa`). Paste as one blob, including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`. |
| `DEPLOY_PATH`     | (Optional) Absolute path on the VPS where the repo is cloned, e.g. `/home/opc/theNineteenthChamber`. If not set, the script uses `~/theNineteenthChamber`. |

- **Do not** put `.env` or DB passwords in GitHub; those stay only on the VPS in `deploy/.env`.

### E.3 One-time: Allow GitHub to SSH into the VPS

The **same** key you use for `SSH_PRIVATE_KEY` must be the one that can log in as `opc`/`ubuntu` to the VPS (the public key should be in `~/.ssh/authorized_keys` on the server). Use the key you added when creating the Oracle instance, or add the public key for the key pair you store in `SSH_PRIVATE_KEY` to the VPS `authorized_keys`.

### E.4 Optional: Run migrations in CI/CD

If you want new migrations to run on each deploy, add a step after `git reset` that runs your migration runner (e.g. a one-off container that connects to `postgres` and runs the SQL files, or `node` scripts over SSH). Use the same `deploy/.env` so the runner can connect to the DB. Document the order (001 → 013) and any destructive migrations (e.g. 007) in `deploy/README.md`.

---

## F. Accessibility instructions (you and your partner)

### F.1 App URL

- **Production URL:** `https://yourdomain.com` (replace with your real domain).
- Use this from **any** device (iPhone, PC, tablet) and any network (home, office, cellular). No VPN required.

### F.2 iPhone (Safari)

1. Open Safari and go to `https://yourdomain.com`.
2. Log in with your credentials.
3. **Add to Home Screen (optional):** Tap the **Share** button → **Add to Home Screen** → name it (e.g. "Nineteenth Chamber") → Add. It will open like an app and use the same HTTPS URL.

### F.3 PC (Chrome, Edge, Firefox)

1. Open the browser and go to `https://yourdomain.com`.
2. Log in.
3. **Bookmark:** Ctrl+D (Windows) or Cmd+D (Mac) → save to Bookmarks Bar or a folder so you can open it quickly.

### F.4 Shared data and accounts

- You and your partner share the **same** database (hosted on the VPS). Each of you has your own login (auth service). All data (customers, tickets, orders, invoices) is the same for both of you because there is one app and one DB.
- Use strong passwords and keep the production `.env` (and any admin accounts) secure; only the two of you have access.

### F.5 If the site is unreachable

- **Check DNS:** `nslookup yourdomain.com` — should return the Oracle public IP.
- **Check instance:** In Oracle Console, ensure the instance is **Running** and has a **Public IP**.
- **Check firewall:** Security list must allow ingress 80 and 443 from 0.0.0.0/0 (section A.3).
- **Check Caddy:** On the VPS, `docker compose logs caddy` — look for certificate or config errors. Ensure the Caddyfile domain matches your domain exactly.

---

## G. Cost recap (Oracle + domain + SSL)

- **Oracle Cloud Free Tier:** $0/month (stay within Always Free shape and limits).
- **Domain:** One-time or yearly (~$10–14/year for a .com or similar; free if using DuckDNS-style subdomain).
- **SSL:** $0 (Let's Encrypt via Caddy).
- **GitHub Actions:** Free within 2,000 minutes/month for private repos; frequent pushes (several times a week) stay under that.

Initial out-of-pocket is effectively **domain only** (if you use a paid domain); ongoing hosting and HTTPS remain $0 with Oracle Free Tier.
