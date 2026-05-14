const express = require('express');
const router  = express.Router();
const mysql   = require('mysql');

const db = mysql.createConnection({
  host: 'localhost', user: 'root',
  password: '2002', database: 'punto_de_venta'
});

// ── Lista de todas las páginas del sistema ──
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

// ── GET /api/roles/paginas — lista de todas las páginas del sistema ──
router.get('/paginas', (req, res) => res.json(TODAS_LAS_PAGINAS));

// ── GET /api/roles/all — todos los roles con conteo de permisos ──
router.get('/all', (req, res) => {
  const q = `
    SELECT r.*, COUNT(rp.id) AS total_permisos
    FROM roles r
    LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
    GROUP BY r.id
    ORDER BY r.id ASC`;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error al obtener roles' });
    res.json(rows);
  });
});

// ── GET /api/roles/:id — rol con sus permisos ──
router.get('/:id', (req, res) => {
  db.query('SELECT * FROM roles WHERE id = ?', [req.params.id], (err, rol) => {
    if (err || !rol.length) return res.status(404).json({ message: 'Rol no encontrado' });
    db.query('SELECT pagina FROM rol_permisos WHERE rol_id = ?', [req.params.id], (err2, perms) => {
      if (err2) return res.status(500).json({ message: 'Error al obtener permisos' });
      res.json({ ...rol[0], permisos: perms.map(p => p.pagina) });
    });
  });
});

// ── GET /api/roles/usuario/:userId — permisos del usuario ──
router.get('/usuario/:userId', (req, res) => {
  const q = `
    SELECT rp.pagina FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    JOIN rol_permisos rp ON rp.rol_id = r.id
    WHERE u.id = ?`;
  db.query(q, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error al obtener permisos' });
    // Si no tiene rol_id asignado, verificar si es admin por ENUM
    if (!rows.length) {
      db.query('SELECT rol FROM usuarios WHERE id = ?', [req.params.userId], (e2, u) => {
        if (!e2 && u.length && u[0].rol === 'admin') {
          // Admin sin rol_id: devolver todas las páginas
          return res.json(TODAS_LAS_PAGINAS.map(p => p.pagina));
        }
        res.json([]);
      });
      return;
    }
    res.json(rows.map(r => r.pagina));
  });
});

// ── POST /api/roles/create — crear nuevo rol ──
router.post('/create', (req, res) => {
  const { nombre, descripcion, permisos } = req.body;
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' });

  db.query('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || ''], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya existe un rol con ese nombre' });
      return res.status(500).json({ message: 'Error al crear rol' });
    }
    const rolId = result.insertId;
    if (!permisos || !permisos.length) return res.json({ message: 'Rol creado', rolId });

    const vals = permisos.map(p => [rolId, p]);
    db.query('INSERT INTO rol_permisos (rol_id, pagina) VALUES ?', [vals], (err2) => {
      if (err2) return res.status(500).json({ message: 'Rol creado pero error al guardar permisos' });
      res.json({ message: 'Rol creado exitosamente', rolId });
    });
  });
});

// ── PUT /api/roles/:id — actualizar rol y sus permisos ──
router.put('/:id', (req, res) => {
  const { nombre, descripcion, permisos } = req.body;
  const id = req.params.id;

  db.query('UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?', [nombre, descripcion || '', id], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya existe un rol con ese nombre' });
      return res.status(500).json({ message: 'Error al actualizar rol' });
    }
    // Reemplazar permisos
    db.query('DELETE FROM rol_permisos WHERE rol_id = ?', [id], (err2) => {
      if (err2) return res.status(500).json({ message: 'Error al actualizar permisos' });
      if (!permisos || !permisos.length) return res.json({ message: 'Rol actualizado' });

      const vals = permisos.map(p => [id, p]);
      db.query('INSERT INTO rol_permisos (rol_id, pagina) VALUES ?', [vals], (err3) => {
        if (err3) return res.status(500).json({ message: 'Error al guardar permisos' });
        res.json({ message: 'Rol actualizado exitosamente' });
      });
    });
  });
});

// ── DELETE /api/roles/:id — eliminar rol ──
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  // Verificar que no haya usuarios con este rol
  db.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol_id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error al verificar rol' });
    if (rows[0].total > 0) return res.status(400).json({ message: `No se puede eliminar: ${rows[0].total} usuario(s) tienen este rol asignado` });

    db.query('DELETE FROM roles WHERE id = ?', [id], (err2) => {
      if (err2) return res.status(500).json({ message: 'Error al eliminar rol' });
      res.json({ message: 'Rol eliminado exitosamente' });
    });
  });
});

module.exports = router;
module.exports.TODAS_LAS_PAGINAS = TODAS_LAS_PAGINAS;
