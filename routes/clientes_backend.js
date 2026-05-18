const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

router.get('/buscar', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  const { data, error } = await supabase.from('clientes').select('id, nombre, cedula, rnc, telefono, balance_actual, limite_credito')
    .eq('activo', true).or(`nombre.ilike.%${q}%,cedula.ilike.%${q}%,rnc.ilike.%${q}%,telefono.ilike.%${q}%`).order('nombre').limit(10);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al buscar clientes' }); }
  res.json(data);
});

router.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('id, nombre, cedula, rnc, telefono, email, direccion, limite_credito, balance_actual, activo, notas, fecha_creacion').order('nombre');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener clientes' }); }
  res.json(data);
});

// ANTES de /:id
router.get('/reporte/deudas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('clientes').select('id, nombre, cedula, rnc, telefono, balance_actual, limite_credito').gt('balance_actual', 0).eq('activo', true).order('balance_actual', { ascending: false });
    if (error) throw error;
    // Agregar ultima_actividad y total_ventas
    const resultado = await Promise.all(data.map(async (c) => {
      const { data: cxc }    = await supabase.from('cuentas_por_cobrar').select('fecha').eq('cliente_id', c.id).order('fecha', { ascending: false }).limit(1);
      const { count }        = await supabase.from('ventas').select('*', { count: 'exact', head: true }).eq('cliente_id', c.id);
      return { ...c, ultima_actividad: cxc?.[0]?.fecha || null, total_ventas: count || 0 };
    }));
    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener reporte' }); }
});

router.post('/crear', async (req, res) => {
  const { nombre, cedula, rnc, telefono, email, direccion, limite_credito, notas } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' });
  const { data, error } = await supabase.from('clientes').insert({
    nombre: nombre.trim(), cedula: cedula?.trim()||null, rnc: rnc?.trim()||null,
    telefono: telefono?.trim()||null, email: email?.trim()||null, direccion: direccion?.trim()||null,
    limite_credito: parseFloat(limite_credito)||0, balance_actual: 0, notas: notas?.trim()||null
  }).select('id').single();
  if (error) {
    console.error(error);
    if (error.code === '23505') return res.status(400).json({ message: 'Ya existe un cliente con esa cédula o RNC' });
    return res.status(500).json({ message: 'Error al crear cliente' });
  }
  res.json({ message: 'Cliente creado exitosamente', clienteId: data.id });
});

router.put('/:id', async (req, res) => {
  const { nombre, cedula, rnc, telefono, email, direccion, limite_credito, activo, notas } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' });
  const { error } = await supabase.from('clientes').update({
    nombre: nombre.trim(), cedula: cedula?.trim()||null, rnc: rnc?.trim()||null,
    telefono: telefono?.trim()||null, email: email?.trim()||null, direccion: direccion?.trim()||null,
    limite_credito: parseFloat(limite_credito)||0, activo: activo !== undefined ? activo : true, notas: notas?.trim()||null
  }).eq('id', req.params.id);
  if (error) {
    console.error(error);
    if (error.code === '23505') return res.status(400).json({ message: 'Ya existe un cliente con esa cédula o RNC' });
    return res.status(500).json({ message: 'Error al actualizar cliente' });
  }
  res.json({ message: 'Cliente actualizado exitosamente' });
});

router.get('/:id/historial', async (req, res) => {
  const { data, error } = await supabase.from('cuentas_por_cobrar').select('*, cajeros(nombre), ventas(total)').eq('cliente_id', req.params.id).order('fecha', { ascending: false }).limit(100);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener historial' }); }
  res.json(data.map(d => ({ ...d, cajero_nombre: d.cajeros?.nombre, venta_total: d.ventas?.total })));
});

router.post('/:id/pago', async (req, res) => {
  const { id } = req.params;
  const { monto, descripcion, cajero_id, metodo_pago, referencia } = req.body;
  const montoPago = parseFloat(monto);
  if (!montoPago || montoPago <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
  try {
    const { data: cli } = await supabase.from('clientes').select('balance_actual, nombre').eq('id', id).single();
    if (!cli) return res.status(404).json({ message: 'Cliente no encontrado' });
    const balanceActual = parseFloat(cli.balance_actual);
    if (montoPago > balanceActual) return res.status(400).json({ message: `El monto (RD$ ${montoPago.toFixed(2)}) excede la deuda (RD$ ${balanceActual.toFixed(2)})` });
    const nuevoBalance = balanceActual - montoPago;
    await supabase.from('clientes').update({ balance_actual: nuevoBalance }).eq('id', id);
    await supabase.from('cuentas_por_cobrar').insert({ cliente_id: parseInt(id), tipo: 'pago', monto: -montoPago, balance_despues: nuevoBalance, descripcion: descripcion||'Pago recibido', metodo_pago: metodo_pago||'efectivo', referencia: referencia||null, cajero_id: cajero_id||null });
    res.json({ message: 'Pago registrado exitosamente', nuevoBalance, cliente: cli.nombre });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al registrar pago' }); }
});

router.post('/:id/deuda', async (req, res) => {
  const { id } = req.params;
  const { monto, descripcion, cajero_id } = req.body;
  const montoDeuda = parseFloat(monto);
  if (!montoDeuda || montoDeuda <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
  try {
    const { data: cli } = await supabase.from('clientes').select('balance_actual, limite_credito, nombre').eq('id', id).single();
    if (!cli) return res.status(404).json({ message: 'Cliente no encontrado' });
    const nuevoBalance = parseFloat(cli.balance_actual) + montoDeuda;
    if (nuevoBalance > parseFloat(cli.limite_credito)) return res.status(400).json({ message: `Excede el límite de crédito. Disponible: RD$ ${(parseFloat(cli.limite_credito) - parseFloat(cli.balance_actual)).toFixed(2)}` });
    await supabase.from('clientes').update({ balance_actual: nuevoBalance }).eq('id', id);
    await supabase.from('cuentas_por_cobrar').insert({ cliente_id: parseInt(id), tipo: 'ajuste', monto: montoDeuda, balance_despues: nuevoBalance, descripcion: descripcion||'Ajuste de deuda manual', cajero_id: cajero_id||null });
    res.json({ message: 'Deuda agregada exitosamente', nuevoBalance, cliente: cli.nombre });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al registrar deuda' }); }
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ message: 'Cliente no encontrado' });
  res.json(data);
});

module.exports = router;