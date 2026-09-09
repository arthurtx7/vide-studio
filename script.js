/* ============================= STATE ============================= */
const DEFAULT_POS = { x: 50, y: 80 };
const state = {
  videos: [],           // {id, file, url, el, duration, pos:{x,y}}
  captionMode: 'perLine', // 'perLine' | 'shared'
  sharedCaption: '',
  activeVideoIndex: 0,
  format: '1080x1920',
  font: 'Inter',
  overlay: 30,
  shadow: true,
  bgBox: false,
  boxOpacity: 88,
  boxStyle: 'block',
  boxColor: '#000000',
  audioMode: 'original',   // 'original' | 'custom' | 'mute'
  audioVolume: 100,
  customAudio: null,       // {file, audioBuffer, name}
  slide: { size: 72, maxWidth: 80, weight: 'bold', color: '#FFFFFF', align: 'center' }
};
const results = []; // {blob, url, label}

const swatchColors = ['#FFFFFF','#000000','#FF3D77','#A6FF4D','#FFD166','#4DA6FF'];
const weightMap = { regular:'400', semibold:'600', bold:'700', black:'900' };

/* ============================= DOM ============================= */
const $ = (id) => document.getElementById(id);
const dropzone = $('dropzone'), fileInput = $('fileInput'), thumbs = $('thumbs');
const phrasesInput = $('phrasesInput');
const countVideos = $('countVideos'), countPhrases = $('countPhrases'), countPosts = $('countPosts');
const generateBtn = $('generateBtn');
const progressWrap = $('progressWrap'), progressBar = $('progressBar');
const resultsEl = $('results'), resultsEmpty = $('resultsEmpty'), footerActions = $('footerActions');

/* ============================= UPLOAD ============================= */
dropzone.addEventListener('click', () => fileInput.click());
['dragover','dragenter'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function handleFiles(fileList){
  const wasEmpty = state.videos.length === 0;
  [...fileList].forEach(file => {
    if(!file.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.src = url;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = 'auto';
    const entry = { id: crypto.randomUUID(), file, url, el, duration: 0, pos: { ...DEFAULT_POS } };
    el.addEventListener('loadedmetadata', () => {
      entry.duration = el.duration;
      renderThumbs(); updateCounts();
    });
    state.videos.push(entry);
  });
  renderThumbs(); updateCounts();
  if(wasEmpty && state.videos.length > 0){
    setActiveVideo(0);
  }
}

function fmtDur(s){
  if(!s || !isFinite(s)) return '';
  const m = Math.floor(s/60), sec = Math.round(s%60);
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

function setActiveVideo(i){
  if(state.videos.length === 0){ state.activeVideoIndex = 0; return; }
  if(i < 0 || i >= state.videos.length) i = 0;
  state.activeVideoIndex = i;
  state.videos.forEach((v, idx) => {
    if(idx === i) v.el.play().catch(()=>{});
    else v.el.pause();
  });
  renderThumbs();
  syncPosSliders();
  const lbl = $('activeVideoLabel');
  if(lbl) lbl.textContent = `Vídeo ${i+1}`;
}

function renderThumbs(){
  thumbs.innerHTML = '';
  state.videos.forEach((v, i) => {
    const div = document.createElement('div');
    div.className = 'thumb' + (i === state.activeVideoIndex ? ' active-edit' : '');
    div.innerHTML = `<video src="${v.url}" muted loop playsinline autoplay></video><span class="num">${i+1}</span><span class="dur">${fmtDur(v.duration)}</span><button data-id="${v.id}">✕</button>`;
    div.addEventListener('click', (e) => {
      if(e.target.tagName === 'BUTTON') return;
      setActiveVideo(i);
    });
    thumbs.appendChild(div);
  });
  thumbs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.videos = state.videos.filter(v => v.id !== btn.dataset.id);
      if(state.activeVideoIndex >= state.videos.length) state.activeVideoIndex = Math.max(0, state.videos.length - 1);
      renderThumbs(); updateCounts();
      if(state.videos[state.activeVideoIndex]) state.videos[state.activeVideoIndex].el.play().catch(()=>{});
    });
  });
}

