import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import outpassRoutes from './routes/outpassRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/outpasses', outpassRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
