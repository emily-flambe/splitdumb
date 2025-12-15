# SplitDumb Deployment Guide

## Overview

This guide covers deploying SplitDumb to Cloudflare Workers, including backend (Python), frontend (TypeScript), database (D1), and session storage (KV).

## Prerequisites

- Cloudflare account (free or paid)
- Node.js 18+ and npm
- Python 3.11+
- Wrangler CLI

## Initial Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 3. Verify Authentication

```bash
wrangler whoami
```

## Backend Deployment

### 1. Create D1 Database

```bash
# Create the database
wrangler d1 create splitdumb_db

# Note the database_id from the output
# Example output:
# ✅ Successfully created DB 'splitdumb_db'
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "splitdumb_db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. Create KV Namespace for Sessions

```bash
# Create production KV namespace
wrangler kv:namespace create "SESSIONS"

# Create preview KV namespace (for development)
wrangler kv:namespace create "SESSIONS" --preview

# Note the namespace IDs from the output
```

### 3. Initialize Database Schema

```bash
# Execute the schema file against the database
wrangler d1 execute splitdumb_db --file=backend/schema.sql

# Verify tables were created
wrangler d1 execute splitdumb_db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 4. Configure wrangler.toml

Create `backend/wrangler.toml`:

```toml
name = "splitdumb-api"
main = "src/main.py"
compatibility_date = "2025-12-15"
python_compat = true

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "splitdumb_db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Replace with your database_id

# KV namespace binding for sessions
[[kv_namespaces]]
binding = "SESSIONS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Replace with your KV namespace id
preview_id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Replace with your preview KV namespace id

# Environment variables
[vars]
ENVIRONMENT = "production"
SESSION_DURATION = "86400"  # 24 hours in seconds

# Secrets (set via wrangler secret put)
# JWT_SECRET - set via: wrangler secret put JWT_SECRET

# Routes
routes = [
    { pattern = "api.splitdumb.com/*", zone_name = "splitdumb.com" }
]

# Limits
[limits]
cpu_ms = 50

# Build configuration
[build]
command = "pip install -r requirements.txt --target ./deps"
watch_dirs = ["src"]
```

### 5. Create requirements.txt

Create `backend/requirements.txt`:

```
# Cloudflare Workers Python runtime includes:
# - Standard library
# - Some popular packages

# Additional dependencies (if needed):
# pyjwt==2.8.0
# bcrypt==4.1.2
```

### 6. Set Secrets

```bash
# Set JWT secret (use a strong random string)
wrangler secret put JWT_SECRET --env production

# You'll be prompted to enter the secret value
# Generate a strong secret: openssl rand -base64 32
```

### 7. Deploy Backend

```bash
cd backend
wrangler deploy

# For preview deployment:
wrangler deploy --env preview
```

### 8. Verify Backend Deployment

```bash
# Test the health endpoint
curl https://api.splitdumb.com/health

# Or use your workers.dev URL
curl https://splitdumb-api.workers.dev/health
```

## Frontend Deployment

### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
```

### 2. Create Cloudflare Pages Project

```bash
# Initialize Pages project
wrangler pages project create splitdumb

# Or use the dashboard:
# 1. Go to Pages in Cloudflare dashboard
# 2. Create a new project
# 3. Connect to Git or upload directly
```

### 3. Configure pages.json

Create `frontend/pages.json`:

```json
{
  "name": "splitdumb",
  "production_branch": "main",
  "build": {
    "command": "npm run build",
    "destination_dir": "dist"
  },
  "env": {
    "production": {
      "API_BASE_URL": "https://api.splitdumb.com"
    },
    "preview": {
      "API_BASE_URL": "https://splitdumb-api.workers.dev"
    }
  }
}
```

### 4. Deploy Frontend

```bash
# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=splitdumb

# Or use Git integration for automatic deployments
```

### 5. Configure Custom Domain (Optional)

```bash
# Add custom domain to Pages
wrangler pages deployment create production --project-name=splitdumb

# Or in the dashboard:
# 1. Go to Pages > splitdumb
# 2. Custom domains
# 3. Add custom domain
```

## Environment Configuration

### Development Environment

Create `backend/wrangler.dev.toml`:

```toml
name = "splitdumb-api-dev"
main = "src/main.py"
compatibility_date = "2025-12-15"
python_compat = true

[[d1_databases]]
binding = "DB"
database_name = "splitdumb_db_dev"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[kv_namespaces]]
binding = "SESSIONS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[vars]
ENVIRONMENT = "development"
SESSION_DURATION = "86400"
```

### Local Development

```bash
# Start local development server
wrangler dev --port 8787

# With local D1 database
wrangler dev --local --persist

# The API will be available at http://localhost:8787
```

### Test with Local Database

```bash
# Create local database
wrangler d1 execute splitdumb_db --local --file=backend/schema.sql

# Query local database
wrangler d1 execute splitdumb_db --local --command="SELECT * FROM users;"
```

## Database Management

### Migrations

Create migration files in `backend/migrations/`:

```bash
# Example: backend/migrations/001_initial_schema.sql
# Example: backend/migrations/002_add_indexes.sql
```

Apply migrations:

```bash
# Production
wrangler d1 execute splitdumb_db --file=backend/migrations/002_add_indexes.sql

# Development
wrangler d1 execute splitdumb_db_dev --file=backend/migrations/002_add_indexes.sql

# Local
wrangler d1 execute splitdumb_db --local --file=backend/migrations/002_add_indexes.sql
```

### Backups

```bash
# Export database
wrangler d1 export splitdumb_db --output=backup.sql

