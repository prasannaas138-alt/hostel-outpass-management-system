import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import outpassRoutes from './routes/outpassRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const indexHtmlPath = path.join(frontendDistPath, 'index.html');

// Allow all origins for easier deployment to Vercel/Render without CORS issues
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }

  return res.status(200).json({
    message: 'Frontend is not built yet. Run the frontend dev server or build frontend/dist for production.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/outpasses', outpassRoutes);

app.get(/^\/(?!api).*/, (req, res, next) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }

  return next();
});

app.use(notFound);
app.use(errorHandler);

export default app;
