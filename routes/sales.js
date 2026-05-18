const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

let wss = null;
const setWebSocketServer = (webSocketServer) => { wss = webSocketServer; };

const emitirKPIActualizados = async () => {
  if (!wss) return;
  try {
    const hoy   = new Date().toISOString().slice(0, 10);
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const { data: ventas } = await supabase.from('ventas').select('id, itbis, detalle_ventas(precio_unitario, cantidad)').gte('fecha', hoy).lt('fecha', manana);
    const transacciones = ventas?.length || 0;
    const total = ventas?.reduce((sum, v) => {
      const subtotal = v.detalle_ventas?.reduce((s, d) => s + (d.precio_unitario * d.cantidad), 0) || 0;
      return sum + subtotal + (parseFloat(v.itbis) || 0);
    }, 0) || 0;
    const resultado = { type: 'KPI_UPDATE', data: { transacciones, total: +total.toFixed(2) } };
    wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify(resultado)); });
  } catch (err) { console.error('Error KPI WebSocket:', err); }
};

// KPIs
router.get('/kpi', async (req, res) => {
  try {
    const hoy    = new Date().toISOString().slice(0, 10);
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const { data: ventas } = await supabase.from('ventas').select('id, itbis, detalle_ventas(precio_unitario, cantidad)').gte('fecha', hoy).lt('fecha', manana);
    const transacciones = ventas?.length || 0;
    const total = ventas?.reduce((sum, v) => {
      const subtotal = v.detalle_ventas?.reduce((s, d) => s + (d.precio_unitario * d.cantidad), 0) || 0;
      return sum + subtotal + (parseFloat(v.itbis) || 0);
    }, 0) || 0;
    res.json({ transacciones, total: +total.toFixed(2) });
  } catch (err) { console.error(err); res.status(500).json({ transacciones: 0, total: 0 }); }
});

