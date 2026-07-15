// ====== CONTENT LOADER ======
// Loads content from localStorage (admin overrides) → content.json (default).
// Patches the DOM dynamically, then dispatches 'content:ready' so script.js can bind events.
(function() {
  const STORAGE_KEY = 'farsharp_content_override';

  function enc(p) {
    return p.split('/').map((part, i) => i === 0 && part === '..' ? part : encodeURIComponent(part)).join('/');
  }
  function setText(sel, val) {
    if (val == null) return;
    const el = document.querySelector(sel);
    if (el) el.textContent = val;
  }
  function setHTML(sel, val) {
    if (val == null) return;
    const el = document.querySelector(sel);
    if (el) el.innerHTML = val;
  }

  async function getContent() {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && parsed.version) return parsed;
      }
    } catch (e) {}
    try {
      const res = await fetch('content.json', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }

  function apply(c) {
    if (!c) return;

    // Nav
    if (c.nav) {
      document.querySelectorAll('.logo').forEach(l => {
        l.innerHTML = `${c.nav.logoLatin} <span class="ar-mark">${c.nav.logoArabic}</span>`;
      });
      const navCta = document.querySelector('.nav-cta');
      if (navCta && c.nav.cta) { navCta.textContent = c.nav.cta.label; navCta.href = c.nav.cta.href; }
      const navLinksUl = document.querySelector('.nav-links');
      if (navLinksUl && Array.isArray(c.nav.links)) {
        navLinksUl.innerHTML = c.nav.links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
      }
    }

    // Hero
    if (c.hero) {
      setText('.hero-eyebrow-row .eyebrow', c.hero.eyebrow);
      setText('.hero-arabic-line', c.hero.arabicLine);
      setText('.hero-display-word', c.hero.displayWord);
      setHTML('.hero-h1', c.hero.headline);
      setHTML('.hero-desc', c.hero.description);
      const ctaPrim = document.querySelector('.hero-cta-row .btn-ink');
      if (ctaPrim && c.hero.ctaPrimary) { ctaPrim.textContent = c.hero.ctaPrimary.label; ctaPrim.href = c.hero.ctaPrimary.href; }
      const ctaSec = document.querySelector('.hero-cta-row .btn-ghost');
      if (ctaSec && c.hero.ctaSecondary) { ctaSec.textContent = c.hero.ctaSecondary.label; ctaSec.href = c.hero.ctaSecondary.href; }

      const statContainer = document.querySelector('.hero-stats');
      if (statContainer && Array.isArray(c.hero.stats)) {
        statContainer.innerHTML = c.hero.stats.map(s =>
          `<div><div class="stat-num">${s.num} <span class="stat-num-ar">${s.numAr || ''}</span></div><div class="stat-label">${s.label}</div></div>`
        ).join('');
      }

      setText('.stamp-mid', c.hero.stampMid);
      const stampBot = document.querySelector('.stamp-bot');
      if (stampBot) stampBot.innerHTML = `<span>${c.hero.stampYear || ''}</span><span class="dot">●</span><span>${c.hero.stampValue || ''}</span>`;

      const note = document.querySelector('.collage-note');
      if (note && c.hero.note) {
        note.innerHTML = `<span class="ar">${c.hero.note.arabic || ''}</span><br>${c.hero.note.english || ''}<br><span style="font-size:18px;color:var(--ink-mute);">${c.hero.note.tagline || ''}</span>`;
      }

      const p1cap = document.querySelector('.collage-photo-1 .caption');
      if (p1cap && c.hero.polaroid1) p1cap.textContent = c.hero.polaroid1.caption;
      const p2cap = document.querySelector('.collage-photo-2 .caption');
      if (p2cap && c.hero.polaroid2) p2cap.textContent = c.hero.polaroid2.caption;

      const photo1 = document.getElementById('heroPhoto1');
      const photo2 = document.getElementById('heroPhoto2');
      if (photo1 && c.hero.polaroid1 && c.hero.polaroid1.cover) {
        photo1.style.backgroundImage = c.hero.polaroid1.cover.startsWith('data:')
          ? `url("${c.hero.polaroid1.cover}")`
          : `url("${enc(c.hero.polaroid1.cover)}")`;
      }
      if (photo2 && c.hero.polaroid2 && c.hero.polaroid2.cover) {
        photo2.style.backgroundImage = c.hero.polaroid2.cover.startsWith('data:')
          ? `url("${c.hero.polaroid2.cover}")`
          : `url("${enc(c.hero.polaroid2.cover)}")`;
      }
    }

    // Work
    if (c.work) {
      setText('#work .eyebrow', c.work.eyebrow);
      setText('#work .section-title-ar', c.work.titleAr);
      setHTML('#work .section-title', c.work.title);
      setHTML('#work .section-desc', c.work.description);
      const mini = document.getElementById('openBrandsModal');
      if (mini && c.work.miniCard) {
        const ml = mini.querySelector('.mini-label'); if (ml) ml.textContent = c.work.miniCard.label;
        const mn = mini.querySelector('.mini-name');  if (mn) mn.textContent = c.work.miniCard.name;
        const ms = mini.querySelector('.mini-sub');   if (ms) ms.textContent = c.work.miniCard.sub;
        if (c.work.miniCard.cover) mini.dataset.cover = c.work.miniCard.cover;
      }
    }

    // Brands
    if (c.brands) {
      setText('.brands-modal-header .eyebrow', c.brands.modalEyebrow);
      setHTML('.brands-modal-title', c.brands.modalTitle);
      const grid = document.querySelector('.brands-grid');
      if (grid && Array.isArray(c.brands.items)) {
        grid.innerHTML = c.brands.items.map(b => `
          <div class="brand-card ${b.featured ? 'featured' : ''}" data-project="${b.id}" data-cover="${b.cover || ''}">
            <div class="cover"></div>
            <div class="content">
              <div class="meta">
                <span class="meta-tag">${b.tag || ''}</span>
                <span class="meta-count">${b.count || ''}</span>
              </div>
              <h3 class="brand-name">${b.name || ''}</h3>
              <p class="brand-sub">${b.sub || ''}</p>
              <p class="brand-desc">${b.desc || ''}</p>
            </div>
            <div class="arrow">↗</div>
          </div>`).join('');
      }
    }

    // Projects → expose for script.js
    if (c.projects) window.__contentProjects = c.projects;

    // About
    if (c.about) {
      setText('#about .eyebrow', c.about.eyebrow);
      setText('#about .section-title-ar', c.about.titleAr);
      setHTML('#about .section-title', c.about.title);

      const portrait = document.querySelector('.portrait');
      if (portrait && c.about.portraitCover) {
        portrait.style.backgroundImage = c.about.portraitCover.startsWith('data:')
          ? `url("${c.about.portraitCover}")`
          : `url("${enc(c.about.portraitCover)}")`;
      }
      const cap = document.querySelector('.portrait-caption');
      if (cap) cap.innerHTML = `${c.about.portraitCaption || ''}<span class="small">${c.about.portraitLocation || ''}</span>`;

      const en = document.querySelector('.lang-en');
      const ar = document.querySelector('.lang-ar');
      if (en && Array.isArray(c.about.textEn)) en.innerHTML = c.about.textEn.map(p => `<p>${p}</p>`).join('');
      if (ar && Array.isArray(c.about.textAr)) ar.innerHTML = c.about.textAr.map(p => `<p>${p}</p>`).join('');

      const meta = document.querySelector('.about-meta');
      if (meta && Array.isArray(c.about.meta)) {
        meta.innerHTML = c.about.meta.map(m =>
          `<div class="meta-row"><span class="meta-label">${m.label}</span><span class="meta-value${m.accent ? ' accent' : ''}">${m.value}</span></div>`
        ).join('');
      }

      const skillsBlock = document.querySelector('.skills-block');
      if (skillsBlock && Array.isArray(c.about.skills)) {
        const titleHTML = skillsBlock.querySelector('.skills-title') ? skillsBlock.querySelector('.skills-title').outerHTML : '';
        skillsBlock.innerHTML = titleHTML + c.about.skills.map(s => `
          <div class="skill-row">
            <div class="skill-label">
              <span class="skill-name">${s.name} <em>· ${s.nameAr || ''}</em></span>
              <span class="skill-percent">${s.percent}%</span>
            </div>
            <div class="skill-bar"><div class="skill-fill" style="width: ${s.percent}%;"></div></div>
          </div>`).join('');
      }
    }

    // Chapter
    if (c.chapterBreak) {
      const breaks = document.querySelectorAll('.chapter-break .chapter-label');
      if (breaks[0]) breaks[0].textContent = c.chapterBreak.label;
      if (breaks[1]) breaks[1].textContent = c.chapterBreak.endLabel;
      setText('.chapter-sub', c.chapterBreak.sub);
    }

    // Agency
    if (c.agency) {
      const agencyMetaRow = document.querySelector('.agency-meta-row');
      if (agencyMetaRow && Array.isArray(c.agency.metaPieces)) {
        agencyMetaRow.innerHTML = c.agency.metaPieces.map((p, i) =>
          i === 0
            ? `<span class="agency-meta-piece"><span class="dot"></span> ${p}</span>`
            : `<span class="agency-meta-sep">·</span><span class="agency-meta-piece">${p}</span>`
        ).join('');
      }
      setText('.agency-arabic-mark', c.agency.arabicMark);
      const agencyName = document.querySelector('.agency-name');
      if (agencyName) agencyName.innerHTML = `${c.agency.name} <span class="agency-name-accent">${c.agency.nameAccent}</span>`;
      const tagline = document.querySelector('.agency-tagline');
      if (tagline) tagline.innerHTML = `${c.agency.tagline || ''}<br><span class="ar">${c.agency.arabicTag || ''}</span>`;
      setText('.agency-founder-pill', c.agency.founderPill);
      setText('.agency-founder-note', c.agency.founderNote);

      const servicesGrid = document.querySelector('.services-grid');
      if (servicesGrid && Array.isArray(c.agency.services)) {
        servicesGrid.innerHTML = c.agency.services.map(s =>
          `<div class="service"><div class="service-icon">${s.icon}</div><h4>${s.title}</h4><p>${s.desc}</p></div>`
        ).join('');
      }
    }

    // System
    if (c.system) {
      setText('#system .eyebrow', c.system.eyebrow);
      setText('#system .section-title-ar', c.system.titleAr);
      setHTML('#system .section-title', c.system.title);
      const intro = document.querySelector('.system-caption');
      if (intro && c.system.intro) {
        intro.innerHTML = `<span class="greeting">${c.system.intro.greeting || ''}</span>` +
          (c.system.intro.lines || []).map(l => `<p>${l}</p>`).join('');
      }
      const sysGrid = document.querySelector('.system-grid');
      if (sysGrid && Array.isArray(c.system.packages)) {
        sysGrid.innerHTML = c.system.packages.map(p => `
          <div class="system-card ${p.featured ? 'featured' : ''}">
            ${p.bestValueLabel ? `<div class="best-value">${p.bestValueLabel}</div>` : ''}
            <div class="system-card-top">
              <div class="system-emoji">${p.emoji}</div>
              <div class="system-variant">${p.variant}</div>
              <div class="system-format">${p.format}</div>
            </div>
            <ul class="system-features">${(p.features || []).map(f => `<li>${f}</li>`).join('')}</ul>
            <div class="system-price-row">
              <span class="price-old">${p.priceOld || ''}</span>
              <div class="price-new">${p.priceNew || ''}<span class="currency">${p.currency || ''}</span></div>
              <span class="price-badge">${p.priceBadge || ''}</span>
            </div>
            <a href="${p.ctaHref || '#'}" target="_blank" rel="noopener" class="system-btn ${p.featured ? 'primary' : ''}">
              <span class="wa-icon">💬</span> ${p.ctaLabel || ''}
            </a>
          </div>`).join('');
      }
      const sysNote = document.querySelector('.system-note');
      if (sysNote && c.system.note) {
        sysNote.innerHTML =
          `<p>${c.system.note.advice || ''}</p>` +
          `<p class="system-cta-line">${c.system.note.cta || ''}</p>` +
          `<p>${c.system.note.brief || ''}</p>` +
          `<p class="system-closing">${c.system.note.closing || ''}</p>`;
      }
    }

    // Contact
    if (c.contact) {
      setText('.contact-arabic', c.contact.arabicTitle);
      setHTML('.contact-title', c.contact.title);
      setHTML('.contact-desc', c.contact.description);
      const waCta = document.querySelector('.whatsapp-cta');
      if (waCta && c.contact.whatsapp) {
        waCta.href = c.contact.whatsapp.href;
        waCta.innerHTML = `<span class="wa-icon">💬</span><span><span class="wa-label">${c.contact.whatsapp.label}</span><span class="wa-number">${c.contact.whatsapp.number}</span></span><span class="wa-arrow">↗</span>`;
      }
      const socialRow = document.querySelector('.social-row');
      if (socialRow) {
        socialRow.innerHTML =
          `<a href="mailto:${c.contact.email || ''}" class="social-link"><span>@</span> ${c.contact.email || ''}</a>` +
          `<a href="${c.contact.linkedin || '#'}" target="_blank" rel="noopener" class="social-link"><span>in</span> LinkedIn</a>`;
      }
    }

    // Footer
    if (c.footer) {
      const footer = document.querySelector('.footer-meta');
      if (footer) footer.innerHTML = `© ${c.footer.year} Farsharp <span class="sep">·</span> ${c.footer.tagline}`;
    }
  }

  // Bootstrap: load content → apply → notify script.js
  function boot() {
    getContent().then(c => {
      window.__siteContent = c;
      apply(c);
      // Tell script.js it can bind events now
      window.__contentReady = true;
      document.dispatchEvent(new CustomEvent('content:ready', { detail: c }));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
