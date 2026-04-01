// Nueva ruta para reportes de ventas con filtros
const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

// Reporte de ventas con filtros por fecha, producto, cliente
router.get('/ventas', (req, res) => {
  const { fecha_inicio, fecha_fin, producto, cliente } = req.query;

  let query = `
    SELECT 
      v.fecha,
      i.nombre AS producto,
      v.cliente_nombre AS cliente,
      dv.cantidad,
      dv.precio_unitario * dv.cantidad AS total
    FROM ventas v
    JOIN detalle_ventas dv ON v.id = dv.venta_id
    JOIN inventario i ON dv.producto_id = i.id
    WHERE 1=1
  `;

  const params = [];

  // 🔹 Filtro por fecha inicio
  if (fecha_inicio) {
    query += ' AND v.fecha >= ?';
    params.push(fecha_inicio);
  }

  // 🔹 Filtro por fecha fin (día completo)
  if (fecha_fin) {
    query += ' AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(fecha_fin);
  }

  // 🔹 Filtro por producto
  if (producto) {
    query += ' AND (i.nombre LIKE ? OR i.id = ?)';
    params.push(`%${producto}%`, producto);
  }

  // 🔹 Filtro por cliente
  if (cliente) {
    query += ' AND (v.cliente_nombre LIKE ? OR v.cliente_rnc LIKE ?)';
    params.push(`%${cliente}%`, `%${cliente}%`);
  }

  query += ' ORDER BY v.fecha DESC';

  console.log('Query:', query);
  console.log('Params:', params);

  db.query(query, params, (err, rows) => {
    if (err) {
      console.error('Error en query de reportes:', err);
      return res.status(500).json({ 
        message: 'Error al obtener reporte de ventas' 
      });
    }
    res.json(rows);
  });
});

// ===== REPORTE DE VENTAS POR CAJERO =====
router.get('/ventas-por-cajero', (req, res) => {
  const { fecha_inicio, fecha_fin, cajero_id } = req.query;
  
  let query = `
    SELECT 
      c.id as cajero_id,
      c.nombre as cajero_nombre,
      COUNT(v.id) as num_transacciones,
      COALESCE(SUM(v.total), 0) as total_ventas,
      COALESCE(AVG(v.total), 0) as ticket_promedio
    FROM cajeros c
    LEFT JOIN ventas v ON c.id = v.cajero_id
    WHERE c.activo = 1
  `;
  
  const params = [];
  
  // 🔹 Filtro por fecha inicio
  if (fecha_inicio) {
    query += ' AND v.fecha >= ?';
    params.push(fecha_inicio);
  }
  
  // 🔹 Filtro por fecha fin (día completo)
  if (fecha_fin) {
    query += ' AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(fecha_fin);
  }
  
  // 🔹 Filtro por cajero específico
  if (cajero_id) {
    query += ' AND c.id = ?';
    params.push(cajero_id);
  }
  
  query += ' GROUP BY c.id, c.nombre';
  query += ' HAVING num_transacciones > 0'; // Solo cajeros con ventas
  query += ' ORDER BY total_ventas DESC';
  
  console.log('Query ventas por cajero:', query);
  console.log('Params:', params);
  
  db.query(query, params, (err, rows) => {
    if (err) {
      console.error('Error en query de ventas por cajero:', err);
      return res.status(500).json({ 
        message: 'Error al obtener reporte de ventas por cajero' 
      });
    }
    res.json(rows);
  });
});

module.exports = router;