/* ============================= LEGENDA (por vídeo / compartilhada) ============================= */
const sharedCaptionInput = $('sharedCaptionInput');
document.querySelectorAll('#captionModeToggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    state.captionMode = btn.dataset.mode;
    document.querySelectorAll('#captionModeToggle button').forEach(b => b.classList.toggle('active', b===btn));
    const isShared = state.captionMode === 'shared';
    phrasesInput.style.display = isShared ? 'none' : '';
    sharedCaptionInput.style.display = isShared ? '' : 'none';
    $('captionModeHint').textContent = isShared
      ? 'A mesma legenda vai em todos os vídeos. A posição dela ainda pode ser movida individualmente em cada vídeo, no preview.'
      : 'Cada linha vira a legenda de 1 vídeo, na ordem: linha 1 → vídeo 1, linha 2 → vídeo 2...';
    updateCounts();
  });
});
sharedCaptionInput.addEventListener('input', e => { state.sharedCaption = e.target.value; updateCounts(); });

function getPhrases(){
  return phrasesInput.value.split('\n').map(s => s.trim()).filter(Boolean);
}

function getPhraseForIndex(i){
  if(state.captionMode === 'shared') return state.sharedCaption.trim();
  const phrases = getPhrases();
  return phrases[i] || '';
}

/* ============================= COUNTS ============================= */
phrasesInput.addEventListener('input', () => updateCounts());

function updateCounts(){
  let phrasesCount, posts;
  if(state.captionMode === 'shared'){
    const has = state.sharedCaption.trim() !== '';
    phrasesCount = has ? state.videos.length : 0;
    posts = has ? state.videos.length : 0;
  } else {
    const phrases = getPhrases();
    phrasesCount = phrases.length;
    posts = Math.min(state.videos.length, phrases.length);
  }
  countVideos.textContent = state.videos.length;
  countPhrases.textContent = phrasesCount;
  countPosts.textContent = posts;
  generateBtn.textContent = `Gerar ${posts} vídeo${posts===1?'':'s'}`;
  generateBtn.disabled = posts === 0;
}

/* ============================= TEMPLATE SETTINGS UI ============================= */
function buildTextSettings(){
  const s = state.slide;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="field">
      <label>Tamanho <span class="val">${s.size}px</span></label>
      <input type="range" min="24" max="140" value="${s.size}" data-k="size">
    </div>
    <div class="field">
      <label>Largura máx <span class="val">${s.maxWidth}%</span></label>
      <input type="range" min="30" max="100" value="${s.maxWidth}" data-k="maxWidth">
    </div>
    <div class="field">
      <label>Peso</label>
      <div class="weight-btns">
        ${Object.keys(weightMap).map(w => `<button data-w="${w}" class="${s.weight===w?'active':''}">${w[0].toUpperCase()+w.slice(1)}</button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>Cor</label>
      <div class="swatches">
        ${swatchColors.map(c => `<button class="swatch ${s.color.toLowerCase()===c.toLowerCase()?'active':''}" style="background:${c};${c==='#FFFFFF'?'box-shadow:inset 0 0 0 1px #444':''}" data-c="${c}"></button>`).join('')}
        <input type="color" class="color-custom" value="${s.color}">
      </div>
    </div>
    <div class="field">
      <label>Alinhamento</label>
      <div class="align-btns">
        <button data-a="left" class="${s.align==='left'?'active':''}">Esq.</button>
        <button data-a="center" class="${s.align==='center'?'active':''}">Centro</button>
        <button data-a="right" class="${s.align==='right'?'active':''}">Dir.</button>
      </div>
    </div>
    <div class="field">
      <label>Posição X <span class="val" id="posXVal">${DEFAULT_POS.x}%</span></label>
      <input type="range" min="0" max="100" value="${DEFAULT_POS.x}" id="posXRange">
    </div>
    <div class="field">
      <label>Posição Y <span class="val" id="posYVal">${DEFAULT_POS.y}%</span></label>
      <input type="range" min="0" max="100" value="${DEFAULT_POS.y}" id="posYRange">
    </div>
  `;
  wrap.querySelectorAll('input[type=range][data-k]').forEach(inp => {
    inp.addEventListener('input', () => {
      const k = inp.dataset.k;
      s[k] = Number(inp.value);
      const label = inp.previousElementSibling;
      if(label){ const valEl = label.querySelector('.val'); if(valEl) valEl.textContent = inp.value + (k==='size'?'px':'%'); }
    });
  });
  wrap.querySelectorAll('.weight-btns button').forEach(btn => {
    btn.addEventListener('click', () => {
      s.weight = btn.dataset.w;
      wrap.querySelectorAll('.weight-btns button').forEach(b => b.classList.toggle('active', b===btn));
    });
  });
  wrap.querySelectorAll('.align-btns button').forEach(btn => {
    btn.addEventListener('click', () => {
      s.align = btn.dataset.a;
      wrap.querySelectorAll('.align-btns button').forEach(b => b.classList.toggle('active', b===btn));
    });
  });
  wrap.querySelectorAll('.swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      s.color = btn.dataset.c;
      wrap.querySelectorAll('.swatch').forEach(b => b.classList.toggle('active', b===btn));
    });
  });
  wrap.querySelector('.color-custom').addEventListener('input', (e) => {
    s.color = e.target.value;
  });
  wrap.querySelector('#posXRange').addEventListener('input', (e) => {
    setActivePosValue('x', Number(e.target.value));
  });
  wrap.querySelector('#posYRange').addEventListener('input', (e) => {
    setActivePosValue('y', Number(e.target.value));
  });
  return wrap;
}
$('textSettings1').appendChild(buildTextSettings());

