const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { addToBlacklist } = require('./authMiddleware');
const secret = process.env.JWT_SECRET || 'jwt_secret_key';

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('MySQL connected...');
});

// ===== LOGIN CON BCRYPT =====
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  }
  
  // Buscar usuario con información completa
  const query = `
    SELECT 
      u.id,
      u.username,
      u.password,
      u.rol,
      u.nombre_completo,
      u.cajero_id,
      u.activo,
      c.nombre as cajero_nombre
    FROM usuarios u
    LEFT JOIN cajeros c ON u.cajero_id = c.id
    WHERE u.username = ?
  `;
  
  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error('Error en consulta de login:', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    
    const user = results[0];
    
    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }
    
    try {
      // Comparar contraseña con bcrypt
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }
      
      // Generar token JWT con más información
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          rol: user.rol,
          cajero_id: user.cajero_id
        },
        secret,
        { expiresIn: '8h' } // Aumentado a 8 horas
      );
      
      // Establecer cookie httpOnly
      res.cookie('token', token, { 
        httpOnly: true, 
        sameSite: 'Strict', 
        secure: false,
        maxAge: 8 * 60 * 60 * 1000 // 8 horas en milisegundos
      });
      
      // Retornar datos del usuario (sin la contraseña)
      return res.json({ 
        message: 'Login successful', 
        token: token,
        user: {
          id: user.id,
          username: user.username,
          nombre: user.nombre_completo || user.cajero_nombre,
          rol: user.rol,
          cajero_id: user.cajero_id
        }
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
  
  if (!usuario_id || !password_actual || !password_nuevo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos' });
  }
  
  // Validar longitud de la nueva contraseña
  if (password_nuevo.length < 6) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }
  
  try {
    // Obtener contraseña actual del usuario
    db.query('SELECT password FROM usuarios WHERE id = ?', [usuario_id], async (err, result) => {
      if (err || result.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      const usuario = result[0];
      
      // Verificar contraseña actual
      const passwordMatch = await bcrypt.compare(password_actual, usuario.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
      }
      
      // Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(password_nuevo, 10);
      
      // Actualizar contraseña
      db.query(
        'UPDATE usuarios SET password = ? WHERE id = ?',
        [hashedPassword, usuario_id],
        (err) => {
          if (err) {
            console.error('Error al actualizar contraseña:', err);
            return res.status(500).json({ message: 'Error al actualizar contraseña' });
          }
          
          res.json({ message: 'Contraseña actualizada exitosamente' });
        }
      );
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// ===== VERIFICAR TOKEN (endpoint adicional) =====
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  
  try {
    const decoded = jwt.verify(token, secret);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Token inválido' });
  }
});

module.exports = router;