/* ========== АДМИНКА MCE ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };

const FILES = ['products', 'news', 'reviews', 'banners'];
let DB = { products: [], news: [], reviews: [], banners: [] };
let CATS = [];
const dlg = $('#editor');

/* ========== ЗАГРУЗКА / ЧЕРНОВИК ========== */
async function loadSite() {
  for (const f of FILES) {
    try { DB[f] = await (await fetch('data/' + f + '.json')).json(); } catch (e) { DB[f] = []; }
  }
  try { CATS = await (await fetch('data/categories.json')).json(); } catch (e) { CATS = []; }
}
function saveDraft() {
  try { localStorage.setItem('mceAdminDraft', JSON.stringify(DB)); }
  catch (e) { showNotice('⚠️ Черновик не влез в память браузера: слишком много встроенных фото. Используй пути к uploads/ вместо drag&drop.'); }
}
function loadDraft() {
  const d = localStorage.getItem('mceAdminDraft');
  if (!d) return false;
  try { const p = JSON.parse(d); if (p && p.products) { DB = p; return true; } } catch (e) {}
  return false;
}
function showNotice(text, withReset = true) {
  const n = $('#notice');
  n.hidden = false;
  n.innerHTML = `<span>${esc(text)}</span>` + (withReset
    ? `<button class="btn btn-ghost btn-sm" id="reset-draft">Сбросить черновик</button>` : '');
  $('#reset-draft')?.addEventListener('click', () => {
    localStorage.removeItem('mceAdminDraft'); location.reload();
  });
}

/* ========== ВКЛАДКИ ========== */
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.toggle('active', x === t));
  $$('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + t.dataset.tab));
});

/* ========== СПИСКИ ========== */
const nextId = k => DB[k].reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;

function renderLists() {
  fillList('products', p => p.title, p => `${p.price} ₽ · ${p.published ? 'опубликован' : 'скрыт'}`, editProduct);
  fillList('news', n => n.title, n => `${n.date} · ${n.published ? 'опубликована' : 'скрыта'}`, editNews);
  fillList('reviews', r => r.name, r => '★'.repeat(r.rating), editReview);
  fillList('banners', b => b.title, b => b.active ? 'активный' : 'выключен', editBanner);
}
function fillList(key, titleOf, metaOf, editFn) {
  const wrap = $('#list-' + key); wrap.innerHTML = '';
  if (!DB[key].length) { wrap.innerHTML = '<p class="empty">Пока пусто. Нажми «＋ Добавить».</p>'; return; }
  DB[key].forEach((item, i) => {
    const r = el(`<div class="admin-row">
      <div><strong>${esc(titleOf(item))}</strong><small>${esc(metaOf(item))}</small></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm">✎ Изменить</button>
        <button class="btn btn-danger btn-sm">🗑</button>
      </div></div>`);
    const [eb, db] = $$('button', r);
    eb.onclick = () => editFn(item, i);
    db.onclick = () => { if (confirm('Удалить «' + titleOf(item) + '»?')) { DB[key].splice(i, 1); saveDraft(); renderLists(); } };
    wrap.append(r);
  });
}