function getActivePos(){
  const v = state.videos[state.activeVideoIndex];
  return v ? v.pos : DEFAULT_POS;
}

function setActivePosValue(axis, val){
  const pos = getActivePos();
  pos[axis] = val;
  const rangeEl = $(axis === 'x' ? 'posXRange' : 'posYRange');
  const valEl = $(axis === 'x' ? 'posXVal' : 'posYVal');
  if(rangeEl) rangeEl.value = val;
  if(valEl) valEl.textContent = val + '%';
}

function syncPosSliders(){
  const pos = getActivePos();
  const xr = $('posXRange'), yr = $('posYRange');
  if(xr){ xr.value = pos.x; $('posXVal').textContent = pos.x + '%'; }
  if(yr){ yr.value = pos.y; $('posYVal').textContent = pos.y + '%'; }
}

$('resetPosBtn').addEventListener('click', () => {
  const v = state.videos[state.activeVideoIndex];
  if(!v) return;
  v.pos = { ...DEFAULT_POS };
  syncPosSliders();
});

$('applyPosAllBtn').addEventListener('click', () => {
  const v = state.videos[state.activeVideoIndex];
  if(!v) return;
  const pos = { ...v.pos };
  state.videos.forEach(vv => vv.pos = { ...pos });
});

/* ============================= ARRASTAR NO PREVIEW PRA POSICIONAR ============================= */
const cvEl = $('cv1');
let draggingPos = false;

function posFromEvent(e){
  const rect = cvEl.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const xPct = Math.min(100, Math.max(0, ((clientX-rect.left)/rect.width)*100));
  const yPct = Math.min(100, Math.max(0, ((clientY-rect.top)/rect.height)*100));
  return { x: Math.round(xPct), y: Math.round(yPct) };
}
function handleDragMove(e){
  if(!draggingPos) return;
  if(!state.videos[state.activeVideoIndex]) return;
  const { x, y } = posFromEvent(e);
  setActivePosValue('x', x);
  setActivePosValue('y', y);
  e.preventDefault();
}
cvEl.addEventListener('mousedown', e => { draggingPos = true; handleDragMove(e); });
window.addEventListener('mousemove', handleDragMove);
window.addEventListener('mouseup', () => { draggingPos = false; });
cvEl.addEventListener('touchstart', e => { draggingPos = true; handleDragMove(e); }, { passive:false });
window.addEventListener('touchmove', handleDragMove, { passive:false });
window.addEventListener('touchend', () => { draggingPos = false; });

