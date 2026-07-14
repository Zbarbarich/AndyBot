# Changelog

Notable product changes for Andy Bot (Field Service and Asset Management ERP).

## UI and branding

- Product name: Andy Bot
- Tagline: Field Service and Asset Management ERP
- Dashboard with KPI cards, revenue chart (Recharts), and quick links
- Glass-style surfaces for light and dark themes
- Document shell for orders, quotes, invoices, tickets, and purchase orders
- Mobile navigation with Andy head icon for home; page titles outside glass cards on list pages

## Commerce and operations

- Quotes, orders, returns; convert quote to order
- Invoices with payments, deposits, and line billing notation
- Purchase orders with line ordering and receipt notes
- PDF generation for quotes, orders, invoices, and purchase orders (PDFKit)
- Customer payment history and global search across entities
- Ticket attachments and resolution updates

## Platform

- Microservices behind an API gateway (JWT)
- PostgreSQL schema migrations `000`–`021`
- Docker Compose production stack with Caddy reverse proxy
- Local development Postgres via `deploy/docker-compose.dev.yml`
