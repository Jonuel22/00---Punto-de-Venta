const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const multer = require('multer');
const xlsx = require('xlsx');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('MySQL connected...');
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Crear un nuevo producto
router.post('/create', (req, res) => {
  const { nombre, descripcion, cantidad, precio, codigo_barras } = req.body;
  const query = 'INSERT INTO inventario (nombre, descripcion, cantidad, precio, codigo_barras) VALUES (?, ?, ?, ?, ?)';
  
  db.query(query, [nombre, descripcion, cantidad, precio, codigo_barras], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json({ message: 'Producto creado exitosamente' });
    }
  });
});

// Editar un producto existente
router.put('/edit/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, cantidad, precio, codigo_barras } = req.body;
  const query = 'UPDATE inventario SET nombre = ?, descripcion = ?, cantidad = ?, precio = ?, codigo_barras = ? WHERE id = ?';
  
  db.query(query, [nombre, descripcion, cantidad, precio, codigo_barras, id], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json({ message: 'Producto editado exitosamente' });
    }
  });
});

// Eliminar un producto
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM inventario WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json({ message: 'Producto eliminado exitosamente' });
    }
  });
});

// Buscar productos por nombre
router.get('/search', (req, res) => {
  const { name } = req.query;
  const query = 'SELECT * FROM inventario WHERE nombre LIKE ?';
  
  db.query(query, [`${name}%`], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json(result);
    }
  });
});

// Obtener todos los productos
router.get('/all', (req, res) => {
  const query = 'SELECT * FROM inventario';
  
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json(result);
    }
  });
});

// Obtener productos sin stock (para alertas)
router.get('/sin-stock', (req, res) => {
  const query = 'SELECT * FROM inventario WHERE cantidad = 0 ORDER BY nombre ASC';
  
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json(result);
    }
  });
});

// Subir y procesar archivo Excel
router.post('/upload', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  }

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  const query = 'INSERT INTO inventario (nombre, descripcion, cantidad, precio, codigo_barras) VALUES ?';
  const values = data.map(row => [row.nombre, row.descripcion, row.cantidad, row.precio, row.codigo_barras]);

  db.query(query, [values], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      res.json({ message: 'Datos cargados exitosamente' });
    }
  });
});

module.exports = router;