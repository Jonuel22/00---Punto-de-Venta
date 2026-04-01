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

// ===== GESTIÓN DE CAJEROS CON USUARIOS =====

// Obtener todos los cajeros con información de usuario
router.get('/all', (req, res) => {
  const query = `
    SELECT 
      c.id,
      c.nombre,
      c.email,
      c.telefono,
      c.activo as cajero_activo,
      u.id as usuario_id,
      u.username,
      u.rol,
      u.activo as usuario_activo,
      c.fecha_creacion
    FROM cajeros c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    ORDER BY c.nombre ASC
  `;
  
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
  const query = `
    SELECT 
      c.id,
      c.nombre,
      u.username
    FROM cajeros c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.activo = 1 AND (u.activo = 1 OR u.activo IS NULL)
    ORDER BY c.nombre ASC
  `;
  
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener cajeros activos:', err);
      return res.status(500).json({ message: 'Error al obtener cajeros' });
    }
    res.json(result);
  });
});

// Crear nuevo cajero vinculando usuario existente (simple)
router.post('/create-simple', (req, res) => {
  const { nombre, usuario_id, email, telefono } = req.body;
  
  if (!nombre || !usuario_id) {
    return res.status(400).json({ message: 'Nombre y usuario son requeridos' });
  }
  
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al iniciar transacción' });
    }
    
    // Crear cajero
    const insertCajeroQuery = `
      INSERT INTO cajeros (nombre, email, telefono, usuario_id, activo)
      VALUES (?, ?, ?, ?, 1)
    `;
    
    db.query(insertCajeroQuery, [nombre, email, telefono, usuario_id], (err, cajeroResult) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error al crear cajero:', err);
          res.status(500).json({ message: 'Error al crear cajero' });
        });
      }
      
      const cajeroId = cajeroResult.insertId;
      
      // Actualizar usuario con cajero_id
      const updateUserQuery = 'UPDATE usuarios SET cajero_id = ? WHERE id = ?';
      
      db.query(updateUserQuery, [cajeroId, usuario_id], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error al vincular usuario con cajero:', err);
            res.status(500).json({ message: 'Error al vincular usuario con cajero' });
          });
        }
        
        // Confirmar transacción
        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error al confirmar transacción:', err);
              res.status(500).json({ message: 'Error al guardar datos' });
            });
          }
          
          res.json({ 
            message: 'Cajero creado y vinculado exitosamente',
            cajeroId: cajeroId
          });
        });
      });
    });
  });
});

