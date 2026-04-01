const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const bcrypt = require('bcryptjs');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

// ===== GESTIÓN DE USUARIOS =====

// Obtener todos los usuarios con información de cajero
router.get('/all', (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.username,
      u.nombre_completo,
      u.rol,
      u.cajero_id,
      u.activo,
      u.fecha_creacion,
      c.nombre as cajero_nombre
    FROM usuarios u
    LEFT JOIN cajeros c ON u.cajero_id = c.id
    ORDER BY u.username ASC
  `;
  
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ message: 'Error al obtener usuarios' });
    }
    res.json(result);
  });
});

// Obtener usuarios activos
router.get('/activos', (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.username,
      u.nombre_completo,
      u.rol,
      c.nombre as cajero_nombre
    FROM usuarios u
    LEFT JOIN cajeros c ON u.cajero_id = c.id
    WHERE u.activo = 1
    ORDER BY u.username ASC
  `;
  
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener usuarios activos:', err);
      return res.status(500).json({ message: 'Error al obtener usuarios' });
    }
    res.json(result);
  });
});

// Crear nuevo usuario
router.post('/create', async (req, res) => {
  const { username, nombre_completo, password, rol, cajero_id } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }
  
  try {
    // Verificar si el usuario ya existe
    const checkQuery = 'SELECT id FROM usuarios WHERE username = ?';
    db.query(checkQuery, [username], async (err, result) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        return res.status(500).json({ message: 'Error al verificar usuario' });
      }
      
      if (result.length > 0) {
        return res.status(400).json({ message: 'El nombre de usuario ya existe' });
      }
      
      // Hashear password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insertar usuario
      const insertQuery = `
        INSERT INTO usuarios (username, password, nombre_completo, rol, cajero_id, activo)
        VALUES (?, ?, ?, ?, ?, 1)
      `;
      
      db.query(insertQuery, [
        username, 
        hashedPassword, 
        nombre_completo, 
        rol || 'cajero', 
        cajero_id || null
      ], (err, result) => {
        if (err) {
          console.error('Error al crear usuario:', err);
          return res.status(500).json({ message: 'Error al crear usuario' });
        }
        
        res.json({ 
          message: 'Usuario creado exitosamente',
          usuarioId: result.insertId 
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Actualizar usuario
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { username, nombre_completo, password, rol, cajero_id, activo } = req.body;
  
  try {
    let query = `
      UPDATE usuarios 
      SET username = ?, nombre_completo = ?, rol = ?, cajero_id = ?, activo = ?
    `;
    let params = [username, nombre_completo, rol || 'cajero', cajero_id || null, activo];
    
    // Si se proporciona password, hashear y actualizar
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    db.query(query, params, (err, result) => {
      if (err) {
        console.error('Error al actualizar usuario:', err);
        return res.status(500).json({ message: 'Error al actualizar usuario' });
      }
      
      res.json({ message: 'Usuario actualizado exitosamente' });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Desactivar usuario
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  
  // En lugar de eliminar, desactivamos el usuario
  const query = 'UPDATE usuarios SET activo = 0 WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar usuario:', err);
      return res.status(500).json({ message: 'Error al eliminar usuario' });
    }
    
    res.json({ message: 'Usuario desactivado exitosamente' });
  });
});

// Obtener un usuario por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      u.id,
      u.username,
      u.nombre_completo,
      u.rol,
      u.cajero_id,
      u.activo,
      c.nombre as cajero_nombre
    FROM usuarios u
    LEFT JOIN cajeros c ON u.cajero_id = c.id
    WHERE u.id = ?
  `;
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener usuario:', err);
      return res.status(500).json({ message: 'Error al obtener usuario' });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(result[0]);
  });
});

module.exports = router;
