const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

// ===== OBTENER NOTIFICACIONES DE ACCIONES (DESDE TABLA NOTIFICACIONES) =====
router.get('/acciones', (req, res) => {
  db.query('SELECT * FROM notificaciones ORDER BY fecha DESC LIMIT 20', (err, result) => {
    if (err) {
      console.error('Error al obtener acciones:', err);
      return res.status(500).json([]);
    }
    res.json(result);
  });
});

// ===== OBTENER NOTIFICACIONES DE ALERTAS (PRODUCTOS SIN STOCK) =====
router.get('/alertas', (req, res) => {
  const query = `
    SELECT 
      i.id,
      CONCAT('⚠️ ', i.nombre, ' - Sin stock disponible') as mensaje,
      NOW() as fecha
    FROM inventario i
    WHERE i.cantidad = 0
    ORDER BY i.nombre ASC
  `;
  
  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error al obtener alertas:', err);
      return res.status(500).json([]);
    }
    res.json(rows);
  });
});

// ===== AGREGAR NOTIFICACIÓN =====
router.post('/add', (req, res) => {
  const { mensaje } = req.body;
  db.query('INSERT INTO notificaciones (mensaje, fecha) VALUES (?, NOW())', [mensaje], err => {
    if (err) return res.status(500).json({ok:false});
    res.json({ok:true});
  });
});

// ===== LIMPIAR NOTIFICACIONES =====
router.post('/clear', (req, res) => {
  db.query('DELETE FROM notificaciones', err => {
    if (err) return res.status(500).json({ok:false});
    res.json({ok:true});
  });
});

module.exports = router;