$('formatSelect').addEventListener('change', e => { state.format = e.target.value; applyFormat(); });
$('fontSelect').addEventListener('change', e => { state.font = e.target.value; });
$('overlayRange').addEventListener('input', e => { state.overlay = Number(e.target.value); $('overlayVal').textContent = e.target.value+'%'; });
$('shadowToggle').addEventListener('change', e => { state.shadow = e.target.checked; });
$('boxToggle').addEventListener('change', e => { state.bgBox = e.target.checked; });
$('boxOpacityRange').addEventListener('input', e => { state.boxOpacity = Number(e.target.value); $('boxOpacityVal').textContent = e.target.value+'%'; });
document.querySelectorAll('#boxStyleToggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    state.boxStyle = btn.dataset.style;
    document.querySelectorAll('#boxStyleToggle button').forEach(b => b.classList.toggle('active', b===btn));
  });
});
document.querySelectorAll('#boxColorSwatches .swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    state.boxColor = btn.dataset.c;
    document.querySelectorAll('#boxColorSwatches .swatch').forEach(b => b.classList.toggle('active', b===btn));
    $('boxColorCustom').value = btn.dataset.c;
  });
});
$('boxColorCustom').addEventListener('input', e => {
  state.boxColor = e.target.value;
  document.querySelectorAll('#boxColorSwatches .swatch').forEach(b => b.classList.remove('active'));
});

/* ============================= ÁUDIO ============================= */
const audioHints = {
  original: 'O áudio original de cada vídeo é mantido na gravação.',
  custom: 'O áudio enviado substitui o áudio original em todos os vídeos gerados. Se for mais curto que o vídeo, toca em loop até o fim.',
  mute: 'Os vídeos gerados saem sem áudio nenhum.'
};

document.querySelectorAll('#audioModeToggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    state.audioMode = btn.dataset.mode;
    document.querySelectorAll('#audioModeToggle button').forEach(b => b.classList.toggle('active', b===btn));
    $('customAudioField').style.display = state.audioMode === 'custom' ? '' : 'none';
    updateAudioHint();
  });
});

function updateAudioHint(){
  if(state.audioMode === 'custom' && !state.customAudio){
    $('audioHint').textContent = 'Envie um áudio abaixo — até lá, os vídeos saem mudos.';
  } else {
    $('audioHint').textContent = audioHints[state.audioMode];
  }
}

