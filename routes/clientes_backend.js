const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

// ===== BUSCAR CLIENTES (para el buscador en ventas) =====
router.get('/buscar', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  
  const query = `
    SELECT 
      id,
      nombre,
      cedula,
      rnc,
      telefono,
      balance_actual,
      limite_credito
    FROM clientes
    WHERE activo = 1
      AND (
        nombre LIKE ? OR 
        cedula LIKE ? OR 
        rnc LIKE ? OR 
        telefono LIKE ?
      )
    ORDER BY nombre ASC
    LIMIT 10
  `;
  
  const searchTerm = `%${q}%`;
  db.query(query, [searchTerm, searchTerm, searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error('Error al buscar clientes:', err);
      return res.status(500).json({ message: 'Error al buscar clientes' });
    }
    res.json(results);
  });
});

// ===== OBTENER TODOS LOS CLIENTES =====
router.get('/all', (req, res) => {
  const query = `
    SELECT 
      id,
      nombre,
      cedula,
      rnc,
      telefono,
      email,
      direccion,
      limite_credito,
      balance_actual,
      activo,
      notas,
      fecha_creacion
    FROM clientes
    ORDER BY nombre ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener clientes:', err);
      return res.status(500).json({ message: 'Error al obtener clientes' });
    }
    res.json(results);
  });
});

// ===== OBTENER UN CLIENTE POR ID =====
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'SELECT * FROM clientes WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener cliente:', err);
      return res.status(500).json({ message: 'Error al obtener cliente' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    res.json(results[0]);
  });
});

// ===== CREAR NUEVO CLIENTE =====
router.post('/crear', (req, res) => {
  const { nombre, cedula, rnc, telefono, email, direccion, limite_credito, notas } = req.body;
  
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ message: 'El nombre es requerido' });
  }
  
  const query = `
    INSERT INTO clientes 
    (nombre, cedula, rnc, telefono, email, direccion, limite_credito, balance_actual, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, ?)
  `;
  
  const values = [
    nombre.trim(),
    cedula?.trim() || null,
    rnc?.trim() || null,
    telefono?.trim() || null,
    email?.trim() || null,
    direccion?.trim() || null,
    parseFloat(limite_credito) || 0.00,
    notas?.trim() || null
  ];
  
  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al crear cliente:', err);
      
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Ya existe un cliente con esa cédula o RNC' });
      }
      
      return res.status(500).json({ message: 'Error al crear cliente' });
    }
    
    res.json({ 
      message: 'Cliente creado exitosamente',
      clienteId: result.insertId
    });
  });
});

// ===== ACTUALIZAR CLIENTE =====
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, cedula, rnc, telefono, email, direccion, limite_credito, activo, notas } = req.body;
  
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ message: 'El nombre es requerido' });
  }
  
  const query = `
    UPDATE clientes 
    SET nombre = ?,
        cedula = ?,
        rnc = ?,
        telefono = ?,
        email = ?,
        direccion = ?,
        limite_credito = ?,
        activo = ?,
        notas = ?
    WHERE id = ?
  `;
  
  const values = [
    nombre.trim(),
    cedula?.trim() || null,
    rnc?.trim() || null,
    telefono?.trim() || null,
    email?.trim() || null,
    direccion?.trim() || null,
    parseFloat(limite_credito) || 0.00,
    activo !== undefined ? activo : 1,
    notas?.trim() || null,
    id
  ];
  
  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al actualizar cliente:', err);
      
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Ya existe un cliente con esa cédula o RNC' });
      }
      
      return res.status(500).json({ message: 'Error al actualizar cliente' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    res.json({ message: 'Cliente actualizado exitosamente' });
  });
});

// ===== OBTENER HISTORIAL DE CUENTAS DE UN CLIENTE =====
router.get('/:id/historial', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      cpc.*,
      c.nombre as cajero_nombre,
      v.total as venta_total
    FROM cuentas_por_cobrar cpc
    LEFT JOIN cajeros c ON cpc.cajero_id = c.id
    LEFT JOIN ventas v ON cpc.venta_id = v.id
    WHERE cpc.cliente_id = ?
    ORDER BY cpc.fecha DESC
    LIMIT 100
  `;
  
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener historial:', err);
      return res.status(500).json({ message: 'Error al obtener historial' });
    }
    res.json(results);
  });
});

