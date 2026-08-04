/* ========== ХЕЛПЕРЫ ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
const json = async n => { const r = await fetch('data/' + n); if (!r.ok) throw new Error('Не загрузился ' + n); return r.json(); };
const fmtPrice = n => n.toLocaleString('ru-RU') + ' ₽';
const fmtDate = s => new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

/* ========== ШАПКА И ПОДВАЛ ========== */
const NAV = [
  ['index.html','Главная'], ['club.html','Наш клуб'], ['razrabotki.html','Разработки'],
  ['online-games.html','Онлайн игры'], ['author.html','Автор'], ['news.html','Новости'], ['contacts.html','Контакты']
];
const VK_URL = 'https://vk.com/mycrazyenglishgroup';

function renderLayout() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const header = $('#header');
  if (header) header.innerHTML = `
    <div class="container navbar">
      <a class="logo" href="index.html">
        <img src="assets/img/logo.png" alt="Логотип" onerror="this.outerHTML='<span class=logo-emoji>🐱</span>'">
        <span class="logo-text"><strong>Мой удивительный английский</strong><small>My Crazy English</small></span>
      </a>
      <nav><ul class="menu" id="menu">${NAV.map(([h,l]) =>
        `<li><a href="${h}" class="${h === page ? 'active' : ''}">${l}</a></li>`).join('')}</ul></nav>
      <a class="vk-btn" href="${VK_URL}" target="_blank" rel="noopener" aria-label="Мы во ВКонтакте">VK</a>
      <button class="burger" id="burger" aria-label="Меню">☰</button>
    </div>`;
  $('#burger')?.addEventListener('click', () => $('#menu').classList.toggle('open'));

  const footer = $('#footer');
  if (footer) footer.innerHTML = `
    <div class="container footer-grid">
      <div>
        <a class="logo" href="index.html" style="margin-bottom:14px">
          <img src="assets/img/logo.png" alt="" onerror="this.outerHTML='<span class=logo-emoji>🐱</span>'">
          <span class="logo-text"><strong style="color:#fff">Мой удивительный английский</strong><small>My Crazy English</small></span>
        </a>
        <p>Авторские материалы, видеобуки и онлайн-игры для уроков английского языка.</p>
      </div>
      <div><h3>Разделы</h3><ul>${NAV.slice(1).map(([h,l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
      <div><h3>Контакты</h3><ul>
        <li>Волгоград, ул. Историческая, 140б, офис 230</li>
        <li><a href="${VK_URL}" target="_blank" rel="noopener">Группа ВКонтакте</a></li>
        <li><a href="https://vk.com/market-192843316" target="_blank" rel="noopener">Магазин материалов</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom">© 2026 Мой удивительный английский / My Crazy English</div>`;
}

/* ========== АНИМАЦИИ ПОЯВЛЕНИЯ ========== */
function initReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  $$('[data-animate]').forEach(n => io.observe(n));
}

/* ========== КЛИКАБЕЛЬНЫЙ ПРОМО-БЛОК ========== */
function initPromo() {
  const promo = $('.promo-block'); if (!promo) return;
  if (sessionStorage.getItem('promoHidden')) { promo.remove(); return; }
  $('.promo-close', promo)?.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    promo.remove(); sessionStorage.setItem('promoHidden', '1');
  });
}

