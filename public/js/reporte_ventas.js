// reporte_ventas.js
// Este script maneja la carga, filtrado y exportación de los reportes de ventas

document.addEventListener('DOMContentLoaded', function() {
    filtrarVentas(); // Cargar ventas al iniciar
});

function filtrarVentas() {
    const fecha_inicio = document.getElementById('fecha_inicio').value;
    const fecha_fin = document.getElementById('fecha_fin').value;
    const producto = document.getElementById('producto').value;
    const cliente = document.getElementById('cliente').value;

    fetch(`/api/reportes/ventas?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}&producto=${producto}&cliente=${cliente}`)
        .then(res => res.json())
        .then(data => llenarTablaVentas(data))
        .catch(err => alert('Error al cargar ventas: ' + err));
}

function llenarTablaVentas(ventas) {
    const tbody = document.querySelector('#tabla-ventas tbody');
    tbody.innerHTML = '';
    ventas.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v.fecha}</td>
            <td>${v.producto}</td>
            <td>${v.cliente}</td>
            <td>${v.cantidad}</td>
            <td>${v.total}</td>
        `;
        tbody.appendChild(tr);
    });
}

function descargarExcel() {
    const tabla = document.getElementById('tabla-ventas');
    const wb = XLSX.utils.table_to_book(tabla, {sheet: 'Ventas'});
    XLSX.writeFile(wb, 'reporte_ventas.xlsx');
}

function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tabla = document.getElementById('tabla-ventas');
    let rows = [];
    for (let i = 0, row; row = tabla.rows[i]; i++) {
        let rowData = [];
        for (let j = 0, col; col = row.cells[j]; j++) {
            rowData.push(col.innerText);
        }
        rows.push(rowData);
    }
    doc.autoTable({ head: [rows[0]], body: rows.slice(1) });
    doc.save('reporte_ventas.pdf');
}
