import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Middleware de seguridad centralizado para enmascarar errores 500 en producción
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode === 500 && body && body.error) {
      // Imprimir el error original en los logs del servidor para depuración
      console.error('Error 500 en servidor:', body.error);
      if (process.env.NODE_ENV === 'production') {
        body.error = 'Ocurrió un error interno en el servidor';
      }
    }
    return originalJson.call(this, body);
  };
  next();
});

app.use(express.json());

// Rutas
import authRoutes from './src/routes/auth.js';
import negociosRoutes from './src/routes/negocios.js';
import onboardingRoutes from './src/routes/onboarding.js';
import negocioRoutes from './src/routes/negocio.js';
import operarioRoutes from './src/routes/operario.js';

app.use('/api/auth', authRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/negocios', negocioRoutes);
app.use('/api/operario', operarioRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
