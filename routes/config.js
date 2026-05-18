const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const supabase = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../images');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, 'logo_' + Date.now() + path.extname(file.originalname))
});
const fileFilter = (req, file, cb) => {
  ['image/png','image/jpeg','image/jpg','image/svg+xml'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Tipo no permitido. Solo PNG, JPG o SVG'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    const nombre        = req.body.nombre || 'Logo ' + Date.now();
    const nombreArchivo = req.file.filename;
    const tipo          = path.extname(req.file.originalname).substring(1);
    const { data, error } = await supabase.from('logos_configuracion').insert({ nombre, nombre_archivo: nombreArchivo, tipo, activo: false }).select('id').single();
    if (error) throw error;
    res.json({ message: 'Logo subido exitosamente', id: data.id, filename: nombreArchivo, path: `/images/${nombreArchivo}` });
  } catch (err) {
    console.error(err);
    if (req.file) try { fs.unlinkSync(path.join(__dirname, '../images', req.file.filename)); } catch (_) {}
    res.status(500).json({ message: 'Error al subir el logo' });
  }
});

router.get('/logos', async (req, res) => {
  const { data, error } = await supabase.from('logos_configuracion').select('*').order('fecha_creacion', { ascending: false });
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener los logos' }); }
  res.json(data);
});

router.get('/logo/activo', async (req, res) => {
  const { data } = await supabase.from('logos_configuracion').select('*').eq('activo', true).limit(1);
  if (data?.length) return res.json({ logo: data[0], path: `/images/${data[0].nombre_archivo}` });
  res.json({ logo: null, path: '/images/Logo2.png', message: 'No hay logo activo, usando por defecto' });
});

router.put('/logo/activar/:id', async (req, res) => {
  try {
    await supabase.from('logos_configuracion').update({ activo: false }).neq('id', 0);
    await supabase.from('logos_configuracion').update({ activo: true }).eq('id', req.params.id);
    res.json({ message: 'Logo activado exitosamente' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al activar el logo' }); }
});

router.delete('/logo/:id', async (req, res) => {
  try {
    const { data } = await supabase.from('logos_configuracion').select('*').eq('id', req.params.id).single();
    if (!data) return res.status(404).json({ message: 'Logo no encontrado' });
    if (data.activo) return res.status(400).json({ message: 'No puedes eliminar el logo activo. Activa otro logo primero.' });
    await supabase.from('logos_configuracion').delete().eq('id', req.params.id);
    const filePath = path.join(__dirname, '../images', data.nombre_archivo);
    if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch (_) {}
    res.json({ message: 'Logo eliminado exitosamente' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al eliminar el logo' }); }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'El archivo es muy grande. Máximo 2MB' });
    return res.status(400).json({ message: error.message });
  } else if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
});

module.exports = router;