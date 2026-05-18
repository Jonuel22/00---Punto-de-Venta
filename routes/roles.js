const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

const TODAS_LAS_PAGINAS = [
  { pagina: 'ventas.html',                     label: 'Ventas',                  icono: 'fa-cash-register',        grupo: 'Operaciones' },
  { pagina: 'inventario.html',                 label: 'Inventario',               icono: 'fa-boxes',                grupo: 'Operaciones' },
  { pagina: 'clientes.html',                   label: 'Clientes',                 icono: 'fa-users',                grupo: 'Operaciones' },
  { pagina: 'crear_producto.html',             label: 'Crear Producto',           icono: 'fa-plus-circle',          grupo: 'Productos' },
  { pagina: 'consultar_productos.html',        label: 'Consultar Productos',      icono: 'fa-search',               grupo: 'Productos' },
  { pagina: 'editar_producto.html',            label: 'Editar Producto',          icono: 'fa-edit',                 grupo: 'Productos' },
  { pagina: 'eliminar_producto.html',          label: 'Eliminar Producto',        icono: 'fa-trash',                grupo: 'Productos' },
  { pagina: 'cargar_excel.html',               label: 'Cargar Excel',             icono: 'fa-file-excel',           grupo: 'Productos' },
  { pagina: 'reportes.html',                   label: 'Reportes',                 icono: 'fa-chart-bar',            grupo: 'Reportes' },
  { pagina: 'reporte_ventas.html',             label: 'Reporte de Ventas',        icono: 'fa-chart-line',           grupo: 'Reportes' },
  { pagina: 'reporte_ventas_cajero.html',      label: 'Reporte por Cajero',       icono: 'fa-user-tie',             grupo: 'Reportes' },
  { pagina: 'cuentas_por_cobrar_reporte.html', label: 'Cuentas por Cobrar',       icono: 'fa-file-invoice-dollar',  grupo: 'Reportes' },
  { pagina: 'cuadre_caja.html',                label: 'Cuadre de Caja',           icono: 'fa-cash-register',        grupo: 'Reportes' },
  { pagina: 'productos_agotados.html',         label: 'Productos Agotados',       icono: 'fa-box-open',             grupo: 'Reportes' },
  { pagina: 'config_general.html',             label: 'Configuración General',    icono: 'fa-cog',                  grupo: 'Configuración' },
  { pagina: 'config_usuarios.html',            label: 'Gestión de Usuarios',      icono: 'fa-user-cog',             grupo: 'Configuración' },
  { pagina: 'configuracion_cajeros.html',      label: 'Configuración de Cajeros', icono: 'fa-user-tie',             grupo: 'Configuración' },
  { pagina: 'roles.html',                      label: 'Gestión de Roles',         icono: 'fa-shield-alt',           grupo: 'Configuración' },
];

router.get('/paginas', (req, res) => res.json(TODAS_LAS_PAGINAS));

router.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('roles').select('*, rol_permisos(id)').order('id');
  if (error) { console.error(error); return res.status(500).json({ message: 'Error al obtener roles' }); }
  res.json(data.map(r => ({ ...r, total_permisos: r.rol_permisos?.length || 0 })));
});

// ANTES de /:id
router.get('/usuario/:userId', async (req, res) => {
  try {
    const { data: user } = await supabase.from('usuarios').select('rol, rol_id').eq('id', req.params.userId).single();
    if (!user) return res.json([]);
    if (!user.rol_id) {
      if (user.rol === 'admin') return res.json(TODAS_LAS_PAGINAS.map(p => p.pagina));
      return res.json([]);
    }
    const { data: perms } = await supabase.from('rol_permisos').select('pagina').eq('rol_id', user.rol_id);
    if (!perms?.length && user.rol === 'admin') return res.json(TODAS_LAS_PAGINAS.map(p => p.pagina));
    res.json(perms?.map(p => p.pagina) || []);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener permisos' }); }
});

router.get('/:id', async (req, res) => {
  const { data: rol, error } = await supabase.from('roles').select('*').eq('id', req.params.id).single();
  if (error || !rol) return res.status(404).json({ message: 'Rol no encontrado' });
  const { data: perms } = await supabase.from('rol_permisos').select('pagina').eq('rol_id', req.params.id);
  res.json({ ...rol, permisos: perms?.map(p => p.pagina) || [] });
});

router.post('/create', async (req, res) => {
  const { nombre, descripcion, permisos } = req.body;
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' });
  try {
    const { data, error } = await supabase.from('roles').insert({ nombre, descripcion: descripcion||'' }).select('id').single();
    if (error) throw error;
    if (permisos?.length) await supabase.from('rol_permisos').insert(permisos.map(p => ({ rol_id: data.id, pagina: p })));
    res.json({ message: 'Rol creado exitosamente', rolId: data.id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ message: 'Ya existe un rol con ese nombre' });
    res.status(500).json({ message: 'Error al crear rol' });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, descripcion, permisos } = req.body;
  const id = req.params.id;
  try {
    const { error } = await supabase.from('roles').update({ nombre, descripcion: descripcion||'' }).eq('id', id);
    if (error) throw error;
    await supabase.from('rol_permisos').delete().eq('rol_id', id);
    if (permisos?.length) await supabase.from('rol_permisos').insert(permisos.map(p => ({ rol_id: parseInt(id), pagina: p })));
    res.json({ message: 'Rol actualizado exitosamente' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ message: 'Ya existe un rol con ese nombre' });
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { count } = await supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol_id', req.params.id);
    if (count > 0) return res.status(400).json({ message: `No se puede eliminar: ${count} usuario(s) tienen este rol asignado` });
    await supabase.from('roles').delete().eq('id', req.params.id);
    res.json({ message: 'Rol eliminado exitosamente' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error al eliminar rol' }); }
});

module.exports = router;
module.exports.TODAS_LAS_PAGINAS = TODAS_LAS_PAGINAS;