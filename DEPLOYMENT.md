# Deployment Guide for Firefighter Timeclock

This guide covers how to deploy the Firefighter Timeclock application to a Linux server (e.g., DigitalOcean Droplet, AWS EC2, or a local VM) using **Docker**. This is the recommended method as it simplifies dependencies and updates.

## Prerequisites

1.  **A Server**: A Linux server (Ubuntu 22.04 LTS recommended) with at least 1GB RAM.
2.  **Domain Name** (Optional but recommended): Pointed to your server's IP address.

## Step 1: Server Setup (Ubuntu)

Connect to your server via SSH:
```bash
ssh root@your_server_ip
```

Update the system and install Docker:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose (if not included)
sudo apt install docker-compose-plugin -y
```

## Step 2: Deploy the Application

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/time-clock.git
    cd time-clock
    ```
    *(If your repo is private, you'll need to set up an SSH key or use a Personal Access Token)*

2.  **Configure Environment**:
    The generic configuration works out of the box for SQLite. The `docker-compose.yml` sets the database to run from a persistent volume.
    
    If you need to change secrets (e.g. for authentication), create a `.env` file:
    ```bash
    nano .env
    ```
    Add any secrets here if you add authentication providers later.

3.  **Build and Start**:
    ```bash
    docker compose up -d --build
    ```
    This will take a few minutes to build the image.

4.  **Initialize the Database**:
    Run the migrations to set up the database schema in the production volume:
    ```bash
    docker compose exec timeclock npx prisma migrate deploy
    ```

## Step 3: Verify

Your application should now be running on port 3000.
Visit `http://your_server_ip:3000` in your browser.

## Step 4: Production Setup (Nginx + SSL)

To serve the app on port 80/443 with HTTPS, use Nginx.

1.  **Install Nginx**:
    ```bash
    sudo apt install nginx -y
    ```

2.  **Configure Nginx**:
    Create a config file:
    ```bash
    sudo nano /etc/nginx/sites-available/timeclock
    ```
    Paste the following (replace `your-domain.com` with your actual domain or IP):
    ```nginx
    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Enable Site**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/timeclock /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    ```

4.  **Enable HTTPS (Certbot)**:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d your-domain.com
    ```

## Maintenance

-   **Updating**:
    ```bash
    git pull
    docker compose up -d --build
    docker compose exec timeclock npx prisma migrate deploy
    ```

## Windows Server / VM Deployment

You have two main options for deploying on Windows: **Docker Desktop** (Recommended for ease of use) and **Native Node.js** (Recommended for lower resource usage).

### Option A: Docker Desktop (Easiest)
*(Requires Windows 10/11 Pro/Enterprise or Windows Server 2016+ with Hyper-V enabled)*

1.  **Install Docker Desktop**: Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2.  **Clone Source**: Download the project files to a folder (e.g., `C:\TimeClock`).
3.  **Run**: Open PowerShell or Command Prompt in that folder and run:
    ```powershell
    docker compose up -d --build
    ```
4.  **Initialize DB**:
    ```powershell
    docker compose exec timeclock npx prisma migrate deploy
    ```
5.  **Access**: Open `http://localhost:3000` or `http://YOUR_VM_IP:3000`.

### Option B: Native Node.js (Lightweight)
*(Best for standard Windows Server VMs without nested virtualization)*

1.  **Install Prerequisites**:
    -   **Node.js**: Download and install the LTS version from [nodejs.org](https://nodejs.org/).
    -   **Git**: (Optional) To clone the repo, or just copy files manually.

2.  **Setup the App**:
    Open PowerShell as Administrator and run:
    ```powershell
    cd C:\Path\To\TimeClock
    npm install
    npm run build
    ```

3.  **Initialize Database**:
    ```powershell
    # This creates the SQLite file in /prisma/dev.db by default
    npx prisma migrate deploy
    ```

4.  **Run the App**:
    ```powershell
    # Starts the production server on port 3000
    npm start
    ```

5.  **Run in Background (Production)**:
    To keep the app running even if you close the terminal, use a process manager like PM2:
    ```powershell
    npm install -g pm2
    pm2 start npm --name "timeclock" -- start
    pm2 save
    # To restore on reboot, you may need a startup script or use pm2-startup
    ```

### Firewall configuration
Ensure you allow **TCP Port 3000** through the **Windows Defender Firewall** so other computers can access the site.

## Maintenance

-   **Updating**:
