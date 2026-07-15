// ====== ADMIN PANEL LOGIC ======
const ADMIN_PASSWORD = 'farsharp2025';
const STORAGE_KEY = 'farsharp_content_override';
const SESSION_KEY = 'farsharp_admin_session';

let content = null;

// ===== HELPERS =====
function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = obj;
  for (const k of keys) {
    if (target[k] == null || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  target[last] = value;
}
function showStatus(text, type = '') {
  const el = document.getElementById('adminStatus');
  el.textContent = text;
  el.className = 'admin-status ' + type;
  if (type !== 'saving' && type !== 'error') {
    setTimeout(() => { if (el.textContent === text) { el.textContent = 'جاهز'; el.className = 'admin-status'; } }, 2200);
  }
}
function readImageAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== LOGIN =====
function checkLogin() {
  const sess = sessionStorage.getItem(SESSION_KEY);
  if (sess === '1') showAdmin();
}
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('passwordInput').value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, '1');
    showAdmin();
  } else {
    document.getElementById('loginError').textContent = 'كلمة السر غلط';
    document.getElementById('passwordInput').value = '';
  }
});

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'block';
  loadContent();
}

document.getElementById('btnLogout').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});

// ===== LOAD CONTENT =====
async function loadContent() {
  // Try localStorage first
  let local = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) local = JSON.parse(raw);
  } catch (e) {}

  if (local && local.version) {
    content = local;
    renderAll();
    showStatus('تم التحميل من localStorage');
    return;
  }

  // Fall back to content.json
  try {
    const res = await fetch('content.json', { cache: 'no-store' });
    if (res.ok) {
      content = await res.json();
      renderAll();
      showStatus('تم التحميل من content.json');
      return;
    }
  } catch (e) {}

  // Last resort: empty
  content = { version: 1 };
  renderAll();
  showStatus('لم يتم العثور على content.json', 'error');
}

// ===== TABS =====
document.querySelectorAll('.admin-tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.tab-panel[data-tab="${tab.dataset.tab}"]`).classList.add('active');
  });
});

// ===== RENDER ALL =====
function renderAll() {
  // Bind all data-bind fields (input/textarea)
  document.querySelectorAll('[data-bind]').forEach(el => {
    if (el.classList.contains('repeater')) return; // handle below
    if (el.classList.contains('image-uploader')) return;
    const path = el.dataset.bind;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const val = getPath(content, path);
      if (el.type === 'checkbox') el.checked = !!val;
      else el.value = val == null ? '' : val;
      // wire change handler
      if (!el.dataset.wired) {
        el.addEventListener('input', () => {
          const v = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value);
          setPath(content, path, v);
          autoSave();
        });
        el.dataset.wired = '1';
      }
    }
  });

  // Bind image uploaders
  document.querySelectorAll('.image-uploader').forEach(uploader => {
    bindImageUploader(uploader);
  });

  // Repeaters
  document.querySelectorAll('.repeater').forEach(rep => {
    renderRepeater(rep);
  });

  // Projects manager
  renderProjects();
}

function bindImageUploader(uploader) {
  const path = uploader.dataset.bind;
  const preview = uploader.querySelector('.img-preview');
  const fileInput = uploader.querySelector('.img-file');
  const pathInput = uploader.querySelector('.img-path');
  const cur = getPath(content, path) || '';
  pathInput.value = cur;
  if (cur) {
    preview.src = cur.startsWith('data:') ? cur : encodeURI(cur);
    uploader.classList.add('has-image');
  } else {
    preview.src = '';
    uploader.classList.remove('has-image');
  }

  if (!uploader.dataset.wired) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await readImageAsDataURL(file);
        setPath(content, path, dataUrl);
        pathInput.value = dataUrl;
        preview.src = dataUrl;
        uploader.classList.add('has-image');
        autoSave();
        showStatus('تم رفع الصورة');
      } catch (err) { showStatus('فشل رفع الصورة', 'error'); }
    });
    pathInput.addEventListener('input', () => {
      const v = pathInput.value.trim();
      setPath(content, path, v);
      if (v) {
        preview.src = v.startsWith('data:') ? v : encodeURI(v);
        uploader.classList.add('has-image');
      } else {
        preview.src = '';
        uploader.classList.remove('has-image');
      }
      autoSave();
    });
    uploader.dataset.wired = '1';
  }
}

