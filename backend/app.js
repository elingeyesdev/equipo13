import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
}));
app.use(express.json());

// Rutas
import authRoutes from './src/routes/auth.js';
import negociosRoutes from './src/routes/negocios.js';
import onboardingRoutes from './src/routes/onboarding.js';
import negocioRoutes from './src/routes/negocio.js';

app.use('/api/auth', authRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/negocios', negocioRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
