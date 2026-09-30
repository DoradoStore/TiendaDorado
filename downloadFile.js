
// Id del documento provisto en tu enlace
const sheetId = '140YqHJYp4Ng-2SXD9uxNr_6BMkID_PSPlgLxNwVSXrA';
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
console.log(url);
async function leerGoogleSheet() {
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error("No se pudo acceder al enlace.");
        
        const buffer = await respuesta.arrayBuffer();
        const libro = XLSX.read(buffer, { type: 'array' });
        const primeraHojaNombre = libro.SheetNames[0];
        const primeraHoja = libro.Sheets[primeraHojaNombre];
        const datosJson = XLSX.utils.sheet_to_json(primeraHoja);

        // Se eliminó la línea de textContent para evitar el error de nodo nulo
        console.log("Datos cargados con éxito:", datosJson);

    } catch (error) {
        console.error("Error al procesar la hoja de cálculo:", error);
        // Se eliminó la línea de textContent del bloque catch
    }
}

// Ejecutar la función al cargar la página
leerGoogleSheet();

