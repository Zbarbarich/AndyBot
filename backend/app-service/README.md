# App Service (Tickets & Customers)

Runs on port 3002. Uses the same PostgreSQL database as the auth service.

## Setup

1. Copy `.env.example` to `.env` and set `PORT=3002` and your database credentials (same as auth-service).
2. Run the schema migrations once (same DB as auth):

   ```bash
   psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f src/schema/001_customers_tickets.sql
   psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f src/schema/002_add_ticket_status.sql
   ```

   If the DB already had 001 applied, running 002 alone adds the `status` column to tickets. New installs: run both (001 includes status).

   ```bash
   psql ... -f src/schema/003_ticket_resolution_updates.sql
   ```

   (003 creates `ticket_resolution_updates` for resolution update history.)

## Scripts

- `npm run dev` – run with nodemon
- `npm run build` / `npm start` – production

## API (via gateway)

All routes require `Authorization: Bearer <token>` and are proxied at `http://localhost:3000/api/app/`.

- **Customers**: `GET/POST /api/app/customers`, `GET/PUT/DELETE /api/app/customers/:id`, `GET /api/app/customers/sorted?orderBy=&order=`, `GET /api/app/customers/search?q=`
- **Tickets**: `GET/POST /api/app/tickets`, `GET/PUT/DELETE /api/app/tickets/:id`, `GET /api/app/tickets/sorted`, `GET /api/app/tickets/by-category?category=`, `GET /api/app/tickets/by-priority?priority=`, `GET /api/app/tickets/by-customer?customerId=`, and ticket images at `/:id/images`
