const express = require('express');
const router  = express.Router();
const mysql   = require('mysql');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { addToBlacklist } = require('./authMiddleware');
const secret  = process.env.JWT_SECRET || 'jwt_secret_key';

const db = mysql.createConnection({
  host: 'localhost', user: 'root',
  password: '2002', database: 'punto_de_venta'
});

db.connect(err => {
  if (err) { console.error('Error connecting to MySQL:', err); return; }
  console.log('MySQL connected...');
});

// Todas las páginas del sistema (usado como fallback para admin sin rol_id)
const TODAS_LAS_PAGINAS = [
  'ventas.html','inventario.html','clientes.html','crear_producto.html',
  'consultar_productos.html','editar_producto.html','eliminar_producto.html',
  'cargar_excel.html','reportes.html','reporte_ventas.html',
  'reporte_ventas_cajero.html','cuentas_por_cobrar_reporte.html',
  'cuadre_caja.html','productos_agotados.html','config_general.html',
  'config_usuarios.html','configuracion_cajeros.html','roles.html'
];

// ===== LOGIN =====
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });

  const query = `
    SELECT u.id, u.username, u.password, u.rol, u.rol_id,
           u.nombre_completo, u.cajero_id, u.activo,
           c.nombre AS cajero_nombre
    FROM usuarios u
    LEFT JOIN cajeros c ON u.cajero_id = c.id
    WHERE u.username = ?`;

  db.query(query, [username], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Error en el servidor' });
    if (!results.length) return res.status(401).json({ message: 'Usuario no encontrado' });

    const user = results[0];
    if (!user.activo) return res.status(401).json({ message: 'Usuario inactivo' });

    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: 'Credenciales incorrectas' });

      // Obtener permisos del rol
      const obtenerPermisos = (cb) => {
        if (user.rol === 'admin' && !user.rol_id) {
          // Admin sin rol personalizado → acceso total
          return cb(TODAS_LAS_PAGINAS);
        }
        if (!user.rol_id) return cb([]);

        db.query('SELECT pagina FROM rol_permisos WHERE rol_id = ?', [user.rol_id], (e, rows) => {
          if (e || !rows.length) {
            // Si es admin por ENUM, dar acceso total aunque no tenga permisos
            if (user.rol === 'admin') return cb(TODAS_LAS_PAGINAS);
            return cb([]);
          }
          cb(rows.map(r => r.pagina));
        });
      };

      obtenerPermisos((permisos) => {
        const token = jwt.sign(
          { id: user.id, username: user.username, rol: user.rol, cajero_id: user.cajero_id },
          secret, { expiresIn: '8h' }
        );

        res.cookie('token', token, {
          httpOnly: true, sameSite: 'Strict',
          secure: false, maxAge: 8 * 60 * 60 * 1000
        });

        return res.json({
          message: 'Login successful',
          token,
          user: {
            id:        user.id,
            username:  user.username,
            nombre:    user.nombre_completo || user.cajero_nombre,
            rol:       user.rol,
            rol_id:    user.rol_id,
            cajero_id: user.cajero_id,
            permisos              // ← array de páginas permitidas
          }
        });
      });

    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      return res.status(500).json({ message: 'Error al procesar la solicitud' });
    }
  });
});

// ===== LOGOUT =====
router.post('/logout', (req, res) => {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (token) addToBlacklist(token);
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// ===== VERIFICAR SESIÓN =====
router.get('/check', (req, res) => {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, secret);
    res.json({ message: 'Token válido', user: decoded });
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
});

// ===== CAMBIAR CONTRASEÑA =====
router.post('/cambiar-password', async (req, res) => {
  const { usuario_id, password_actual, password_nuevo } = req.body;
  if (!usuario_id || !password_actual || !password_nuevo)
    return res.status(400).json({ message: 'Todos los campos son requeridos' });
  if (password_nuevo.length < 6)
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });

  db.query('SELECT password FROM usuarios WHERE id = ?', [usuario_id], async (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const match = await bcrypt.compare(password_actual, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(password_nuevo, 10);
    db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, usuario_id], (err2) => {
      if (err2) return res.status(500).json({ message: 'Error al actualizar contraseña' });
      res.json({ message: 'Contraseña actualizada exitosamente' });
    });
  });
});

module.exports = router;
