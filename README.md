# The Nineteenth Chamber

A personal tech companies ticket/ERP system built with React, TypeScript, Node.js, Express, and PostgreSQL.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt

## Project Structure

```
theNineteenthChamber/
├── frontend/              # React + TypeScript frontend
├── backend/
│   ├── api-gateway/       # API Gateway service (port 3000)
│   └── auth-service/      # Authentication service (port 3001)
└── package.json           # Root package with scripts
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v12+)
- npm

### Setup

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Configure environment variables:**
   ```bash
   cp backend/api-gateway/.env.example backend/api-gateway/.env
   cp backend/auth-service/.env.example backend/auth-service/.env
   ```
   
   Edit `backend/auth-service/.env` with your PostgreSQL credentials.

3. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE "TheNineteenthChamber";
   ```

4. **Start services:**
   ```bash
   npm start
   ```
   
   Services:
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:3000
   - Auth Service: http://localhost:3001

## Development

**Start all services:**
```bash
npm start
```

**Start backend only:**
```bash
cd backend && npm run dev
```

Hot reloading is enabled for both frontend (Vite HMR) and backend (Nodemon).

## API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/users` - Create user (public for first user)
- `GET /api/auth/users` - Get all users (admin)
- `PUT /api/auth/users/:id` - Update user (admin)
- `DELETE /api/auth/users/:id` - Delete user (admin)

## Database Schema

**Users Table:**
- `userID` (SERIAL PRIMARY KEY)
- `userName` (VARCHAR(50))
- `password` (VARCHAR(255)) - bcrypt hashed
- `email` (VARCHAR(50) UNIQUE NOT NULL)
- `role` (VARCHAR(10)) - 'admin' or 'tech'

## License

Private project - All rights reserved
