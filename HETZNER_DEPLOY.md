# Deploying to Hetzner with Persistent Database

This guide explains how to deploy the inventory tracking app to Hetzner with persistent database storage.

## Prerequisites

- Hetzner VPS or dedicated server
- Docker and Docker Compose installed on the server
- SSH access to your Hetzner server

## Deployment Steps

### 1. Connect to Your Hetzner Server

```bash
ssh root@your-hetzner-ip
```

### 2. Clone or Update Your Repository

```bash
# If first time
git clone <your-repo-url> /opt/inventory-tracking
cd /opt/inventory-tracking

# If updating
cd /opt/inventory-tracking
git pull
```

### 3. Create Persistent Data Directory

```bash
# Create directory for persistent database storage
# The startup script will automatically set the correct permissions
mkdir -p /opt/inventory-tracking/sqlite-data
```

### 4. Build and Start the Application

```bash
# Build the Docker image
docker-compose -f docker-compose.prod.yml build

# Start the application
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify the Application is Running

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# You should see:
# - "Initializing database..."
# - "Database path: /app/sqlite-data/sqlite.db"
# - "Schema pushed successfully!" or "Database already exists"
# - "Starting Next.js server..."
```

### 6. Access Your Application

The application will be available at:
- `http://your-hetzner-ip:3001`

If you want to use port 80, update the docker-compose.prod.yml:
```yaml
ports:
  - "80:3000"
```

### 7. (Optional) Seed Initial Data

If you want to add initial inventory items:

```bash
# Enter the container
docker exec -it inventory_app sh

# Run the seed script
node /app/db/seed.ts

# Exit
exit
```

## Updating the Application

When you need to deploy updates:

```bash
cd /opt/inventory-tracking

# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

**Important**: Your database in `./sqlite-data/sqlite.db` will persist across updates!

## Database Management

### Backup Database

```bash
# Create backup
cp /opt/inventory-tracking/sqlite-data/sqlite.db /opt/backups/sqlite-$(date +%Y%m%d-%H%M%S).db
```

### Restore Database

```bash
# Stop application
docker-compose -f docker-compose.prod.yml down

# Restore backup
cp /opt/backups/sqlite-20260129-120000.db /opt/inventory-tracking/sqlite-data/sqlite.db

# Set permissions
chown 1001:1001 /opt/inventory-tracking/sqlite-data/sqlite.db

# Start application
docker-compose -f docker-compose.prod.yml up -d
```

### View Database Contents

```bash
# Install sqlite3 if not already installed
apt-get install sqlite3

# Query database
sqlite3 /opt/inventory-tracking/sqlite-data/sqlite.db

# Example queries:
.tables              # List all tables
SELECT * FROM items; # View all items
SELECT * FROM logs;  # View all logs
.exit                # Exit sqlite3
```

## Troubleshooting

### Check if database exists

```bash
ls -la /opt/inventory-tracking/sqlite-data/
```

### Check container logs

```bash
docker-compose -f docker-compose.prod.yml logs inventory-app
```

### Re-initialize database (CAUTION: This will delete all data!)

```bash
docker-compose -f docker-compose.prod.yml down
rm /opt/inventory-tracking/sqlite-data/sqlite.db
docker-compose -f docker-compose.prod.yml up -d
```

### Fix permission issues

Permissions are automatically handled by the startup script. If you still encounter issues:

```bash
# Ensure the directory exists
mkdir -p /opt/inventory-tracking/sqlite-data

# Restart the container (it will set permissions automatically)
docker-compose -f docker-compose.prod.yml restart
```

## Automatic Backups

Create a daily backup cron job:

```bash
# Edit crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * cp /opt/inventory-tracking/sqlite-data/sqlite.db /opt/backups/sqlite-$(date +\%Y\%m\%d).db

# Create backups directory
mkdir -p /opt/backups

# Optional: Add cleanup of old backups (keep last 30 days)
0 3 * * * find /opt/backups -name "sqlite-*.db" -mtime +30 -delete
```

## Security Notes

1. **Firewall**: Make sure to configure your firewall to only allow access to port 3001 (or 80) from trusted IPs
2. **HTTPS**: Consider setting up nginx reverse proxy with SSL/TLS certificate
3. **Backups**: Regularly backup your database to prevent data loss
4. **Updates**: Keep your system and Docker images up to date

## Environment Variables

You can customize the application by editing `docker-compose.prod.yml`:

```yaml
environment:
  - DATABASE_URL=/app/sqlite-data/sqlite.db
  - NODE_ENV=production
  - SITE_PASSWORD=your-password-here
```

After changing environment variables, restart the container:
```bash
docker-compose -f docker-compose.prod.yml restart
```
