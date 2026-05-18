const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const supabase = require('../db');

router.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('id, username, nombre_completo, rol, cajero_id, activo, fecha_creacion, cajeros!fk_usuarios_cajero(nombre)').order('username');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener usuarios' }); }
  res.json(data.map(u => ({ ...u, cajero_nombre: u.cajeros?.nombre })));
});

router.get('/activos', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('id, username, nombre_completo, rol, cajeros!fk_usuarios_cajero(nombre)').eq('activo', true).order('username');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener usuarios' }); }
  res.json(data.map(u => ({ ...u, cajero_nombre: u.cajeros?.nombre })));
});

router.post('/create', async (req, res) => {
  const { username, nombre_completo, password, rol, cajero_id, rol_id } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  if (password.length < 6)    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  try {
    const { data: exists } = await supabase.from('usuarios').select('id').eq('username', username).single();
    if (exists) return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    const hashedPassword = await bcrypt.hash(password, 10);
    let rolIdFinal = rol_id || null;
    if (!rolIdFinal) {
      const { data: r } = await supabase.from('roles').select('id').ilike('nombre', rol || 'cajero').single();
      rolIdFinal = r?.id || null;
    }
    const { data, error } = await supabase.from('usuarios').insert({ username, password: hashedPassword, nombre_completo, rol: rol||'cajero', rol_id: rolIdFinal, cajero_id: cajero_id||null, activo: true }).select('id').single();
    if (error) throw error;
    res.json({ message: 'Usuario creado exitosamente', usuarioId: data.id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al crear usuario' }); }
});

router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { username, nombre_completo, password, rol, cajero_id, activo, rol_id } = req.body;
  try {
    let rolIdFinal = rol_id || null;
    if (!rolIdFinal) {
      const { data: r } = await supabase.from('roles').select('id').ilike('nombre', rol || 'cajero').single();
      rolIdFinal = r?.id || null;
    }
    const update = { username, nombre_completo, rol: rol||'cajero', rol_id: rolIdFinal, cajero_id: cajero_id||null, activo };
    if (password?.trim()) {
      if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      update.password = await bcrypt.hash(password, 10);
    }
    const { error } = await supabase.from('usuarios').update(update).eq('id', id);
    if (error) throw error;
    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al actualizar usuario' }); }
});

router.delete('/delete/:id', async (req, res) => {
  const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', req.params.id);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al eliminar usuario' }); }
  res.json({ message: 'Usuario desactivado exitosamente' });
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('id, username, nombre_completo, rol, cajero_id, activo, cajeros!fk_usuarios_cajero(nombre)').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json({ ...data, cajero_nombre: data.cajeros?.nombre });
});

module.exports = router;