/* ========== СЛАЙДЕР (баннеры) ========== */
function initSlider(root, speed) {
  const track = $('.slider-track', root), slides = $$('.slide', track), dots = $('.slider-dots', root);
  let i = 0, t;
  slides.forEach((_, n) => {
    const d = el('<button class="dot" aria-label="Слайд ' + (n + 1) + '"></button>');
    d.onclick = () => { go(n); again(); };
    dots.append(d);
  });
  const go = n => {
    i = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${i * 100}%)`;
    $$('.dot', dots).forEach((d, n) => d.classList.toggle('active', n === i));
  };
  const again = () => { clearInterval(t); t = setInterval(() => go(i + 1), speed); };
  $('.prev', root).onclick = () => { go(i - 1); again(); };
  $('.next', root).onclick = () => { go(i + 1); again(); };
  root.onmouseenter = () => clearInterval(t);
  root.onmouseleave = again;
  go(0); again();
}

async function initBanners() {
  const root = $('#banners'); if (!root) return;
  const banners = (await json('banners.json')).filter(b => b.active);
  root.innerHTML = `
    <div class="slider-track">${banners.map(b => `
      <a class="slide" href="${b.link}" ${b.link.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}
         style="background-image:url('${b.image}')">
        <div class="slide-content container">
          <h2>${esc(b.title)}</h2><p>${esc(b.subtitle)}</p>
          <span class="btn btn-light">${esc(b.linkText)} →</span>
        </div>
      </a>`).join('')}</div>
    <button class="slider-arrow prev" aria-label="Назад">‹</button>
    <button class="slider-arrow next" aria-label="Вперёд">›</button>
    <div class="slider-dots"></div>`;
  initSlider(root, +root.dataset.speed || 6000);
}

/* ========== КАРУСЕЛЬ-СКРОЛЛЕР ========== */
function initCarousel(root) {
  const tr = $('.scroller', root); if (!tr) return;
  $('.car-prev', root)?.addEventListener('click', () => tr.scrollBy({ left: -tr.clientWidth * .85, behavior: 'smooth' }));
  $('.car-next', root)?.addEventListener('click', () => tr.scrollBy({ left: tr.clientWidth * .85, behavior: 'smooth' }));
}

/* ========== КАРТОЧКИ ========== */
const BADGE_CLS = { 'Хит': 'badge-hit', 'Новинка': 'badge-new', 'Скидка': 'badge-sale' };
const badges = list => (list || []).map(b =>
  `<span class="badge ${BADGE_CLS[b] || 'badge-default'}">${esc(b)}</span>`).join('');

function productCard(p, clickable = false) {
  const c = el(`<article class="card" data-id="${p.id}">
    <div class="card-media hover-zoom">${badges(p.badges)}<img loading="lazy" src="${p.images[0]}" alt="${esc(p.title)}"></div>
    <div class="card-body">
      <h3 class="card-title">${esc(p.title)}</h3>
      <p class="card-text">${esc(p.short)}</p>
      <div class="card-foot">
        <span class="price">${p.oldPrice ? `<s>${fmtPrice(p.oldPrice)}</s>` : ''}${fmtPrice(p.price)}</span>
        <button class="btn btn-primary btn-sm">Подробнее</button>
      </div>
    </div></article>`);
  if (clickable) c.style.cursor = 'pointer';
  return c;
}

function newsCard(n) {
  return el(`<a class="card" href="news.html?id=${n.id}" style="text-decoration:none;color:inherit">
    <div class="card-media hover-zoom"><img loading="lazy" src="${n.cover}" alt=""></div>
    <div class="card-body">
      <div class="meta">${fmtDate(n.date)} · ${esc(n.author)}</div>
      <h3 class="card-title">${esc(n.title)}</h3>
      <p class="card-text">${esc(n.preview)}</p>
      <span class="link-more">Подробнее →</span>
    </div></a>`);
}

function reviewCard(r) {
  return el(`<figure class="review-card">
    <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
    <blockquote>«${esc(r.text)}»</blockquote>
    <figcaption><strong>${esc(r.name)}</strong><span>${esc(r.role)}</span></figcaption>
  </figure>`);
}

/* ========== ГЛАВНАЯ ========== */
async function initHome() {
  await initBanners();
  const [news, products, reviews] = await Promise.all([json('news.json'), json('products.json'), json('reviews.json')]);

  const np = $('#news-preview');
  if (np) np.append(...news.filter(n => n.published)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(newsCard));

  const pp = $('#products-preview .scroller');
  if (pp) {
    pp.append(...products.filter(p => p.published)
      .sort((a, b) => (b.featured - a.featured) || (b.popularity - a.popularity)).slice(0, 6)
      .map(p => {
        const c = productCard(p);
        c.querySelector('.btn').outerHTML = `<a class="btn btn-primary btn-sm" href="razrabotki.html#product-${p.id}">Подробнее</a>`;
        return c;
      }));
    initCarousel($('#products-preview'));
  }

  const rp = $('#reviews .scroller');
  if (rp) { rp.append(...reviews.map(reviewCard)); initCarousel($('#reviews')); }
}

/* ========== КАТАЛОГ ========== */
let CATS = [], PRODS = [];
const state = { q: '', cats: new Set(), badges: new Set(), sort: 'new', page: 1 };
const PER = 8;

async function initCatalog() {
  CATS = await json('categories.json');
  PRODS = (await json('products.json')).filter(p => p.published);

  const catList = $('#cat-list');
  catList.innerHTML = CATS.map(c => {
    const n = PRODS.filter(p => p.category === c.id).length;
    return `<label class="cat-item"><input type="checkbox" value="${c.id}"><span>${esc(c.title)}</span><em>${n}</em></label>`;
  }).join('');
  catList.addEventListener('change', e => {
    e.target.checked ? state.cats.add(e.target.value) : state.cats.delete(e.target.value);
    state.page = 1; render();
  });

  /* Быстрый фильтр по бейджам */
  const bf = $('#badge-filter');
  bf.innerHTML = ['Хит', 'Новинка', 'Скидка'].map(b => `<button class="chip-btn" data-b="${b}">${b}</button>`).join('');
  bf.addEventListener('click', e => {
    const btn = e.target.closest('.chip-btn'); if (!btn) return;
    state.badges.has(btn.dataset.b) ? state.badges.delete(btn.dataset.b) : state.badges.add(btn.dataset.b);
    btn.classList.toggle('active');
    state.page = 1; render();
  });

  $('#search').addEventListener('input', e => { state.q = e.target.value; state.page = 1; render(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; render(); });
  $('#reset').addEventListener('click', () => {
    state.q = ''; state.cats.clear(); state.badges.clear(); state.sort = 'new'; state.page = 1;
    $('#search').value = ''; $('#sort').value = 'new';
    $$('#cat-list input').forEach(i => i.checked = false);
    $$('#badge-filter .chip-btn').forEach(b => b.classList.remove('active'));
    render();
  });

  $('.modal-close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  render();
  const m = location.hash.match(/product-(\d+)/);
  if (m) openModal(PRODS.find(p => p.id === +m[1]));
}

function filtered() {
  let list = PRODS.filter(p => {
    const q = state.q.toLowerCase();
    const okQ = !q || [p.title, p.short, p.full, (p.tags || []).join(' ')].join(' ').toLowerCase().includes(q);
    const okC = !state.cats.size || state.cats.has(p.category);
    const okB = !state.badges.size || [...state.badges].some(b => (p.badges || []).includes(b));
    return okQ && okC && okB;
  });
  if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (state.sort === 'pop') list.sort((a, b) => b.popularity - a.popularity);
  else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

function render() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PER));
  state.page = Math.min(state.page, pages);
  $('#count').textContent = `Найдено материалов: ${list.length}`;
  const grid = $('#grid');
  grid.replaceChildren(...list.slice((state.page - 1) * PER, state.page * PER).map(p => {
    const c = productCard(p, true);
    c.addEventListener('click', () => openModal(p));
    return c;
  }));
  const pg = $('#pagination'); pg.innerHTML = '';
  for (let i = 1; i <= pages; i++) {
    const b = el(`<button class="${i === state.page ? 'current' : ''}">${i}</button>`);
    b.onclick = () => { state.page = i; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    pg.append(b);
  }
}

/* ========== КАРТОЧКА ТОВАРА: фото и видео в одном окне ========== */
function openModal(p) {
  if (!p) return;
  const cat = CATS.find(c => c.id === p.category);
  $('#m-title').textContent = p.title;
  $('#m-cat').textContent = cat ? cat.title : '';
  $('#m-badges').innerHTML = (p.badges || []).length ? badges(p.badges) : '';
  $('#m-desc').textContent = p.full;
  $('#m-meta').innerHTML = `<span class="chip">${esc(p.level || '')}</span><span class="chip">${esc(p.age || '')}</span><span class="chip">${esc(p.format || '')}</span>`;
  $('#m-price').innerHTML = `${p.oldPrice ? `<s>${fmtPrice(p.oldPrice)}</s> ` : ''}${fmtPrice(p.price)}`;
  $('#m-buy').href = p.buyUrl || 'https://vk.com/market-192843316';

  /* Галерея: все фото + видео в одном окне */
  const media = (p.images || []).map(src => ({ type: 'img', src }));
  if (p.video) media.push({ type: 'video', src: p.video });

  const imgEl = $('#m-img'), vidEl = $('#m-video'), th = $('#m-thumbs');
  th.innerHTML = '';

  const show = i => {
    const m = media[i];
    if (m.type === 'img') {
      imgEl.hidden = false; imgEl.src = m.src;
      vidEl.hidden = true; vidEl.src = '';          // останавливаем видео
    } else {
      imgEl.hidden = true;
      vidEl.hidden = false; vidEl.src = m.src;      // видео в том же окне
    }
    $$('.thumb', th).forEach((t, n) => t.classList.toggle('active', n === i));
  };

  media.forEach((m, i) => {
    const t = el(m.type === 'img'
      ? `<button class="thumb" aria-label="Фото ${i + 1}"><img src="${m.src}" alt=""></button>`
      : `<button class="thumb thumb-video" aria-label="Видео">▶</button>`);
    t.onclick = () => show(i);
    th.append(t);
  });

  if (media.length) show(0);
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
  const vid = $('#m-video'); if (vid) vid.src = '';
}

/* ========== НОВОСТИ ========== */
async function initNews() {
  const news = (await json('news.json')).filter(n => n.published).sort((a, b) => b.date.localeCompare(a.date));
  const id = new URLSearchParams(location.search).get('id');
  const wrap = $('#news-wrap');
  if (!id) {
    wrap.innerHTML = `<div class="grid-3"></div>`;
    $('.grid-3', wrap).append(...news.map(newsCard));
    return;
  }
  const n = news.find(x => String(x.id) === id);
  if (!n) { wrap.innerHTML = '<p>Новость не найдена.</p>'; return; }
  wrap.innerHTML = `<article class="article" data-animate="fade">
    <a href="news.html">← Все новости</a>
    <div class="meta" style="margin-top:14px">${fmtDate(n.date)} · ${esc(n.author)}</div>
    <h1>${esc(n.title)}</h1>
    ${(n.blocks || []).map(b => {
      if (b.type === 'text') return `<p style="white-space:pre-line">${esc(b.content)}</p>`;
      if (b.type === 'image') return `<figure><img src="${b.src}" alt=""><figcaption>${esc(b.caption || '')}</figcaption></figure>`;
      if (b.type === 'quote') return `<div class="quote-block">«${esc(b.content)}»<cite>— ${esc(b.author || '')}</cite></div>`;
      if (b.type === 'video') return `<iframe src="${b.url}" style="width:100%;aspect-ratio:16/9;border:none;border-radius:16px" allowfullscreen></iframe>`;
      return '';
    }).join('')}
  </article>`;
}

/* ========== ИГРЫ ========== */
async function initGames() {
  const games = (await json('games.json')).filter(g => g.published);
  $('#games-grid').append(...games.map(g => el(`
    <article class="card game-card">
      <div class="card-media hover-zoom">${badges(g.badges)}<img src="${g.image}" alt="${esc(g.title)}"></div>
      <div class="card-body">
        <h3 class="card-title">${esc(g.title)}</h3>
        <p class="card-text" style="-webkit-line-clamp:4">${esc(g.description)}</p>
        ${g.url
          ? `<a class="btn btn-primary" href="${g.url}" target="_blank" rel="noopener">Играть ▶</a>`
          : `<button class="btn btn-ghost" disabled>Скоро</button>`}
      </div>
    </article>`)));
}

/* ========== СТАРТ ========== */
document.addEventListener('DOMContentLoaded', () => {
  renderLayout();
  initReveal();
  initPromo();
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  if (page === 'catalog') initCatalog();
  if (page === 'news') initNews();
  if (page === 'games') initGames();
});
