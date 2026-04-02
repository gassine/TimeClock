#!/bin/sh
# Ensure the uploads directory exists and is writable by the nextjs user.
# This handles the case where Docker creates the bind-mount directory as root.
mkdir -p /app/public/uploads /app/public/uploads/training
chown -R nextjs:nodejs /app/public/uploads

# --- Automatic database backup on every startup ---
# Before running migrations or starting the server, we snapshot the current
# database file. This means you always have a copy from just before the last
# deployment, so you can roll back if something goes wrong.
DB_FILE="/app/db/prod.db"
BACKUP_DIR="/app/db/backups"

if [ -f "$DB_FILE" ]; then
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/prod_backup_$TIMESTAMP.db"
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "Database backed up to $BACKUP_FILE"

    # Keep only the 10 most recent backups to avoid filling up disk space
    ls -t "$BACKUP_DIR"/prod_backup_*.db 2>/dev/null | tail -n +11 | xargs rm -f
    echo "Backup rotation: keeping 10 most recent backups"
fi

# Run as nextjs user
exec su-exec nextjs sh -c "npx prisma migrate deploy && node server.js"
