// Id del documento provisto en tu enlace
const sheetId = '140YqHJYp4Ng-2SXD9uxNr_6BMkID_PSPlgLxNwVSXrA';
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

let allProducts = [];
let filteredProducts = [];
let categories = new Set();
let sheetNames = [];

// Función para convertir enlaces de Google Drive a URLs de thumbnail
function convertGoogleDriveUrl(url) {
    if (!url) return null;
    
    // Si ya es una URL de thumbnail, retornarla
    if (url.includes('drive.google.com/thumbnail')) {
        return url;
    }
    
    // Convertir enlace de Google Drive a URL de thumbnail (evita problemas CORB)
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        const fileId = match[1];
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    }
    
    // Si no es un enlace de Google Drive, retornar la URL original
    return url;
}

// Función para verificar si una URL parece ser una imagen válida
function isValidImageUrl(url) {
    if (!url) return false;
    
    // URLs válidas de imágenes
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerUrl = url.toLowerCase();
    
    // Verificar si tiene extensión de imagen
    const hasImageExtension = imageExtensions.some(ext => lowerUrl.includes(ext));
    
    // Verificar si es una URL de Google Drive thumbnail
    const isGoogleDriveImage = url.includes('drive.google.com/thumbnail');
    
    // Verificar si es de un servicio de imágenes común
    const isImageService = url.includes('imgur.com') || 
                          url.includes('flickr.com') || 
                          url.includes('cloudinary.com') ||
                          url.includes('unsplash.com') ||
                          url.includes('images.unsplash.com');
    
    return hasImageExtension || isGoogleDriveImage || isImageService;
}

// Elementos del DOM
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const stats = document.getElementById('stats');
const sheetInfo = document.getElementById('sheetInfo');

// Cargar datos del Google Sheet
async function cargarDatos() {
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error("No se pudo acceder al enlace.");
        
        const buffer = await respuesta.arrayBuffer();
        const libro = XLSX.read(buffer, { type: 'array' });
        sheetNames = libro.SheetNames;

        // Leer todas las hojas y combinar los productos
        allProducts = [];
        sheetNames.forEach(sheetName => {
            const hoja = libro.Sheets[sheetName];
            const datosJson = XLSX.utils.sheet_to_json(hoja);
            
            // Agregar el nombre de la hoja como origen
            datosJson.forEach(product => {
                product._sheetName = sheetName;
                allProducts.push(product);
            });
        });

        console.log(`Total de productos de ${sheetNames.length} hojas:`, allProducts.length);
        sheetInfo.textContent = `Cargando de ${sheetNames.length} hojas: ${sheetNames.join(', ')}`;
        
        // Filtrar solo productos activos
        allProducts = allProducts.filter(product => {
            const activeKeys = Object.keys(product).filter(key => 
                key.toLowerCase().includes('activo') || 
                key.toLowerCase().includes('active') ||
                key.toLowerCase().includes('estado') ||
                key.toLowerCase().includes('status')
            );
            
            if (activeKeys.length > 0) {
                const isActive = product[activeKeys[0]];
                // Considerar activo si es true, 'si', 'yes', 'activo', o 1
                return isActive === true || 
                       String(isActive).toLowerCase() === 'si' ||
                       String(isActive).toLowerCase() === 'yes' ||
                       String(isActive).toLowerCase() === 'activo' ||
                       String(isActive).toLowerCase() === 'active' ||
                       isActive === 1;
            }
            
            // Si no hay campo de activo, mostrar todos
            return true;
        });

        console.log(`Productos activos:`, allProducts.length);
        filteredProducts = [...allProducts];
        
        // Extraer categorías únicas
        allProducts.forEach(product => {
            // Intentar encontrar el campo de categoría (puede tener diferentes nombres)
            const categoryKeys = Object.keys(product).filter(key => 
                key.toLowerCase().includes('categoría') || 
                key.toLowerCase().includes('categoria') ||
                key.toLowerCase().includes('category')
            );
            
            if (categoryKeys.length > 0) {
                const categoryValue = product[categoryKeys[0]];
                // Solo agregar si no está vacío y no empieza con __
                if (categoryValue && !String(categoryValue).startsWith('__') && !String(categoryValue).toLowerCase().includes('empty')) {
                    categories.add(categoryValue);
                }
            }
        });

        // Si no hay categorías específicas, usar los nombres de las hojas como categorías
        if (categories.size === 0 && sheetNames.length > 1) {
            sheetNames.forEach(name => categories.add(name));
        }

        // Si aún no hay categorías, usar la primera columna que tenga valores variados
        if (categories.size === 0 && allProducts.length > 0) {
            const keys = Object.keys(allProducts[0]);
            keys.forEach(key => {
                const values = allProducts.map(p => p[key]);
                const uniqueValues = new Set(values);
                if (uniqueValues.size > 1 && uniqueValues.size < allProducts.length * 0.8) {
                    values.forEach(v => categories.add(v));
                }
            });
        }

        renderCategories();
        renderProducts();
        updateStats();

    } catch (error) {
        console.error("Error al procesar la hoja de cálculo:", error);
        productsGrid.innerHTML = `
            <div class="no-results">
                <p>Error al cargar los productos: ${error.message}</p>
                <p>Por favor, verifica que el Google Sheet sea público o accesible.</p>
            </div>
        `;
    }
}

