// URLs de los archivos JSON
const dataUrl = 'data_8f3k2l4m.json';
const vendedoresUrl = 'vendedores.json';

let allProducts = [];
let filteredProducts = [];
let categories = new Set();
let sheetNames = [];
let productsData = {}; // Almacenar datos de productos por ID
let cart = []; // Carrito de compras
let sellerInfo = {}; // Información del vendedor
let vendedoresData = {}; // Datos de vendedores del JSON

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
const categorySelect = document.getElementById('categorySelect');
const stats = document.getElementById('stats');
const sheetInfo = document.getElementById('sheetInfo');

// Cargar datos del JSON local
async function cargarDatos() {
    try {
        const respuesta = await fetch(dataUrl);
        if (!respuesta.ok) throw new Error("No se pudo acceder a los datos.");
        
        const data = await respuesta.json();
        allProducts = data.productos || [];

        // Filtrar campos sensibles (costo y ganancia)
        allProducts = allProducts.map(producto => {
            const productoFiltrado = { ...producto };
            delete productoFiltrado.costo;
            delete productoFiltrado.ganancia;
            return productoFiltrado;
        });

        console.log(`Total de productos cargados:`, allProducts.length);
        sheetInfo.textContent = `Cargados ${allProducts.length} productos`;
        
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
        if (categories.size === 0) {
            const sheetNames = new Set(allProducts.map(p => p._hoja).filter(h => h));
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
        console.error("Error al cargar los datos:", error);
        productsGrid.innerHTML = `
            <div class="no-results">
                <p>Error al cargar los productos: ${error.message}</p>
                <p>Por favor, verifica la conexión con el servidor.</p>
            </div>
        `;
    }
}

// Renderizar selector de categorías
function renderCategories() {
    const categoryArray = Array.from(categories).filter(c =>
        c &&
        c !== '' &&
        !String(c).startsWith('__') &&
        !String(c).toLowerCase().includes('empty')
    );

    // Limpiar opciones existentes (excepto "Todos")
    while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
    }

    if (categoryArray.length === 0) {
        // Si no hay categorías, ocultar el filtro
        categoryFilter.style.display = 'none';
        return;
    }

    categoryArray.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    // Event listener para el cambio de categoría
    categorySelect.addEventListener('change', (e) => {
        filterByCategory(e.target.value);
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
        
        // Buscar campo de imagen (imagen, image, img, foto, photo)
        const imageKeys = keys.filter(key => 
            key.toLowerCase().includes('imagen') || 
            key.toLowerCase().includes('image') ||
            key.toLowerCase().includes('img') ||
            key.toLowerCase().includes('foto') ||
            key.toLowerCase().includes('photo')
        );
        
        // Obtener URLs de imágenes del campo "imagen" separadas por comas
        let images = [];
        if (imageKeys.length > 0) {
            const imageValue = product[imageKeys[0]];
            if (imageValue) {
                // Separar por comas y limpiar espacios
                const imageUrls = String(imageValue).split(',').map(url => url.trim()).filter(url => url);
                // Convertir URLs de Google Drive y filtrar válidas
                images = imageUrls
                    .map(url => convertGoogleDriveUrl(url))
                    .filter(url => url && isValidImageUrl(url));
            }
        }
        
        // Buscar precio
        const priceKeys = keys.filter(key => 
            key.toLowerCase().includes('precio')
           
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
            key.toLowerCase().includes('existe') && !key.toLowerCase().includes('costo')
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

        // Generar HTML del carrusel si hay imágenes
        let imagesHTML = '';
        if (images.length > 0) {
            if (images.length === 1) {
                // Una sola imagen
                imagesHTML = `<img src="${images[0]}" alt="${product[nameKey] || 'Producto'}" class="product-image" onerror="this.style.display='none'; this.onerror=null;">`;
            } else {
                // Múltiples imágenes - carrusel
                const productId = `product-${Math.random().toString(36).substr(2, 9)}`;
                imagesHTML = `
                    <div class="carousel" id="${productId}">
                        <div class="carousel-inner">
                            ${images.map((img, index) => `
                                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                    <img src="${img}" alt="${product[nameKey] || 'Producto'} ${index + 1}" class="product-image" onerror="this.parentElement.style.display='none'; this.onerror=null;">
                                </div>
                            `).join('')}
                        </div>
                        ${images.length > 1 ? `
                            <button class="carousel-control prev" onclick="event.stopPropagation(); moveCarousel('${productId}', -1)">&#10094;</button>
                            <button class="carousel-control next" onclick="event.stopPropagation(); moveCarousel('${productId}', 1)">&#10095;</button>
                            <div class="carousel-indicators">
                                ${images.map((_, index) => `
                                    <span class="indicator ${index === 0 ? 'active' : ''}" onclick="event.stopPropagation(); goToSlide('${productId}', ${index})"></span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }

        // Generar ID único para el producto y guardar sus datos
        const productCardId = `product-card-${Math.random().toString(36).substr(2, 9)}`;
        productsData[productCardId] = {
            id: productCardId,
            name: product[nameKey] || 'Sin nombre',
            category: category,
            price: formattedPrice,
            priceValue: price, // Valor numérico para cálculos
            description: description,
            images: images,
            allData: product
        };

        return `
            <div class="product-card" onclick="openModal('${productCardId}')">
                ${imagesHTML}
                <span class="product-category">${category}</span>
                <h3 class="product-name">${product[nameKey] || 'Sin nombre'}</h3>
                ${formattedPrice ? `<div class="product-price">${formattedPrice}</div>` : ''}
                ${description ? `<p class="product-description">${description}</p>` : ''}
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${productCardId}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    Agregar al Carrito
                </button>
            </div>
        `;
    }).join('');
}

// Filtrar por categoría
function filterByCategory(category) {
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
    const selectedCategory = categorySelect ? categorySelect.value : 'all';

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

// Funciones globales para el carrusel
window.moveCarousel = function(carouselId, direction) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    // Buscar items e indicadores (puede ser del carrusel normal o del modal)
    const items = carousel.querySelectorAll('.carousel-item, .modal-carousel-item');
    const indicators = carousel.querySelectorAll('.indicator, .modal-indicator');
    let currentIndex = 0;
    
    items.forEach((item, index) => {
        if (item.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;
    
    items[currentIndex].classList.remove('active');
    if (indicators[currentIndex]) indicators[currentIndex].classList.remove('active');
    items[newIndex].classList.add('active');
    if (indicators[newIndex]) indicators[newIndex].classList.add('active');
};

window.goToSlide = function(carouselId, index) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    // Buscar items e indicadores (puede ser del carrusel normal o del modal)
    const items = carousel.querySelectorAll('.carousel-item, .modal-carousel-item');
    const indicators = carousel.querySelectorAll('.indicator, .modal-indicator');
    
    items.forEach(item => item.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));
    
    items[index].classList.add('active');
    if (indicators[index]) indicators[index].classList.add('active');
};

// Función para convertir URL de YouTube a embed
function convertYouTubeUrl(url) {
    if (!url) return null;
    
    // Extraer ID de YouTube de diferentes formatos
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return `https://www.youtube.com/embed/${match[1]}`;
        }
    }
    
    // Si es de Google Drive, intentar convertir a preview
    if (url.includes('drive.google.com')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            // Google Drive no tiene un endpoint de video embed directo, 
            // pero podemos intentar usar el preview
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
    }
    
    // Si no es YouTube, retornar la URL original (puede ser Vimeo u otro)
    return url;
}

// Función para abrir el modal
window.openModal = function(productCardId) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');

    // Obtener datos del producto por ID
    const productData = productsData[productCardId];
    if (!productData) {
        console.error('No se encontraron datos del producto:', productCardId);
        return;
    }

    // Buscar campo de video
    const keys = Object.keys(productData.allData);
    const videoKeys = keys.filter(key =>
        key.toLowerCase().includes('video') ||
        key.toLowerCase().includes('vídeo')
    );
    const videoUrl = videoKeys.length > 0 ? productData.allData[videoKeys[0]] : null;
    const embedVideoUrl = videoUrl ? convertYouTubeUrl(videoUrl) : null;

    // Generar carrusel para el modal
    let modalCarouselHTML = '';
    if (productData.images && productData.images.length > 0) {
        const modalCarouselId = `modal-carousel-${Math.random().toString(36).substr(2, 9)}`;

        if (productData.images.length === 1) {
            modalCarouselHTML = `
                <div class="modal-carousel">
                    <div class="modal-carousel-inner">
                        <div class="modal-carousel-item active">
                            <img src="${productData.images[0]}" alt="${productData.name}">
                        </div>
                    </div>
                </div>
            `;
        } else {
            modalCarouselHTML = `
                <div class="modal-carousel" id="${modalCarouselId}">
                    <div class="modal-carousel-inner">
                        ${productData.images.map((img, index) => `
                            <div class="modal-carousel-item ${index === 0 ? 'active' : ''}">
                                <img src="${img}" alt="${productData.name} ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                    <button class="modal-carousel-control prev" onclick="moveCarousel('${modalCarouselId}', -1)">&#10094;</button>
                    <button class="modal-carousel-control next" onclick="moveCarousel('${modalCarouselId}', 1)">&#10095;</button>
                    <div class="modal-carousel-indicators">
                        ${productData.images.map((_, index) => `
                            <span class="modal-indicator ${index === 0 ? 'active' : ''}" onclick="goToSlide('${modalCarouselId}', ${index})"></span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    // Generar HTML del modal
    modalBody.innerHTML = `
        ${modalCarouselHTML}
        <span class="modal-category">${productData.category}</span>
        <h2 class="modal-title">${productData.name}</h2>
        ${productData.price ? `<div class="modal-price">${productData.price}</div>` : ''}
        ${productData.description ? `<p class="modal-description">${productData.description}</p>` : ''}
        ${embedVideoUrl ? `
            <div class="modal-video">
                <iframe src="${embedVideoUrl}?autoplay=0" allowfullscreen></iframe>
            </div>
        ` : ''}
        ${videoUrl && !embedVideoUrl ? `
            <div class="modal-video-error">
                <p><strong>Video no disponible:</strong> El video requiere permisos adicionales.</p>
                <p><a href="${videoUrl}" target="_blank">Abrir video en nueva pestaña</a></p>
            </div>
        ` : ''}
    `;

    // Mostrar modal después de un pequeño delay para asegurar que el DOM esté listo
    requestAnimationFrame(() => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
};

// Función para cerrar el modal
window.closeModal = function() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

// Cerrar modal al hacer click fuera del contenido
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Cerrar modal con Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Funciones del carrito
window.addToCart = function(productCardId) {
    const product = productsData[productCardId];
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productCardId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productCardId,
            name: product.name,
            price: product.price,
            priceValue: product.priceValue,
            image: product.images[0] || null,
            quantity: 1
        });
    }
    
    updateCartCount();
    showNotification('Producto agregado al carrito');
};

window.removeFromCart = function(productCardId) {
    cart = cart.filter(item => item.id !== productCardId);
    updateCartCount();
    renderCart();
};

window.updateQuantity = function(productCardId, change) {
    const item = cart.find(item => item.id === productCardId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productCardId);
    } else {
        renderCart();
    }
    
    updateCartCount();
};

window.updateCartCount = function() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
};

window.openCart = function() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    renderCart();
};

window.closeCart = function() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

window.clearCart = function() {
    if (cart.length === 0) return;
    
    if (confirm('¿Estás seguro de vaciar el carrito?')) {
        cart = [];
        updateCartCount();
        renderCart();
    }
};

window.renderCart = function() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const sellerNameElement = document.getElementById('sellerName');
    const currentSellerElement = document.getElementById('currentSeller');
    const sellerSelectElement = document.getElementById('sellerSelect');
    const sellerSection = document.querySelector('.cart-seller-section');
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
        cartTotalElement.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    
    cartItemsContainer.innerHTML = cart.map(item => {
        const itemTotal = item.priceValue * item.quantity;
        total += itemTotal;
        
        return `
            <div class="cart-item">
                ${item.image ? `<img src="${item.image}" alt="${item.name}">` : '<div class="cart-item-placeholder"></div>'}
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price}</div>
                </div>
                <div class="cart-item-quantity">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">&times;</button>
            </div>
        `;
    }).join('');
    
    cartTotalElement.textContent = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Eliminar botón de cambiar vendedor si existe
    const existingChangeBtn = sellerSection.querySelector('.change-seller-btn');
    if (existingChangeBtn) {
        existingChangeBtn.remove();
    }
    
    // Mostrar vendedor actual o selector
    if (sellerInfo && sellerInfo.name) {
        sellerNameElement.textContent = sellerInfo.name;
        currentSellerElement.style.display = 'flex';
        sellerSelectElement.style.display = 'none';
        
        // Agregar botón para cambiar vendedor
        const changeBtn = document.createElement('button');
        changeBtn.className = 'change-seller-btn';
        changeBtn.textContent = 'Cambiar vendedor';
        changeBtn.onclick = () => {
            currentSellerElement.style.display = 'none';
            sellerSelectElement.style.display = 'block';
            populateSellerSelect();
        };
        sellerSection.appendChild(changeBtn);
    } else {
        currentSellerElement.style.display = 'none';
        sellerSelectElement.style.display = 'block';
        populateSellerSelect();
    }
};

// Función para llenar el selector de vendedores
function populateSellerSelect() {
    const sellerSelect = document.getElementById('sellerSelect');
    sellerSelect.innerHTML = '<option value="">Selecciona un vendedor</option>';
    
    if (vendedoresData.vendedores && vendedoresData.vendedores.length > 0) {
        vendedoresData.vendedores.forEach(vendedor => {
            const option = document.createElement('option');
            option.value = vendedor.id;
            option.textContent = `${vendedor.nombre} (${vendedor.ciudad || 'Sin ciudad'})`;
            option.dataset.phone = vendedor.telefono;
            option.dataset.email = vendedor.email;
            sellerSelect.appendChild(option);
        });
    }
    
    // Agregar opción de vendedor por defecto
    if (vendedoresData.default) {
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = vendedoresData.default.nombre;
        defaultOption.dataset.phone = vendedoresData.default.telefono;
        sellerSelect.appendChild(defaultOption);
    }
    
    // Event listener para cuando selecciona un vendedor
    sellerSelect.onchange = function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value) {
            sellerInfo = {
                id: selectedOption.value,
                name: selectedOption.textContent,
                phone: selectedOption.dataset.phone,
                email: selectedOption.dataset.email
            };
            renderCart();
        }
    };
}

window.showNotification = function(message) {
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 30px;
        background: #25D366;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
};

// Cargar datos de vendedores del JSON
async function cargarVendedores() {
    try {
        const respuesta = await fetch(vendedoresUrl);
        if (!respuesta.ok) throw new Error("No se encontró el archivo de vendedores");

        vendedoresData = await respuesta.json();
        console.log("Vendedores cargados:", vendedoresData);
    } catch (error) {
        console.error("Error al cargar vendedores:", error);
        // Usar datos por defecto si falla la carga
        vendedoresData = {
            vendedores: [],
            default: {
                nombre: "Ventas Generales",
                telefono: "521234567890"
            }
        };
    }
}

// Detectar información del vendedor de la URL
function detectSellerInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('vendedor') || urlParams.get('seller') || urlParams.get('v');
    const sellerPhone = urlParams.get('telefono') || urlParams.get('phone') || urlParams.get('tel');
    const sellerName = urlParams.get('nombre') || urlParams.get('name') || urlParams.get('n');
    
    // Resetear sellerInfo
    sellerInfo = {};
    
    if (sellerId && vendedoresData.vendedores) {
        // Buscar vendedor en el JSON por ID
        const vendedor = vendedoresData.vendedores.find(v => v.id === sellerId);
        
        if (vendedor) {
            // Vendedor encontrado en el JSON, usar sus datos
            sellerInfo = {
                id: vendedor.id,
                phone: vendedor.telefono,
                name: vendedor.nombre,
                email: vendedor.email,
                ciudad: vendedor.ciudad
            };
            console.log('Vendedor encontrado en JSON:', sellerInfo);
        } else {
            // Vendedor no encontrado en el JSON, no asignar nada
            console.log('Vendedor ID no encontrado en JSON:', sellerId);
        }
    } else if (sellerPhone && vendedoresData.vendedores) {
        // Buscar vendedor por teléfono en el JSON
        const vendedor = vendedoresData.vendedores.find(v => v.telefono === sellerPhone);
        
        if (vendedor) {
            sellerInfo = {
                id: vendedor.id,
                phone: vendedor.telefono,
                name: vendedor.nombre,
                email: vendedor.email,
                ciudad: vendedor.ciudad
            };
            console.log('Vendedor encontrado por teléfono en JSON:', sellerInfo);
        } else {
            console.log('Vendedor teléfono no encontrado en JSON:', sellerPhone);
        }
    }
    
    // Si no se encontró vendedor, no asignar nada (el usuario deberá seleccionar)
    if (!sellerInfo.id) {
        console.log('No se asignó vendedor, el usuario deberá seleccionar uno');
    }
}

// Generar mensaje de WhatsApp
window.sendToWhatsApp = function() {
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    
    // Verificar que haya un vendedor seleccionado
    if (!sellerInfo || !sellerInfo.phone) {
        alert('Por favor, selecciona un vendedor antes de enviar el pedido');
        return;
    }
    
    const phone = sellerInfo.phone;
    
    // Generar mensaje
    let message = `🛒 *Nuevo Pedido*\n\n`;
    message += `👤 *Vendedor:* ${sellerInfo.name || 'No especificado'}\n\n`;
    message += `📦 *Productos:*\n\n`;
    
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.priceValue * item.quantity;
        total += itemTotal;
        message += `${index + 1}. *${item.name}*\n`;
        message += `   Cantidad: ${item.quantity}\n`;
        message += `   Precio unitario: ${item.price}\n`;
        message += `   Subtotal: $${itemTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
    });
    
    message += `💰 *Total: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n\n`;
    message += `📍 Por favor, envía los detalles de entrega y pago.`;
    
    // Codificar mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Opcional: Limpiar carrito después de enviar
    // cart = [];
    // updateCartCount();
    // closeCart();
};

// Inicializar
async function inicializar() {
    await cargarVendedores();
    detectSellerInfo();
    cargarDatos();
}

inicializar();