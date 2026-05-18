const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const xlsx     = require('xlsx');
const supabase = require('../db');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/create', async (req, res) => {
  const { nombre, descripcion, cantidad, precio, codigo_barras } = req.body;
  const { error } = await supabase.from('inventario').insert({ nombre, descripcion, cantidad, precio, codigo_barras });
  if (error) { console.error(error); return res.status(500).json({ message: 'Error en el servidor' }); }
  res.json({ message: 'Producto creado exitosamente' });
});

router.put('/edit/:id', async (req, res) => {
  const { nombre, descripcion, cantidad, precio, codigo_barras } = req.body;
  const { error } = await supabase.from('inventario').update({ nombre, descripcion, cantidad, precio, codigo_barras }).eq('id', req.params.id);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error en el servidor' }); }
  res.json({ message: 'Producto editado exitosamente' });
});

router.delete('/delete/:id', async (req, res) => {
  const { error } = await supabase.from('inventario').delete().eq('id', req.params.id);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error en el servidor' }); }
  res.json({ message: 'Producto eliminado exitosamente' });
});

router.get('/search', async (req, res) => {
  const { name } = req.query;
  const { data, error } = await supabase.from('inventario').select('*').ilike('nombre', `${name}%`);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error en el servidor' }); }
  res.json(data);
});

router.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('inventario').select('*');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error en el servidor' }); }
  res.json(data);
});

router.get('/sin-stock', async (req, res) => {
  const { data, error } = await supabase.from('inventario').select('*').eq('cantidad', 0).order('nombre');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error en el servidor' }); }
  res.json(data);
});

router.post('/upload', upload.single('excelFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const data     = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  const rows     = data.map(row => ({ nombre: row.nombre, descripcion: row.descripcion, cantidad: row.cantidad, precio: row.precio, codigo_barras: row.codigo_barras }));
  const { error } = await supabase.from('inventario').insert(rows);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error en el servidor' }); }
  res.json({ message: 'Datos cargados exitosamente' });
});

module.exports = router;