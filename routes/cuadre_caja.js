const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

// ===== CUADRE DE CAJA =====

// Abrir caja
router.post('/abrir', (req, res) => {
  const { cajero_id, monto_apertura } = req.body;
  
  if (!cajero_id) {
    return res.status(400).json({ message: 'El ID del cajero es requerido' });
  }
  
  // Verificar si ya hay una caja abierta para este cajero
  const checkQuery = 'SELECT id FROM cuadre_caja WHERE cajero_id = ? AND estado = "abierto"';
  
  db.query(checkQuery, [cajero_id], (err, result) => {
    if (err) {
      console.error('Error al verificar caja:', err);
      return res.status(500).json({ message: 'Error al verificar estado de caja' });
    }
    
    if (result.length > 0) {
      return res.status(400).json({ message: 'Ya existe una caja abierta para este cajero' });
    }
    
    // Abrir nueva caja
    const insertQuery = `
      INSERT INTO cuadre_caja (cajero_id, fecha_apertura, monto_apertura, estado) 
      VALUES (?, NOW(), ?, 'abierto')
    `;
    
    db.query(insertQuery, [cajero_id, monto_apertura || 0], (err, result) => {
      if (err) {
        console.error('Error al abrir caja:', err);
        return res.status(500).json({ message: 'Error al abrir caja' });
      }
      
      res.json({ 
        message: 'Caja abierta exitosamente',
        cuadreId: result.insertId 
      });
    });
  });
});

// Cerrar caja
router.post('/cerrar/:id', (req, res) => {
  const { id } = req.params;
  const { monto_real, observaciones } = req.body;
  
  // Obtener totales de ventas para este cuadre
  const ventasQuery = `
    SELECT 
      COUNT(*) as total_transacciones,
      COALESCE(SUM(total), 0) as total_ventas
    FROM ventas v
    JOIN cuadre_caja cc ON v.cajero_id = cc.cajero_id
    WHERE cc.id = ? 
      AND v.fecha >= cc.fecha_apertura
      AND cc.estado = 'abierto'
  `;
  
  db.query(ventasQuery, [id], (err, ventasResult) => {
    if (err) {
      console.error('Error al obtener ventas:', err);
      return res.status(500).json({ message: 'Error al calcular ventas' });
    }
    
    const totalVentas = parseFloat(ventasResult[0].total_ventas) || 0;
    const totalTransacciones = parseInt(ventasResult[0].total_transacciones) || 0;
    
    // Obtener monto de apertura
    const getAperturaQuery = 'SELECT monto_apertura FROM cuadre_caja WHERE id = ?';
    
    db.query(getAperturaQuery, [id], (err, aperturaResult) => {
      if (err || aperturaResult.length === 0) {
        return res.status(500).json({ message: 'Error al obtener datos de apertura' });
      }
      
      const montoApertura = parseFloat(aperturaResult[0].monto_apertura) || 0;
      const montoEsperado = montoApertura + totalVentas;
      const montoRealFloat = parseFloat(monto_real) || 0;
      const diferencia = montoRealFloat - montoEsperado;
      
      // Cerrar caja
      const updateQuery = `
        UPDATE cuadre_caja 
        SET fecha_cierre = NOW(),
            monto_esperado = ?,
            monto_real = ?,
            diferencia = ?,
            total_ventas = ?,
            total_transacciones = ?,
            estado = 'cerrado',
            observaciones = ?
        WHERE id = ?
      `;
      
      db.query(updateQuery, [
        montoEsperado,
        montoRealFloat,
        diferencia,
        totalVentas,
        totalTransacciones,
        observaciones,
        id
      ], (err, result) => {
        if (err) {
          console.error('Error al cerrar caja:', err);
          return res.status(500).json({ message: 'Error al cerrar caja' });
        }
        
        res.json({ 
          message: 'Caja cerrada exitosamente',
          datos: {
            monto_esperado: montoEsperado,
            monto_real: montoRealFloat,
            diferencia: diferencia,
            total_ventas: totalVentas,
            total_transacciones: totalTransacciones
          }
        });
      });
    });
  });
});

// Obtener caja abierta de un cajero
router.get('/abierta/:cajero_id', (req, res) => {
  const { cajero_id } = req.params;
  
  const query = `
    SELECT 
      cc.*,
      c.nombre as cajero_nombre
    FROM cuadre_caja cc
    JOIN cajeros c ON cc.cajero_id = c.id
    WHERE cc.cajero_id = ? AND cc.estado = 'abierto'
    ORDER BY cc.fecha_apertura DESC
    LIMIT 1
  `;
  
  db.query(query, [cajero_id], (err, result) => {
    if (err) {
      console.error('Error al obtener caja abierta:', err);
      return res.status(500).json({ message: 'Error al obtener caja' });
    }
    
    if (result.length === 0) {
      return res.json(null);
    }
    
    res.json(result[0]);
  });
});

// Obtener historial de cuadres
router.get('/historial', (req, res) => {
  const { cajero_id, fecha_inicio, fecha_fin } = req.query;
  
  let query = `
    SELECT 
      cc.*,
      c.nombre as cajero_nombre,
      c.usuario as cajero_usuario
    FROM cuadre_caja cc
    JOIN cajeros c ON cc.cajero_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (cajero_id) {
    query += ' AND cc.cajero_id = ?';
    params.push(cajero_id);
  }
  
  if (fecha_inicio) {
    query += ' AND DATE(cc.fecha_apertura) >= ?';
    params.push(fecha_inicio);
  }
  
  if (fecha_fin) {
    query += ' AND DATE(cc.fecha_apertura) <= ?';
    params.push(fecha_fin);
  }
  
  query += ' ORDER BY cc.fecha_apertura DESC';
  
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error al obtener historial:', err);
      return res.status(500).json({ message: 'Error al obtener historial' });
    }
    
    res.json(result);
  });
});

// Obtener detalles de un cuadre específico
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      cc.*,
      c.nombre as cajero_nombre,
      c.usuario as cajero_usuario
    FROM cuadre_caja cc
    JOIN cajeros c ON cc.cajero_id = c.id
    WHERE cc.id = ?
  `;
  
  db.query(query, [id], (err, cuadreResult) => {
    if (err) {
      console.error('Error al obtener cuadre:', err);
      return res.status(500).json({ message: 'Error al obtener cuadre' });
    }
    
    if (cuadreResult.length === 0) {
      return res.status(404).json({ message: 'Cuadre no encontrado' });
    }
    
    // Obtener ventas asociadas al cuadre
    const ventasQuery = `
      SELECT 
        v.id,
        v.fecha,
        v.total,
        v.cliente_nombre
      FROM ventas v
      WHERE v.cajero_id = ?
        AND v.fecha >= ?
        ${cuadreResult[0].fecha_cierre ? 'AND v.fecha <= ?' : ''}
      ORDER BY v.fecha DESC
    `;
    
    const ventasParams = [cuadreResult[0].cajero_id, cuadreResult[0].fecha_apertura];
    if (cuadreResult[0].fecha_cierre) {
      ventasParams.push(cuadreResult[0].fecha_cierre);
    }
    
    db.query(ventasQuery, ventasParams, (err, ventasResult) => {
      if (err) {
        console.error('Error al obtener ventas:', err);
        return res.status(500).json({ message: 'Error al obtener ventas' });
      }
      
      res.json({
        cuadre: cuadreResult[0],
        ventas: ventasResult
      });
    });
  });
});

module.exports = router;
