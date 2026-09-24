import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import outpassRoutes from './routes/outpassRoutes.js';
import gateRoutes from './routes/gateRoutes.js';
import movementRoutes from './routes/movementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import monthlyDownloadRoutes from './routes/monthlyDownloadRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const indexHtmlPath = path.join(frontendDistPath, 'index.html');

// Allow all origins for easier deployment to Vercel/Render without CORS issues
app.use(
  cors({
    origin: 'https://hostel-outpass-management-system.vercel.app',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

if (fs.existsSync(frontendDistPath)) {
  // index.html: never cached, so mobile browsers always load the CURRENT
  // bundle on reopen (a stale cached shell used to re-run the old code —
  // which broke mobile login persistence and other fixes).
  app.use(express.static(frontendDistPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Vite emits content-hashed filenames, safe to cache long-term.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(indexHtmlPath);
  }

  return res.status(200).json({
    message: 'Frontend is not built yet. Run the frontend dev server or build frontend/dist for production.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/outpasses', outpassRoutes);
app.use('/api/gates', gateRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monthly-outpasses', monthlyDownloadRoutes);

app.get(/^\/(?!api).*/, (req, res, next) => {
  if (fs.existsSync(indexHtmlPath)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(indexHtmlPath);
  }

  return next();
});

app.use(notFound);
app.use(errorHandler);

export default app;
