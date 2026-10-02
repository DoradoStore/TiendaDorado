# Guía de Actualización de Datos

## 🔄 Cómo actualizar los productos

Cuando actualices el Excel de productos, sigue estos pasos:

### 1. Sube el nuevo Excel
- Coloca el nuevo archivo Excel en este directorio
- Nómbralo temporalmente como `carga_de_productos.xlsx`

### 2. Convierte a JSON
Ejecuta el script de conversión:
```bash
python3 convertir_excel.py
```

Esto generará el archivo `productos_data.json`

### 3. Renombra con nombre ofuscado
```bash
mv productos_data.json data_8f3k2l4m.json
```

### 4. Borra el Excel temporal
```bash
rm carga_de_productos.xlsx
```

### 5. Verifica que funcione
- Abre el catálogo en el navegador
- Verifica que los productos se carguen correctamente

## 🔄 Cómo actualizar los vendedores

### 1. Edita el archivo vendedores.json
```json
{
  "vendedores": [
    {
      "id": "nuevo_vendedor",
      "nombre": "Nombre del Vendedor",
      "telefono": "521234567890",
      "email": "email@ejemplo.com",
      "ciudad": "Ciudad"
    }
  ],
  "default": {
    "nombre": "Ventas Generales",
    "telefono": "521234567890"
  }
}
```

### 2. Guarda los cambios
- Los cambios se aplican automáticamente

## 🌐 Tecnologías

Este catálogo usa:
- **JavaScript puro** - Sin backend, sin PHP, sin Python
- **HTML5 y CSS3** - Para la interfaz
- **JSON** - Para almacenar datos
- **Hosting estático** - Funciona en cualquier servidor web (Apache, Nginx, GitHub Pages, Netlify, Vercel, etc.)

## 🔒 Seguridad

Los campos sensibles se filtran automáticamente:
- `costo` y `ganancia` se eliminan del JSON antes de mostrarlo
- Los datos se cargan directamente en el navegador
- Los nombres de archivos están ofuscados

## 📝 Notas

- No usa PHP ni backend - completamente estático
- Funciona en cualquier hosting estático
- Los datos se cargan directamente desde archivos JSON
- Cambia el nombre ofuscado periódicamente
- Mantén copias de seguridad de tus datos