// ===== REPEATERS =====
function renderRepeater(rep) {
  const path = rep.dataset.bind;
  const fields = JSON.parse(rep.dataset.fields);
  const isStringArr = rep.dataset.stringArray === 'true';
  let arr = getPath(content, path);
  if (!Array.isArray(arr)) { arr = []; setPath(content, path, arr); }

  rep.innerHTML = '';
  arr.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'repeater-item';
    const itemValue = isStringArr ? { _text: item } : item;
    card.innerHTML = `
      <div class="repeater-item-header">
        <span class="repeater-item-title">عنصر #${idx + 1}</span>
        <div class="repeater-item-actions">
          <button data-action="up" title="فوق">↑</button>
          <button data-action="down" title="تحت">↓</button>
          <button data-action="remove" title="حذف">✕</button>
        </div>
      </div>
      <div class="field-grid"></div>
    `;
    const grid = card.querySelector('.field-grid');
    fields.forEach(f => {
      const field = document.createElement('div');
      field.className = 'field' + (f.type === 'textarea' || f.type === 'image' || f.type === 'stringArray' ? ' full' : '');
      if (f.type === 'checkbox') {
        field.classList.add('field-row', 'checkbox-row');
        field.innerHTML = `<input type="checkbox" ${itemValue[f.key] ? 'checked' : ''}><label>${f.label}</label>`;
        field.querySelector('input').addEventListener('change', (e) => {
          if (isStringArr) arr[idx] = e.target.checked; else item[f.key] = e.target.checked;
          autoSave();
        });
      } else if (f.type === 'textarea') {
        field.innerHTML = `<label>${f.label}</label><textarea rows="3"></textarea>`;
        const ta = field.querySelector('textarea');
        ta.value = itemValue[f.key] == null ? '' : itemValue[f.key];
        ta.addEventListener('input', () => {
          if (isStringArr) arr[idx] = ta.value; else item[f.key] = ta.value;
          autoSave();
        });
      } else if (f.type === 'image') {
        field.innerHTML = `<label>${f.label}</label>
          <div class="image-uploader">
            <img class="img-preview" src="" alt="">
            <input type="file" accept="image/*" class="img-file">
            <input type="text" class="img-path" placeholder="../path/image.png">
          </div>`;
        const u = field.querySelector('.image-uploader');
        const prv = u.querySelector('.img-preview');
        const fi = u.querySelector('.img-file');
        const pi = u.querySelector('.img-path');
        const cur = item[f.key] || '';
        pi.value = cur;
        if (cur) { prv.src = cur.startsWith('data:') ? cur : encodeURI(cur); u.classList.add('has-image'); }
        fi.addEventListener('change', async (e) => {
          const file = e.target.files[0]; if (!file) return;
          try {
            const url = await readImageAsDataURL(file);
            item[f.key] = url; pi.value = url; prv.src = url;
            u.classList.add('has-image'); autoSave();
            showStatus('تم رفع الصورة');
          } catch (er) {}
        });
        pi.addEventListener('input', () => {
          item[f.key] = pi.value.trim();
          if (pi.value) { prv.src = pi.value.startsWith('data:') ? pi.value : encodeURI(pi.value); u.classList.add('has-image'); }
          else { prv.src = ''; u.classList.remove('has-image'); }
          autoSave();
        });
      } else if (f.type === 'stringArray') {
        field.innerHTML = `<label>${f.label}</label><textarea rows="4" placeholder="سطر لكل عنصر"></textarea>`;
        const ta = field.querySelector('textarea');
        ta.value = Array.isArray(item[f.key]) ? item[f.key].join('\n') : '';
        ta.addEventListener('input', () => {
          item[f.key] = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
          autoSave();
        });
      } else if (f.type === 'number') {
        field.innerHTML = `<label>${f.label}</label><input type="number" value="${itemValue[f.key] == null ? '' : itemValue[f.key]}">`;
        field.querySelector('input').addEventListener('input', (e) => {
          if (isStringArr) arr[idx] = Number(e.target.value); else item[f.key] = Number(e.target.value);
          autoSave();
        });
      } else {
        field.innerHTML = `<label>${f.label}</label><input type="text" value="${(itemValue[f.key] == null ? '' : itemValue[f.key]).toString().replace(/"/g, '&quot;')}">`;
        field.querySelector('input').addEventListener('input', (e) => {
          if (isStringArr) arr[idx] = e.target.value; else item[f.key] = e.target.value;
          autoSave();
        });
      }
      grid.appendChild(field);
    });

    // Actions
    card.querySelector('[data-action="remove"]').addEventListener('click', () => {
      if (confirm('متأكد عايز تحذف العنصر ده؟')) { arr.splice(idx, 1); renderRepeater(rep); autoSave(); }
    });
    card.querySelector('[data-action="up"]').addEventListener('click', () => {
      if (idx > 0) { [arr[idx], arr[idx-1]] = [arr[idx-1], arr[idx]]; renderRepeater(rep); autoSave(); }
    });
    card.querySelector('[data-action="down"]').addEventListener('click', () => {
      if (idx < arr.length - 1) { [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]]; renderRepeater(rep); autoSave(); }
    });

    rep.appendChild(card);
  });

  // Add button
  const addBtn = document.createElement('button');
  addBtn.className = 'repeater-add';
  addBtn.type = 'button';
  addBtn.textContent = '+ إضافة عنصر جديد';
  addBtn.addEventListener('click', () => {
    if (isStringArr) arr.push('');
    else {
      const newItem = {};
      fields.forEach(f => {
        if (f.type === 'checkbox') newItem[f.key] = false;
        else if (f.type === 'number') newItem[f.key] = 0;
        else if (f.type === 'stringArray') newItem[f.key] = [];
        else newItem[f.key] = '';
      });
      arr.push(newItem);
    }
    renderRepeater(rep);
    autoSave();
  });
  rep.appendChild(addBtn);
}

