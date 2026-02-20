Steps to update the software

1. Taking the server down:
docker compose down

2. Bringing the server up:
docker compose up -d

3. Bringing the server up and compiling the new version:
docker compose up -d --build

4. Update database structure:
docker compose exec timeclock npx prisma migrate deploy

5. Feed database with information (only when setting up for the first time)
docker compose exec timeclock npx prisma db seed

In order to deploy update do steps 1, 3 and 4.