# Import database
wrangler d1 execute splitdumb_db --file=backup.sql
```

### Query Database

```bash
# Execute SQL command
wrangler d1 execute splitdumb_db --command="SELECT COUNT(*) FROM users;"

# Execute SQL file
wrangler d1 execute splitdumb_db --file=query.sql

# Interactive mode (coming soon)
# wrangler d1 console splitdumb_db
```

## Monitoring & Debugging

### View Logs

```bash
# Tail logs in real-time
wrangler tail

# Filter logs
wrangler tail --format=pretty

# Save logs to file
wrangler tail > logs.txt
```

### Metrics

View metrics in the Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. View Analytics tab

Key metrics:
- Requests per second
- CPU time
- Success rate
- Error rate

### Debugging

```bash
# Deploy with debugging enabled
wrangler deploy --debug

# Local debugging
wrangler dev --local --debug
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    name: Deploy Backend
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: ./backend
        run: pip install -r requirements.txt
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: backend
          command: deploy

  deploy-frontend:
    runs-on: ubuntu-latest
    name: Deploy Frontend
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_BASE_URL: https://api.splitdumb.com
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: frontend
          command: pages deploy dist --project-name=splitdumb
```

### Required Secrets

Add these secrets to your GitHub repository:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers and Pages permissions

## Security Best Practices

### 1. API Tokens

Create scoped API tokens:
```bash
# In Cloudflare Dashboard:
# 1. My Profile > API Tokens
# 2. Create Token
# 3. Use "Edit Cloudflare Workers" template
# 4. Scope to specific accounts/zones
```

### 2. Environment Variables

Never commit secrets to version control:
```bash
# Use wrangler secrets
wrangler secret put SECRET_NAME

# Or use .dev.vars for local development (add to .gitignore)
```

### 3. Rate Limiting

Enable rate limiting in `wrangler.toml`:
```toml
[rate_limiting]
enabled = true
```

### 4. CORS Configuration

Configure CORS headers appropriately in your worker code.

## Performance Optimization

### 1. Caching

Use Cloudflare KV for caching:
```python
# Cache expensive operations
cached_value = await env.CACHE.get(key)
if not cached_value:
    value = compute_expensive_value()
    await env.CACHE.put(key, value, expiration_ttl=3600)
```

### 2. Database Query Optimization

- Use indexes appropriately
- Limit result sets
- Use prepared statements
- Cache frequently accessed data

### 3. Asset Optimization

Frontend optimization:
```bash
# Minify JavaScript
npm run build -- --minify

# Compress images
# Use Cloudflare Images for image optimization
```

## Cost Optimization

### Free Tier Limits

**Workers:**
- 100,000 requests/day
- 10ms CPU time per request
- 128MB memory

**D1:**
- 5GB storage
- 5M rows read/day
- 100K rows written/day

**KV:**
- 100,000 reads/day
- 1,000 writes/day
- 1GB storage

**Pages:**
- 500 builds/month
- Unlimited bandwidth

### Monitoring Costs

```bash
# View usage
wrangler billing show

# Set up billing alerts in Cloudflare Dashboard
```

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Verify database binding
wrangler d1 info splitdumb_db

# Check wrangler.toml configuration
```

**2. CORS Errors**
- Verify CORS headers in worker code
- Check allowed origins

**3. 500 Internal Server Error**
```bash
# Check logs
wrangler tail

# Enable debug mode
wrangler dev --debug
```

**4. Slow Performance**
- Check CPU time usage
- Optimize database queries
- Add caching

### Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Community](https://community.cloudflare.com/)
- [Discord](https://discord.gg/cloudflaredev)

## Rollback Procedure

### Workers Rollback

```bash
# List previous deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback [deployment-id]
```

### Database Rollback

```bash
# Restore from backup
wrangler d1 execute splitdumb_db --file=backup.sql
```

### Frontend Rollback

```bash
# In Cloudflare Dashboard:
# 1. Go to Pages > splitdumb
# 2. View deployments
# 3. Rollback to previous deployment
```

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Review error logs
   - Check performance metrics
   - Monitor costs

2. **Monthly:**
   - Update dependencies
   - Review security advisories
   - Backup database

3. **Quarterly:**
   - Performance audit
   - Security audit
   - Cost optimization review

### Scheduled Maintenance

```bash
# Use Cloudflare Cron Triggers for scheduled tasks
# Add to wrangler.toml:
[triggers]
crons = ["0 0 * * *"]  # Daily at midnight UTC
```

## Scaling Considerations

### Horizontal Scaling

Cloudflare Workers automatically scale horizontally across Cloudflare's global network.

### Database Scaling

For large-scale deployments:
1. Implement database sharding
2. Use read replicas
3. Optimize queries and indexes
4. Consider upgrading to paid D1 tier

### Caching Strategy

1. Use Cloudflare Cache API for static content
2. Use KV for session data and frequently accessed data
3. Implement application-level caching
4. Use Cloudflare CDN for assets

## Production Checklist

Before going live:

- [ ] Set all production secrets
- [ ] Configure custom domain
- [ ] Set up SSL/TLS
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up monitoring and alerts
- [ ] Create database backups
- [ ] Test all API endpoints
- [ ] Load testing
- [ ] Security audit
- [ ] Set up CI/CD pipeline
- [ ] Document rollback procedure
- [ ] Configure error tracking
- [ ] Set up logging
- [ ] Configure analytics
