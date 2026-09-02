/* Funcionalidades avanzadas para búsqueda de empleados */

// ========== EXPORT A PDF ==========
function exportToPDF() {
    if (allEmployees.length === 0) {
        alert('No hay empleados para exportar');
        return;
    }

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const department = document.getElementById('departmentFilter').value;

    let filtered = allEmployees.filter(emp => {
        const matchSearch = emp.nombre.toLowerCase().includes(searchTerm) ||
                           emp.email.toLowerCase().includes(searchTerm) ||
                           emp.departamento.toLowerCase().includes(searchTerm);
        const matchDept = !department || emp.departamento === department;
        return matchSearch && matchDept;
    });

    // Crear contenido HTML para PDF
    let htmlContent = `
        <h2>Reporte de Empleados</h2>
        <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
        <p>Total de empleados: ${filtered.length}</p>
        <table border="1" cellpadding="10" style="width:100%;">
            <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Departamento</th>
            </tr>
    `;

    filtered.forEach(emp => {
        htmlContent += `
            <tr>
                <td>${emp.nombre}</td>
                <td>${emp.email}</td>
                <td>${emp.departamento}</td>
            </tr>
        `;
    });

    htmlContent += '</table>';

    // Usar jsPDF si está disponible, sino descargar como HTML
    downloadHTML(htmlContent, 'Reporte_Empleados.html');
}

// ========== EXPORT A CSV ==========
function exportToCSV() {
    if (allEmployees.length === 0) {
        alert('No hay empleados para exportar');
        return;
    }

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const department = document.getElementById('departmentFilter').value;

    let filtered = allEmployees.filter(emp => {
        const matchSearch = emp.nombre.toLowerCase().includes(searchTerm) ||
                           emp.email.toLowerCase().includes(searchTerm) ||
                           emp.departamento.toLowerCase().includes(searchTerm);
        const matchDept = !department || emp.departamento === department;
        return matchSearch && matchDept;
    });

    // Crear CSV
    let csv = 'Nombre,Email,Departamento\n';
    filtered.forEach(emp => {
        csv += `"${emp.nombre}","${emp.email}","${emp.departamento}"\n`;
    });

    downloadFile(csv, 'Reporte_Empleados.csv', 'text/csv');
}

// ========== DESCARGAR ARCHIVO ==========
function downloadFile(content, filename, type) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:' + type + ';charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function downloadHTML(content, filename) {
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${filename}</title>
            <style>
                body { font-family: Arial; margin: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #123456; color: white; }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;
    downloadFile(htmlContent, filename, 'text/html');
}

// ========== ENVIAR DATOS AL BACKEND ==========
async function syncWithBackend() {
    if (allEmployees.length === 0) {
        alert('No hay empleados para sincronizar');
        return;
    }

    try {
        const response = await fetch('/api/employees/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ employees: allEmployees })
        });

        const data = await response.json();
        if (response.ok) {
            alert(`✅ Se sincronizaron ${data.synced} empleados con el servidor`);
        } else {
            alert('❌ Error: ' + (data.error || 'Error desconocido'));
        }
    } catch (err) {
        console.error('Error:', err);
        alert('❌ Error de conexión con el servidor');
    }
}

// ========== CARGAR DESDE BACKEND ==========
async function loadFromBackend() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Por favor inicia sesión primero');
            return;
        }

        const response = await fetch('/api/employees', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            alert('❌ Error al cargar empleados del servidor');
            return;
        }

        const data = await response.json();
        allEmployees = data.employees || [];

        if (allEmployees.length === 0) {
            alert('No hay empleados en el servidor');
            return;
        }

        // Actualizar UI
        const departments = [...new Set(allEmployees.map(e => e.departamento).filter(d => d))];
        const filterSelect = document.getElementById('departmentFilter');
        filterSelect.innerHTML = '<option value="">Todos los departamentos</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            filterSelect.appendChild(option);
        });

        searchEmployees();
        alert(`✅ Se cargaron ${allEmployees.length} empleados del servidor`);

    } catch (err) {
        console.error('Error:', err);
        alert('❌ Error de conexión');
    }
}

// ========== ENVIAR EMAIL A EMPLEADO ==========
function sendEmailTo(email) {
    const subject = 'Comunicación desde sistema de empleados';
    const body = 'Hola,\n\nLe contactamos desde nuestro sistema.\n\nSaludos';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ========== IMPRIMIR TARJETA ==========
function printEmployee(emp) {
    const printWindow = window.open('', '', 'height=400,width=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Empleado: ${emp.nombre}</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    .card { border: 2px solid #123456; padding: 20px; max-width: 400px; }
                    img { width: 200px; height: 200px; object-fit: cover; }
                    h2 { color: #123456; }
                </style>
            </head>
            <body>
                <div class="card">
                    <img src="${emp.foto}" onerror="this.src='https://via.placeholder.com/200x200?text=Sin+Foto'">
                    <h2>${emp.nombre}</h2>
                    <p><strong>Email:</strong> ${emp.email}</p>
                    <p><strong>Departamento:</strong> ${emp.departamento}</p>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ========== BUSCAR POR FOTO ==========
async function searchByPhoto() {
    alert('Funcionalidad de búsqueda por foto (requiere ML.js o Google Vision API)');
}

// ========== EXPORTAR A JSON ==========
function exportToJSON() {
    if (allEmployees.length === 0) {
        alert('No hay empleados para exportar');
        return;
    }

    const json = JSON.stringify(allEmployees, null, 2);
    downloadFile(json, 'empleados.json', 'application/json');
}

// ========== VALIDAR Y LIMPIAR DATOS ==========
function validateEmployeeData() {
    let errors = [];
    
    allEmployees.forEach((emp, index) => {
        if (!emp.nombre) errors.push(`Fila ${index + 1}: Nombre vacío`);
        if (!emp.email || !emp.email.includes('@')) errors.push(`Fila ${index + 1}: Email inválido`);
        if (!emp.departamento) errors.push(`Fila ${index + 1}: Departamento vacío`);
    });

    if (errors.length === 0) {
        alert(`✅ Todos los ${allEmployees.length} empleados tienen datos válidos`);
    } else {
        alert(`❌ Se encontraron ${errors.length} errores:\n\n${errors.slice(0, 5).join('\n')}`);
    }
}

// ========== DUPLICADOS ==========
function findDuplicates() {
    const seen = new Set();
    const duplicates = [];

    allEmployees.forEach(emp => {
        if (seen.has(emp.email)) {
            duplicates.push(emp.email);
        }
        seen.add(emp.email);
    });

    if (duplicates.length === 0) {
        alert('✅ No se encontraron empleados duplicados');
    } else {
        alert(`⚠️ Se encontraron ${duplicates.length} emails duplicados:\n\n${duplicates.slice(0, 5).join('\n')}`);
    }
}

// ========== ESTADÍSTICAS ==========
function showStatistics() {
    const stats = {
        total: allEmployees.length,
        departments: [...new Set(allEmployees.map(e => e.departamento))].length,
        byDept: {}
    };

    allEmployees.forEach(emp => {
        if (!stats.byDept[emp.departamento]) {
            stats.byDept[emp.departamento] = 0;
        }
        stats.byDept[emp.departamento]++;
    });

    let message = `📊 ESTADÍSTICAS\n\n`;
    message += `Total de empleados: ${stats.total}\n`;
    message += `Departamentos: ${stats.departments}\n\n`;
    message += `Por departamento:\n`;
    Object.entries(stats.byDept).forEach(([dept, count]) => {
        message += `• ${dept}: ${count}\n`;
    });

    alert(message);
}
