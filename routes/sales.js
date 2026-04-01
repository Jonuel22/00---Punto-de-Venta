const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

// Variable para almacenar la instancia de WebSocket Server
let wss = null;

// Función para configurar WebSocket Server
const setWebSocketServer = (webSocketServer) => {
  wss = webSocketServer;
};

// Función para emitir actualización de KPIs a todos los clientes conectados
const emitirKPIActualizados = () => {
  if (!wss) return;
  
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  const fechaHoy = `${year}-${month}-${day}`;

  const query = `
    SELECT 
      COUNT(DISTINCT v.id) AS transacciones,
      ROUND(
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0)
        + COALESCE(SUM(DISTINCT v.itbis), 0),
        2
      ) AS total
    FROM ventas v
    LEFT JOIN detalle_ventas dv 
      ON v.id = dv.venta_id
    WHERE v.fecha >= ?
      AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY);
  `;
  
  db.query(query, [fechaHoy, fechaHoy], (err, rows) => {
    if (err) {
      console.error('Error al obtener KPIs para WebSocket:', err);
      return;
    }
    
    const resultado = {
      type: 'KPI_UPDATE',
      data: {
        transacciones: parseInt(rows[0]?.transacciones) || 0,
        total: parseFloat(rows[0]?.total) || 0
      }
    };
    
    // Enviar a todos los clientes conectados
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(JSON.stringify(resultado));
      }
    });
    
    console.log('KPIs actualizados emitidos:', resultado.data);
  });
};

// ===== ENDPOINT DE KPIs - DEBE IR PRIMERO =====
router.get('/kpi', (req, res) => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  const fechaHoy = `${year}-${month}-${day}`;
  
  console.log('Consultando KPIs para la fecha:', fechaHoy);
  
  const query = `
    SELECT 
      COUNT(DISTINCT v.id) AS transacciones,
      ROUND(
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0)
        + COALESCE(SUM(DISTINCT v.itbis), 0),
        2
      ) AS total
    FROM ventas v
    LEFT JOIN detalle_ventas dv 
      ON v.id = dv.venta_id
    WHERE v.fecha >= ?
      AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY);
  `;
  
  db.query(query, [fechaHoy, fechaHoy], (err, rows) => {
    if (err) {
      console.error('Error en KPI:', err);
      return res.status(500).json({ 
        message: 'Error al obtener KPIs',
        transacciones: 0,
        total: 0 
      });
    }
    
    console.log('Resultado de KPIs:', rows);
    
    if (rows.length === 0 || rows[0].transacciones === 0) {
      console.log('No hay ventas hoy');
      return res.json({ 
        transacciones: 0, 
        total: 0 
      });
    }
    
    const resultado = {
      transacciones: parseInt(rows[0].transacciones) || 0,
      total: parseFloat(rows[0].total) || 0
    };
    
    console.log('Enviando resultado:', resultado);
    res.json(resultado);
  });
});

// ===== TOP 5 PRODUCTOS MÁS VENDIDOS =====
router.get('/top-selling', (req, res) => {
  const query = `
    SELECT 
      i.nombre,
      SUM(dv.cantidad) as cantidad
    FROM detalle_ventas dv
    JOIN inventario i ON dv.producto_id = i.id
    GROUP BY dv.producto_id, i.nombre
    ORDER BY cantidad DESC
    LIMIT 5
  `;
  
  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error al obtener productos más vendidos:', err);
      return res.status(500).json({ message: 'Error al obtener productos' });
    }
    
    if (rows.length === 0) {
      return res.json([]);
    }
    
    res.json(rows);
  });
});

