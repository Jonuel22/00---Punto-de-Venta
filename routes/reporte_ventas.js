// reporte_ventas.js - Script para el reporte de ventas

const API_URL = 'http://localhost:5000';

// Cargar todas las ventas al inicio
document.addEventListener('DOMContentLoaded', function() {
    cargarVentas();
});

// Función para cargar ventas (sin filtros o con filtros)
function cargarVentas(filtros = {}) {
    let url = `${API_URL}/api/reportes/ventas?`;
    
    if (filtros.fecha_inicio) {
        url += `fecha_inicio=${filtros.fecha_inicio}&`;
    }
    if (filtros.fecha_fin) {
        // Agregar un día más para incluir todo el día final
        const fechaFin = new Date(filtros.fecha_fin);
        fechaFin.setDate(fechaFin.getDate() + 1);
        const fechaFinStr = fechaFin.toISOString().split('T')[0];
        url += `fecha_fin=${fechaFinStr}&`;
    }
    if (filtros.producto) {
        url += `producto=${encodeURIComponent(filtros.producto)}&`;
    }
    if (filtros.cliente) {
        url += `cliente=${encodeURIComponent(filtros.cliente)}&`;
    }
    
    console.log('URL de consulta:', url);
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Datos recibidos:', data);
            llenarTablaVentas(data);
        })
        .catch(error => {
            console.error('Error al cargar ventas:', error);
            alert('Error al cargar el reporte de ventas');
        });
}

// Función para llenar la tabla con los datos
function llenarTablaVentas(ventas) {
    const tbody = document.querySelector('#tabla-ventas tbody');
    
    if (!tbody) {
        console.error('No se encontró el tbody de la tabla');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #999;">No se encontraron ventas con los filtros aplicados</td></tr>';
        return;
    }
    
    ventas.forEach(venta => {
        const tr = document.createElement('tr');
        
        // Formatear fecha
        const fecha = new Date(venta.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-DO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // Formatear total
        const totalFormateado = parseFloat(venta.total).toLocaleString('es-DO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        tr.innerHTML = `
            <td>${fechaFormateada}</td>
            <td>${venta.producto}</td>
            <td>${venta.cliente || 'N/A'}</td>
            <td>${venta.cantidad}</td>
            <td>RD$ ${totalFormateado}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Función para filtrar ventas desde el formulario
function filtrarVentas() {
    const fechaInicio = document.getElementById('fecha_inicio').value;
    const fechaFin = document.getElementById('fecha_fin').value;
    const producto = document.getElementById('producto').value;
    const cliente = document.getElementById('cliente').value;
    
    const filtros = {};
    
    if (fechaInicio) filtros.fecha_inicio = fechaInicio;
    if (fechaFin) filtros.fecha_fin = fechaFin;
    if (producto) filtros.producto = producto;
    if (cliente) filtros.cliente = cliente;
    
    console.log('Filtros aplicados:', filtros);
    
    cargarVentas(filtros);
}

// Función para filtrar ventas de hoy
function filtrarHoy() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    const fechaHoy = `${year}-${month}-${day}`;
    
    document.getElementById('fecha_inicio').value = fechaHoy;
    document.getElementById('fecha_fin').value = fechaHoy;
    document.getElementById('producto').value = '';
    document.getElementById('cliente').value = '';
    
    cargarVentas({
        fecha_inicio: fechaHoy,
        fecha_fin: fechaHoy
    });
}

// Función para descargar Excel
function descargarExcel() {
    const tabla = document.getElementById('tabla-ventas');
    
    if (!tabla) {
        alert('No se encontró la tabla para exportar');
        return;
    }
    
    // Obtener datos de la tabla
    const tbody = tabla.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Crear libro de Excel
    const data = [['Fecha', 'Producto', 'Cliente', 'Cantidad', 'Total']];
    
    rows.forEach(row => {
        if (row.cells.length >= 5) {
            const rowData = [
                row.cells[0].textContent,
                row.cells[1].textContent,
                row.cells[2].textContent,
                row.cells[3].textContent,
                row.cells[4].textContent
            ];
            data.push(rowData);
        }
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    
    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_ventas_${fecha}.xlsx`);
}

// Función para descargar PDF
function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const tabla = document.getElementById('tabla-ventas');
    const tbody = tabla.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Título
    doc.setFontSize(16);
    doc.text('Reporte de Ventas', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-DO')}`, 14, 22);
    
    // Preparar datos para la tabla
    const headers = [['Fecha', 'Producto', 'Cliente', 'Cantidad', 'Total']];
    const data = [];
    
    rows.forEach(row => {
        if (row.cells.length >= 5) {
            data.push([
                row.cells[0].textContent,
                row.cells[1].textContent,
                row.cells[2].textContent,
                row.cells[3].textContent,
                row.cells[4].textContent
            ]);
        }
    });
    
    // Agregar tabla
    doc.autoTable({
        head: headers,
        body: data,
        startY: 28,
        theme: 'grid',
        headStyles: {
            fillColor: [0, 204, 102],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        }
    });
    
    // Agregar total
    const totalVendido = document.getElementById('total-vendido').textContent;
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Vendido: ${totalVendido}`, 14, finalY);
    
    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`reporte_ventas_${fecha}.pdf`);
}
