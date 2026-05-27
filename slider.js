class InfiniteSlider extends HTMLElement {
  static _docsLogged = false;

  static _printDocs() {
    if (InfiniteSlider._docsLogged) return;
    InfiniteSlider._docsLogged = true;

    const s = '%c%s%c';
    const t = 'color:#ff0;font-weight:bold;font-size:14px;';
    const r = 'color:inherit;';

    console.groupCollapsed('%c📖 <infinite-slider> — Documentación', 'font-weight:bold;font-size:14px;');
    
    console.log(s, t, '\n📋 Atributos:', r);
    console.log('  data-items         Contenido: tipo|contenido|link (separados por salto de línea)');
    console.log('  slides-per-view    Slides visibles (default: 1)');
    console.log('  slide-height       Altura fija, ej: 400px, 60vh');
    console.log('  slide-gap          Separación entre slides en px (ej: 16)');
    console.log('  auto-play          true | false');
    console.log('  auto-play-interval Intervalo en ms (default: 4000)');

    console.log(s, t, '\n📝 Tipos en data-items:', r);
    console.log('  image   → image|URL|link(opcional)');
    console.log('  youtube → youtube|URL|link(opcional)');
    console.log('  vimeo   → vimeo|URL|link(opcional)');
    console.log('  video   → video|URL|link(opcional)');
    console.log('  html    → html|HTML codificado');
    console.log('  embed   → embed|URL|link(opcional)');

    console.log(s, t, '\n━━━ Ejemplos ━━━', r);

    console.log('%c① Imágenes%c\n' +
      '<infinite-slider \n' +
      '  data-items="image|https://ejemplo.com/foto1.jpg\n' +
      '              image|https://ejemplo.com/foto2.jpg|https://enlace.com"\n' +
      '  slides-per-view="1"\n' +
      '  auto-play="false">\n' +
      '</infinite-slider>',
      'font-weight:bold;color:#0cf;', '');

    console.log('%c② YouTube con altura y gap%c\n' +
      '<infinite-slider \n' +
      '  data-items="youtube|https://www.youtube.com/watch?v=VIDEO_ID\n' +
      '              youtube|https://www.youtube.com/watch?v=VIDEO_ID"\n' +
      '  slides-per-view="2"\n' +
      '  slide-height="400px"\n' +
      '  slide-gap="16"\n' +
      '  auto-play="false">\n' +
      '</infinite-slider>',
      'font-weight:bold;color:#0cf;', '');

    console.log('%c③ Mixto con auto-play%c\n' +
      '<infinite-slider \n' +
      '  data-items="image|https://ejemplo.com/foto.jpg\n' +
      '              youtube|https://youtu.be/VIDEO_ID\n' +
      '              vimeo|https://vimeo.com/123456789\n' +
      '              html|<h2>Título</h2><p>Texto</p>"\n' +
      '  auto-play="true"\n' +
      '  auto-play-interval="5000">\n' +
      '</infinite-slider>',
      'font-weight:bold;color:#0cf;', '');

    console.groupEnd();
  }
  static get observedAttributes() {
    return ['data-items', 'slides-per-view', 'auto-play', 'auto-play-interval', 'slide-height', 'slide-gap'];
  }

  constructor() {
    super();
    this._index = 1;
    this._total = 0;
    this._autoPlayTimer = null;

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .slider {
          overflow: hidden;
          position: relative;
          margin: auto;
          width: 100%;
        }
        .slides {
          display: flex;
          gap: var(--slide-gap, 0px);
          transition: transform 0.5s ease-in-out;
        }
        .slide {
          min-width: calc((100% - (var(--slides-per-view, 1) - 1) * var(--slide-gap, 0px)) / var(--slides-per-view, 1));
          box-sizing: border-box;
          height: var(--slide-height, auto);
        }
        .slide img, .slide iframe, .slide video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          vertical-align: middle;
        }
        .slide iframe {
          border: none;
        }
        .slide .embed-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          flex: 1;
        }
        button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.5);
          color: white;
          border: none;
          padding: 10px;
          cursor: pointer;
          z-index: 1;
          transition: background 0.3s;
        }
        button:hover {
          background: rgba(0,0,0,0.8);
        }
        button.hidden {
          display: none;
        }
        #prev { left: 2em; }
        #next { right: 2em; }
        .dots {
          position: absolute;
          bottom: 1em;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5em;
          z-index: 1;
        }
        .dots.hidden {
          display: none;
        }
        .dot {
          --wh: .6em;
          --br: 50%;
          --transition: all 0.3s ease;
          width: var(--wh);
          height: var(--wh);
          border-radius: var(--br);
          background: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: var(--transition);
        }
        .dot.active {
          width: calc(var(--wh) * 3);
          background: white;
           --br:.5em;
        }
      </style>
      <div class="slider" part="slider">
        <div id="slides" class="slides"></div>
        <button id="prev" type="button" aria-label="Anterior">&#10094;</button>
        <button id="next" type="button" aria-label="Siguiente">&#10095;</button>
        <div id="dots" class="dots"></div>
      </div>
    `;
  }

  connectedCallback() {
    InfiniteSlider._printDocs();
    this._slidesContainer = this.shadowRoot.getElementById('slides');
    this._dotsContainer = this.shadowRoot.getElementById('dots');
    this._prevBtn = this.shadowRoot.getElementById('prev');
    this._nextBtn = this.shadowRoot.getElementById('next');
    this._applySlidesPerView();
    this._applySlideHeight();
    this._applySlideGap();
    this._parseItems();
    this._index = Math.min(this._slidesPerView, this._items.length || 1);
    this._setupClones();
    this._slides = this.shadowRoot.querySelectorAll('.slide');
    this._total = this._slides.length;
    this._toggleButtons();
    this._bindEvents();
    this._render(false);
    this._startAutoPlay();
    this._createDots();
  }

  disconnectedCallback() {
    this._stopAutoPlay();
    this._prevBtn?.removeEventListener('click', this._next);
    this._nextBtn?.removeEventListener('click', this._prev);
    this._slidesContainer?.removeEventListener('transitionend', this._handleLoop);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (!this._slidesContainer) return;
    if (name === 'data-items' || name === 'slides-per-view') {
      this._rebuild();
    }
    if (name === 'auto-play') {
      this._stopAutoPlay();
      this._startAutoPlay();
    }
    if (name === 'slide-height') {
      this._applySlideHeight();
    }
    if (name === 'slide-gap') {
      this._applySlideGap();
    }
  }

  _parseItems() {
    const raw = this.getAttribute('data-items') || '';
    // Formato: tipo|contenido|link (opcional)
    // tipos: image, video, youtube, vimeo, html, embed
    const entries = raw.split(/(?=\n|^image\||^video\||^youtube\||^vimeo\||^html\||^embed\|)/).filter(Boolean);
    
    this._items = [];
    
    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      
      const [type, ...rest] = trimmed.split('|');
      const content = rest[0];
      const link = rest[1] || '';
      
      switch(type) {
        case 'image':
          if (content && content.startsWith('http')) {
            this._items.push({ type: 'image', url: content, link });
          }
          break;
        case 'video':
          if (content) {
            this._items.push({ type: 'video', url: content, link });
          }
          break;
        case 'youtube':
          if (content) {
            const videoId = this._getYoutubeId(content);
            if (videoId) {
              this._items.push({ type: 'youtube', id: videoId, link });
            }
          }
          break;
        case 'vimeo':
          if (content) {
            const videoId = this._getVimeoId(content);
            if (videoId) {
              this._items.push({ type: 'vimeo', id: videoId, link });
            }
          }
          break;
        case 'html':
          if (content) {
            this._items.push({ type: 'html', html: decodeURIComponent(content), link });
          }
          break;
        case 'embed':
          if (content) {
            this._items.push({ type: 'embed', url: content, link });
          }
          break;
      }
    }
  }

  _getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  _getVimeoId(url) {
    const regExp = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  _createSlide(item) {
    const div = document.createElement('div');
    div.className = 'slide';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'embed-content';
    
    switch(item.type) {
      case 'image':
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = 'Slide image';
        img.loading = 'lazy';
        contentDiv.appendChild(img);
        break;
        
      case 'video':
        const video = document.createElement('video');
        video.src = item.url;
        video.controls = true;
        video.preload = 'metadata';
        contentDiv.appendChild(video);
        break;
        
      case 'youtube':
        const ytIframe = document.createElement('iframe');
        ytIframe.src = `https://www.youtube.com/embed/${item.id}?autoplay=0&controls=1&rel=0`;
        ytIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        ytIframe.allowFullscreen = true;
        contentDiv.appendChild(ytIframe);
        break;
        
      case 'vimeo':
        const vmIframe = document.createElement('iframe');
        vmIframe.src = `https://player.vimeo.com/video/${item.id}`;
        vmIframe.allow = 'autoplay; fullscreen; picture-in-picture';
        vmIframe.allowFullscreen = true;
        contentDiv.appendChild(vmIframe);
        break;
        
      case 'html':
        contentDiv.innerHTML = item.html;
        break;
        
      case 'embed':
        const embedIframe = document.createElement('iframe');
        embedIframe.src = item.url;
        embedIframe.allow = 'fullscreen';
        embedIframe.allowFullscreen = true;
        contentDiv.appendChild(embedIframe);
        break;
    }
    
    if (item.link && item.link.startsWith('http')) {
      const anchor = document.createElement('a');
      anchor.href = item.link;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.appendChild(contentDiv);
      div.appendChild(anchor);
    } else {
      div.appendChild(contentDiv);
    }
    
    return div;
  }

  _buildSlides() {
    const container = this._slidesContainer;
    container.innerHTML = '';
    for (const item of this._items) {
      container.appendChild(this._createSlide(item));
    }
  }

  _setupClones() {
    this._buildSlides();
    const container = this._slidesContainer;
    const realSlides = this._items.length;
    if (realSlides === 0) return;
    const n = Math.min(this._slidesPerView, realSlides);

    for (let i = realSlides - 1; i >= realSlides - n; i--) {
      const clone = container.children[i].cloneNode(true);
      container.insertBefore(clone, container.firstChild);
    }

    for (let i = 0; i < n; i++) {
      const clone = container.children[i + n].cloneNode(true);
      container.appendChild(clone);
    }
  }

  _createDots() {
    const realCount = this._items.length;
    this._dotsContainer.innerHTML = '';
    
    // Solo crear dots si hay más de un slide
    if (realCount > 1) {
      this._dotsContainer.classList.remove('hidden');
      for (let i = 0; i < realCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.addEventListener('click', () => this._goToSlide(i));
        this._dotsContainer.appendChild(dot);
      }
      this._updateDots();
    } else {
      this._dotsContainer.classList.add('hidden');
    }
  }

  _updateDots() {
    const realSlides = this._items.length;
    if (realSlides <= 1) return;

    let currentRealIndex = (this._index - this._slidesPerView) % realSlides;
    if (currentRealIndex < 0) currentRealIndex += realSlides;

    const dots = this._dotsContainer.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === currentRealIndex);
    }
  }

  _goToSlide(index) {
    this._index = index + this._slidesPerView;
    this._render();
    this._resetAutoPlay();
  }

  _render(animate = true) {
    const container = this._slidesContainer;
    const n = this._slidesPerView;
    const stepPercent = 100 / n;
    const shiftPx = this._slideGap ? (this._index * this._slideGap) / n : 0;
    container.style.transition = animate ? 'transform 0.5s ease' : 'none';
    container.style.transform = this._slideGap
      ? `translateX(calc(-${this._index * stepPercent}% - ${shiftPx}px))`
      : `translateX(-${this._index * stepPercent}%)`;
    this._updateDots();
  }

  _next = () => {
    if (this._items.length <= 1) return;
    this._index++;
    this._render();
    this._resetAutoPlay();
  };

  _prev = () => {
    if (this._items.length <= 1) return;
    this._index--;
    this._render();
    this._resetAutoPlay();
  };

  _handleLoop = () => {
    const realSlides = this._items.length;
    const n = this._slidesPerView;
    if (this._index < n) {
      this._index += realSlides;
      this._render(false);
    } else if (this._index >= n + realSlides) {
      this._index -= realSlides;
      this._render(false);
    }
    this._updateDots();
  };

  _bindEvents() {
    this._prevBtn.addEventListener('click', this._prev);
    this._nextBtn.addEventListener('click', this._next);
    this._slidesContainer.addEventListener('transitionend', this._handleLoop);
  }

  _startAutoPlay() {
    if (this.getAttribute('auto-play') !== 'true') return;
    if (this._items.length <= 1) return;
    const interval = parseInt(this.getAttribute('auto-play-interval'), 10) || 4000;
    this._autoPlayTimer = setInterval(this._next, interval);
  }

  _stopAutoPlay() {
    if (this._autoPlayTimer) {
      clearInterval(this._autoPlayTimer);
      this._autoPlayTimer = null;
    }
  }

  _resetAutoPlay() {
    this._stopAutoPlay();
    this._startAutoPlay();
  }

  _rebuild() {
    this._stopAutoPlay();
    this._applySlidesPerView();
    this._parseItems();
    this._index = Math.min(this._slidesPerView, this._items.length || 1);
    this._applySlideGap();
    this._setupClones();
    this._slides = this.shadowRoot.querySelectorAll('.slide');
    this._total = this._slides.length;
    this._applySlideHeight();
    this._toggleButtons();
    this._render(false);
    this._createDots();
    this._startAutoPlay();
  }

  _applySlideHeight() {
    const height = this.getAttribute('slide-height');
    if (height) {
      this.style.setProperty('--slide-height', height);
    } else {
      this.style.removeProperty('--slide-height');
    }
  }

  _applySlidesPerView() {
    const n = parseInt(this.getAttribute('slides-per-view'), 10) || 1;
    this._slidesPerView = Math.max(1, n);
    this.style.setProperty('--slides-per-view', this._slidesPerView);
  }

  _applySlideGap() {
    const gap = parseInt(this.getAttribute('slide-gap'), 10) || 0;
    this._slideGap = Math.max(0, gap);
    if (this._slideGap > 0) {
      this.style.setProperty('--slide-gap', this._slideGap + 'px');
    } else {
      this.style.removeProperty('--slide-gap');
    }
  }

  _toggleButtons() {
    const show = this._items.length > 1;
    // Agregar/quitar clase 'hidden' en lugar de modificar style.display
    if (show) {
      this._prevBtn.classList.remove('hidden');
      this._nextBtn.classList.remove('hidden');
    } else {
      this._prevBtn.classList.add('hidden');
      this._nextBtn.classList.add('hidden');
    }
  }
}

customElements.define('infinite-slider', InfiniteSlider);