// Top 5 productos
router.get('/top-selling', async (req, res) => {
  try {
    const { data, error } = await supabase.from('detalle_ventas').select('producto_id, cantidad, inventario(nombre)');
    if (error) throw error;
    const agrupado = {};
    data.forEach(d => {
      const nombre = d.inventario?.nombre || 'Desconocido';
      agrupado[nombre] = (agrupado[nombre] || 0) + (d.cantidad || 0);
    });
    const resultado = Object.entries(agrupado).map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener productos' }); }
});

// Ventas diarias del mes
router.get('/daily-month', async (req, res) => {
  try {
    const hoy   = new Date();
    const inicio = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`;
    const fin    = `${hoy.getFullYear()}-${String(hoy.getMonth()+2).padStart(2,'0')}-01`;
    const { data, error } = await supabase.from('ventas').select('fecha, itbis, detalle_ventas(precio_unitario, cantidad)').gte('fecha', inicio).lt('fecha', fin);
    if (error) throw error;
    const porDia = {};
    data.forEach(v => {
      const dia = new Date(v.fecha).getDate();
      const subtotal = v.detalle_ventas?.reduce((s, d) => s + (d.precio_unitario * d.cantidad), 0) || 0;
      porDia[dia] = (porDia[dia] || 0) + subtotal + (parseFloat(v.itbis) || 0);
    });
    const resultado = Object.entries(porDia).map(([dia, total]) => ({ dia: parseInt(dia), total: +total.toFixed(2) })).sort((a, b) => a.dia - b.dia);
    res.json(resultado);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener ventas diarias' }); }
});

// Buscar productos
router.get('/productos', async (req, res) => {
  const { q } = req.query;
  try {
    const { data, error } = await supabase.from('inventario').select('*').or(`nombre.ilike.%${q}%,codigo_barras.ilike.%${q}%`);
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error en el servidor' }); }
});

// Crear venta
router.post('/crear', async (req, res) => {
  const { productos, cliente, cajero_id, forma_pago } = req.body;
  if (!productos?.length) return res.status(400).json({ message: 'No hay productos en la venta' });
  if (!cajero_id)         return res.status(400).json({ message: 'Debe especificar el cajero' });

  let subtotal = 0;
  productos.forEach(p => { subtotal += parseFloat(p.precio) * parseInt(p.cantidad); });
  const itbis      = +(subtotal * 0.18).toFixed(2);
  const total      = +(subtotal + itbis).toFixed(2);
  const metodoPago = forma_pago || 'efectivo';
  const clienteId  = cliente?.id ? parseInt(cliente.id) : null;
  const cajeroIdInt = parseInt(cajero_id);

  try {
    // 1. Validar crédito
    let balanceActual = null;
    if (metodoPago === 'credito' && clienteId) {
      const { data: cli } = await supabase.from('clientes').select('balance_actual, limite_credito').eq('id', clienteId).eq('activo', true).single();
      if (!cli) return res.status(400).json({ message: 'Cliente no encontrado' });
      const disponible = parseFloat(cli.limite_credito) - parseFloat(cli.balance_actual);
      if (total > disponible) return res.status(400).json({ message: `Crédito insuficiente. Disponible: RD$ ${disponible.toFixed(2)}` });
      balanceActual = parseFloat(cli.balance_actual);
    }

    // 2. Insertar venta
    const { data: ventaData, error: ventaError } = await supabase.from('ventas').insert({
      fecha: new Date().toISOString(),
      cliente_nombre: cliente?.nombre || '',
      cliente_rnc:    cliente?.rnc || '',
      subtotal, itbis, total,
      cajero_id: cajeroIdInt,
      cliente_id: clienteId,
      forma_pago: metodoPago
    }).select('id').single();
    if (ventaError) throw ventaError;
    const ventaId = ventaData.id;

    // 3. Detalle
    const detalles = productos.map(p => ({ venta_id: ventaId, producto_id: parseInt(p.id), cantidad: parseInt(p.cantidad), precio_unitario: parseFloat(p.precio) }));
    const { error: detError } = await supabase.from('detalle_ventas').insert(detalles);
    if (detError) throw detError;

    // 4. Actualizar inventario
    for (const p of productos) {
      const { data: inv } = await supabase.from('inventario').select('cantidad').eq('id', parseInt(p.id)).single();
      await supabase.from('inventario').update({ cantidad: (inv?.cantidad || 0) - parseInt(p.cantidad) }).eq('id', parseInt(p.id));
    }

    // 5. Crédito
    if (metodoPago === 'credito' && clienteId) {
      const nuevoBalance = +(balanceActual + total).toFixed(2);
      await supabase.from('clientes').update({ balance_actual: nuevoBalance }).eq('id', clienteId);
      await supabase.from('cuentas_por_cobrar').insert({
        cliente_id: clienteId, venta_id: ventaId, tipo: 'venta',
        monto: total, balance_despues: nuevoBalance,
        descripcion: `Venta #${ventaId} a crédito`, cajero_id: cajeroIdInt
      });
    }

    emitirKPIActualizados();
    res.json({ message: metodoPago === 'credito' ? 'Venta a crédito registrada' : 'Venta realizada exitosamente', ventaId });

  } catch (err) {
    console.error('[VENTA ERROR]', err);
    res.status(500).json({ message: 'Error al procesar la venta' });
  }
});

// Factura
router.get('/factura/:id', async (req, res) => {
  try {
    const { data: venta, error } = await supabase.from('ventas').select('*, cajeros!ventas_cajero_id_fkey(nombre)').eq('id', req.params.id).single();
    if (error || !venta) return res.status(404).json({ message: 'Venta no encontrada' });
    const { data: detalle } = await supabase.from('detalle_ventas').select('*, inventario(nombre)').eq('venta_id', req.params.id);
    res.json({ venta: { ...venta, cajero_nombre: venta.cajeros?.nombre }, detalle });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener factura' }); }
});

module.exports = router;
module.exports.setWebSocketServer = setWebSocketServer;