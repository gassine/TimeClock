Steps to update the software

1. Taking the server down:
docker compose down

2. Git update
git pull

3. Bringing the server up:
docker compose up -d

4. Bringing the server up and compiling the new version:
docker compose up -d --build

5. Update database structure:
docker compose exec timeclock npx prisma migrate deploy

6. Feed database with information (only when setting up for the first time)
docker compose exec timeclock npx prisma db seed

In order to deploy update do steps 1, 3 and 4.

IF YOU DELETE THE DATABASE MAKE SURE TO GIVE THE SYSTEM PERMISSIONS TO ACCESS THE DATABASE WITH
sudo chown -R 1001:1001 db


also to force a build if it is feeding from cache do
docker compose build --no-cache
docker compose up -d
