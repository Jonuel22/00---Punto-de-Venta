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

// ===== GESTIÓN DE CAJEROS =====

// Obtener todos los cajeros
router.get('/all', (req, res) => {
  const query = 'SELECT id, nombre, usuario, email, telefono, activo, fecha_creacion FROM cajeros ORDER BY nombre ASC';
  
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener cajeros:', err);
      return res.status(500).json({ message: 'Error al obtener cajeros' });
    }
    res.json(result);
  });
});

// Obtener cajeros activos
router.get('/activos', (req, res) => {
  const query = 'SELECT id, nombre, usuario, email FROM cajeros WHERE activo = 1 ORDER BY nombre ASC';
  
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener cajeros activos:', err);
      return res.status(500).json({ message: 'Error al obtener cajeros' });
    }
    res.json(result);
  });
});

// Crear nuevo cajero
router.post('/create', async (req, res) => {
  const { nombre, usuario, password, email, telefono } = req.body;
  
  if (!nombre || !usuario || !password) {
    return res.status(400).json({ message: 'Nombre, usuario y password son requeridos' });
  }
  
  try {
    // Verificar si el usuario ya existe
    const checkQuery = 'SELECT id FROM cajeros WHERE usuario = ?';
    db.query(checkQuery, [usuario], async (err, result) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        return res.status(500).json({ message: 'Error al verificar usuario' });
      }
      
      if (result.length > 0) {
        return res.status(400).json({ message: 'El usuario ya existe' });
      }
      
      // Hashear password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insertar cajero
      const insertQuery = 'INSERT INTO cajeros (nombre, usuario, password, email, telefono, activo) VALUES (?, ?, ?, ?, ?, 1)';
      db.query(insertQuery, [nombre, usuario, hashedPassword, email, telefono], (err, result) => {
        if (err) {
          console.error('Error al crear cajero:', err);
          return res.status(500).json({ message: 'Error al crear cajero' });
        }
        
        res.json({ 
          message: 'Cajero creado exitosamente',
          cajeroId: result.insertId 
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Actualizar cajero
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, password, email, telefono, activo } = req.body;
  
  try {
    let query = 'UPDATE cajeros SET nombre = ?, usuario = ?, email = ?, telefono = ?, activo = ?';
    let params = [nombre, usuario, email, telefono, activo];
    
    // Si se proporciona password, hashear y actualizar
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    db.query(query, params, (err, result) => {
      if (err) {
        console.error('Error al actualizar cajero:', err);
        return res.status(500).json({ message: 'Error al actualizar cajero' });
      }
      
      res.json({ message: 'Cajero actualizado exitosamente' });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Eliminar cajero (desactivar)
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  
  // En lugar de eliminar, desactivamos el cajero
  const query = 'UPDATE cajeros SET activo = 0 WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar cajero:', err);
      return res.status(500).json({ message: 'Error al eliminar cajero' });
    }
    
    res.json({ message: 'Cajero desactivado exitosamente' });
  });
});

// Obtener un cajero por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT id, nombre, usuario, email, telefono, activo, fecha_creacion FROM cajeros WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener cajero:', err);
      return res.status(500).json({ message: 'Error al obtener cajero' });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Cajero no encontrado' });
    }
    
    res.json(result[0]);
  });
});

module.exports = router;
