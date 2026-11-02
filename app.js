(() => {
  'use strict';

  const { recipes, photos, translations = {} } = JSON.parse(document.getElementById('cookbook-data').textContent);
  const app = document.getElementById('app');
  const storage = (() => { try { return window.localStorage; } catch { return null; } })();
  const supportedLocales = ['zh', 'en', 'nl'];
  const isLocale = value => supportedLocales.includes(value);
  const savedLocale = storage?.getItem('cooking-locale');
  const requestedLocale = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(location.search || '').get('lang') : null;
  const browserLanguage = typeof navigator !== 'undefined' ? String(navigator.language || '').toLowerCase() : '';
  const detectedLocale = browserLanguage.startsWith('nl') ? 'nl' : browserLanguage.startsWith('en') ? 'en' : 'zh';
  const initialLocale = isLocale(savedLocale) ? savedLocale : isLocale(requestedLocale) ? requestedLocale : detectedLocale;
  const state = { query: '', category: '全部', tag: '全部', status: 'cooked', locale: initialLocale };
  const categories = ['全部', '海鲜', '蔬菜', '鸡蛋', '汤', '肉类'];
  const matchedCount = photos.filter(p => p.matchStatus === 'matched').length;
  const reviewCount = photos.filter(p => p.matchStatus === 'review').length;
  const cookedCount = recipes.filter(r => r.status === 'cooked').length;
  const tags = [...new Set(recipes.flatMap(r => r.tags))].sort();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  const back = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6"/></svg>';
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="7.1"/><path d="m16.2 16.2 5 5"/></svg>';
  const photoIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.65"/><path d="m4 17 5.5-5 3.5 3 2.5-2 4.5 5"/></svg>';
  const bookIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6c-2.6-1.6-5.6-1.7-9-1v13c3.3-.6 6.4-.5 9 1 2.6-1.5 5.7-1.6 9-1V5c-3.4-.7-6.4-.6-9 1Z"/><path d="M12 6v13"/></svg>';
  const clockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/><path d="M12 7v5l3.5 2"/></svg>';

  const englishUI = translations.ui?.en || {};
  const dutchUI = translations.nl?.ui || {};
  function currentUI() {
    return state.locale === 'en' ? englishUI : state.locale === 'nl' ? dutchUI : {};
  }
  function currentRecipeTranslation(recipe) {
    return state.locale === 'en'
      ? (translations.recipes?.[recipe.id] || {})
      : state.locale === 'nl'
        ? (translations.nl?.recipes?.[recipe.id] || {})
        : {};
  }
  function currentPhotoTranslation(photo) {
    return state.locale === 'en'
      ? (translations.photos?.[photo.displayFile] || {})
      : state.locale === 'nl'
        ? (translations.nl?.photos?.[photo.displayFile] || {})
        : {};
  }
  function t(key, fallback, values = {}) {
    const ui = currentUI();
    let text = state.locale === 'zh' ? fallback : (ui[key] || fallback);
    Object.entries(values).forEach(([name, value]) => { text = text.replaceAll('{' + name + '}', String(value)); });
    return text;
  }
  function categoryLabel(category) {
    return state.locale === 'zh' ? category : (currentUI().categories?.[category] || category);
  }
  function tagLabel(tag) {
    return state.locale === 'zh' ? tag : (currentUI().tags?.[tag] || tag);
  }
  function localizedRecipe(recipe) {
    const tr = currentRecipeTranslation(recipe);
    const localized = { ...recipe };
    ['title', 'category', 'ingredients', 'seasonings', 'instructions', 'experience', 'improvements', 'nextSeasonings', 'notes', 'sources'].forEach(key => {
      if (tr[key] !== undefined) localized[key] = tr[key];
    });
    return localized;
  }
  function localizedPhoto(photo) {
    const tr = currentPhotoTranslation(photo);
    return { ...photo, ...tr };
  }

  function route() {
    const path = decodeURIComponent(location.hash.replace(/^#/, '') || '/');
    if (path === '/photos') return { type: 'photos' };
    if (path.startsWith('/recipe/')) return { type: 'recipe', id: path.slice('/recipe/'.length) };
    if (path === '/about') return { type: 'about' };
    return { type: 'home' };
  }

  function header(current) {
    return `<header class="site-header">
      <div class="header-inner layout-container">
        <a class="brand" href="#/" aria-label="${t('brandAria', '我的厨房笔记，返回首页')}">
          <span class="brand-symbol"><span class="brand-fork">✳</span></span>
          <span class="brand-title"><strong>${t('brand', '厨房笔记')}</strong><small>${t('brandSubtitle', 'THE COOKING JOURNAL')}</small></span>
        </a>
        <nav class="main-nav" aria-label="${t('mainNavAria', '主导航')}">
          <a href="#/" ${current === 'home' ? 'aria-current="page"' : ''}>${t('recipes', '菜谱')} <span class="nav-count">${cookedCount}</span></a>
          <a href="#/photos" ${current === 'photos' ? 'aria-current="page"' : ''}>${t('photos', '照片档案')}</a>
          <a href="#/about" ${current === 'about' ? 'aria-current="page"' : ''}>${t('about', '关于记录')}</a>
        </nav>
        <select class="language-select" aria-label="${t('languageAria', '选择语言')}">
          <option value="zh" ${state.locale === 'zh' ? 'selected' : ''}>${t('languageChinese', '中文')}</option>
          <option value="en" ${state.locale === 'en' ? 'selected' : ''}>${t('languageEnglish', 'English')}</option>
          <option value="nl" ${state.locale === 'nl' ? 'selected' : ''}>${t('languageDutch', 'Nederlands')}</option>
        </select>
        <div class="header-side"><span class="header-star">✳</span> ${t('headerSide', 'KEEP THE GOOD BITS')}</div>
      </div>
    </header>`;
  }

  function footer() {
    return `<footer class="site-footer"><div class="layout-container footer-inner">
      <div class="footer-brand">✳ <span>${t('brand', '厨房笔记')}</span></div>
      <span>${t('footerText', '记录真实做过的菜，也记录不那么成功的尝试。')}</span>
      <span>${t('footerArchive', 'PERSONAL COOKING ARCHIVE')}</span>
    </div></footer>`;
  }

  function photoVisual(photo, mode = '') {
    const cls = mode === 'card' ? 'visual-card' : mode === 'album' ? 'visual-album' : 'visual-detail';
    if (photo?.available) {
      return `<div class="photo-frame ${cls}"><img loading="lazy" src="${escape(photo.publicPath)}" alt="${escape(photo.identifiedAs)} ${t('cookingPhotoAlt', '的烹饪照片')}"/></div>`;
    }
    const hasRecord = Boolean(photo);
    return `<div class="photo-frame photo-missing ${cls}" aria-label="${hasRecord ? t('photoPending', '照片文件尚未上传') : t('noLinkedPhoto', '暂未关联照片')}">
      <span class="photo-corner">${hasRecord ? t('photoReference', 'PHOTO REFERENCE') : t('noPhotoLabel', 'NO PHOTO')}</span>
      <div class="placeholder-plate"><div class="placeholder-inner">${photoIcon}</div></div>
      <span class="placeholder-text">${hasRecord ? t('photoPending', '照片文件待添加') : t('noLinkedPhoto', '尚无关联照片')}</span>
      ${hasRecord ? `<span class="placeholder-filename">${escape(photo.displayFile)}</span>` : `<span class="placeholder-filename">${t('spaceLater', 'A LITTLE SPACE FOR LATER')}</span>`}
    </div>`;
  }

  function chip(tag, cls = '') { return `<span class="tag ${cls}">${escape(tag)}</span>`; }

  function referenceVisual(url, title, mode = '') {
    const cls = mode === 'card' ? 'visual-card' : mode === 'album' ? 'visual-album' : 'visual-detail';
    return '<div class="photo-frame ' + cls + ' photo-reference"><img loading="lazy" referrerpolicy="no-referrer" src="' + escape(url) + '" alt="' + escape(title) + ' ' + t('webReferenceAlt', '的网络参考图') + '"/><span class="photo-corner">' + t('webBadge', 'WEB REFERENCE') + '</span></div>';
  }

  function recipeCard(recipe, index) {
    const display = localizedRecipe(recipe);
    const photo = recipe.photos[0] || null;
    const reference = !photo && recipe.referenceImage ? recipe.referenceImage : null;
    const visual = photo ? photoVisual(localizedPhoto(photo), 'card') : reference ? referenceVisual(reference, display.title, 'card') : photoVisual(null, 'card');
    return `<a class="recipe-card" href="#/recipe/${encodeURIComponent(recipe.id)}" style="--card-index:${index}">
      <div class="card-cover cover-${escape(recipe.category)}">
        ${visual}
        <span class="card-number">${String(index + 1).padStart(2,'0')} / ${String(cookedCount).padStart(2,'0')}</span>
      </div>
      <div class="card-content">
        <div class="card-meta"><span class="dot"></span>${escape(display.category)}<span class="meta-divider">/</span>${recipe.status === 'cooked' ? t('statusCooked', '已做过') : t('statusTry', '想试试')}</div>
        <div class="card-title-row"><h3>${escape(display.title)}</h3><span class="card-arrow">${arrow}</span></div>
        <p class="card-ingredients">${escape(display.ingredients.length ? display.ingredients.join(' · ') : t('noIngredients', '食材尚未记录'))}</p>
        <div class="card-bottom"><span class="card-photo-status">${photo ? (photo.available ? t('photoMy', '● 有实拍照片') : t('photoLinked', '◌ 照片已关联')) : reference ? t('webReference', '◎ 网络参考图') : t('noPhoto', '— 暂无照片')}</span><span>${escape(display.tags.slice(0, 2).map(tagLabel).join(' / '))}</span></div>
      </div>
    </a>`;
  }

  function hero() {
    return `<section class="hero layout-container">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> ${t('heroEyebrow', 'A PERSONAL COOKING ARCHIVE')} <span class="edition">${t('heroEdition', 'VOL. 01')}</span></div>
        <h1>${state.locale === 'zh' ? '把每一次下厨，' : t('heroTitle1', 'Take every time you cook')}<br/><em>${state.locale === 'zh' ? '都认真记下来。' : t('heroTitle2', 'seriously enough to remember.')}</em></h1>
        <p class="hero-description">${t('heroDescription', '不只是好吃的做法，也收藏失败的原因、下一次的想法，还有那些值得留下的厨房小发现。')}</p>
        <a class="hero-link" href="#recipes"><span>${t('heroLink', '翻看我的菜谱')}</span><span class="hero-link-icon">${arrow}</span></a>
      </div>
      <div class="hero-art" role="img" aria-label="${t('heroAria', '抽象装饰图案：厨房笔记与盘子，不代表实际菜肴照片')}">
        <div class="art-top">${t('artJournal', 'THE<br/>COOKING<br/>JOURNAL')} <span>✳</span></div>
        <div class="art-plate"><div class="art-plate-ring"><span>${t('artGoodFood', 'GOOD FOOD')}<br/>${t('artGoodNotes', 'GOOD NOTES')}</span></div></div>
        <div class="art-bottom"><span>${t('artCollected', 'COLLECTED WITH CARE')}</span><span>${t('artEst', 'EST. 2026')}</span></div>
      </div>
    </section>`;
  }

  function stats() {
    return `<section class="stats-strip layout-container" aria-label="${t('statsAria', '菜谱统计')}">
      <div class="stat"><strong>${String(cookedCount).padStart(2, '0')}</strong><span>${t('statsCooked', '做过的菜谱')}<small>${t('statsCookedMeta', 'COOKED RECIPES')}</small></span></div>
      <div class="stat"><strong>${String(matchedCount).padStart(2, '0')}</strong><span>${t('statsMatched', '已匹配照片')}<small>${t('statsMatchedMeta', 'MATCHED REFERENCES')}</small></span></div>
      <div class="stat"><strong>${String(reviewCount).padStart(2, '0')}</strong><span>${t('statsReview', '待确认照片')}<small>${t('statsReviewMeta', 'NEEDS REVIEW')}</small></span></div>
      <div class="stat stat-note"><span>${t('statsNote1', '值得记录的，不只是')}<br/>${t('statsNote2', '成功的那一顿。')}</span><i>✳</i></div>
    </section>`;
  }

  function filters() {
    return `<div class="toolbar">
      <div class="search-wrap">${searchIcon}<input id="recipe-search" type="search" placeholder="${t('searchPlaceholder', '搜索菜名、食材或标签…')}" autocomplete="off" aria-label="${t('searchAria', '搜索菜名或食材')}" value="${escape(state.query)}" />
        ${state.query ? `<button class="clear-search" type="button" aria-label="${t('clearSearch', '清除搜索')}">×</button>` : ''}
      </div>
      <div class="filter-title">${t('browseCategory', '按类别浏览')} <span>${t('filterCategoryMeta', 'FILTER BY CATEGORY')}</span></div>
      <div class="category-row" role="group" aria-label="${t('categoryAria', '菜谱类别')}">${categories.map(cat => `<button type="button" class="category-button ${state.category === cat ? 'active' : ''}" data-category="${escape(cat)}" aria-pressed="${state.category === cat}">${escape(categoryLabel(cat))}</button>`).join('')}</div>
      <div class="filter-title tag-title">${t('browseTag', '按标签浏览')} <span>${t('filterTagMeta', 'FILTER BY TAG')}</span></div>
      <div class="tag-row" role="group" aria-label="${t('tagAria', '标签筛选')}">${['全部', ...tags].map(tag => `<button type="button" class="tag-button ${state.tag === tag ? 'active' : ''}" data-tag="${escape(tag)}" aria-pressed="${state.tag === tag}">${escape(tag === '全部' ? t('all', '全部') : tagLabel(tag))}</button>`).join('')}</div>
    </div>`;
  }

  function getFiltered() {
    const q = state.query.trim().toLocaleLowerCase();
    return recipes.filter(r => r.status === state.status)
      .filter(r => state.category === '全部' || r.category === state.category)
      .filter(r => state.tag === '全部' || r.tags.includes(state.tag))
      .filter(r => !q || [r.title, r.category, r.cuisine, ...r.tags, ...r.ingredients, ...r.seasonings].join(' ').toLocaleLowerCase().includes(q));
  }

  function galleryResults() {
    const results = getFiltered();
    const resultLabel = state.status === 'to-try'
      ? t('resultsToTry', '共找到 {count} 道想尝试的菜谱', { count: results.length })
      : t('resultsFound', '共找到 {count} 道菜谱', { count: results.length });
    const hasFilters = state.query || state.category !== '全部' || state.tag !== '全部';
    const emptyTitle = state.status === 'to-try' ? t('emptyToTryTitle', '想做的清单还是空的') : t('emptyTitle', '没有找到对应菜谱');
    const emptyText = state.status === 'to-try' ? t('emptyToTryText', '目前还没有记录 to-try 菜谱。以后可以把想尝试的菜加进 Markdown。') : t('emptyText', '可以换个关键词，或者清除类别和标签筛选。');
    return `<div class="results-heading"><span>${escape(resultLabel)}</span>
      ${hasFilters ? `<button class="reset-filter" type="button">${t('clearFilters', '清除筛选 ↗')}</button>` : `<span class="results-aside">${t('madeRemembered', 'MADE & REMEMBERED')}</span>`}</div>
      ${results.length ? `<div class="recipe-grid">${results.map(recipeCard).join('')}</div>` : `<div class="empty-results"><span class="empty-symbol">✳</span><h3>${emptyTitle}</h3><p>${emptyText}</p>${state.status !== 'to-try' ? `<button type="button" class="reset-filter btn-outline">${t('clearFilters', '清除筛选')}</button>` : ''}</div>`}`;
  }

  function home() {
    return `${stats()}
      <section class="catalog layout-container" id="recipes">
        <div class="section-heading"><div><span class="section-kicker">${t('recipesKicker', '01 / THE RECIPES')}</span><h2>${t('sectionRecipes', '我的菜谱收藏')}<span class="heading-mark">✳</span></h2><p>${t('sectionDescription', '每一道菜都有自己的小故事，和可以做得更好的地方。')}</p></div><span class="section-side">${t('fromKitchen', 'FROM MY KITCHEN')}<br/>${t('toPages', 'TO THESE PAGES')}</span></div>
        <div class="status-tabs" role="group" aria-label="${t('statusAria', '菜谱状态')}">
          <button type="button" class="status-button ${state.status === 'cooked' ? 'active' : ''}" data-status="cooked" aria-pressed="${state.status === 'cooked'}">${t('statusCooked', '已经做过')} <span>${cookedCount}</span></button>
          <button type="button" class="status-button ${state.status === 'to-try' ? 'active' : ''}" data-status="to-try" aria-pressed="${state.status === 'to-try'}">${t('statusTry', '想试试')} <span>${recipes.filter(r => r.status === 'to-try').length}</span></button>
        </div>
        <div id="filters">${filters()}</div>
        <div id="gallery-results" aria-live="polite">${galleryResults()}</div>
      </section>
      <section class="bottom-callout layout-container"><div class="callout-flower">✳</div><div><span>${t('calloutEyebrow', 'AN HONEST KITCHEN DIARY')}</span><h2>${t('calloutTitle', '做得不完美，也值得写下来。')}</h2><p>${t('calloutText', '留下真实反馈，才能在下一次尝试里有所不同。')}</p></div><a href="#/about">${t('readPrinciples', '看看记录原则')} ${arrow}</a></section>`;
  }

  function itemList(items, numbered = false) {
    if (!items?.length) return '<p class="not-recorded">' + t('notRecorded', '尚未记录') + '</p>';
    const tag = numbered ? 'ol' : 'ul';
    return `<${tag} class="detail-list ${numbered ? 'steps-list' : ''}">${items.map(item => `<li>${escape(item)}</li>`).join('')}</${tag}>`;
  }
  function detailSection(label, title, items, options = {}) {
    return `<section class="detail-section ${options.className || ''}"><div class="detail-section-head"><span class="tiny-index">${escape(label)}</span><h2>${escape(title)}</h2></div>${itemList(items, options.numbered)}</section>`;
  }

  function detail(recipe) {
    const display = localizedRecipe(recipe);
    const idx = recipes.findIndex(r => r.id === recipe.id) + 1;
    const cover = recipe.photos.find(p => p.available) || recipe.photos[0] || null;
    const reference = !cover && recipe.referenceImage ? recipe.referenceImage : null;
    const linkedLabel = `${recipe.photos.length} ${t('linked', '张已关联')}`;
    const extraTip = recipe.photos.length && !recipe.photos.some(p => p.available) ? t('photoPending', '目前尚未提供实际图片文件。') : '';
    return `<main class="detail-page layout-container">
      <div class="breadcrumbs"><a href="#/">${t('allRecipes', '全部菜谱')}</a><span>/</span><span>${escape(display.category)}</span><span>/</span><b>${escape(display.title)}</b></div>
      <div class="detail-top"><div class="detail-intro"><div class="detail-kicker">${t('recipeLabel', 'RECIPE')} ${String(idx).padStart(2, '0')} / ${String(recipes.length).padStart(2, '0')} <span class="detail-line"></span> ${escape(display.category)}</div>
        <h1>${escape(display.title)}</h1>
        <p>${t('recipeIntro', '记下做过的步骤、真实感受，以及下次还想改进的地方。')}</p>
        <div class="detail-tag-row">${recipe.tags.map(tag => chip(tagLabel(tag))).join('')}</div>
        <div class="detail-action-row"><span class="cooked-label"><span class="dot"></span> ${t('cooked', '实际做过')}</span><button type="button" class="print-button">${t('print', '打印菜谱 ↗')}</button></div></div>
        <div class="detail-cover">${cover ? photoVisual(localizedPhoto(cover)) : reference ? referenceVisual(reference, display.title) : photoVisual(null)}</div>
      </div>
      <div class="detail-body">
        <aside class="detail-sidebar">${detailSection('01', t('mainIngredients', '主要食材'), display.ingredients)}${detailSection('02', t('seasonings', '调味料'), display.seasonings)}
          ${display.nextSeasonings?.length ? `<section class="sidebar-next"><div class="mini-label">${t('forNext', 'FOR NEXT TIME')}</div><h3>${t('nextTitle', '下次参考调味比例')}</h3>${itemList(display.nextSeasonings)}<p>${t('nextNote', '这是下次参考建议，不代表上次实际用量。')}</p></section>` : ''}
          <div class="recipe-sourcefile">${bookIcon}<span>${t('markdownSource', '菜谱数据来自 Markdown')}<br/><small>${escape(recipe.filename)}</small></span></div>
        </aside>
        <div class="detail-primary">${detailSection('03', t('steps', '做法步骤'), display.instructions, {numbered:true})}
          <div class="experience-panels"><div class="experience-panel observed"><div class="panel-eyebrow"><span>↳</span> ${t('experienceEyebrow', 'WHAT ACTUALLY HAPPENED')}</div><h2>${t('experienceTitle', '我的实际经验')}</h2>${itemList(display.experience)}</div>
          <div class="experience-panel next"><div class="panel-eyebrow"><span>✳</span> ${t('improvementsEyebrow', 'NOTES FOR NEXT TIME')}</div><h2>${t('improvementsTitle', '下次可以改进')}</h2>${itemList(display.improvements)}</div></div>
          ${detailSection('04', t('otherNotes', '其他记录'), display.notes)}
          ${detailSection('05', t('sources', '参考来源'), display.sources)}
          <section class="detail-section detail-gallery"><div class="detail-section-head"><span class="tiny-index">06</span><h2>${t('relatedPhotos', '相关照片')} <span class="photo-count">${linkedLabel}</span></h2></div>
            ${recipe.photos.length ? `<div class="detail-photos">${recipe.photos.map(photo => { const displayPhoto = localizedPhoto(photo); return `<div class="detail-photo"><div>${photoVisual(displayPhoto, 'album')}</div><p>${escape(displayPhoto.originalFile)} <span>· ${escape(displayPhoto.date)}</span></p></div>`; }).join('')}</div>` : reference ? `<div class="detail-photos detail-reference-wrap">${referenceVisual(reference, display.title, 'album')}</div><p class="reference-photo-note">${t('referenceTip', '这是网络参考图，不是本人实拍照片。')}</p>` : `<p class="not-recorded">${t('noReliablePhoto', '尚未记录可靠匹配的照片')}</p>`}
            <p class="gallery-tip">${photoIcon} ${t('photoRules', '只有人工确认匹配的照片才会关联到菜谱。')}${extraTip}</p>
          </section>
        </div>
      </div>
      <div class="detail-bottom"><a href="#/">${back} ${t('backToList', '返回菜谱列表')}</a><a href="#/photos">${t('viewPhotoArchive', '查看照片档案')} ${arrow}</a></div>
    </main>`;
  }

  function photoCard(photo) {
    const display = localizedPhoto(photo);
    const confirmed = photo.matchStatus === 'matched';
    return `<article class="album-card ${confirmed ? '' : 'review-photo'}">
      ${photoVisual(display, 'album')}
      <div class="album-content"><div class="album-topline"><span class="album-status ${confirmed ? 'matched' : 'review'}">${confirmed ? t('photoConfirmed', '✓ 已可靠匹配') : t('photoReview', '◌ 待确认')}</span><span>${escape(display.date)}</span></div>
      <h3>${escape(display.identifiedAs)}</h3><p>${escape(display.note)}</p><div class="album-files"><span>${t('originalLabel', 'ORIGINAL')} <b>${escape(display.originalFile)}</b></span><span>${t('displayLabel', 'DISPLAY')} <b>${escape(display.displayFile)}</b></span></div>
      ${confirmed ? `<a class="album-recipe-link" href="#/recipe/${encodeURIComponent(photo.recipeId)}">${t('viewRecipe', '查看对应菜谱')} ${arrow}</a>` : `<span class="album-unassigned">${t('unassigned', '尚未归入任何正式菜谱')}</span>`}</div>
    </article>`;
  }

  function photosPage() {
    const matched = photos.filter(p => p.matchStatus === 'matched');
    const pending = photos.filter(p => p.matchStatus === 'review');
    const availableCount = photos.filter(p => p.available).length;
    const imageMessage = availableCount
      ? pending.length
        ? t('imageBannerWithPending', `已接入 ${availableCount} 张 JPEG 显示图片；原始 HEIC 保留在资料库中。待确认照片仍只作为审核记录展示，不会自动关联到菜谱。`, { count: availableCount })
        : t('imageBannerAllConfirmed', `已接入 ${availableCount} 张 JPEG 显示图片；原始 HEIC 保留在资料库中。当前照片均已根据用户确认关联到对应菜谱。`, { count: availableCount })
      : t('imageBannerNone', '目前只有照片文件名和审核记录，没有收到实际 HEIC 或 JPEG 图片。下方先保留照片位置；把真实 JPG 放入项目的 images/photos/ 文件夹并重新构建，图片即可显示。');
    return `<main class="album-page layout-container"><div class="breadcrumbs"><a href="#/">${t('home', '首页')}</a><span>/</span><b>${t('photos', '照片档案')}</b></div>
      <div class="page-intro"><span class="section-kicker">${t('photoArchiveKicker', '02 / PHOTO ARCHIVE')}</span><h1>${t('photoArchiveTitle', '镜头里的厨房。')}<span>✳</span></h1><p>${t('photoArchiveIntro1', '照片是回忆的一部分，但不是所有照片都能准确对应到某道菜。')}<br/>${t('photoArchiveIntro2', '已确认的归档，不能确认的先留着。')}</p></div>
      <div class="archive-banner"><span class="banner-icon">${photoIcon}</span><div><strong>${t('imageBannerTitle', '关于图片文件')}</strong><p>${imageMessage}</p></div></div>
      <section class="photo-group"><div class="photo-group-title"><div><span class="section-kicker">${t('confirmedKicker', '01 / CONFIRMED')}</span><h2>${t('confirmedTitle', '已可靠匹配')} <span>${matched.length}</span></h2></div><p>${t('confirmedSubtitle', '已确认属于现有菜谱')}</p></div><div class="album-grid">${matched.map(photoCard).join('')}</div></section>
      ${pending.length ? `<section class="photo-group"><div class="photo-group-title"><div><span class="section-kicker">${t('toReviewKicker', '02 / TO REVIEW')}</span><h2>${t('toReviewTitle', '待确认')} <span>${pending.length}</span></h2></div><p>${t('toReviewSubtitle', '保留可能性，不做未经确认的推断')}</p></div><div class="album-grid">${pending.map(photoCard).join('')}</div></section>` : ''}
    </main>`;
  }

  function aboutPage() {
    return `<main class="about-page layout-container"><div class="breadcrumbs"><a href="#/">${t('home', '首页')}</a><span>/</span><b>${t('about', '关于记录')}</b></div>
      <section class="about-hero"><span class="section-kicker">${t('aboutKicker', '03 / THE PHILOSOPHY')}</span><h1>${t('aboutTitle1', '不是菜谱大全，')}<br/><em>${t('aboutTitle2', '是一份真实的厨房日记。')}</em></h1><p>${t('aboutIntro', '每一道菜都来自实际做过的记录。把知道的写清楚，把不知道的留白。')}</p></section>
      <section class="principle-grid"><article><span>01</span><h2>${t('principle1Title', '真实胜过完整')}</h2><p>${t('principle1Text', '缺少的烹饪时间、食材用量和步骤会标为「尚未记录」，而不是为了让页面好看而猜测。')}</p></article><article><span>02</span><h2>${t('principle2Title', '失败也要留下')}</h2><p>${t('principle2Text', '把「实际经验」与「下次可以改进」分开展示。建议不是既成事实。')}</p></article><article><span>03</span><h2>${t('principle3Title', '照片需要确认')}</h2><p>${t('principle3Text', '只有可靠匹配的照片可以关联菜谱。待确认的照片不擅自归类，更不拿来证明未记录的事情。')}</p></article></section>
      <section class="about-foot"><div><span>${t('howItWorks', 'HOW IT WORKS')}</span><h2>${t('aboutFootTitle', 'Markdown 写内容，网页负责展示。')}</h2><p>${t('aboutFootText', '每一道菜对应一个 Markdown 文件。修改食材、步骤或记录后，重新运行构建即可更新网站，不需要数据库或后台。')}</p></div><a href="#/">${t('goRecipes', '去看菜谱')} ${arrow}</a></section>
    </main>`;
  }

  function shell(view, active) { return `${header(active)}${view}${footer()}`; }

  function updateGallery() {
    const target = document.getElementById('gallery-results');
    if (target) target.innerHTML = galleryResults();
  }
  function updateFilters() {
    const target = document.getElementById('filters');
    if (target) target.innerHTML = filters();
    updateGallery();
  }

  function attachEvents() {
    // Event delegation on stable containers ensures filters still work after a redraw.
    const filterRoot = document.getElementById('filters');
    filterRoot?.addEventListener('input', event => {
      if (event.target.id !== 'recipe-search') return;
      state.query = event.target.value;
      updateGallery();
      const clear = filterRoot.querySelector('.clear-search');
      if (state.query && !clear) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'clear-search'; b.textContent = '×';
        b.setAttribute('aria-label', t('clearSearch', '清除搜索'));
        event.target.parentElement.append(b);
      } else if (!state.query && clear) clear.remove();
    });
    filterRoot?.addEventListener('click', event => {
      const category = event.target.closest('[data-category]');
      if (category) { state.category = category.dataset.category; updateFilters(); return; }
      const tag = event.target.closest('[data-tag]');
      if (tag) { state.tag = tag.dataset.tag; updateFilters(); return; }
      if (event.target.closest('.clear-search')) {
        state.query = ''; updateFilters(); document.getElementById('recipe-search')?.focus();
      }
    });
    document.querySelector('.status-tabs')?.addEventListener('click', event => {
      const b = event.target.closest('[data-status]'); if (!b) return;
      state.status = b.dataset.status;
      document.querySelectorAll('[data-status]').forEach(el => {
        el.classList.toggle('active', el.dataset.status === state.status);
        el.setAttribute('aria-pressed', String(el.dataset.status === state.status));
      });
      updateGallery();
    });
    document.getElementById('gallery-results')?.addEventListener('click', event => {
      if (!event.target.closest('.reset-filter')) return;
      state.query = ''; state.category = '全部'; state.tag = '全部'; updateFilters();
    });
    document.querySelector('.print-button')?.addEventListener('click', () => window.print());
    document.querySelector('.language-select')?.addEventListener('change', event => {
      state.locale = isLocale(event.target.value) ? event.target.value : 'zh';
      storage?.setItem('cooking-locale', state.locale);
      render();
    });
  }

  function render() {
    const r = route();
    if (document.documentElement) {
      document.documentElement.lang = state.locale === 'en' ? 'en' : state.locale === 'nl' ? 'nl' : 'zh-CN';
      document.title = state.locale === 'en' ? 'Cooking Notes' : state.locale === 'nl' ? 'Kooknotities' : '我的厨房笔记 · Cooking Notes';
    }
    if (r.type === 'recipe') {
      const recipe = recipes.find(rec => rec.id === r.id);
      app.innerHTML = shell(recipe ? detail(recipe) : `<main class="layout-container not-found"><h1>${t('notFound', '没有找到这道菜')}</h1><a href="#/">${back} ${t('backToList', '返回列表')}</a></main>`, 'recipe');
    } else if (r.type === 'photos') app.innerHTML = shell(photosPage(), 'photos');
    else if (r.type === 'about') app.innerHTML = shell(aboutPage(), 'about');
    else app.innerHTML = shell(home(), 'home');
    attachEvents();
    if (r.type === 'home' && location.hash === '#recipes') {
      requestAnimationFrame(() => document.getElementById('recipes')?.scrollIntoView());
    } else window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  render();
})();
