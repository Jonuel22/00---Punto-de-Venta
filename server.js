const express    = require('express');
const bodyParser = require('body-parser');
const path       = require('path');
const cors       = require('cors');
const cookieParser = require('cookie-parser');

const app  = express();
const port = 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Importar rutas y middleware
const authRoutes          = require('./routes/auth');
const inventoryRoutes     = require('./routes/inventory');
const salesRoutes         = require('./routes/sales');
const notificationsRoutes = require('./routes/notifications');
const reportesRoutes      = require('./routes/reportes');
const cajerosRoutes       = require('./routes/cajeros');
const cuadreCajaRoutes    = require('./routes/cuadre_caja');
const usuariosRouter      = require('./routes/usuarios');
const clientes_backendRouter = require('./routes/clientes_backend');
const configRouter        = require('./routes/config');
const rolesRouter         = require('./routes/roles');          // ← NUEVO
const { authMiddleware }  = require('./routes/authMiddleware');

// No-cache middleware
function noCacheHeaders(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/inventory',     authMiddleware, noCacheHeaders, inventoryRoutes);
app.use('/api/sales',         authMiddleware, noCacheHeaders, salesRoutes);
app.use('/api/notifications', authMiddleware, noCacheHeaders, notificationsRoutes);
app.use('/api/reportes',      authMiddleware, noCacheHeaders, reportesRoutes);
app.use('/api/cajeros',       authMiddleware, noCacheHeaders, cajerosRoutes);
app.use('/api/cuadre-caja',   authMiddleware, noCacheHeaders, cuadreCajaRoutes);
app.use('/api/usuarios',      authMiddleware, noCacheHeaders, usuariosRouter);
app.use('/api/config',        authMiddleware, noCacheHeaders, configRouter);
app.use('/api/clientes',      authMiddleware, noCacheHeaders, clientes_backendRouter);
app.use('/api/roles',         authMiddleware, noCacheHeaders, rolesRouter);  // ← NUEVO

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