// Crear nuevo cajero con usuario
router.post('/create', async (req, res) => {
  const { nombre, username, password, email, telefono, rol } = req.body;
  
  if (!nombre || !username || !password) {
    return res.status(400).json({ message: 'Nombre, usuario y contraseña son requeridos' });
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
      
      // Iniciar transacción
      db.beginTransaction(async (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error al iniciar transacción' });
        }
        
        // Crear usuario
        const insertUserQuery = `
          INSERT INTO usuarios (username, password, rol, nombre_completo, activo)
          VALUES (?, ?, ?, ?, 1)
        `;
        
        db.query(insertUserQuery, [username, hashedPassword, rol || 'cajero', nombre], (err, userResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error al crear usuario:', err);
              res.status(500).json({ message: 'Error al crear usuario' });
            });
          }
          
          const usuarioId = userResult.insertId;
          
          // Crear cajero
          const insertCajeroQuery = `
            INSERT INTO cajeros (nombre, email, telefono, usuario_id, activo)
            VALUES (?, ?, ?, ?, 1)
          `;
          
          db.query(insertCajeroQuery, [nombre, email, telefono, usuarioId], (err, cajeroResult) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error al crear cajero:', err);
                res.status(500).json({ message: 'Error al crear cajero' });
              });
            }
            
            const cajeroId = cajeroResult.insertId;
            
            // Actualizar usuario con cajero_id
            const updateUserQuery = 'UPDATE usuarios SET cajero_id = ? WHERE id = ?';
            
            db.query(updateUserQuery, [cajeroId, usuarioId], (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error al vincular usuario con cajero:', err);
                  res.status(500).json({ message: 'Error al vincular usuario con cajero' });
                });
              }
              
              // Confirmar transacción
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error al confirmar transacción:', err);
                    res.status(500).json({ message: 'Error al guardar datos' });
                  });
                }
                
                res.json({ 
                  message: 'Cajero y usuario creados exitosamente',
                  cajeroId: cajeroId,
                  usuarioId: usuarioId
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Actualizar cajero y usuario
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, username, password, email, telefono, rol, activo, usuario_id } = req.body;
  
  try {
    // Si viene usuario_id, es actualización simple (solo cajero)
    if (usuario_id !== undefined) {
      db.beginTransaction((err) => {
        if (err) {
          return res.status(500).json({ message: 'Error al iniciar transacción' });
        }
        
        // Obtener usuario_id anterior
        db.query('SELECT usuario_id FROM cajeros WHERE id = ?', [id], (err, result) => {
          if (err || result.length === 0) {
            return db.rollback(() => {
              res.status(404).json({ message: 'Cajero no encontrado' });
            });
          }
          
          const oldUsuarioId = result[0].usuario_id;
          
          // Actualizar cajero
          const updateCajeroQuery = `
            UPDATE cajeros 
            SET nombre = ?, email = ?, telefono = ?, usuario_id = ?, activo = ?
            WHERE id = ?
          `;
          
          db.query(updateCajeroQuery, [nombre, email, telefono, usuario_id || null, activo, id], (err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error al actualizar cajero:', err);
                res.status(500).json({ message: 'Error al actualizar cajero' });
              });
            }
            
            // Actualizar cajero_id en usuarios
            // Primero limpiar el anterior
            if (oldUsuarioId) {
              db.query('UPDATE usuarios SET cajero_id = NULL WHERE id = ?', [oldUsuarioId], () => {});
            }
            
            // Luego asignar el nuevo
            if (usuario_id) {
              db.query('UPDATE usuarios SET cajero_id = ? WHERE id = ?', [id, usuario_id], (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: 'Error al vincular usuario' });
                  });
                }
                
                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({ message: 'Error al guardar cambios' });
                    });
                  }
                  res.json({ message: 'Cajero actualizado exitosamente' });
                });
              });
            } else {
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: 'Error al guardar cambios' });
                  });
                }
                res.json({ message: 'Cajero actualizado exitosamente' });
              });
            }
          });
        });
      });
      return;
    }
    
    // Si viene username, es actualización completa (cajero + usuario)
    db.query('SELECT usuario_id FROM cajeros WHERE id = ?', [id], async (err, result) => {
      if (err || result.length === 0) {
        return res.status(404).json({ message: 'Cajero no encontrado' });
      }
      
      const usuarioId = result[0].usuario_id;
      
      db.beginTransaction(async (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error al iniciar transacción' });
        }
        
        // Actualizar cajero
        const updateCajeroQuery = `
          UPDATE cajeros 
          SET nombre = ?, email = ?, telefono = ?, activo = ?
          WHERE id = ?
        `;
        
        db.query(updateCajeroQuery, [nombre, email, telefono, activo, id], async (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error al actualizar cajero:', err);
              res.status(500).json({ message: 'Error al actualizar cajero' });
            });
          }
          
          // Actualizar usuario si existe
          if (usuarioId) {
            let updateUserQuery = `
              UPDATE usuarios 
              SET username = ?, nombre_completo = ?, rol = ?, activo = ?
            `;
            let params = [username, nombre, rol || 'cajero', activo];
            
            // Si se proporciona password, hashear y actualizar
            if (password && password.trim() !== '') {
              const hashedPassword = await bcrypt.hash(password, 10);
              updateUserQuery += ', password = ?';
              params.push(hashedPassword);
            }
            
            updateUserQuery += ' WHERE id = ?';
            params.push(usuarioId);
            
            db.query(updateUserQuery, params, (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error al actualizar usuario:', err);
                  res.status(500).json({ message: 'Error al actualizar usuario' });
                });
              }
              
              // Confirmar transacción
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error al confirmar transacción:', err);
                    res.status(500).json({ message: 'Error al guardar cambios' });
                  });
                }
                
                res.json({ message: 'Cajero actualizado exitosamente' });
              });
            });
          } else {
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Error al guardar cambios' });
                });
              }
              res.json({ message: 'Cajero actualizado exitosamente' });
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Desactivar cajero y usuario
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al iniciar transacción' });
    }
    
    // Desactivar cajero
    db.query('UPDATE cajeros SET activo = 0 WHERE id = ?', [id], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error al desactivar cajero:', err);
          res.status(500).json({ message: 'Error al desactivar cajero' });
        });
      }
      
      // Desactivar usuario asociado
      db.query('UPDATE usuarios SET activo = 0 WHERE cajero_id = ?', [id], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error al desactivar usuario:', err);
            res.status(500).json({ message: 'Error al desactivar usuario' });
          });
        }
        
        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ message: 'Error al confirmar cambios' });
            });
          }
          
          res.json({ message: 'Cajero y usuario desactivados exitosamente' });
        });
      });
    });
  });
});

// Obtener un cajero por ID con información de usuario
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      c.id,
      c.nombre,
      c.email,
      c.telefono,
      c.activo,
      u.id as usuario_id,
      u.username,
      u.rol
    FROM cajeros c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.id = ?
  `;
  
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