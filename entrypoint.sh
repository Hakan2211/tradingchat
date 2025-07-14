#!/bin/sh
# This script runs every time the container starts.

# Exit on any error
set -e

# Set the path for a flag file that will be created in your persistent storage.
# This ensures it survives restarts and redeployments.
SETUP_COMPLETE_FLAG="/app/prisma/data/.setup_complete"

# Ensure the data directory exists
mkdir -p /app/prisma/data

# 1. Run database migrations on every startup.
# This is safe and ensures your schema is always up-to-date.
echo "--> ENTRYPOINT: Running database migrations..."
npm run db:deploy

# 2. Check if the setup flag file exists.
if [ ! -f "$SETUP_COMPLETE_FLAG" ]; then
  # If the flag file does NOT exist, this is the first run.
  echo "--> ENTRYPOINT: First time setup detected. Seeding the database..."
  npm run db:seed
  
  # Create the flag file to prevent this block from running again.
  echo "--> ENTRYPOINT: Seeding complete. Creating .setup_complete flag."
  touch "$SETUP_COMPLETE_FLAG"
else
  # If the flag file exists, skip the seed.
  echo "--> ENTRYPOINT: Database already seeded. Skipping."
fi

# 3. Hand off control to the main container command (your "npm run start").
echo "--> ENTRYPOINT: Handing off to application..."
exec "$@"