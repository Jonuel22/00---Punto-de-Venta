const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../images');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único con timestamp
    const uniqueName = 'logo_' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo PNG, JPG o SVG'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// ===== SUBIR LOGO =====
router.post('/logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    }
    
    const nombre = req.body.nombre || 'Logo ' + Date.now();
    const nombreArchivo = req.file.filename;
    const tipo = path.extname(req.file.originalname).substring(1);
    
    // Insertar en la base de datos
    const query = 'INSERT INTO logos_configuracion (nombre, nombre_archivo, tipo, activo) VALUES (?, ?, ?, 0)';
    
    db.query(query, [nombre, nombreArchivo, tipo], (err, result) => {
      if (err) {
        console.error('Error al guardar logo en BD:', err);
        // Eliminar archivo si falla la BD
        fs.unlinkSync(path.join(__dirname, '../images', nombreArchivo));
        return res.status(500).json({ message: 'Error al guardar el logo en la base de datos' });
      }
      
      res.json({ 
        message: 'Logo subido exitosamente',
        id: result.insertId,
        filename: nombreArchivo,
        path: `/images/${nombreArchivo}`
      });
    });
  } catch (error) {
    console.error('Error al subir logo:', error);
    res.status(500).json({ message: 'Error al subir el logo' });
  }
});

// ===== OBTENER TODOS LOS LOGOS =====
router.get('/logos', (req, res) => {
  const query = 'SELECT * FROM logos_configuracion ORDER BY fecha_creacion DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener logos:', err);
      return res.status(500).json({ message: 'Error al obtener los logos' });
    }
    
    res.json(results);
  });
});

// ===== OBTENER LOGO ACTIVO =====
router.get('/logo/activo', (req, res) => {
  const query = 'SELECT * FROM logos_configuracion WHERE activo = 1 LIMIT 1';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener logo activo:', err);
      return res.status(500).json({ message: 'Error al obtener el logo activo' });
    }
    
    if (results.length > 0) {
      res.json({
        logo: results[0],
        path: `/images/${results[0].nombre_archivo}`
      });
    } else {
      res.json({
        logo: null,
        path: '/images/Logo2.png',
        message: 'No hay logo activo, usando por defecto'
      });
    }
  });
});

// ===== ACTIVAR LOGO =====
router.put('/logo/activar/:id', (req, res) => {
  const { id } = req.params;
  
  // Primero desactivar todos los logos
  const deactivateQuery = 'UPDATE logos_configuracion SET activo = 0';
  
  db.query(deactivateQuery, (err) => {
    if (err) {
      console.error('Error al desactivar logos:', err);
      return res.status(500).json({ message: 'Error al cambiar logo activo' });
    }
    
    // Activar el logo seleccionado
    const activateQuery = 'UPDATE logos_configuracion SET activo = 1 WHERE id = ?';
    
    db.query(activateQuery, [id], (err, result) => {
      if (err) {
        console.error('Error al activar logo:', err);
        return res.status(500).json({ message: 'Error al activar el logo' });
      }
      
      res.json({ message: 'Logo activado exitosamente' });
    });
  });
});

// ===== ELIMINAR LOGO =====
router.delete('/logo/:id', (req, res) => {
  const { id } = req.params;
  
  // Obtener información del logo antes de eliminar
  const selectQuery = 'SELECT * FROM logos_configuracion WHERE id = ?';
  
  db.query(selectQuery, [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Logo no encontrado' });
    }
    
    const logo = results[0];
    
    // No permitir eliminar el logo activo
    if (logo.activo === 1) {
      return res.status(400).json({ message: 'No puedes eliminar el logo activo. Activa otro logo primero.' });
    }
    
    // Eliminar de la base de datos
    const deleteQuery = 'DELETE FROM logos_configuracion WHERE id = ?';
    
    db.query(deleteQuery, [id], (err) => {
      if (err) {
        console.error('Error al eliminar logo de BD:', err);
        return res.status(500).json({ message: 'Error al eliminar el logo' });
      }
      
      // Eliminar archivo físico
      const filePath = path.join(__dirname, '../images', logo.nombre_archivo);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          console.error('Error al eliminar archivo:', fileErr);
        }
      }
      
      res.json({ message: 'Logo eliminado exitosamente' });
    });
  });
});

// ===== MANEJO DE ERRORES DE MULTER =====
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El archivo es muy grande. Máximo 2MB' });
    }
    return res.status(400).json({ message: error.message });
  } else if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
});

module.exports = router;