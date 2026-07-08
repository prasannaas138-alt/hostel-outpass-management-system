# Hostel Outpass Management System — Backend

This is the Node.js/Express backend for the Hostel Outpass Management System.

## Environment Variables Required

Set these in your hosting platform (e.g., Render):

| Variable | Value |
|---|---|
| `PORT` | `5000` (or leave blank — Render sets this automatically) |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random secret string |
| `JWT_EXPIRES_IN` | `7d` |

## Start Command

```
node --dns-result-order=ipv4first server.js
```
