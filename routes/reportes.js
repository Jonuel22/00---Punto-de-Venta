const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

router.get('/ventas', async (req, res) => {
  const { fecha_inicio, fecha_fin, producto, cliente } = req.query;
  try {
    let query = supabase.from('detalle_ventas').select('precio_unitario, cantidad, inventario(nombre), ventas(fecha, cliente_nombre, cliente_rnc)');
    if (fecha_inicio) query = query.gte('ventas.fecha', fecha_inicio);
    if (fecha_fin)    query = query.lte('ventas.fecha', fecha_fin);
    if (producto)     query = query.ilike('inventario.nombre', `%${producto}%`);
    if (cliente)      query = query.or(`ventas.cliente_nombre.ilike.%${cliente}%,ventas.cliente_rnc.ilike.%${cliente}%`);
    const { data, error } = await query;
    if (error) throw error;
    const resultado = data.filter(d => d.ventas && d.inventario).map(d => ({
      fecha:    d.ventas.fecha,
      producto: d.inventario.nombre,
      cliente:  d.ventas.cliente_nombre,
      cantidad: d.cantidad,
      total:    d.precio_unitario * d.cantidad
    })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener reporte de ventas' }); }
});

router.get('/ventas-por-cajero', async (req, res) => {
  const { fecha_inicio, fecha_fin, cajero_id } = req.query;
  try {
    let query = supabase.from('ventas').select('total, cajero_id, cajeros!ventas_cajero_id_fkey(id, nombre)').eq('cajeros.activo', true);
    if (fecha_inicio) query = query.gte('fecha', fecha_inicio);
    if (fecha_fin)    query = query.lte('fecha', fecha_fin);
    if (cajero_id)    query = query.eq('cajero_id', cajero_id);
    const { data, error } = await query;
    if (error) throw error;
    const agrupado = {};
    data.filter(v => v.cajeros).forEach(v => {
      const id     = v.cajeros.id;
      const nombre = v.cajeros.nombre;
      if (!agrupado[id]) agrupado[id] = { cajero_id: id, cajero_nombre: nombre, num_transacciones: 0, total_ventas: 0 };
      agrupado[id].num_transacciones += 1;
      agrupado[id].total_ventas      += parseFloat(v.total) || 0;
    });
    const resultado = Object.values(agrupado).map(r => ({ ...r, total_ventas: +r.total_ventas.toFixed(2), ticket_promedio: +(r.total_ventas / r.num_transacciones).toFixed(2) })).sort((a, b) => b.total_ventas - a.total_ventas);
    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener reporte por cajero' }); }
});

module.exports = router;