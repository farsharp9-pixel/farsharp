// ====== PROJECT DATA (fallback only — overridden by content.json via content-loader.js) ======
let projects = {
  crabra: {
    title: 'CR A BRA — Brand Guidelines',
    folder: 'athr agency',
    images: [
      'cr a bra _Brand Guidelines 01.png','cr a bra _Brand Guidelines 02.png','cr a bra _Brand Guidelines 03.png',
      'cr a bra _Brand Guidelines 04.png','cr a bra _Brand Guidelines 05.png','cr a bra _Brand Guidelines 06.png',
      'cr a bra _Brand Guidelines 07.png','cr a bra _Brand Guidelines 08.png','cr a bra _Brand Guidelines 09.png',
      'cr a bra _Brand Guidelines 10.png','cr a bra _Brand Guidelines 11.png','cr a bra _Brand Guidelines 12.png',
      'cr a bra _Brand Guidelines 13.png','cr a bra _Brand Guidelines 14.png','cr a bra _Brand Guidelines 15.png',
      'cr a bra _Brand Guidelines 16.png','cr a bra _Brand Guidelines 17.png','cr a bra _Brand Guidelines 18.png',
      'cr a bra _Brand Guidelines 19.png','cr a bra _Brand Guidelines 20.png','cr a bra _Brand Guidelines 21.png',
      'cr a bra _Brand Guidelines 22.png','cr a bra _Brand Guidelines 23.png','cr a bra _Brand Guidelines 24.png',
      'cr a bra _Brand Guidelines 25.png','logo.png','اخر .png'
    ]
  },
  tajdeed: {
    title: 'TAJDEED — تجديد',
    folder: 'تج',
    images: ['تج-01.jpg','تج-02.jpg','تج-03.jpg','تج-05.jpg','تج-06.jpg']
  }
};

// ====== STACK MODAL STATE ======
let currentProject = null;
let currentIndex = 0;
let stackCards = [];

function buildImagePath(folder, file) {
  // Support full data URLs (uploaded images from admin)
  if (file && file.startsWith && file.startsWith('data:')) return file;
  const enc = (s) => encodeURIComponent(s);
  return '../' + enc(folder).replace(/%2F/g, '/') + '/' + file.split('/').map(enc).join('/');
}