// Renderizar botones de categorías
function renderCategories() {
    const categoryArray = Array.from(categories).filter(c => 
        c && 
        c !== '' && 
        !String(c).startsWith('__') && 
        !String(c).toLowerCase().includes('empty')
    );
    
    // Limpiar botones existentes (excepto "Todos")
    const existingBtns = categoryFilter.querySelectorAll('.category-btn:not([data-category="all"])');
    existingBtns.forEach(btn => btn.remove());
    
    if (categoryArray.length === 0) {
        // Si no hay categorías, ocultar el filtro
        categoryFilter.style.display = 'none';
        return;
    }

    categoryArray.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = category;
        btn.dataset.category = category;
        btn.addEventListener('click', () => filterByCategory(category));
        categoryFilter.appendChild(btn);
    });
}

// Renderizar productos
function renderProducts() {
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-results">
                <p>No se encontraron productos que coincidan con tu búsqueda.</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = filteredProducts.map(product => {
        const keys = Object.keys(product);
        
        // Buscar categoría
        const categoryKeys = keys.filter(key => 
            key.toLowerCase().includes('categoría') || 
            key.toLowerCase().includes('categoria') ||
            key.toLowerCase().includes('category')
        );
        const category = categoryKeys.length > 0 ? product[categoryKeys[0]] : (product._sheetName || 'General');
        
        // Buscar nombre del producto
        const nameKeys = keys.filter(key => 
            key.toLowerCase().includes('nombre') || 
            key.toLowerCase().includes('name') ||
            key.toLowerCase().includes('producto') ||
            key.toLowerCase().includes('product')
        );
        const nameKey = nameKeys.length > 0 ? nameKeys[0] : keys[0];
        
        // Buscar imagen
        const imageKeys = keys.filter(key => 
            key.toLowerCase().includes('imagen') || 
            key.toLowerCase().includes('image') ||
            key.toLowerCase().includes('img') ||
            key.toLowerCase().includes('foto') ||
            key.toLowerCase().includes('photo')
        );
        const imageKey = imageKeys.length > 0 ? imageKeys[0] : null;
        const rawImageUrl = imageKey && product[imageKey] ? product[imageKey] : null;
        const convertedUrl = rawImageUrl ? convertGoogleDriveUrl(rawImageUrl) : null;
        const imageUrl = convertedUrl && isValidImageUrl(convertedUrl) ? convertedUrl : null;
        
        // Buscar precio
        const priceKeys = keys.filter(key => 
            key.toLowerCase().includes('precio') || 
            key.toLowerCase().includes('price') ||
            key.toLowerCase().includes('costo') ||
            key.toLowerCase().includes('cost')
        );
        const priceKey = priceKeys.length > 0 ? priceKeys[0] : null;
        const price = priceKey && product[priceKey] ? product[priceKey] : null;
        
        // Buscar descripción
        const descKeys = keys.filter(key => 
            key.toLowerCase().includes('descripción') || 
            key.toLowerCase().includes('descripcion') ||
            key.toLowerCase().includes('description') ||
            key.toLowerCase().includes('desc')
        );
        const descKey = descKeys.length > 0 ? descKeys[0] : null;
        const description = descKey && product[descKey] ? product[descKey] : null;
        
        // Filtrar otros detalles excluyendo campos especiales
        const excludedKeys = ['_sheetName', nameKey, ...categoryKeys, ...imageKeys, ...priceKeys, ...descKeys];
        const activeKeys = keys.filter(key => 
            key.toLowerCase().includes('activo') || 
            key.toLowerCase().includes('active') ||
            key.toLowerCase().includes('estado') ||
            key.toLowerCase().includes('status')
        );
        excludedKeys.push(...activeKeys);
        
        // Excluir campos existe, existe_1, existe_2
        const existeKeys = keys.filter(key => 
            key.toLowerCase().includes('existe')
        );
        excludedKeys.push(...existeKeys);
        
        // Excluir campos que empiezan con __ o están vacíos
        const emptyKeys = keys.filter(key => 
            key.startsWith('__') || 
            key.toLowerCase().includes('empty')
        );
        excludedKeys.push(...emptyKeys);
        
        const detailKeys = keys.filter(key => !excludedKeys.includes(key));

        const detailsHTML = detailKeys.map(key => {
            const value = product[key];
            // Solo mostrar si tiene valor y no está vacío
            if (value && value !== '' && value !== null && value !== undefined) {
                return `<p><strong>${key}:</strong> ${value}</p>`;
            }
            return '';
        }).filter(html => html !== '').join('');

        // Formatear precio
        const formattedPrice = price ? `$${Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';

        return `
            <div class="product-card">
                ${imageUrl ? `<img src="${imageUrl}" alt="${product[nameKey] || 'Producto'}" class="product-image" onerror="this.style.display='none'; this.onerror=null;">` : ''}
                <span class="product-category">${category}</span>
                <h3 class="product-name">${product[nameKey] || 'Sin nombre'}</h3>
                ${formattedPrice ? `<div class="product-price">${formattedPrice}</div>` : ''}
                ${description ? `<p class="product-description">${description}</p>` : ''}
                ${detailsHTML ? `<div class="product-details">${detailsHTML}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Filtrar por categoría
function filterByCategory(category) {
    // Actualizar estado activo de botones
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    if (category === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => {
            const categoryKeys = Object.keys(product).filter(key => 
                key.toLowerCase().includes('categoría') || 
                key.toLowerCase().includes('categoria') ||
                key.toLowerCase().includes('category')
            );
            
            if (categoryKeys.length > 0) {
                return product[categoryKeys[0]] === category;
            }
            
            // Si no hay campo de categoría específico, buscar en todos los campos y también en el nombre de la hoja
            return Object.values(product).some(value => value === category) || product._sheetName === category;
        });
    }

    // Aplicar filtro de búsqueda si existe
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filterBySearch(searchTerm);
    } else {
        renderProducts();
        updateStats();
    }
}

// Filtrar por búsqueda
function filterBySearch(searchTerm) {
    const categoryBtn = document.querySelector('.category-btn.active');
    const selectedCategory = categoryBtn ? categoryBtn.dataset.category : 'all';

    let productsToFilter = selectedCategory === 'all' ? [...allProducts] : 
        allProducts.filter(product => {
            const categoryKeys = Object.keys(product).filter(key => 
                key.toLowerCase().includes('categoría') || 
                key.toLowerCase().includes('categoria') ||
                key.toLowerCase().includes('category')
            );
            
            if (categoryKeys.length > 0) {
                return product[categoryKeys[0]] === selectedCategory;
            }
            return Object.values(product).some(value => value === selectedCategory) || product._sheetName === selectedCategory;
        });

    filteredProducts = productsToFilter.filter(product => {
        return Object.values(product).some(value => 
            String(value).toLowerCase().includes(searchTerm)
        );
    });

    renderProducts();
    updateStats();
}

// Actualizar estadísticas
function updateStats() {
    stats.textContent = `Mostrando ${filteredProducts.length} de ${allProducts.length} productos activos`;
}

// Event listeners
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterBySearch(searchTerm);
});

// Inicializar
cargarDatos();