// ===== VENTAS DIARIAS DEL MES ACTUAL =====
router.get('/daily-month', (req, res) => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const primerDia = `${year}-${month}-01`;

  
  const query = `
    SELECT 
      DAY(v.fecha) as dia,
      ROUND(
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0)
        + COALESCE(SUM(DISTINCT v.itbis), 0),
        2
      ) AS total
    FROM ventas v
    LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
    WHERE v.fecha >= ? 
      AND MONTH(v.fecha) = ?
      AND YEAR(v.fecha) = ?
    GROUP BY DAY(v.fecha)
    ORDER BY dia ASC
  `;
  
  db.query(query, [primerDia, month, year], (err, rows) => {
    if (err) {
      console.error('Error al obtener ventas diarias:', err);
      return res.status(500).json({ message: 'Error al obtener ventas diarias' });
    }
    
    if (rows.length === 0) {
      return res.json([]);
    }
    
    res.json(rows);
  });
});

// ===== BUSCAR PRODUCTOS =====
router.get('/productos', (req, res) => {
  const { q } = req.query;
  const query = 'SELECT * FROM inventario WHERE nombre LIKE ? OR codigo_barras LIKE ?';
  db.query(query, [`%${q}%`, `%${q}%`], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json(result);
    }
  });
});

// ===== CREAR VENTA CON CAJERO =====
router.post('/crear', (req, res) => {
  const { productos, cliente, cajero_id } = req.body;
  
  if (!productos || productos.length === 0) {
    return res.status(400).json({ message: 'No hay productos en la venta' });
  }
  
  if (!cajero_id) {
    return res.status(400).json({ message: 'Debe especificar el cajero' });
  }
  
  let subtotal = 0;
  productos.forEach(p => {
    subtotal += p.precio * p.cantidad;
  });
  const itbis = +(subtotal * 0.18).toFixed(2);
  const total = +(subtotal + itbis).toFixed(2);

  const ventaQuery = 'INSERT INTO ventas (fecha, cliente_nombre, cliente_rnc, subtotal, itbis, total, cajero_id) VALUES (NOW(), ?, ?, ?, ?, ?, ?)';
  db.query(ventaQuery, [cliente?.nombre || '', cliente?.rnc || '', subtotal, itbis, total, cajero_id], (err, ventaResult) => {
    if (err) {
      console.error('Error al crear venta:', err);
      return res.status(500).json({ message: 'Error al crear la venta' });
    }
    const ventaId = ventaResult.insertId;
    
    const detalleQuery = 'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES ?';
    const detalleValues = productos.map(p => [ventaId, p.id, p.cantidad, p.precio]);
    db.query(detalleQuery, [detalleValues], (err) => {
      if (err) {
        console.error('Error al guardar detalle:', err);
        return res.status(500).json({ message: 'Error al guardar el detalle de venta' });
      }
      
      productos.forEach(p => {
        db.query('UPDATE inventario SET cantidad = cantidad - ? WHERE id = ?', [p.cantidad, p.id], (err) => {
          if (err) console.error('Error al actualizar inventario:', err);
        });
      });
      
      const mensajeNotificacion = `Venta realizada - Total: RD$ ${total.toLocaleString('es-DO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

      
      // ⚡ EMITIR ACTUALIZACIÓN DE KPIs VÍA WEBSOCKET
      emitirKPIActualizados();
      
      res.json({ message: 'Venta realizada exitosamente', ventaId });
    });
  });
});

// ===== OBTENER FACTURA CON INFORMACIÓN DEL CAJERO =====
router.get('/factura/:id', (req, res) => {
  const ventaId = req.params.id;
  
  const ventaQuery = `
    SELECT 
      v.*,
      c.nombre as cajero_nombre
    FROM ventas v
    LEFT JOIN cajeros c ON v.cajero_id = c.id
    WHERE v.id = ?
  `;
  
  db.query(ventaQuery, [ventaId], (err, ventaRows) => {
    if (err || ventaRows.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    db.query('SELECT dv.*, i.nombre FROM detalle_ventas dv JOIN inventario i ON dv.producto_id = i.id WHERE dv.venta_id = ?', [ventaId], (err, detalleRows) => {
      if (err) {
        return res.status(500).json({ message: 'Error al obtener detalle' });
      }
      res.json({ venta: ventaRows[0], detalle: detalleRows });
    });
  });
});

// Exportar router y función para configurar WebSocket
module.exports = router;
module.exports.setWebSocketServer = setWebSocketServer;