function openStack(projectKey) {
  const proj = projects[projectKey];
  if (!proj) return;
  currentProject = proj;
  currentIndex = 0;
  document.getElementById('stackTitle').textContent = proj.title;
  document.getElementById('stackTotal').textContent = '/ ' + String(proj.images.length).padStart(2, '0');
  document.getElementById('stackCur').textContent = String(currentIndex + 1).padStart(2, '0');
  const area = document.getElementById('stackArea');
  area.innerHTML = '';
  stackCards = [];
  proj.images.forEach((entry, idx) => {
    const card = document.createElement('div');
    card.className = 'stack-card';
    const img = document.createElement('img');
    img.alt = proj.title + ' ' + (idx + 1);
    img.loading = 'lazy';
    const folder = (typeof entry === 'object' && entry !== null) ? entry.folder : proj.folder;
    const file   = (typeof entry === 'object' && entry !== null) ? entry.file   : entry;
    img.src = buildImagePath(folder, file);
    img.onerror = () => {
      const bg = document.createElement('div');
      bg.className = 'bg-fallback';
      card.appendChild(bg);
    };
    card.appendChild(img);
    area.appendChild(card);
    stackCards.push(card);
  });
  updateStackPositions();
  const modal = document.getElementById('stackModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function updateStackPositions() {
  stackCards.forEach((card, idx) => {
    const pos = idx - currentIndex;
    card.classList.remove('s-0','s-1','s-2','s-3','s-back','s-out');
    if (pos < 0) card.classList.add('s-out');
    else if (pos === 0) card.classList.add('s-0');
    else if (pos === 1) card.classList.add('s-1');
    else if (pos === 2) card.classList.add('s-2');
    else if (pos === 3) card.classList.add('s-3');
    else card.classList.add('s-back');
  });
}

function nextCard() {
  if (!currentProject) return;
  if (currentIndex >= currentProject.images.length - 1) { closeStack(); return; }
  currentIndex++;
  document.getElementById('stackCur').textContent = String(currentIndex + 1).padStart(2, '0');
  updateStackPositions();
}

function closeStack() {
  const modal = document.getElementById('stackModal');
  modal.classList.remove('active');
  const brandsOpen = document.getElementById('brandsModal') &&
                     document.getElementById('brandsModal').classList.contains('active');
  if (!brandsOpen) document.body.style.overflow = '';
  currentProject = null;
  currentIndex = 0;
}

// ====== BRANDS MODAL ======
function openBrandsModal() {
  const modal = document.getElementById('brandsModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;
}
function closeBrandsModal() {
  const modal = document.getElementById('brandsModal');
  modal.classList.remove('active');
  if (!document.getElementById('stackModal').classList.contains('active')) {
    document.body.style.overflow = '';
  }
}

// ====== INIT (runs after content-loader has patched DOM) ======
function initBindings() {
  // Pull projects from content-loader if available
  if (window.__contentProjects) projects = window.__contentProjects;

  // Cover images on brand cards & mini cards
  document.querySelectorAll('.brand-card, .mini-card').forEach(card => {
    const cover = card.dataset.cover;
    const coverEl = card.querySelector('.cover');
    if (cover && coverEl) {
      if (cover.startsWith('data:')) {
        coverEl.style.backgroundImage = `url("${cover}")`;
      } else {
        const encoded = cover.split('/').map((part, i) => i === 0 && part === '..' ? part : encodeURIComponent(part)).join('/');
        coverEl.style.backgroundImage = `url("${encoded}")`;
      }
    }
    if (card.id === 'openBrandsModal') {
      card.addEventListener('click', openBrandsModal);
    } else if (card.dataset.project) {
      card.addEventListener('click', () => openStack(card.dataset.project));
    }
  });

  // Brands modal close handlers
  const brandsModal = document.getElementById('brandsModal');
  if (brandsModal) {
    brandsModal.addEventListener('click', (e) => {
      if (e.target.id === 'brandsModal') closeBrandsModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const brandsActive = document.getElementById('brandsModal')?.classList.contains('active');
    const stackActive  = document.getElementById('stackModal')?.classList.contains('active');
    if (brandsActive && !stackActive) closeBrandsModal();
  });

  // Stack modal navigation
  document.addEventListener('keydown', (e) => {
    if (!currentProject) return;
    if (e.key === 'Escape') closeStack();
    else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextCard(); }
    else if (e.key === 'ArrowLeft') {
      if (currentIndex > 0) {
        currentIndex--;
        document.getElementById('stackCur').textContent = String(currentIndex + 1).padStart(2, '0');
        updateStackPositions();
      }
    }
  });

  const stackModal = document.getElementById('stackModal');
  if (stackModal) {
    stackModal.addEventListener('click', (e) => {
      if (e.target.id === 'stackModal' || e.target.classList.contains('stack-modal-inner')) closeStack();
    });
  }

  // Scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Language toggle
  const btn = document.getElementById('langToggle');
  if (btn) {
    const aboutText = document.getElementById('aboutText');
    const en = aboutText.querySelector('.lang-en');
    const ar = aboutText.querySelector('.lang-ar');
    const label = btn.querySelector('.lang-toggle-label');
    btn.addEventListener('click', () => {
      const showingEn = en.style.display !== 'none';
      if (showingEn) { en.style.display = 'none'; ar.style.display = ''; label.textContent = 'English'; btn.setAttribute('aria-pressed','true'); }
      else { en.style.display = ''; ar.style.display = 'none'; label.textContent = 'العربية'; btn.setAttribute('aria-pressed','false'); }
    });
  }
}

// Wait for content-loader to finish patching DOM, then bind events
if (window.__contentReady) {
  initBindings();
} else {
  document.addEventListener('content:ready', initBindings, { once: true });
  // Safety net: bind anyway after 2s if loader fails (e.g., offline)
  setTimeout(() => { if (!window.__contentReady) initBindings(); }, 2000);
}
