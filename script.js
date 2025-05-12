document.addEventListener('DOMContentLoaded', () => {
    // 1. Мобильное меню (работает на всех страницах)
    const burger = document.getElementById('burger');
    const menu = document.getElementById('menu');
    if (burger && menu) {
        burger.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }

    // 2. Слайдер (работает только на index.html)
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    const dotsLeft = document.getElementById('dots-left');
    const dotsRight = document.getElementById('dots-right');

    if (slides.length > 0) {
        let currentIndex = 0;
        const intervalTime = 3000;
        let sliderInterval;

        function createDots() {
            for (let i = 0; i < slides.length; i++) {
                const dotLeft = document.createElement('span');
                const dotRight = document.createElement('span');
                dotLeft.className = 'dot';
                dotRight.className = 'dot';
                dotLeft.setAttribute('data-slide', i);
                dotRight.setAttribute('data-slide', i);
                if (i === 0) {
                    dotLeft.classList.add('active');
                    dotRight.classList.add('active');
                }
                if (dotsLeft) dotsLeft.appendChild(dotLeft);
                if (dotsRight) dotsRight.appendChild(dotRight);
            }
            document.querySelectorAll('.dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    const index = parseInt(dot.getAttribute('data-slide'));
                    showSlide(index);
                    resetInterval();
                });
            });
        }

        function showSlide(index) {
            const containerWidth = slides[0].offsetWidth;
            const offset = -index * containerWidth;
            document.getElementById('slides-container').style.transform = `translateX(${offset}px)`;
            document.querySelectorAll('.dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
            currentIndex = index;
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % slides.length;
            showSlide(currentIndex);
        }

        function prevSlide() {
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            showSlide(currentIndex);
        }

        function startInterval() {
            sliderInterval = setInterval(nextSlide, intervalTime);
        }

        function resetInterval() {
            clearInterval(sliderInterval);
            startInterval();
        }

        window.addEventListener('resize', () => {
            showSlide(currentIndex);
        });

        createDots();
        showSlide(currentIndex);
        startInterval();
    }

    // 3. Каталог товаров (работает только на catalog.html)
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        let currentPage = 1;
        const itemsPerPage = 12;
        let filteredProducts = [];
        let allProducts = [];

        async function loadProducts() {
            try {
                const response = await fetch('data/products.json');
                allProducts = await response.json();
                filteredProducts = [...allProducts];
                renderCategories(allProducts);
                renderProducts(filteredProducts, currentPage);
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
            }
        }

        function renderCategories(products) {
            const categories = [...new Set(products.map(p => p.category))];
            const container = document.getElementById('category-filters');
            if (!container) return;
            categories.forEach(cat => {
                const li = document.createElement('li');
                li.innerHTML = `<label><input type="checkbox" class="category-filter" value="${cat}"> ${cat}</label>`;
                container.appendChild(li);
            });
            document.querySelectorAll('.category-filter').forEach(cb => {
                cb.addEventListener('change', applyFilters);
            });
        }

        function applyFilters() {
            let filtered = [...allProducts];

            const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked')).map(cb => cb.value);
            if (selectedCategories.length > 0) {
                filtered = filtered.filter(p => selectedCategories.includes(p.category));
            }

            // ❌ Убрано: фильтр по цене

            // ✅ Изменено: фильтр по акции
            if (document.getElementById('on-sale')?.checked) {
                filtered = filtered.filter(p => p.onSale === true);
            }

            const searchQuery = document.getElementById('search-input')?.value.toLowerCase();
            if (searchQuery) {
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(searchQuery) ||
                    p.description.toLowerCase().includes(searchQuery)
                );
            }

            const sortSelect = document.getElementById('sort-select');
            const sortValue = sortSelect?.value;
            if (sortValue === 'priceAsc') {
                filtered.sort((a, b) => a.price - b.price);
            } else if (sortValue === 'priceDesc') {
                filtered.sort((a, b) => b.price - a.price);
            } else if (sortValue === 'popularity') {
                filtered.sort((a, b) => b.description.length - a.description.length);
            }

            renderProducts(filtered, 1);
        }

        function renderProducts(products, page) {
            const container = document.getElementById('product-grid');
            if (!container) return;
            container.innerHTML = '';
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginated = products.slice(start, end);

            paginated.forEach(product => {
                const card = document.createElement('div');
                card.className = 'card';

                // ✅ Добавлен бейдж "Акция" и цена по акции
                card.innerHTML = `
                    <div class="card-img-wrapper">
                        <img src="${product.images[0]}" alt="${product.name}">
                        ${product.onSale ? '<div class="badge-sale">Акция</div>' : ''}
                    </div>
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                    <div class="price">
                        ${product.onSale ? `<span>${product.price} ₽</span><br>` : ''}
                        <strong>${product.onSale ? product.salePrice : product.price} ₽</strong>
                    </div>
                `;
                card.addEventListener('click', () => openModal(product));
                container.appendChild(card);
            });

            updatePagination(products, page);
        }

        function updatePagination(products, currentPage) {
            const totalPages = Math.ceil(products.length / itemsPerPage);
            const pageInfo = document.getElementById('page-info');
            const prevBtn = document.getElementById('prev-page');
            const nextBtn = document.getElementById('next-page');

            if (pageInfo) pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
            if (prevBtn) prevBtn.disabled = currentPage === 1;
            if (nextBtn) nextBtn.disabled = currentPage === totalPages;

            if (prevBtn) {
                prevBtn.onclick = () => {
                    if (currentPage > 1) renderProducts(products, currentPage - 1);
                };
            }
            if (nextBtn) {
                nextBtn.onclick = () => {
                    if (currentPage < totalPages) renderProducts(products, currentPage + 1);
                };
            }
        }

        function openModal(product) {
            const modal = document.getElementById('product-modal');
            if (!modal) return;
            modal.style.display = 'block';

            document.getElementById('modal-title').textContent = product.name;
            document.getElementById('modal-description').textContent = product.description;
            document.getElementById('modal-description2').textContent = product.description2 || '';
            document.getElementById('modal-price').innerHTML = `
                ${product.onSale ? `<span style="text-decoration: line-through; color: #999;">${product.price} ₽</span><br>` : ''}
                <strong>${product.onSale ? product.salePrice : product.price} ₽</strong>
            `;

            const mainImage = document.getElementById('modal-image');
            mainImage.src = product.images[0];

            const thumbnails = document.getElementById('gallery-thumbnails');
            thumbnails.innerHTML = '';
            product.images.forEach((img, index) => {
                const imgEl = document.createElement('img');
                imgEl.src = img;
                imgEl.alt = `Превью ${index + 1}`;
                imgEl.className = index === 0 ? 'active' : '';
                imgEl.addEventListener('click', () => {
                    document.querySelectorAll('.gallery-thumbnails img').forEach(th => th.classList.remove('active'));
                    imgEl.classList.add('active');
                    mainImage.src = img;
                });
                thumbnails.appendChild(imgEl);
            });

            const video = document.getElementById('modal-video');
            video.src = product.video || '';

            document.querySelector('.close-btn').onclick = () => {
                modal.style.display = 'none';
                video.src = '';
            };
        }

        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                document.querySelectorAll('.category-filter').forEach(cb => cb.checked = false);
                const inStock = document.getElementById('on-sale');
                if (inStock) inStock.checked = false;
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = '';
                const sortSelect = document.getElementById('sort-select');
                if (sortSelect) sortSelect.value = 'priceAsc';
                applyFilters();
            });
        }

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', applyFilters);
        }

        loadProducts();
    }

    // Анимации появления элементов
    function initAnimation() {
        const animateElements = document.querySelectorAll('.animate');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting || entry.intersectionRatio > 0.1) {
                    entry.target.classList.add('show');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        });

        animateElements.forEach(el => {
            observer.observe(el);
        });
    }

    if (document.body.classList.contains('enable-animation')) {
        window.addEventListener('load', () => {
            setTimeout(initAnimation, 100);
        });
    }
});