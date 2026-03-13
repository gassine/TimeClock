#!/bin/sh
# Ensure the uploads directory exists and is writable by the nextjs user.
# This handles the case where Docker creates the bind-mount directory as root.
mkdir -p /app/public/uploads /app/public/uploads/training
chown -R nextjs:nodejs /app/public/uploads

# Run as nextjs user
exec su-exec nextjs sh -c "npx prisma migrate deploy && node server.js"
