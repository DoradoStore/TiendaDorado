// La ruta DEBE apuntar exactamente a donde guardaste el archivo Excel en tu servidor local
const urlExcel = 'carga_de_productos.xlsx'; 

async function cargarYRecorrerExcel() {
    try {
        const respuesta = await fetch(urlExcel);
        
        // Validar si el archivo realmente se encontró en el servidor
        if (!respuesta.ok) {
            throw new Error(`No se encontró el archivo Excel (Error ${respuesta.status}). Verifica el nombre y su ubicación.`);
        }

        const buffer = await respuesta.arrayBuffer();

        // Procesa los datos binarios con el objeto global XLSX
        const libro = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const hoja = libro.Sheets[libro.SheetNames[0]];

        // Convierte y recorre la información
        const datos = XLSX.utils.sheet_to_json(hoja);
        console.log("¡Archivo leído con éxito! Filas encontradas:", datos.length);
        
        datos.forEach((fila) => {
            console.log('Datos de la fila:', fila);
        });

    } catch (error) {
        console.error('Error al leer el archivo desde la ruta:', error.message || error);
    }
}

// Ejecuta la función
cargarYRecorrerExcel();

