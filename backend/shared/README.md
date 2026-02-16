# Shared backend resources

These migrations are run once against the single PostgreSQL database used by auth-service and all app services (customer, ticket, order, invoice, pdf). Replace host/port/user/database in the commands below as needed.

## Schema

Run the SQL migrations once against your PostgreSQL database:

```bash
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/001_customers_tickets.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/002_add_ticket_status.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/003_ticket_resolution_updates.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/004_erp_items_quotes_orders_invoices.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/005_quote_order_shared_document_number.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/006_invoice_payment_and_return_type.sql
```

Replace host/port/user/database if your setup differs.
