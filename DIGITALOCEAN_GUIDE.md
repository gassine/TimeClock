# The "Zero-Knowledge" Guide to DigitalOcean Deployment

This guide assumes you have never set up a server before. Follow these steps exactly to get your Firefighter Timeclock running online.

## Part 1: Get a Server (Droplet)

1.  **Sign Up**: Go to [digitalocean.com](https://www.digitalocean.com/) and create an account. You may need to enter a credit card, but the server we'll use is very cheap (approx. $6-7/month).
2.  **Create a Droplet**:
    *   Click the big green **"Create"** button at the top and select **"Droplets"**.
    *   **Region**: Pick the datacenter closest to you (e.g., New York, San Francisco).
    *   **OS (Image)**: Select **Ubuntu 24.04 (LTS) x64** (or 22.04 LTS).
    *   **Size (CPU)**: Select **Basic** -> **Regular** -> **$6/mo** (Standard Intel, 1GB RAM, 25GB SSD). This is enough for this app.
    *   **Authentication Method**: Select **Password**.
        *   Create a *very* strong password and write it down! You will need this to log in.
        *   *Note: SSH keys are more secure, but passwords are easier for beginners.*
    *   **Hostname**: Give it a name like `timeclock-server` (no spaces).
    *   Click **Create Droplet**.

3.  **Wait**: It will take about a minute. Once the bar is full, you will see an **IP Address** (a set of numbers like `192.168.1.1`). **Copy this IP address.**

## Part 2: Connect to Your Server

You don't need any special software installed on your computer. We will use the DigitalOcean Web Console.

1.  Click on your new Droplet in the DigitalOcean dashboard.
2.  Click the **"Access"** link in the left menu.
3.  Click the blue **"Launch Droplet Console"** button.
4.  A black window will pop up. It might ask for a login.
    *   **login**: type `root` and press Enter.
    *   **Password**: Type the password you created in Part 1. *Note: You won't see the characters appear as you type. Just type it and press Enter.*

You are now "inside" your server! You are the `root` user (Administrator).

## Part 3: Install the Software

Copy and paste these commands one by one into that black window.
*Tip: In the console, you might need to use `Ctrl+Shift+V` to paste, or right-click to paste.*

1.  **Update the Server**:
    *(This makes sure your server has the latest security patches)*
    ```bash
    apt update && apt upgrade -y
    ```
    *(If a pink screen pops up asking about restarting services, just press **Enter**)*

    **Crucial Step for $6 Droplets (Swap Memory):**
    *Since the $6 droplet only has 1GB RAM, the build might get stuck. Run these commands to add "fake RAM" (swap):*
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    ```

2.  **Install Docker** (The engine that runs the app):
    ```bash
    curl -fsSL https://get.docker.com | sh
    ```
    Wait for it to finish.

## Part 4: Put Your App on the Server

Now we need to get your code onto this server. Since you might not know how to use Git, the easiest way for now is to use `git clone` if your code is on GitHub.

**Do you have your code on GitHub?**

### Option A: Yes, my code is on GitHub (Public Repo)
1.  Run this command (replace the URL with YOUR repository URL):
    ```bash
    git clone https://github.com/YOUR_USERNAME/time-clock.git
    ```
2.  Go into the folder:
    ```bash
    cd time-clock
    ```

### Option B: No, the code is only on my computer
*If your code isn't on GitHub, you can't easily "copy-paste" files into the console. The best path is to upload it to GitHub first.*
1.  Go to [github.com](https://github.com), sign up, create a repository.
2.  Upload your files there using the website's "Upload files" button or creating a repo from your desktop.
3.  Then follow Option A above.

## Part 5: Run the App

Now that you are inside the `time-clock` folder on the server:

1.  **Start the App**:
    ```bash
    docker compose up -d --build
    ```
    *This will take 3-5 minutes. It's downloading all the tools and building your app.*

2.  **Set up the Database**:
    ```bash
    docker compose exec timeclock npx prisma migrate deploy
    ```
    *This creates the database tables.*

## Part 6: Initialize Data (Crucial Step)

If you see an error saying **"unable to open database file"**, run these fix commands first:

```bash
# 1. Stop the app to release the file lock
docker compose down

# 2. Fix permissions on the database folder
# (Everything inside docker runs as user 1001)
mkdir -p db
chown -R 1001:1001 db
chmod 775 db

# 3. Start it back up
docker compose up -d
```

### Run the Seed Command (Create Admin User)

Before you can log in, you need to create the default Admin user.
Run this command in the console:

```bash
docker compose exec timeclock npx prisma db seed
```

This will create:
*   **Role**: Admin
*   **User**: "System Admin"
*   **PIN**: `0000`

## Part 7: You're Done!

Open your web browser (Chrome/Safari) on your computer.
Type in: `http://YOUR_SERVER_IP:3000`
*(Replace YOUR_SERVER_IP with the numbers you copied in Part 1)*

You should see your TimeClock app!

---

### Bonus: Keeping it running
If the server restarts, Docker will automatically restart your app because we configured it to `restart: always`. You don't need to do anything else.

### Troubleshooting
If the site doesn't load:
1.  Check that you included `:3000` at the end of the IP address.
2.  Wait a minute longer, sometimes it takes a moment to start up initially.

## Part 7: How to Update Your App

When you make changes to your code and want to send them to the server:

1.  **Push your changes to GitHub** from your computer.
2.  **Go to your DigitalOcean Console** (the black window).
3.  **Run these 3 commands**:

    ```bash
    # 1. Get the new code
    git pull

    # 2. Rebuild the app (This takes a few minutes)
    docker compose up -d --build

    # 3. Update the database (Just in case you changed the schema)
    docker compose exec timeclock npx prisma migrate deploy
    ```

    **NOTE**: This is **SAFE**. It does NOT wipe your data. It only applies new changes (like adding a new column). Your data is safe in the `db/` folder on the server.

That's it! Your app will restart with the new version.
