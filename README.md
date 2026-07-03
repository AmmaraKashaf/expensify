# Expensify — Personal Finance Tracker

A full-stack SaaS personal finance application built with React, Express, Prisma, and Supabase.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TanStack React Query, Zustand, Tailwind CSS, Shadcn/Radix UI, Recharts
- **Backend**: Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth (JWT)

## Features

- Expense & income tracking with categories
- Monthly budget management
- Savings goals with contribution tracking
- Subscription & recurring bill monitoring
- Bill payment reminders
- Dashboard with charts and analytics
- Reports (weekly / monthly / yearly)
- Multi-currency support
- Dark / light / system theme
- Demo mode (no signup required)

---

## Environment Variables

### Root (for Prisma migrations)
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### `server/.env`
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3001
CLIENT_URL=https://your-frontend-domain.com
NODE_ENV=production
```

### `client/.env.local`
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Local Development

```bash
# Install all dependencies
npm install

# Run migrations (first time)
npx prisma migrate deploy

# Seed default categories + demo data
npx ts-node --project prisma/tsconfig.json prisma/seed.ts

# Start dev servers (frontend + backend concurrently)
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

---

## Production Build

```bash
npm run build
# Outputs:
#   client/dist/   (static frontend files)
#   server/dist/   (compiled backend)
```

---

## Deployment on AWS EC2 (Update Guide)

### 1. SSH into your server

```bash
ssh -i your-key.pem ec2-user@<YOUR_EC2_IP>
```

### 2. Pull latest code

```bash
cd /var/www/expensify   # or wherever the app is deployed
git pull origin main
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run database migrations

```bash
npx prisma migrate deploy
```

> Only needed if you added new migrations. Safe to run every deploy — it's idempotent.

### 5. Rebuild the application

```bash
npm run build
```

### 6. Update environment variables (if changed)

Edit `server/.env` with any new variables:

```bash
nano server/.env
```

Key variables to verify:
- `CLIENT_URL` — must match your frontend domain (e.g. `https://expensify.yourdomain.com`)
- `SUPABASE_SERVICE_ROLE_KEY` — must be current
- `DATABASE_URL` / `DIRECT_URL` — must be correct

### 7. Restart the backend (PM2)

```bash
pm2 restart expensify-server   # or whatever your process name is
pm2 status                      # verify it's running
pm2 logs expensify-server       # check for errors
```

If you haven't set up PM2 yet:
```bash
pm2 start server/dist/index.js --name expensify-server
pm2 save
pm2 startup
```

### 8. Serve the frontend (Nginx)

Copy the new build to your web root:
```bash
cp -r client/dist/* /var/www/html/   # adjust path to match your Nginx root
```

Or if Nginx serves directly from `client/dist`, no copy needed.

Reload Nginx:
```bash
sudo nginx -t          # verify config is valid
sudo systemctl reload nginx
```

### 9. Verify deployment

```bash
# Check backend health
curl http://localhost:3001/health

# Check PM2 process
pm2 status

# Check Nginx
sudo systemctl status nginx
```

Open your browser and test:
- Login / Signup
- Dashboard loads
- Can create a transaction
- Charts display data

### 10. Rollback if something goes wrong

```bash
# Roll back to the previous commit
git log --oneline -5         # find the previous good commit hash
git checkout <COMMIT_HASH>
npm run build
pm2 restart expensify-server
```

---

## Database Migrations

Run on every deploy that includes schema changes:
```bash
npx prisma migrate deploy
```

If you need to reset the database (destructive — dev only):
```bash
npx prisma migrate reset
npx ts-node --project prisma/tsconfig.json prisma/seed.ts
```

---

## Demo Mode

The app includes a demo mode with pre-seeded data. To enable it, make sure the seed script has run:

```bash
npx ts-node --project prisma/tsconfig.json prisma/seed.ts
```

This creates a demo user at `demo@expensify.app` and seeds 3 months of sample transactions.

---

## Security Notes

- Never commit `.env` files to version control
- The `SUPABASE_SERVICE_ROLE_KEY` is a privileged key — keep it secret
- All API routes require authentication via Supabase JWT
- Each user's data is isolated — no cross-user data access is possible
