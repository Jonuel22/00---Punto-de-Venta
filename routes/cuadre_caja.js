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

// ── Abrir caja ──────────────────────────────────────────────────────────────
router.post('/abrir', (req, res) => {
  const { cajero_id, monto_apertura, notas_apertura } = req.body;

  if (!cajero_id) {
    return res.status(400).json({ message: 'El ID del cajero es requerido' });
  }

  const checkQuery = 'SELECT id FROM cuadre_caja WHERE cajero_id = ? AND estado = "abierto"';

  db.query(checkQuery, [cajero_id], (err, result) => {
    if (err) {
      console.error('Error al verificar caja:', err);
      return res.status(500).json({ message: 'Error al verificar estado de caja' });
    }

    if (result.length > 0) {
      return res.status(400).json({ message: 'Ya existe una caja abierta para este cajero' });
    }

    const insertQuery = `
      INSERT INTO cuadre_caja (cajero_id, fecha_apertura, monto_apertura, estado, observaciones)
      VALUES (?, NOW(), ?, 'abierto', ?)
    `;

    db.query(insertQuery, [cajero_id, monto_apertura || 0, notas_apertura || null], (err, result) => {
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

// ── Cerrar caja ─────────────────────────────────────────────────────────────
router.post('/cerrar/:id', (req, res) => {
  const { id } = req.params;
  const { monto_real, observaciones } = req.body;

  // Calcular totales de ventas del período de esta caja
  const ventasQuery = `
    SELECT
      COUNT(*) as total_transacciones,
      COALESCE(SUM(v.total), 0) as total_ventas,
      COALESCE(SUM(CASE WHEN v.forma_pago = 'efectivo'   THEN v.total ELSE 0 END), 0) as ventas_efectivo,
      COALESCE(SUM(CASE WHEN v.forma_pago = 'tarjeta'    THEN v.total ELSE 0 END), 0) as ventas_tarjeta,
      COALESCE(SUM(CASE WHEN v.forma_pago = 'transferencia' THEN v.total ELSE 0 END), 0) as ventas_transferencia,
      COALESCE(SUM(CASE WHEN v.forma_pago NOT IN ('efectivo','tarjeta','transferencia') THEN v.total ELSE 0 END), 0) as ventas_otro
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

    const totalVentas        = parseFloat(ventasResult[0].total_ventas) || 0;
    const totalTransacciones = parseInt(ventasResult[0].total_transacciones) || 0;
    const ventasEfectivo     = parseFloat(ventasResult[0].ventas_efectivo) || 0;
    const ventasTarjeta      = parseFloat(ventasResult[0].ventas_tarjeta) || 0;
    const ventasTransferencia= parseFloat(ventasResult[0].ventas_transferencia) || 0;
    const ventasOtro         = parseFloat(ventasResult[0].ventas_otro) || 0;

    const getAperturaQuery = 'SELECT monto_apertura FROM cuadre_caja WHERE id = ?';

    db.query(getAperturaQuery, [id], (err, aperturaResult) => {
      if (err || aperturaResult.length === 0) {
        return res.status(500).json({ message: 'Error al obtener datos de apertura' });
      }

      const montoApertura  = parseFloat(aperturaResult[0].monto_apertura) || 0;
      const montoEsperado  = montoApertura + totalVentas;
      const montoRealFloat = parseFloat(monto_real) || 0;
      const diferencia     = montoRealFloat - montoEsperado;

      const updateQuery = `
        UPDATE cuadre_caja
        SET fecha_cierre          = NOW(),
            monto_esperado        = ?,
            monto_real            = ?,
            diferencia            = ?,
            total_ventas          = ?,
            total_transacciones   = ?,
            estado                = 'cerrado',
            observaciones         = ?
        WHERE id = ?
      `;

      db.query(updateQuery, [
        montoEsperado, montoRealFloat, diferencia,
        totalVentas, totalTransacciones, observaciones, id
      ], (err) => {
        if (err) {
          console.error('Error al cerrar caja:', err);
          return res.status(500).json({ message: 'Error al cerrar caja' });
        }

        res.json({
          message: 'Caja cerrada exitosamente',
          datos: {
            monto_apertura        : montoApertura,
            monto_esperado        : montoEsperado,
            monto_real            : montoRealFloat,
            diferencia            : diferencia,
            total_ventas          : totalVentas,
            total_transacciones   : totalTransacciones,
            ventas_efectivo       : ventasEfectivo,
            ventas_tarjeta        : ventasTarjeta,
            ventas_transferencia  : ventasTransferencia,
            ventas_otro           : ventasOtro
          }
        });
      });
    });
  });
});

// ── Todas las cajas abiertas actualmente ────────────────────────────────────
router.get('/abiertas', (req, res) => {
  const query = `
    SELECT
      cc.*,
      c.nombre   AS cajero_nombre,
      u.username AS cajero_usuario,
      COALESCE(SUM(v.total), 0)  AS total_ventas_live,
      COUNT(v.id)                AS total_transacciones_live
    FROM cuadre_caja cc
    JOIN cajeros c ON cc.cajero_id = c.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN ventas v ON v.cajero_id = cc.cajero_id AND v.fecha >= cc.fecha_apertura
    WHERE cc.estado = 'abierto'
    GROUP BY cc.id
    ORDER BY cc.fecha_apertura DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener cajas abiertas:', err);
      return res.status(500).json({ message: 'Error al obtener cajas abiertas' });
    }
    res.json(result);
  });
});

// ── Caja abierta de un cajero específico ────────────────────────────────────
router.get('/abierta/:cajero_id', (req, res) => {
  const { cajero_id } = req.params;

  const query = `
    SELECT
      cc.*,
      c.nombre   AS cajero_nombre,
      u.username AS cajero_usuario,
      COALESCE(SUM(v.total), 0) AS total_ventas_live,
      COUNT(v.id)               AS total_transacciones_live
    FROM cuadre_caja cc
    JOIN cajeros c ON cc.cajero_id = c.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN ventas v ON v.cajero_id = cc.cajero_id AND v.fecha >= cc.fecha_apertura
    WHERE cc.cajero_id = ? AND cc.estado = 'abierto'
    GROUP BY cc.id
    ORDER BY cc.fecha_apertura DESC
    LIMIT 1
  `;

  db.query(query, [cajero_id], (err, result) => {
    if (err) {
      console.error('Error al obtener caja abierta:', err);
      return res.status(500).json({ message: 'Error al obtener caja' });
    }
    res.json(result.length === 0 ? null : result[0]);
  });
});

// ── Historial de cuadres (filtros corregidos: desde/hasta) ──────────────────
router.get('/historial', (req, res) => {
  // Acepta tanto desde/hasta (frontend) como fecha_inicio/fecha_fin (legado)
  const cajero_id   = req.query.cajero_id;
  const desde       = req.query.desde       || req.query.fecha_inicio;
  const hasta       = req.query.hasta       || req.query.fecha_fin;
  const estado      = req.query.estado;

  let query = `
    SELECT
      cc.*,
      c.nombre   AS cajero_nombre,
      u.username AS cajero_usuario
    FROM cuadre_caja cc
    JOIN cajeros c ON cc.cajero_id = c.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (cajero_id) {
    query += ' AND cc.cajero_id = ?';
    params.push(cajero_id);
  }
  if (desde) {
    query += ' AND DATE(cc.fecha_apertura) >= ?';
    params.push(desde);
  }
  if (hasta) {
    query += ' AND DATE(cc.fecha_apertura) <= ?';
    params.push(hasta);
  }
  if (estado) {
    query += ' AND cc.estado = ?';
    params.push(estado);
  }

  query += ' ORDER BY cc.fecha_apertura DESC LIMIT 500';

  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error al obtener historial:', err);
      return res.status(500).json({ message: 'Error al obtener historial' });
    }
    res.json(result);
  });
});

// ── Ventas en vivo de una caja (para panel de caja abierta) ─────────────────
router.get('/ventas-caja/:id', (req, res) => {
  const { id } = req.params;

  const cuadreQuery = `
    SELECT cajero_id, fecha_apertura, fecha_cierre, estado
    FROM cuadre_caja WHERE id = ?
  `;

  db.query(cuadreQuery, [id], (err, cuadreResult) => {
    if (err || cuadreResult.length === 0) {
      return res.status(404).json({ message: 'Cuadre no encontrado' });
    }

    const cc = cuadreResult[0];
    const fechaCierre = cc.fecha_cierre ? 'AND v.fecha <= ?' : '';

    const ventasQuery = `
      SELECT
        v.id,
        v.fecha,
        v.total,
        v.cliente_nombre,
        v.forma_pago
      FROM ventas v
      WHERE v.cajero_id = ?
        AND v.fecha >= ?
        ${fechaCierre}
      ORDER BY v.fecha DESC
      LIMIT 200
    `;

    const params = [cc.cajero_id, cc.fecha_apertura];
    if (cc.fecha_cierre) params.push(cc.fecha_cierre);

    db.query(ventasQuery, params, (err, ventas) => {
      if (err) {
        console.error('Error al obtener ventas de caja:', err);
        return res.status(500).json({ message: 'Error al obtener ventas' });
      }

      // Totales por forma de pago
      const resumen = ventas.reduce((acc, v) => {
        const fp = v.forma_pago || 'efectivo';
        acc.total += parseFloat(v.total) || 0;
        acc.count += 1;
        acc.por_forma[fp] = (acc.por_forma[fp] || 0) + (parseFloat(v.total) || 0);
        return acc;
      }, { total: 0, count: 0, por_forma: {} });

      res.json({ ventas, resumen });
    });
  });
});

// ── Detalle completo de un cuadre (/detalle/:id y /:id) ─────────────────────
function getDetalle(id, res) {
  const query = `
    SELECT
      cc.*,
      c.nombre   AS cajero_nombre,
      u.username AS cajero_usuario
    FROM cuadre_caja cc
    JOIN cajeros c ON cc.cajero_id = c.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
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

    const cc = cuadreResult[0];
    const fechaCierre = cc.fecha_cierre ? 'AND v.fecha <= ?' : '';

    const ventasQuery = `
      SELECT
        v.id,
        v.fecha,
        v.total,
        v.cliente_nombre,
        v.forma_pago
      FROM ventas v
      WHERE v.cajero_id = ?
        AND v.fecha >= ?
        ${fechaCierre}
      ORDER BY v.fecha DESC
      LIMIT 200
    `;

    const params = [cc.cajero_id, cc.fecha_apertura];
    if (cc.fecha_cierre) params.push(cc.fecha_cierre);

    db.query(ventasQuery, params, (err, ventas) => {
      if (err) {
        console.error('Error al obtener ventas:', err);
        return res.status(500).json({ message: 'Error al obtener ventas' });
      }

      // Calcular totales en vivo (útil para cajas aún abiertas)
      const totalVentasLive  = ventas.reduce((s, v) => s + (parseFloat(v.total) || 0), 0);
      const porFormaPago     = ventas.reduce((acc, v) => {
        const fp = v.forma_pago || 'efectivo';
        acc[fp] = (acc[fp] || 0) + (parseFloat(v.total) || 0);
        return acc;
      }, {});

      res.json({
        cuadre: cc,
        ventas,
        resumen: {
          total_ventas_live : totalVentasLive,
          total_transacciones: ventas.length,
          por_forma_pago    : porFormaPago
        }
      });
    });
  });
}

// Ruta con prefijo /detalle (la que usa el frontend)
router.get('/detalle/:id', (req, res) => getDetalle(req.params.id, res));

// Ruta genérica /:id (mantener compatibilidad)
router.get('/:id', (req, res) => getDetalle(req.params.id, res));

module.exports = router;