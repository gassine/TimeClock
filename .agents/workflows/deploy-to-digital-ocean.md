---
description: Deploying to DigitalOcean
---

Whenever you are asked to finalize work or prepare a deployment to DigitalOcean for this Firefighter TimeClock project, follow these crucial steps to guarantee the remote database accepts your changes without crashing the app:

1. **Always Generate the Prisma SQL Migration**
The remote server does NOT auto-synchronize its schema based on `schema.prisma`. You must explicitly generate the SQL migration file.
// turbo
```bash
npx prisma migrate dev --name <your_migration_name>
```

*(Note: If `npx prisma migrate dev` throws a schema drift warning, you will need to manually generate the migration using `npx prisma migrate diff`, save it into `prisma/migrations/`, and run `prisma migrate resolve` locally)*

2. **Verify Dockerfile Startup Script**
Ensure the root `Dockerfile` executes `npx prisma migrate deploy` prior to spinning up `server.js`.
It should look like this:
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

3. **Commit the exact Migration Folder**
The `prisma/migrations/` folder **MUST** be committed to Git. The DigitalOcean App Platform builder needs exactly these files to upgrade the production SQLite database.

// turbo
```bash
git add .
git commit -m "chore: Apply explicit database migrations for DigitalOcean Deployment"
git push
```

By strictly adhering to these 3 steps, the remote server will upgrade gracefully!