// ===== PROJECTS MANAGER =====
function renderProjects() {
  const wrap = document.getElementById('projectsManager');
  if (!wrap) return;
  if (!content.projects) content.projects = {};
  wrap.innerHTML = '';
  Object.entries(content.projects).forEach(([key, proj]) => {
    const block = document.createElement('div');
    block.className = 'project-block';
    block.innerHTML = `
      <div class="project-block-header">
        <div class="field-grid">
          <div class="field"><label>ID</label><input type="text" value="${key}" data-projkey="${key}" class="proj-id"></div>
          <div class="field"><label>العنوان</label><input type="text" value="${(proj.title || '').replace(/"/g, '&quot;')}" class="proj-title"></div>
          <div class="field full"><label>اسم الفولدر (للصور غير المرفوعة)</label><input type="text" value="${(proj.folder || '').replace(/"/g, '&quot;')}" class="proj-folder"></div>
        </div>
        <button class="btn-secondary" data-remove-project="${key}">حذف المشروع</button>
      </div>
      <div class="project-block-images"></div>
    `;
    const imgGrid = block.querySelector('.project-block-images');

    (proj.images || []).forEach((img, idx) => {
      const tile = document.createElement('div');
      tile.className = 'project-image-tile';
      const isObj = typeof img === 'object' && img !== null;
      const file = isObj ? img.file : img;
      const folder = isObj ? img.folder : (proj.folder || '');
      const src = (file && file.startsWith && file.startsWith('data:')) ? file : encodeURI('../' + folder + '/' + file);
      tile.innerHTML = `
        <img src="${src}" alt="">
        <div class="filename">${file}</div>
        <button class="remove-img" title="حذف">×</button>
      `;
      tile.querySelector('.remove-img').addEventListener('click', () => {
        proj.images.splice(idx, 1);
        renderProjects();
        autoSave();
      });
      imgGrid.appendChild(tile);
    });

    // Add image tile
    const addTile = document.createElement('label');
    addTile.className = 'add-image-tile';
    addTile.innerHTML = `<span>+</span><span>إضافة صورة</span><input type="file" accept="image/*" style="display:none;">`;
    addTile.querySelector('input').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const url = await readImageAsDataURL(file);
        proj.images = proj.images || [];
        proj.images.push(url);
        renderProjects();
        autoSave();
        showStatus('تم رفع الصورة');
      } catch (er) {}
    });
    imgGrid.appendChild(addTile);

    // Wire ID rename
    block.querySelector('.proj-id').addEventListener('change', (e) => {
      const newKey = e.target.value.trim();
      if (!newKey || newKey === key) return;
      content.projects[newKey] = content.projects[key];
      delete content.projects[key];
      renderProjects();
      autoSave();
    });
    block.querySelector('.proj-title').addEventListener('input', (e) => {
      proj.title = e.target.value;
      autoSave();
    });
    block.querySelector('.proj-folder').addEventListener('input', (e) => {
      proj.folder = e.target.value;
      autoSave();
    });
    block.querySelector('[data-remove-project]').addEventListener('click', () => {
      if (confirm(`متأكد عايز تحذف مشروع "${key}"؟`)) {
        delete content.projects[key];
        renderProjects();
        autoSave();
      }
    });

    wrap.appendChild(block);
  });
}

document.getElementById('btnAddProject').addEventListener('click', () => {
  const key = prompt('ID المشروع الجديد (لاتيني):');
  if (!key) return;
  if (content.projects[key]) { alert('الـ ID ده موجود قبل كده'); return; }
  content.projects[key] = { title: 'مشروع جديد', folder: '', images: [] };
  renderProjects();
  autoSave();
});

// ===== AUTO-SAVE =====
let autoSaveTimer = null;
function autoSave() {
  clearTimeout(autoSaveTimer);
  showStatus('جاري الحفظ...', 'saving');
  autoSaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
      showStatus('تم الحفظ ✓');
    } catch (e) {
      showStatus('فشل الحفظ (الذاكرة ممتلئة)', 'error');
    }
  }, 500);
}

// ===== SAVE / EXPORT / IMPORT =====
document.getElementById('btnSaveNow').addEventListener('click', () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    showStatus('تم الحفظ — افتح المعاينة');
  } catch (e) {
    showStatus('فشل الحفظ', 'error');
  }
});

document.getElementById('btnPreview').addEventListener('click', () => {
  window.open('index.html', '_blank');
});

document.getElementById('btnExport').addEventListener('click', () => {
  content.lastUpdated = new Date().toISOString().split('T')[0];
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  showStatus('تم التنزيل ✓ حط الملف في فولدر الموقع');
});

document.getElementById('btnImport').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});
document.getElementById('importFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.version) throw new Error('Not a valid content.json');
      content = parsed;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(content)); } catch (e) {}
      renderAll();
      showStatus('تم الاستيراد ✓');
    } catch (err) {
      showStatus('ملف غير صالح', 'error');
    }
  };
  reader.readAsText(file);
});

// ===== INIT =====
checkLogin();
