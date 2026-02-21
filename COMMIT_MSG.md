Add Docker, deploy config, and GitHub Actions CI/CD

- Frontend: configurable API base (VITE_API_BASE), vite-env.d.ts; all pages use apiBase for /api calls
- Docker: Dockerfiles for api-gateway, auth, customer, ticket, order, invoice, pdf, frontend (nginx); .dockerignore in each
- Deploy: docker-compose.yml (postgres, all services, Caddy), Caddyfile, deploy/.env.example, deploy/README.md (migrations, quick start)
- API gateway: production CORS via CORS_ORIGIN env
- GitHub Actions: .github/workflows/deploy.yml (push to main → SSH, git pull, docker compose build/up)
- Docs: docs/DEPLOYMENT_ORACLE_CI_ACCESS.md (Oracle, domain, SSL, CI/CD, accessibility)
- .gitignore: deploy/.env, COMMIT_MSG.md