/* ========== ПОЛЯ ФОРМ ========== */
const fText = (id, label, val = '', ph = '') => `<label class="f"><span>${label}</span><input id="${id}" value="${esc(val)}" placeholder="${esc(ph)}"></label>`;
const fArea = (id, label, val = '', rows = 4) => `<label class="f"><span>${label}</span><textarea id="${id}" rows="${rows}">${esc(val)}</textarea></label>`;
const fCheck = (id, label, val) => `<label class="f check"><input type="checkbox" id="${id}" ${val ? 'checked' : ''}><span>${label}</span></label>`;
const fSelect = (id, label, options, val) => `<label class="f"><span>${label}</span><select id="${id}">${options.map(o => `<option value="${esc(o.id)}" ${o.id === val ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></label>`;

function imgField(id, label, val = '') {
  return `<div class="f"><span>${label}</span>
    <div class="dropzone" id="${id}-dz">${val ? `<img src="${esc(val)}">` : '📷 Перетащи картинку или кликни'}</div>
    <input type="file" id="${id}-file" accept="image/*" hidden>
    <input id="${id}" value="${esc(val)}" placeholder="или путь: uploads/products/photo.jpg" style="margin-top:6px">
  </div>`;
}
function bindImg(id) {
  const dz = $('#' + id + '-dz'), inp = $('#' + id), file = $('#' + id + '-file');
  const paint = v => { dz.innerHTML = v ? `<img src="${v}">` : '📷 Перетащи картинку или кликни'; };
  dz.onclick = () => file.click();
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
  dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = async e => { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files[0]) await setImg(id, e.dataTransfer.files[0]); };
  file.onchange = e => { if (e.target.files[0]) setImg(id, e.target.files[0]); };
  inp.oninput = () => paint(inp.value);
}
function setImg(id, f) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const scale = Math.min(1, 900 / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      $('#' + id).value = c.toDataURL('image/jpeg', .82);
      $('#' + id).oninput();
      res();
    };
    img.onerror = rej; img.src = url;
  });
}

/* ========== РЕДАКТОР ========== */
function openEditor(html, onSave) {
  $('#editor-body').innerHTML = html;
  $('#editor-cancel').onclick = () => dlg.close();
  $('#editor-save').onclick = onSave;
  dlg.showModal();
}
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

/* ---------- ТОВАР ---------- */
function editProduct(item) {
  const p = item ? { ...item } : {
    id: nextId('products'), title: '', short: '', full: '', category: CATS[0]?.id || '',
    tags: [], price: 0, oldPrice: null, badges: [], images: [], video: '',
    buyUrl: 'https://vk.com/market-192843316', level: '', age: '', format: '',
    published: true, featured: false, popularity: 50,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  openEditor(`
    <h3>${item ? '✎ Товар' : '＋ Новый товар'}</h3>
    ${fText('p-title', 'Название *', p.title)}
    ${fArea('p-short', 'Краткое описание (1–2 строки для карточки)', p.short, 2)}
    ${fArea('p-full', 'Полное описание (Enter = новая строка)', p.full, 8)}
    ${fSelect('p-cat', 'Категория', CATS, p.category)}
    ${fText('p-tags', 'Теги через запятую', (p.tags || []).join(', '))}
    <div class="f-row">
      ${fText('p-price', 'Цена, ₽', p.price)}
      ${fText('p-old', 'Старая цена (пусто = нет)', p.oldPrice || '')}
      ${fText('p-pop', 'Популярность 0–100', p.popularity)}
    </div>
    <div class="f"><span>Бейджи</span>
      <div class="check-row">${['Хит','Новинка','Скидка'].map(b =>
        `<label class="check"><input type="checkbox" data-badge="${b}" ${(p.badges||[]).includes(b) ? 'checked' : ''}><span>${b}</span></label>`).join('')}
      </div>
    </div>
    ${imgField('p-img1', 'Главное фото (обложка карточки)', p.images[0] || '')}
    ${imgField('p-img2', 'Доп. фото (галерея в карточке)', p.images[1] || '')}
    ${fText('p-video', 'Ссылка на видео (VK embed, пусто = нет)', p.video)}
    ${fText('p-buy', 'Ссылка «Приобрести на VK»', p.buyUrl)}
    <div class="f-row">
      ${fText('p-level', 'Уровень', p.level)}
      ${fText('p-age', 'Возраст', p.age)}
      ${fText('p-format', 'Формат', p.format)}
    </div>
    ${fCheck('p-pub', 'Опубликован на сайте', p.published)}
    ${fCheck('p-feat', 'Показывать на главной (featured)', p.featured)}
  `, () => {
    const title = $('#p-title').value.trim();
    if (!title) { alert('Укажи название'); return; }
    const images = [$('#p-img1').value.trim(), $('#p-img2').value.trim()].filter(Boolean);
    const np = { ...p,
      title,
      short: $('#p-short').value.trim(),
      full: $('#p-full').value,
      category: $('#p-cat').value,
      tags: $('#p-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      price: +$('#p-price').value || 0,
      oldPrice: +$('#p-old').value || null,
      popularity: +$('#p-pop').value || 50,
      badges: $$('[data-badge]:checked').map(c => c.dataset.badge),
      images: images.length ? images : ['https://placehold.co/600x400/7c3aed/ffffff?text=Photo'],
      video: $('#p-video').value.trim(),
      buyUrl: $('#p-buy').value.trim() || 'https://vk.com/market-192843316',
      level: $('#p-level').value.trim(), age: $('#p-age').value.trim(), format: $('#p-format').value.trim(),
      published: $('#p-pub').checked, featured: $('#p-feat').checked
    };
    item ? Object.assign(item, np) : DB.products.unshift(np);
    saveDraft(); renderLists(); dlg.close();
  });
  bindImg('p-img1'); bindImg('p-img2');
}

/* ---------- НОВОСТЬ ---------- */
const BLOCK_NAMES = { text: '📝 Текст', image: '🖼 Фото', quote: '💬 Цитата', video: '🎬 Видео' };
function blockRow(type, b = {}) {
  return el(`<div class="block-row" data-type="${type}">
    <div class="block-head"><strong>${BLOCK_NAMES[type]}</strong>
      <span class="block-ctrl">
        <button type="button" data-mv="-1" title="Выше">↑</button>
        <button type="button" data-mv="1" title="Ниже">↓</button>
        <button type="button" data-rm="1" title="Удалить">✕</button>
      </span>
    </div>
    ${type === 'image'
      ? `<input class="b-src" value="${esc(b.src || '')}" placeholder="Путь или ссылка на фото">
         <input class="b-cap" value="${esc(b.caption || '')}" placeholder="Подпись (необязательно)">`
      : type === 'video'
      ? `<input class="b-src" value="${esc(b.url || '')}" placeholder="Ссылка на видео (VK embed)">`
      : `<textarea class="b-content" rows="3" placeholder="Текст…">${esc(b.content || '')}</textarea>
         ${type === 'quote' ? `<input class="b-author" value="${esc(b.author || '')}" placeholder="Автор цитаты">` : ''}`}
  </div>`);
}
function editNews(item) {
  const n = item ? JSON.parse(JSON.stringify(item)) : {
    id: nextId('news'), title: '', date: new Date().toISOString().slice(0, 10),
    author: 'Олеся', cover: '', preview: '', published: true, blocks: []
  };
  openEditor(`
    <h3>${item ? '✎ Новость' : '＋ Новая новость'}</h3>
    ${fText('n-title', 'Заголовок *', n.title)}
    <div class="f-row" style="grid-template-columns:1fr 1fr">
      ${fText('n-date', 'Дата (ГГГГ-ММ-ДД)', n.date)}
      ${fText('n-author', 'Автор', n.author)}
    </div>
    ${imgField('n-cover', 'Обложка новости', n.cover)}
    ${fArea('n-preview', 'Краткий текст для карточки', n.preview, 2)}
    <div class="f"><span>Блоки статьи</span>
      <div id="blocks-wrap"></div>
      <div class="check-row" style="margin-top:8px">
        ${Object.entries(BLOCK_NAMES).map(([t, l]) => `<button type="button" class="btn btn-ghost btn-sm" data-add="${t}">${l}</button>`).join('')}
      </div>
    </div>
    ${fCheck('n-pub', 'Опубликована', n.published)}
  `, () => {
    const title = $('#n-title').value.trim();
    if (!title) { alert('Укажи заголовок'); return; }
    const blocks = $$('#blocks-wrap .block-row').map(r => {
      const t = r.dataset.type;
      if (t === 'image') return { type: t, src: $('.b-src', r).value.trim(), caption: $('.b-cap', r).value.trim() };
      if (t === 'video') return { type: t, url: $('.b-src', r).value.trim() };
      if (t === 'quote') return { type: t, content: $('.b-content', r).value, author: $('.b-author', r).value.trim() };
      return { type: t, content: $('.b-content', r).value };
    }).filter(b => b.content || b.src || b.url);
    const nn = { ...n, title, date: $('#n-date').value, author: $('#n-author').value.trim(),
      cover: $('#n-cover').value.trim(), preview: $('#n-preview').value.trim(),
      published: $('#n-pub').checked, blocks };
    item ? Object.assign(item, nn) : DB.news.unshift(nn);
    saveDraft(); renderLists(); dlg.close();
  });
  bindImg('n-cover');
  const wrap = $('#blocks-wrap');
  n.blocks.forEach(b => wrap.append(blockRow(b.type, b)));
  $$('[data-add]').forEach(b => b.onclick = () => wrap.append(blockRow(b.dataset.add)));
  wrap.addEventListener('click', e => {
    const row = e.target.closest('.block-row'); if (!row) return;
    if (e.target.dataset.mv) {
      const d = +e.target.dataset.mv;
      const sib = d < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (sib) d < 0 ? wrap.insertBefore(row, sib) : wrap.insertBefore(sib, row);
    }
    if (e.target.dataset.rm) row.remove();
  });
}

/* ---------- ОТЗЫВ ---------- */
function editReview(item) {
  const r = item ? { ...item } : { id: nextId('reviews'), name: '', role: '', rating: 5, text: '' };
  openEditor(`
    <h3>${item ? '✎ Отзыв' : '＋ Новый отзыв'}</h3>
    <div class="f-row" style="grid-template-columns:1fr 1fr">
      ${fText('r-name', 'Имя *', r.name)}
      ${fText('r-role', 'Кто (мама ученицы, репетитор…)', r.role)}
    </div>
    <label class="f"><span>Оценка</span>
      <select id="r-rating">${[5,4,3,2,1].map(x => `<option ${x === r.rating ? 'selected' : ''}>${x}</option>`).join('')}</select>
    </label>
    ${fArea('r-text', 'Текст отзыва', r.text, 4)}
  `, () => {
    const name = $('#r-name').value.trim();
    if (!name || !$('#r-text').value.trim()) { alert('Имя и текст обязательны'); return; }
    const nr = { ...r, name, role: $('#r-role').value.trim(), rating: +$('#r-rating').value, text: $('#r-text').value.trim() };
    item ? Object.assign(item, nr) : DB.reviews.unshift(nr);
    saveDraft(); renderLists(); dlg.close();
  });
}

/* ---------- БАННЕР ---------- */
function editBanner(item) {
  const b = item ? { ...item } : { id: nextId('banners'), title: '', subtitle: '', image: '', link: 'razrabotki.html', linkText: 'Подробнее', active: true };
  openEditor(`
    <h3>${item ? '✎ Баннер' : '＋ Новый баннер'}</h3>
    ${fText('b-title', 'Заголовок *', b.title)}
    ${fText('b-sub', 'Подзаголовок', b.subtitle)}
    ${imgField('b-img', 'Картинка баннера (1600×600)', b.image)}
    <div class="f-row" style="grid-template-columns:2fr 1fr">
      ${fText('b-link', 'Куда ведёт клик', b.link)}
      ${fText('b-cta', 'Текст кнопки', b.linkText)}
    </div>
    ${fCheck('b-active', 'Показывать на сайте', b.active)}
  `, () => {
    const title = $('#b-title').value.trim();
    if (!title) { alert('Укажи заголовок'); return; }
    const nb = { ...b, title, subtitle: $('#b-sub').value.trim(), image: $('#b-img').value.trim(),
      link: $('#b-link').value.trim(), linkText: $('#b-cta').value.trim(), active: $('#b-active').checked };
    item ? Object.assign(item, nb) : DB.banners.push(nb);
    saveDraft(); renderLists(); dlg.close();
  });
  bindImg('b-img');
}

/* ========== ЭКСПОРТ ========== */
function download(name) {
  const blob = new Blob([JSON.stringify(DB[name], null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
FILES.forEach(f => $('#dl-' + f)?.addEventListener('click', () => download(f)));
$('#export-all').addEventListener('click', () => FILES.forEach((f, i) => setTimeout(() => download(f), i * 400)));

/* ========== КНОПКИ ДОБАВЛЕНИЯ ========== */
$('#add-product').onclick = () => editProduct(null);
$('#add-news').onclick = () => editNews(null);
$('#add-review').onclick = () => editReview(null);
$('#add-banner').onclick = () => editBanner(null);

/* ========== СТАРТ ========== */
(async () => {
  await loadSite();
  if (loadDraft()) showNotice('📝 Восстановлен несохранённый черновик из этого браузера.');
  renderLists();
})();
