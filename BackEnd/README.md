# Mosque Management System Backend

This project is a Node.js backend for managing mosque data, using Express.js, MongoDB, and JWT authentication. It is modular and ready for further extension.

## Features

- Modular Express.js structure
- JWT authentication for protected routes
- MongoDB for data storage
- Initial mosque document creation
- RESTful endpoints returning JSON

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with the following variables:
   ```env
   MONGODB_URI=mongodb://localhost:27017/mosque_db
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```
3. Start the server:
   ```bash
   npm start
   ```

## Endpoints

### Public

- `GET /api/mosques` — List all mosques with pagination and search
- `GET /api/mosques/:id/prayer-times` — Get prayer times for a mosque

### Admin

- `POST /api/admin/login` — Login mosque admin
- `POST /api/admin/register` — Register mosque admin (pending approval)
- `PUT /api/mosques/:id/prayer-times` — Update prayer times (admin only)
- `PUT /api/mosques/:id` — Update mosque details (admin only)
- `GET /api/admin/status` — Get admin's own status

### Super Admin

- `POST /api/superadmin/login` — Login super admin
- `POST /api/superadmin/register` — Register super admin (super admin only)
- `PUT /api/superadmin/admins/:id/approve` — Approve mosque admin
- `PUT /api/superadmin/admins/:id/reject` — Reject mosque admin
- `GET /api/superadmin/admins/pending` — List pending admins
- `POST /api/mosques` — Create new mosque
- `DELETE /api/mosques/:id` — Delete mosque

## Notes

- Replace placeholder secrets in production.
- Extend modules as needed for your mosque's requirements.
