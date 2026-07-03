# Hostel Outpass Management System

Full-stack hostel outpass workflow app built with React, Vite, Node.js, Express, MongoDB, Mongoose, and JWT authentication.

## Structure

- `frontend/` React + Vite app
- `server/` Express API

## Features

- JWT login for Student, HOD, Sister, and Warden
- Role-based dashboards
- Student outpass application flow
- Weekend-only validation for Outing requests
- Home request approval chain: Student -> HOD -> Sister -> Warden
- Outing request flow: Student -> Warden
- Rejection reasons and reapply flow
- PDF download for approved outpasses

## Setup

1. Create `server/.env` from `server/.env.example`.
2. Create `frontend/.env` from `frontend/.env.example` if you want to override the default API URL.
3. Install dependencies in both folders.
4. Seed demo users or create accounts with `POST /api/auth/register`.

## Demo users

Run the seed script after connecting MongoDB:

```bash
cd server
npm run seed
```

Default passwords are `Pass@123` for all demo accounts.

Demo accounts:

- Student: `student@hostel.com`
- HOD: `hod@hostel.com`
- Sister: `sister@hostel.com`
- Warden: `warden@hostel.com`

## API

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/outpasses`
- `PUT /api/outpasses/:id`
- `GET /api/outpasses/me`
- `GET /api/outpasses/pending/hod`
- `GET /api/outpasses/pending/sister`
- `GET /api/outpasses/pending/warden`
- `PATCH /api/outpasses/:id/hod`
- `PATCH /api/outpasses/:id/sister`
- `PATCH /api/outpasses/:id/warden`
- `GET /api/outpasses/:id/pdf`
