const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const supabase = require('../db');
const { addToBlacklist } = require('./authMiddleware');
const secret  = process.env.JWT_SECRET || 'jwt_secret_key';

const TODAS_LAS_PAGINAS = [
  'ventas.html','inventario.html','clientes.html','crear_producto.html',
  'consultar_productos.html','editar_producto.html','eliminar_producto.html',
  'cargar_excel.html','reportes.html','reporte_ventas.html',
  'reporte_ventas_cajero.html','cuentas_por_cobrar_reporte.html',
  'cuadre_caja.html','productos_agotados.html','config_general.html',
  'config_usuarios.html','configuracion_cajeros.html','roles.html'
];

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });

  try {
    const { data: results, error } = await supabase
      .from('usuarios')
      .select('id, username, password, rol, rol_id, nombre_completo, cajero_id, activo, cajeros!fk_usuarios_cajero(nombre)')
      .eq('username', username)
      .maybeSingle();

    if (!results) return res.status(401).json({ message: 'Usuario no encontrado' });
    if (error) throw error;

    const user = { ...results, cajero_nombre: results.cajeros?.nombre };
    if (!user.activo) return res.status(401).json({ message: 'Usuario inactivo' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales incorrectas' });

    // Obtener permisos
    let permisos = [];
    if (user.rol === 'admin' && !user.rol_id) {
      permisos = TODAS_LAS_PAGINAS;
    } else if (user.rol_id) {
      const { data: permRows } = await supabase
        .from('rol_permisos')
        .select('pagina')
        .eq('rol_id', user.rol_id);

      if (!permRows?.length && user.rol === 'admin') {
        permisos = TODAS_LAS_PAGINAS;
      } else {
        permisos = permRows?.map(r => r.pagina) || [];
      }
    }

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
        permisos
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
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

  try {
    const { data: user } = await supabase
      .from('usuarios').select('password').eq('id', usuario_id).single();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const match = await bcrypt.compare(password_actual, user.password);
    if (!match) return res.status(401).json({ message: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(password_nuevo, 10);
    await supabase.from('usuarios').update({ password: hash }).eq('id', usuario_id);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error al actualizar contraseña' });
  }
});

module.exports = router;