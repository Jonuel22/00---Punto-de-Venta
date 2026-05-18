const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

router.get('/acciones', async (req, res) => {
  const { data, error } = await supabase.from('notificaciones').select('*').order('fecha', { ascending: false }).limit(20);
  if (error) { console.error(error); return res.status(500).json([]); }
  res.json(data);
});

router.get('/alertas', async (req, res) => {
  const { data, error } = await supabase.from('inventario').select('id, nombre').eq('cantidad', 0).order('nombre');
  if (error) { console.error(error); return res.status(500).json([]); }
  res.json(data.map(i => ({ id: i.id, mensaje: `⚠️ ${i.nombre} - Sin stock disponible`, fecha: new Date().toISOString() })));
});

router.post('/add', async (req, res) => {
  const { mensaje } = req.body;
  const { error } = await supabase.from('notificaciones').insert({ mensaje, fecha: new Date().toISOString() });
  if (error) { console.error(error); return res.status(500).json({ ok: false }); }
  res.json({ ok: true });
});

router.post('/clear', async (req, res) => {
  const { error } = await supabase.from('notificaciones').delete().neq('id', 0);
  if (error) { console.error(error); return res.status(500).json({ ok: false }); }
  res.json({ ok: true });
});

module.exports = router;