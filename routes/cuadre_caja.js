const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

router.post('/abrir', async (req, res) => {
  const { cajero_id, monto_apertura, notas_apertura } = req.body;
  if (!cajero_id) return res.status(400).json({ message: 'El ID del cajero es requerido' });
  try {
    const { data: open } = await supabase.from('cuadre_caja').select('id').eq('cajero_id', cajero_id).eq('estado', 'abierto');
    if (open?.length) return res.status(400).json({ message: 'Ya existe una caja abierta para este cajero' });
    const { data, error } = await supabase.from('cuadre_caja').insert({ cajero_id, fecha_apertura: new Date().toISOString(), monto_apertura: monto_apertura||0, estado: 'abierto', observaciones: notas_apertura||null }).select('id').single();
    if (error) throw error;
    res.json({ message: 'Caja abierta exitosamente', cuadreId: data.id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al abrir caja' }); }
});

router.post('/cerrar/:id', async (req, res) => {
  const { id } = req.params;
  const { monto_real, observaciones } = req.body;
  try {
    const { data: cc } = await supabase.from('cuadre_caja').select('cajero_id, fecha_apertura, monto_apertura').eq('id', id).single();
    if (!cc) return res.status(404).json({ message: 'Cuadre no encontrado' });
    const { data: ventas } = await supabase.from('ventas').select('total, forma_pago').eq('cajero_id', cc.cajero_id).gte('fecha', cc.fecha_apertura);
    const totalVentas        = ventas?.reduce((s, v) => s + parseFloat(v.total||0), 0) || 0;
    const totalTransacciones = ventas?.length || 0;
    const ventasEfectivo     = ventas?.filter(v => v.forma_pago==='efectivo').reduce((s,v)=>s+parseFloat(v.total||0),0)||0;
    const ventasTarjeta      = ventas?.filter(v => v.forma_pago==='tarjeta').reduce((s,v)=>s+parseFloat(v.total||0),0)||0;
    const ventasTransferencia= ventas?.filter(v => v.forma_pago==='transferencia').reduce((s,v)=>s+parseFloat(v.total||0),0)||0;
    const ventasOtro         = ventas?.filter(v => !['efectivo','tarjeta','transferencia'].includes(v.forma_pago)).reduce((s,v)=>s+parseFloat(v.total||0),0)||0;
    const montoApertura  = parseFloat(cc.monto_apertura) || 0;
    const montoEsperado  = montoApertura + totalVentas;
    const montoRealFloat = parseFloat(monto_real) || 0;
    const diferencia     = montoRealFloat - montoEsperado;
    await supabase.from('cuadre_caja').update({ fecha_cierre: new Date().toISOString(), monto_esperado: montoEsperado, monto_real: montoRealFloat, diferencia, total_ventas: totalVentas, total_transacciones: totalTransacciones, estado: 'cerrado', observaciones }).eq('id', id);
    res.json({ message: 'Caja cerrada exitosamente', datos: { monto_apertura: montoApertura, monto_esperado: montoEsperado, monto_real: montoRealFloat, diferencia, total_ventas: totalVentas, total_transacciones: totalTransacciones, ventas_efectivo: ventasEfectivo, ventas_tarjeta: ventasTarjeta, ventas_transferencia: ventasTransferencia, ventas_otro: ventasOtro } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al cerrar caja' }); }
});

router.get('/abiertas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cuadre_caja').select('*, cajeros!cuadre_caja_cajero_id_fkey(nombre, usuarios!cajeros_usuario_id_fkey(username))').eq('estado', 'abierto').order('fecha_apertura', { ascending: false });
    if (error) throw error;

    // Calcular ventas en vivo para cada caja abierta
    const resultado = await Promise.all(data.map(async (cc) => {
      const { data: ventas } = await supabase.from('ventas')
        .select('total')
        .eq('cajero_id', cc.cajero_id)
        .gte('fecha', cc.fecha_apertura);

      const total_ventas_live        = ventas?.reduce((s, v) => s + parseFloat(v.total || 0), 0) || 0;
      const total_transacciones_live = ventas?.length || 0;

      return {
        ...cc,
        cajero_nombre:            cc.cajeros?.nombre,
        cajero_usuario:           cc.cajeros?.usuarios?.username,
        total_ventas_live,
        total_transacciones_live
      };
    }));

    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener cajas abiertas' }); }
});

router.get('/abierta/:cajero_id', async (req, res) => {
  const { data, error } = await supabase.from('cuadre_caja').select('*, cajeros!cuadre_caja_cajero_id_fkey(nombre, usuarios!cajeros_usuario_id_fkey(username))').eq('cajero_id', req.params.cajero_id).eq('estado', 'abierto').order('fecha_apertura', { ascending: false }).limit(1);
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener caja' }); }
  if (!data?.length) return res.json(null);
  const cc = data[0];
  res.json({ ...cc, cajero_nombre: cc.cajeros?.nombre, cajero_usuario: cc.cajeros?.usuarios?.username });
});

router.get('/historial', async (req, res) => {
  const { cajero_id, desde, hasta, estado, fecha_inicio, fecha_fin } = req.query;
  try {
    let query = supabase.from('cuadre_caja').select('*, cajeros!cuadre_caja_cajero_id_fkey(nombre, usuarios!cajeros_usuario_id_fkey(username))').order('fecha_apertura', { ascending: false }).limit(500);
    if (cajero_id) query = query.eq('cajero_id', cajero_id);
    if (desde || fecha_inicio) query = query.gte('fecha_apertura', desde || fecha_inicio);
    if (hasta || fecha_fin)    query = query.lte('fecha_apertura', hasta || fecha_fin);
    if (estado)  query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) throw error;

    // Para cajas abiertas, calcular ventas en vivo
    const resultado = await Promise.all(data.map(async (cc) => {
      let total_ventas       = parseFloat(cc.total_ventas || 0);
      let total_transacciones = parseInt(cc.total_transacciones || 0);

      if (cc.estado === 'abierto') {
        const { data: ventas } = await supabase.from('ventas')
          .select('total')
          .eq('cajero_id', cc.cajero_id)
          .gte('fecha', cc.fecha_apertura);
        total_ventas        = ventas?.reduce((s, v) => s + parseFloat(v.total || 0), 0) || 0;
        total_transacciones = ventas?.length || 0;
      }

      return {
        ...cc,
        cajero_nombre:      cc.cajeros?.nombre,
        cajero_usuario:     cc.cajeros?.usuarios?.username,
        total_ventas,
        total_transacciones
      };
    }));

    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener historial' }); }
});

router.get('/ventas-caja/:id', async (req, res) => {
  try {
    const { data: cc } = await supabase.from('cuadre_caja').select('cajero_id, fecha_apertura, fecha_cierre, estado').eq('id', req.params.id).single();
    if (!cc) return res.status(404).json({ message: 'Cuadre no encontrado' });
    let query = supabase.from('ventas').select('id, fecha, total, cliente_nombre, forma_pago').eq('cajero_id', cc.cajero_id).gte('fecha', cc.fecha_apertura).order('fecha', { ascending: false }).limit(200);
    if (cc.fecha_cierre) query = query.lte('fecha', cc.fecha_cierre);
    const { data: ventas } = await query;
    const resumen = ventas?.reduce((acc, v) => { const fp = v.forma_pago||'efectivo'; acc.total += parseFloat(v.total)||0; acc.count += 1; acc.por_forma[fp] = (acc.por_forma[fp]||0) + (parseFloat(v.total)||0); return acc; }, { total: 0, count: 0, por_forma: {} });
    res.json({ ventas, resumen });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener ventas' }); }
});

async function getDetalle(id, res) {
  try {
    const { data: cc } = await supabase.from('cuadre_caja').select('*, cajeros!cuadre_caja_cajero_id_fkey(nombre, usuarios!cajeros_usuario_id_fkey(username))').eq('id', id).single();
    if (!cc) return res.status(404).json({ message: 'Cuadre no encontrado' });
    let query = supabase.from('ventas').select('id, fecha, total, cliente_nombre, forma_pago').eq('cajero_id', cc.cajero_id).gte('fecha', cc.fecha_apertura).order('fecha', { ascending: false }).limit(200);
    if (cc.fecha_cierre) query = query.lte('fecha', cc.fecha_cierre);
    const { data: ventas } = await query;
    const totalVentasLive = ventas?.reduce((s, v) => s + (parseFloat(v.total)||0), 0) || 0;
    const porFormaPago    = ventas?.reduce((acc, v) => { const fp = v.forma_pago||'efectivo'; acc[fp] = (acc[fp]||0) + (parseFloat(v.total)||0); return acc; }, {});
    res.json({ cuadre: { ...cc, cajero_nombre: cc.cajeros?.nombre, cajero_usuario: cc.cajeros?.usuarios?.username }, ventas, resumen: { total_ventas_live: totalVentasLive, total_transacciones: ventas?.length||0, por_forma_pago: porFormaPago } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener cuadre' }); }
}

router.get('/detalle/:id', (req, res) => getDetalle(req.params.id, res));
router.get('/:id',         (req, res) => getDetalle(req.params.id, res));

module.exports = router;