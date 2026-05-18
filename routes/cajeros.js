const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const supabase = require('../db');

router.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('cajeros').select('*, usuarios!cajeros_usuario_id_fkey(id, username, rol, activo)').order('nombre');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener cajeros' }); }
  const result = data.map(c => ({ ...c, usuario_id: c.usuarios?.id, username: c.usuarios?.username, rol: c.usuarios?.rol, usuario_activo: c.usuarios?.activo, cajero_activo: c.activo }));
  res.json(result);
});

router.get('/activos', async (req, res) => {
  const { data, error } = await supabase.from('cajeros').select('id, nombre, usuarios!cajeros_usuario_id_fkey(username)').eq('activo', true).order('nombre');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener cajeros' }); }
  res.json(data.map(c => ({ id: c.id, nombre: c.nombre, username: c.usuarios?.username })));
});

router.post('/create-simple', async (req, res) => {
  const { nombre, usuario_id, email, telefono } = req.body;
  if (!nombre || !usuario_id) return res.status(400).json({ message: 'Nombre y usuario son requeridos' });
  try {
    const { data, error } = await supabase.from('cajeros').insert({ nombre, email, telefono, usuario_id, activo: true }).select('id').single();
    if (error) throw error;
    await supabase.from('usuarios').update({ cajero_id: data.id }).eq('id', usuario_id);
    res.json({ message: 'Cajero creado y vinculado exitosamente', cajeroId: data.id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al crear cajero' }); }
});

router.post('/create', async (req, res) => {
  const { nombre, username, password, email, telefono, rol } = req.body;
  if (!nombre || !username || !password) return res.status(400).json({ message: 'Nombre, usuario y contraseña son requeridos' });
  try {
    const { data: exists } = await supabase.from('usuarios').select('id').eq('username', username).single();
    if (exists) return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: uData, error: uError } = await supabase.from('usuarios').insert({ username, password: hashedPassword, rol: rol || 'cajero', nombre_completo: nombre, activo: true }).select('id').single();
    if (uError) throw uError;
    const { data: cData, error: cError } = await supabase.from('cajeros').insert({ nombre, email, telefono, usuario_id: uData.id, activo: true }).select('id').single();
    if (cError) throw cError;
    await supabase.from('usuarios').update({ cajero_id: cData.id }).eq('id', uData.id);
    res.json({ message: 'Cajero y usuario creados exitosamente', cajeroId: cData.id, usuarioId: uData.id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al crear cajero' }); }
});

router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, username, password, email, telefono, rol, activo, usuario_id } = req.body;
  try {
    if (usuario_id !== undefined) {
      const { data: prev } = await supabase.from('cajeros').select('usuario_id').eq('id', id).single();
      if (!prev) return res.status(404).json({ message: 'Cajero no encontrado' });
      await supabase.from('cajeros').update({ nombre, email, telefono, usuario_id: usuario_id || null, activo }).eq('id', id);
      if (prev.usuario_id) await supabase.from('usuarios').update({ cajero_id: null }).eq('id', prev.usuario_id);
      if (usuario_id)      await supabase.from('usuarios').update({ cajero_id: id }).eq('id', usuario_id);
      return res.json({ message: 'Cajero actualizado exitosamente' });
    }
    const { data: prev } = await supabase.from('cajeros').select('usuario_id').eq('id', id).single();
    if (!prev) return res.status(404).json({ message: 'Cajero no encontrado' });
    await supabase.from('cajeros').update({ nombre, email, telefono, activo }).eq('id', id);
    if (prev.usuario_id) {
      const uUpdate = { username, nombre_completo: nombre, rol: rol || 'cajero', activo };
      if (password && password.trim() !== '') uUpdate.password = await bcrypt.hash(password, 10);
      await supabase.from('usuarios').update(uUpdate).eq('id', prev.usuario_id);
    }
    res.json({ message: 'Cajero actualizado exitosamente' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al actualizar cajero' }); }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    await supabase.from('cajeros').update({ activo: false }).eq('id', req.params.id);
    await supabase.from('usuarios').update({ activo: false }).eq('cajero_id', req.params.id);
    res.json({ message: 'Cajero y usuario desactivados exitosamente' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al desactivar cajero' }); }
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('cajeros').select('*, usuarios!cajeros_usuario_id_fkey(id, username, rol)').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ message: 'Cajero no encontrado' });
  res.json({ ...data, usuario_id: data.usuarios?.id, username: data.usuarios?.username, rol: data.usuarios?.rol });
});

module.exports = router;