// ===== REGISTRAR PAGO DE CLIENTE =====
router.post('/:id/pago', (req, res) => {
  const { id } = req.params;
  const { monto, descripcion, cajero_id, metodo_pago, referencia } = req.body;
  
  const montoPago = parseFloat(monto);
  
  if (!montoPago || montoPago <= 0) {
    return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
  }
  
  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar transacción:', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
    
    // Obtener balance actual
    db.query('SELECT balance_actual, nombre FROM clientes WHERE id = ?', [id], (err, results) => {
      if (err || results.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ message: 'Cliente no encontrado' });
        });
      }
      
      const balanceActual = parseFloat(results[0].balance_actual);
      const nombreCliente = results[0].nombre;
      
      if (montoPago > balanceActual) {
        return db.rollback(() => {
          res.status(400).json({ 
            message: `El monto (RD$ ${montoPago.toFixed(2)}) excede la deuda actual (RD$ ${balanceActual.toFixed(2)})` 
          });
        });
      }
      
      const nuevoBalance = balanceActual - montoPago;
      
      // Actualizar balance del cliente
      db.query(
        'UPDATE clientes SET balance_actual = ? WHERE id = ?',
        [nuevoBalance, id],
        (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error al actualizar balance:', err);
              res.status(500).json({ message: 'Error al actualizar balance' });
            });
          }
          
          // Registrar en cuentas por cobrar (monto negativo = pago)
          const queryCuenta = `
            INSERT INTO cuentas_por_cobrar 
            (cliente_id, tipo, monto, balance_despues, descripcion, metodo_pago, referencia, cajero_id)
            VALUES (?, 'pago', ?, ?, ?, ?, ?, ?)
          `;
          
          db.query(
            queryCuenta,
            [
              id, 
              -montoPago, 
              nuevoBalance, 
              descripcion || 'Pago recibido', 
              metodo_pago || 'efectivo',
              referencia || null,
              cajero_id || null
            ],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error al registrar pago:', err);
                  res.status(500).json({ message: 'Error al registrar pago' });
                });
              }
              
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error al confirmar transacción:', err);
                    res.status(500).json({ message: 'Error al confirmar pago' });
                  });
                }
                
                res.json({ 
                  message: 'Pago registrado exitosamente',
                  nuevoBalance: nuevoBalance,
                  cliente: nombreCliente
                });
              });
            }
          );
        }
      );
    });
  });
});

// ===== AGREGAR DEUDA MANUAL =====
router.post('/:id/deuda', (req, res) => {
  const { id } = req.params;
  const { monto, descripcion, cajero_id } = req.body;
  
  const montoDeuda = parseFloat(monto);
  
  if (!montoDeuda || montoDeuda <= 0) {
    return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
  }
  
  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar transacción:', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
    
    // Obtener balance y límite
    db.query(
      'SELECT balance_actual, limite_credito, nombre FROM clientes WHERE id = ?',
      [id],
      (err, results) => {
        if (err || results.length === 0) {
          return db.rollback(() => {
            res.status(404).json({ message: 'Cliente no encontrado' });
          });
        }
        
        const balanceActual = parseFloat(results[0].balance_actual);
        const limiteCredito = parseFloat(results[0].limite_credito);
        const nombreCliente = results[0].nombre;
        const nuevoBalance = balanceActual + montoDeuda;
        
        if (nuevoBalance > limiteCredito) {
          return db.rollback(() => {
            res.status(400).json({ 
              message: `El monto excede el límite de crédito. Disponible: RD$ ${(limiteCredito - balanceActual).toFixed(2)}` 
            });
          });
        }
        
        // Actualizar balance
        db.query(
          'UPDATE clientes SET balance_actual = ? WHERE id = ?',
          [nuevoBalance, id],
          (err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error al actualizar balance:', err);
                res.status(500).json({ message: 'Error al actualizar balance' });
              });
            }
            
            // Registrar en cuentas por cobrar
            const queryCuenta = `
              INSERT INTO cuentas_por_cobrar 
              (cliente_id, tipo, monto, balance_despues, descripcion, cajero_id)
              VALUES (?, 'ajuste', ?, ?, ?, ?)
            `;
            
            db.query(
              queryCuenta,
              [id, montoDeuda, nuevoBalance, descripcion || 'Ajuste de deuda manual', cajero_id || null],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error al registrar deuda:', err);
                    res.status(500).json({ message: 'Error al registrar deuda' });
                  });
                }
                
                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error('Error al confirmar transacción:', err);
                      res.status(500).json({ message: 'Error al confirmar operación' });
                    });
                  }
                  
                  res.json({ 
                    message: 'Deuda agregada exitosamente',
                    nuevoBalance: nuevoBalance,
                    cliente: nombreCliente
                  });
                });
              }
            );
          }
        );
      }
    );
  });
});

// ===== REPORTE DE CLIENTES CON DEUDA =====
router.get('/reporte/deudas', (req, res) => {
  const query = `
    SELECT 
      c.id,
      c.nombre,
      c.cedula,
      c.rnc,
      c.telefono,
      c.balance_actual,
      c.limite_credito,
      (SELECT MAX(fecha) FROM cuentas_por_cobrar WHERE cliente_id = c.id) as ultima_actividad,
      (SELECT COUNT(*) FROM ventas WHERE cliente_id = c.id) as total_ventas
    FROM clientes c
    WHERE c.balance_actual > 0 AND c.activo = 1
    ORDER BY c.balance_actual DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener reporte:', err);
      return res.status(500).json({ message: 'Error al obtener reporte' });
    }
    res.json(results);
  });
});

module.exports = router;