const audioDropzone = $('audioDropzone'), audioFileInput = $('audioFileInput');
audioDropzone.addEventListener('click', () => audioFileInput.click());
['dragover','dragenter'].forEach(ev => audioDropzone.addEventListener(ev, e => { e.preventDefault(); audioDropzone.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => audioDropzone.addEventListener(ev, e => { e.preventDefault(); audioDropzone.classList.remove('drag'); }));
audioDropzone.addEventListener('drop', e => { if(e.dataTransfer.files[0]) loadCustomAudio(e.dataTransfer.files[0]); });
audioFileInput.addEventListener('change', e => { if(e.target.files[0]) loadCustomAudio(e.target.files[0]); });

async function loadCustomAudio(file){
  if(!file.type.startsWith('audio/')) return;
  $('audioFileName').textContent = `Carregando ${file.name}...`;
  try{
    const arrayBuffer = await file.arrayBuffer();
    const tmpCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await tmpCtx.decodeAudioData(arrayBuffer);
    await tmpCtx.close();
    state.customAudio = { file, audioBuffer, name: file.name };
    $('audioFileName').textContent = file.name;
  } catch(err){
    $('audioFileName').textContent = 'Adicionar áudio';
    state.customAudio = null;
    alert('Não consegui ler esse arquivo de áudio. Tenta um .mp3 ou .wav.');
  }
  updateAudioHint();
}

$('audioVolumeRange').addEventListener('input', e => {
  state.audioVolume = Number(e.target.value);
  $('audioVolumeVal').textContent = e.target.value + '%';
});

function applyFormat(){
  const [w,h] = state.format.split('x').map(Number);
  $('cv1').width = w; $('cv1').height = h;
}

/* ============================= EMOJI (APPLE-STYLE) RENDERING ============================= */
const EMOJI_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/';
const emojiCache = new Map(); // unified -> {img, ok}
const emojiRegex = /\p{Extended_Pictographic}/u;
const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('pt', { granularity: 'grapheme' }) : null;

function graphemes(text){
  if(segmenter){
    return [...segmenter.segment(text)].map(s => s.segment);
  }
  return [...text];
}

function toUnified(cluster){
  return [...cluster].map(ch => ch.codePointAt(0).toString(16)).join('-');
}

function getEmojiImage(cluster){
  const unified = toUnified(cluster);
  if(emojiCache.has(unified)) return emojiCache.get(unified);
  const entry = { img: new Image(), ok: null };
  entry.img.crossOrigin = 'anonymous';
  entry.img.onload = () => { entry.ok = true; };
  entry.img.onerror = () => { entry.ok = false; };
  entry.img.src = EMOJI_CDN + unified + '.png';
  emojiCache.set(unified, entry);
  return entry;
}

function tokenize(text){
  const clusters = graphemes(text);
  const tokens = [];
  let buffer = '';
  for(const cl of clusters){
    if(emojiRegex.test(cl) && cl.trim() !== ''){
      if(buffer){ tokens.push({type:'text', value:buffer}); buffer=''; }
      tokens.push({type:'emoji', cluster: cl});
    } else {
      buffer += cl;
    }
  }
  if(buffer) tokens.push({type:'text', value:buffer});
  return tokens;
}

function wrapTokens(ctx, text, maxWidth, fontSize){
  const words = [];
  tokenize(text).forEach(tok => {
    if(tok.type === 'emoji'){
      words.push([{ type:'emoji', cluster: tok.cluster }]);
    } else {
      tok.value.split(/(\s+)/).forEach(part => {
        if(part === '') return;
        if(/^\s+$/.test(part)){
          if(words.length) words[words.length-1].push({type:'space'});
        } else {
          words.push([{type:'text', value: part}]);
        }
      });
    }
  });
  const lines = [];
  let current = [];
  let currentWidth = 0;
  const spaceWidth = ctx.measureText(' ').width;

  function wordWidth(word){
    return word.reduce((sum, piece) => {
      if(piece.type === 'text') return sum + ctx.measureText(piece.value).width;
      if(piece.type === 'emoji') return sum + fontSize;
      if(piece.type === 'space') return sum + spaceWidth;
      return sum;
    }, 0);
  }

  words.forEach(word => {
    const w = wordWidth(word);
    if(currentWidth + w > maxWidth && current.length > 0){
      lines.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push(...word);
    currentWidth += w;
  });
  if(current.length) lines.push(current);
  return lines;
}

function lineWidth(ctx, line, fontSize){
  const spaceWidth = ctx.measureText(' ').width;
  return line.reduce((sum, piece) => {
    if(piece.type === 'text') return sum + ctx.measureText(piece.value).width;
    if(piece.type === 'emoji') return sum + fontSize;
    if(piece.type === 'space') return sum + spaceWidth;
    return sum;
  }, 0);
}

function hexToRgba(hex, alpha){
  const h = hex.replace('#','');
  const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  const bigint = parseInt(full, 16);
  const r = (bigint>>16)&255, g = (bigint>>8)&255, b = bigint&255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRichText(ctx, text, cfg, canvasW, canvasH){
  const { size, maxWidthPct, weight, color, align, xPct, yPct } = cfg;
  const maxWidth = canvasW * (maxWidthPct/100);
  ctx.font = `${weightMap[weight]} ${size}px ${state.font}, sans-serif`;
  ctx.textBaseline = 'alphabetic';

  const lines = wrapTokens(ctx, text, maxWidth, size);
  const lineHeight = size * 1.25;
  const totalHeight = lines.length * lineHeight;

  const cx = canvasW * (xPct/100);
  const cy = canvasH * (yPct/100);
  let startY = cy - totalHeight/2 + size*0.85;

  const boxFill = hexToRgba(state.boxColor, state.boxOpacity/100);

  if(state.bgBox && state.boxStyle === 'block'){
    let maxLineW = 0;
    lines.forEach(line => { maxLineW = Math.max(maxLineW, lineWidth(ctx, line, size)); });
    const padX = size*0.35, padY = size*0.3;
    ctx.save();
    ctx.fillStyle = boxFill;
    const boxW = maxLineW + padX*2;
    const boxH = totalHeight + padY*2;
    let boxX = cx - boxW/2;
    if(align==='left') boxX = cx - padX;
    if(align==='right') boxX = cx - boxW + padX;
    roundRect(ctx, boxX, cy - boxH/2, boxW, boxH, 14);
    ctx.fill();
    ctx.restore();
  }

  lines.forEach((line, i) => {
    const lw = lineWidth(ctx, line, size);
    let startX;
    if(align === 'left') startX = cx;
    else if(align === 'right') startX = cx - lw;
    else startX = cx - lw/2;

    const y = startY + i*lineHeight;
    let x = startX;

    if(state.bgBox && state.boxStyle === 'perLine'){
      const padX = size*0.3, padY = size*0.2;
      const boxW = lw + padX*2;
      const boxH = lineHeight - size*0.1;
      const boxX = startX - padX;
      ctx.save();
      ctx.fillStyle = boxFill;
      roundRect(ctx, boxX, y - size*0.82, boxW, boxH, size*0.16);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if(state.shadow){
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = size*0.12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = size*0.04;
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'left';

    line.forEach(piece => {
      if(piece.type === 'text'){
        ctx.fillText(piece.value, x, y);
        x += ctx.measureText(piece.value).width;
      } else if(piece.type === 'space'){
        x += ctx.measureText(' ').width;
      } else if(piece.type === 'emoji'){
        const entry = getEmojiImage(piece.cluster);
        if(entry.ok){
          ctx.drawImage(entry.img, x, y - size*0.85, size, size);
        } else if(entry.ok === false){
          ctx.fillText(piece.cluster, x, y);
        }
        x += size;
      }
    });
    ctx.restore();
  });
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

/* ============================= CANVAS DRAWING ============================= */
function getMediaSize(el){
  if(el instanceof HTMLVideoElement) return [el.videoWidth || 1, el.videoHeight || 1];
  return [el.width, el.height];
}

function drawCover(ctx, media, w, h){
  const [mw, mh] = getMediaSize(media);
  const ir = mw / mh, cr = w / h;
  let sw, sh, sx, sy;
  if(ir > cr){ sh = mh; sw = sh*cr; sy = 0; sx = (mw-sw)/2; }
  else { sw = mw; sh = sw/cr; sx = 0; sy = (mh-sh)/2; }
  ctx.drawImage(media, sx, sy, sw, sh, 0, 0, w, h);
}

function drawSlide(canvas, media, text, pos){
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const p = pos || DEFAULT_POS;
  ctx.clearRect(0,0,w,h);
  if(media && media.videoWidth){
    drawCover(ctx, media, w, h);
  } else {
    ctx.fillStyle = '#232028';
    ctx.fillRect(0,0,w,h);
  }
  if(state.overlay > 0){
    ctx.fillStyle = `rgba(0,0,0,${state.overlay/100})`;
    ctx.fillRect(0,0,w,h);
  }
  if(text){
    const s = state.slide;
    drawRichText(ctx, text, {
      size: s.size * (w/1080),
      maxWidthPct: s.maxWidth,
      weight: s.weight,
      color: s.color,
      align: s.align,
      xPct: p.x,
      yPct: p.y
    }, w, h);
  }
}

/* ============================= LIVE PREVIEW LOOP ============================= */
let previewRAF = null;
function startPreviewLoop(){
  if(previewRAF) cancelAnimationFrame(previewRAF);
  const loop = () => {
    const activeEntry = state.videos[state.activeVideoIndex];
    const phrase = getPhraseForIndex(state.activeVideoIndex) || 'Sua frase aparece aqui 😉';
    const media = activeEntry ? activeEntry.el : null;
    const pos = activeEntry ? activeEntry.pos : DEFAULT_POS;
    drawSlide($('cv1'), media, phrase, pos);
    previewRAF = requestAnimationFrame(loop);
  };
  loop();
}
startPreviewLoop();

/* ============================= GENERATE (REAL VIDEO RENDER) ============================= */
function pickMimeType(){
  const options = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(const m of options){
    if(window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

async function renderVideoOutput(videoEntry, phrase, w, h){
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;

  const vid = document.createElement('video');
  vid.src = videoEntry.url;
  vid.muted = true; // áudio sempre roteado explicitamente via Web Audio abaixo
  vid.playsInline = true;
  vid.preload = 'auto';
  await new Promise(res => {
    if(vid.readyState >= 1) return res();
    vid.onloadedmetadata = res;
  });

  const canvasStream = canvas.captureStream(30);

  let audioCtx = null;
  let audioTracks = [];
  let customSourceNode = null;

  if(state.audioMode !== 'mute'){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended'){ try{ await audioCtx.resume(); }catch(e){} }

    const dest = audioCtx.createMediaStreamDestination();
    const gain = audioCtx.createGain();
    gain.gain.value = state.audioVolume / 100;
    gain.connect(dest);
    gain.connect(audioCtx.destination); // deixa você ouvir enquanto grava

    if(state.audioMode === 'original'){
      try{
        const srcNode = audioCtx.createMediaElementSource(vid);
        srcNode.connect(gain);
      } catch(e){ /* vídeo sem faixa de áudio ou navegador sem suporte */ }
    } else if(state.audioMode === 'custom' && state.customAudio){
      customSourceNode = audioCtx.createBufferSource();
      customSourceNode.buffer = state.customAudio.audioBuffer;
      customSourceNode.loop = true;
      customSourceNode.connect(gain);
    }

    audioTracks = dest.stream.getAudioTracks();
  }

  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(combined, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);
  const chunks = [];
  recorder.ondataavailable = e => { if(e.data.size > 0) chunks.push(e.data); };

  const finished = new Promise(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });

  let drawing = true;
  function drawFrame(){
    if(!drawing) return;
    drawSlide(canvas, vid, phrase, videoEntry.pos);
    requestAnimationFrame(drawFrame);
  }

  const cleanup = () => {
    if(!drawing) return;
    drawing = false;
    if(recorder.state !== 'inactive') recorder.stop();
    if(customSourceNode){ try{ customSourceNode.stop(); }catch(e){} }
    if(audioCtx){ audioCtx.close().catch(()=>{}); }
  };

  vid.onended = cleanup;

  recorder.start();
  vid.currentTime = 0;
  if(customSourceNode) customSourceNode.start(0);
  try{ await vid.play(); } catch(e){ /* alguns navegadores exigem gesto do usuário; o clique no botão já conta */ }
  drawFrame();

  // salvaguarda: se onended não disparar (ex: vídeo sem duração definida), encerra pelo tempo estimado
  const safetyMs = (videoEntry.duration ? videoEntry.duration*1000 : 15000) + 800;
  setTimeout(cleanup, safetyMs);

  return finished;
}

/* ============================= GERAR (GRAVAR DIRETO EM WEBM) ============================= */
generateBtn.addEventListener('click', async () => {
  let total;
  if(state.captionMode === 'shared'){
    total = state.sharedCaption.trim() ? state.videos.length : 0;
  } else {
    const phrases = getPhrases();
    total = Math.min(state.videos.length, phrases.length);
  }
  if(total === 0) return;

  generateBtn.disabled = true;
  progressWrap.style.display = '';
  progressBar.style.width = '0%';

  results.length = 0;
  resultsEl.innerHTML = '';
  renderResults();

  const [w,h] = state.format.split('x').map(Number);

  for(let i=0; i<total; i++){
    generateBtn.textContent = `Gravando ${i+1}/${total}...`;
    const webmBlob = await renderVideoOutput(state.videos[i], getPhraseForIndex(i), w, h);
    results.push({ blob: webmBlob, label: `Vídeo ${i+1}` });
    renderResults();
    progressBar.style.width = `${Math.round(((i+1)/total)*100)}%`;
  }

  generateBtn.disabled = false;
  updateCounts();
  setTimeout(() => { progressWrap.style.display = 'none'; }, 600);
});

function renderResults(){
  resultsEl.innerHTML = '';
  if(results.length === 0){
    resultsEmpty.style.display = '';
    footerActions.style.display = 'none';
    return;
  }
  resultsEmpty.style.display = 'none';
  footerActions.style.display = '';

  results.forEach((r, idx) => {
    const url = URL.createObjectURL(r.blob);
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <video src="${url}" controls muted playsinline></video>
      <div class="rc-foot">
        <span>${r.label}</span>
        <button class="btn btn-ghost btn-sm" data-idx="${idx}">Baixar</button>
      </div>
    `;
    resultsEl.appendChild(card);
  });

  resultsEl.querySelectorAll('button[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = results[btn.dataset.idx];
      const a = document.createElement('a');
      a.href = URL.createObjectURL(r.blob);
      a.download = `${r.label.replace(/\s+/g,'_').replace(/[^\w-]/g,'')}.webm`;
      a.click();
    });
  });
}

$('downloadAllBtn').addEventListener('click', async () => {
  const zip = new JSZip();
  results.forEach((r, idx) => {
    zip.file(`${r.label.replace(/\s+/g,'_').replace(/[^\w-]/g,'')}_${idx+1}.webm`, r.blob);
  });
  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = 'video-studio.zip';
  a.click();
});

/* ============================= INIT ============================= */
applyFormat();
updateCounts();
renderResults();
