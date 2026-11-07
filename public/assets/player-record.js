const knownKinds = new Set(['main', 'archive', 'hozen', 'audit']);
const endLabels = {end1:'END 1', end2:'END 2', end3:'END 3'};
const groupLabels = {public:'施設サイト', members:'会員サイト', archive:'資料室', agency:'照会先のサイト'};
const groupOrder = ['public', 'members', 'archive', 'agency'];
const boundRoots = new WeakSet();
let current = null;
let activeRoot = null;
let contextRequest = null;
let visitQueue = Promise.resolve();
const pendingVisits = new Set();
let recordedMarker = '';
let selectedEnd = '';
let restartBusy = false;
let confirmation = null;
let imageResult = null;
let imageRequest = 0;
let readyWait = null;
let mutationEpoch = 0;
const updateStorageKey = 'asunaro-player-record-update';

function element(tag, className, text) {
 const node = document.createElement(tag);
 if (className) node.className = className;
 if (text !== undefined) node.textContent = text;
 return node;
}

function endingId(value) { return Object.hasOwn(endLabels, value) ? value : ''; }
function safePath(value) {
 if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
 try { return new URL(value, 'https://path.invalid').pathname; } catch { return null; }
}
function originBase(value) {
 if (typeof value !== 'string') return null;
 try {
  const url = new URL(value, location.origin);
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  url.search = ''; url.hash = ''; url.username = ''; url.password = '';
  return url.href.replace(/\/+$/, '');
 } catch { return null; }
}
function routeUrl(kind, path) {
 const base = originBase(current?.origins?.[kind]);
 const pathname = safePath(path);
 if (!base || !pathname) return null;
 const url = new URL(base + pathname);
 if (['hozen','audit'].includes(kind) && ['/receive/','/received/'].includes(pathname) && /^[a-f0-9]{48}$/.test(current?.caseId || '')) {
  url.searchParams.set('case', current.caseId);
 }
 return url.href;
}
function mainUrl() { return routeUrl('main', '/'); }
function recordUrl() { return routeUrl('main', '/player-record/'); }
function timeValue(value) {
 const date = new Date(value);
 return Number.isFinite(date.getTime()) ? date : null;
}
function displayDate(value) {
 const date = timeValue(value);
 return date ? new Intl.DateTimeFormat('ja-JP', {year:'numeric', month:'2-digit', day:'2-digit'}).format(date) : '';
}
function normalizeContext(data) {
 if (!data || typeof data !== 'object' || !originBase(data.origins?.main)) throw new Error('探索記録を読み込めませんでした。');
 const endings = new Map();
 for (const row of Array.isArray(data.endings) ? data.endings : []) {
  const id = endingId(row?.id);
  if (id && !endings.has(id)) endings.set(id, {id, reachedAt:row.reachedAt});
 }
 const visits = new Map();
 for (const row of Array.isArray(data.visits) ? data.visits : []) {
  const path = safePath(row?.path);
  if (!knownKinds.has(row?.kind) || !path || typeof row.title !== 'string') continue;
  visits.set(row.kind + ':' + path, {...row, path, title:row.title.slice(0, 240)});
 }
 return {...data, ending:endingId(data.ending), endings:[...endings.values()], visits:[...visits.values()]};
}

function staticBridge() {
 if (typeof window.asunaroPlayerBridge === 'function') return Promise.resolve(window.asunaroPlayerBridge);
 if (readyWait) return readyWait;
 readyWait = new Promise((resolve, reject) => {
  const finish = () => {
   if (typeof window.asunaroPlayerBridge !== 'function') return;
   clearTimeout(timer);
   document.removeEventListener('asunaro:player-ready', finish);
   resolve(window.asunaroPlayerBridge);
  };
  const timer = setTimeout(() => {
   document.removeEventListener('asunaro:player-ready', finish);
   reject(new Error('探索記録の準備を確認できませんでした。もう一度読み込んでください。'));
  }, 20000);
  document.addEventListener('asunaro:player-ready', finish);
  finish();
 }).finally(() => { readyWait = null; });
 return readyWait;
}

async function request(action, input = {}) {
 if (document.querySelector('meta[name="asunaro-static"]') || typeof window.asunaroPlayerBridge === 'function') {
  const bridge = await staticBridge();
  return normalizeContext(await bridge(action, action === 'context' ? input : {...input, csrf:current?.csrf || ''}));
 }
 const endpoint = new URL('/player-record/api/', location.origin);
 const options = {credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json'}};
 if (action !== 'context') {
  const body = new URLSearchParams({action, csrf:current?.csrf || ''});
  for (const [key, value] of Object.entries(input)) if (value !== undefined && value !== null) body.set(key, String(value));
  options.method = 'POST'; options.body = body;
  if (action === 'visit') options.keepalive = true;
 }
 const controller = new AbortController();
 options.signal = controller.signal;
 const timeout = setTimeout(() => controller.abort(), 20000);
 let response, data;
 try {
  response = await fetch(endpoint, options);
  data = await response.json();
 } catch { throw new Error('探索記録を読み込めませんでした。時間をおいて、もう一度お確かめください。'); }
 finally { clearTimeout(timeout); }
 if (!response.ok) {
  const error = new Error(typeof data?.error === 'string' ? data.error : '記録を更新できませんでした。もう一度お確かめください。');
  error.status = response.status;
  throw error;
 }
 return normalizeContext(data);
}

function announce(node, text = '', error = false) {
 if (!node) return;
 node.textContent = text;
 node.dataset.error = String(error);
}
function rootNode(selector) { return activeRoot?.isConnected ? activeRoot.querySelector(selector) : null; }
function shareStatus(text, error = false) { announce(rootNode('[data-player-share-status]'), text, error); }

function discardImage() {
 if (imageResult) URL.revokeObjectURL(imageResult.url);
 imageResult = null;
 imageRequest++;
 const preview = rootNode('[data-player-image-preview]');
 if (preview) preview.hidden = true;
 const image = rootNode('[data-player-image]');
 if (image) image.removeAttribute('src');
 for (const name of ['[data-player-image-actions]', '[data-player-image-help]']) {
  const node = rootNode(name); if (node) node.hidden = true;
 }
}

function setContext(data) {
 const previousSignature = current ? shareData().signature : '';
 current = data;
 const available = current.endings.map(row => row.id);
 if (!available.includes(selectedEnd)) selectedEnd = available.includes(current.ending) ? current.ending : (available.at(-1) || '');
 if (previousSignature && previousSignature !== shareData().signature) discardImage();
 if (confirmation && String(current.revision) !== String(confirmation.revision) && !restartBusy) {
  const dialog = document.querySelector('[data-player-restart-dialog]');
  if (dialog?.open) {
   announce(dialog.querySelector('[data-player-restart-status]'), '別のタブなどで記録が更新されました。いったん閉じ、戻す内容を確認し直してください。', true);
   dialog.querySelector('[data-player-restart-confirm]').disabled = true;
  }
 }
 updateHomeLinks();
 renderRecord();
 renderEndingPanel();
}

function updateHomeLinks() {
 const url = mainUrl();
 if (!url) return;
 for (const link of document.querySelectorAll('[data-player-home]')) link.href = url;
}

async function loadContext({quiet = false} = {}) {
 if (contextRequest) return contextRequest;
 const root = activeRoot;
 if (!quiet) announce(root?.querySelector('[data-player-status]'), '記録を読み込んでいます。');
 const epoch = mutationEpoch;
 contextRequest = request('context').then(data => {
  if (epoch !== mutationEpoch) return current || data;
  setContext(data);
  if (root?.isConnected) {
   root.querySelector('[data-player-reload]').hidden = true;
   announce(root.querySelector('[data-player-status]'), '同じブラウザーで続けた探索の記録です。');
  }
  return data;
 }).catch(error => {
  if (root?.isConnected) {
   announce(root.querySelector('[data-player-status]'), error.message, true);
   root.querySelector('[data-player-reload]').hidden = false;
  }
  throw error;
 }).finally(() => { contextRequest = null; });
 return contextRequest;
}

function marker() {
 if (document.body.dataset.playerPending === 'true') return null;
 const kind = document.body.dataset.explorationKind;
 const path = safePath(document.body.dataset.explorationPath);
 if (!knownKinds.has(kind) || !path || path === '/player-record/') return null;
 return {kind, path};
}
function pageTitle(page) {
 if (page.path.endsWith('/search/')) return 'サイト内検索';
 if (page.path.endsWith('/console/subjects/')) return '被験者の測定原票';
 if (page.path.includes('/console/')) return '研究コンソール';
 const title = document.title.replace(/\s*[|｜]\s*(?:あすなろ産業支援交流施設|あすなろ会員サイト|産業継続研究資料 保存室|記録保全受付)\s*$/u, '').trim();
 const label = ['hozen','audit'].includes(page.kind) ? page.path === '/received/' ? '：受付控え' : page.path === '/receive/' ? '：資料の提出' : '' : '';
 return ((title || 'ページ') + label).replace(/\s+/gu, ' ').slice(0, 180);
}
async function recordVisiblePage() {
 const page = marker();
 if (!page) return;
 const key = page.kind + ':' + page.path;
 if (recordedMarker === key || pendingVisits.has(key)) return;
 const input = {...page, title:pageTitle(page), stage:document.body.dataset.asunaroStage || ''};
 pendingVisits.add(key);
 const epoch = mutationEpoch;
 const pending = visitQueue.catch(() => {}).then(() => request('visit', input)).then(data => {
  recordedMarker = key;
  if (epoch === mutationEpoch) setContext(data);
 }).finally(() => { pendingVisits.delete(key); });
 visitQueue = pending;
 await pending;
}

function visitGroup(row) {
 if (row.kind === 'main') return row.path.startsWith('/members/') ? 'members' : 'public';
 return row.kind === 'archive' ? 'archive' : 'agency';
}
function searchKey(text) { return String(text).normalize('NFKC').replace(/\s+/gu, '').toLocaleLowerCase('ja-JP'); }

function renderVisits() {
 const host = rootNode('[data-player-visits]');
 if (!host || !current) return;
 const query = searchKey(rootNode('[data-player-visit-search]').value);
 const group = rootNode('[data-player-visit-group]').value;
 const all = current.visits.filter(row => routeUrl(row.kind, row.path));
 const rows = all.filter(row => (!query || searchKey(row.title).includes(query)) && (group === 'all' || visitGroup(row) === group));
 rows.sort((a, b) => (timeValue(b.lastVisitedAt)?.getTime() || 0) - (timeValue(a.lastVisitedAt)?.getTime() || 0));
 const focusedLink = host.contains(document.activeElement) ? document.activeElement.closest('a')?.href : '';
 host.replaceChildren();
 rootNode('[data-player-visit-count]').textContent = all.length + '件';
 rootNode('[data-player-filter-status]').textContent = query || group !== 'all' ? rows.length + '件を表示しています。' : '';
 if (!rows.length) {
  host.append(element('p', 'pr-empty', all.length ? '条件に合うページはありません。' : '訪れたページがここに並びます。'));
  return;
 }
 for (const id of groupOrder) {
  const entries = rows.filter(row => visitGroup(row) === id);
  if (!entries.length) continue;
  const section = element('section', 'pr-visit-group');
  section.append(element('h3', '', groupLabels[id]));
  const list = element('ul', 'pr-visit-list');
  for (const row of entries) {
   const item = element('li');
   const link = element('a', 'pr-visit-link'); link.href = routeUrl(row.kind, row.path);
   if (row.kind === 'main' && row.path.startsWith('/members/')) {
    link.target = '_blank'; link.rel = 'noopener';
   }
   link.append(element('span', 'pr-visit-title', row.title));
   if (link.target === '_blank') link.append(element('span', 'pr-sr-only', '（別タブで開きます）'));
   const date = displayDate(row.lastVisitedAt);
   if (date) { const time = element('time', '', date); time.dateTime = timeValue(row.lastVisitedAt).toISOString(); link.append(time); }
   item.append(link); list.append(item);
  }
  section.append(list); host.append(section);
 }
 if (focusedLink) [...host.querySelectorAll('a')].find(link => link.href === focusedLink)?.focus({preventScroll:true});
}

function shareData() {
 const id = current?.endings.some(row => row.id === selectedEnd) ? selectedEnd : '';
 const label = endLabels[id] || '';
 const count = current?.visits.length || 0;
 const url = mainUrl() || '';
 const sentence = label ? `『あすなろ』で${label}を見届けました。訪れたページは${count}件。` : `『あすなろ』を探索中。訪れたページは${count}件。`;
 const text = sentence + '\n' + url + '\n#あすなろ探索記録';
 return {id, label, count, url, sentence, text, signature:[id, count, url].join('|')};
}
function xUrl(data) {
 const url = new URL('https://twitter.com/intent/tweet');
 url.searchParams.set('text', data.sentence + '\n#あすなろ探索記録');
 url.searchParams.set('url', data.url);
 return url.href;
}
function renderShare() {
 const field = rootNode('[data-player-share-text]');
 if (!field || !current) return;
 const data = shareData(); field.value = data.text;
 rootNode('[data-player-x]').href = xUrl(data);
 rootNode('[data-player-native-share]').hidden = typeof navigator.share !== 'function';
}

function renderRecord() {
 if (!activeRoot?.isConnected || !current) return;
 rootNode('[data-player-record-content]').hidden = false;
 const host = rootNode('[data-player-endings]');
 const focusedEnd = host.contains(document.activeElement) ? document.activeElement.value : '';
 host.replaceChildren();
 const description = activeRoot.querySelector('.pr-endings-section .pr-section-heading>p');
 description.hidden = !current.endings.length;
 if (!current.endings.length) host.append(element('p', 'pr-empty', '見届けた結末の記録は、ここに残ります。'));
 for (const row of current.endings) {
  const label = element('label', 'pr-ending-choice');
  const input = document.createElement('input'); input.type = 'radio'; input.name = 'pr-share-ending'; input.value = row.id;
  input.checked = row.id === selectedEnd; input.setAttribute('aria-label', endLabels[row.id] + 'を共有する記録に選ぶ');
  label.append(input, element('strong', '', endLabels[row.id]));
  const date = displayDate(row.reachedAt);
  if (date) { const time = element('time', '', date + ' 記録'); time.dateTime = timeValue(row.reachedAt).toISOString(); label.append(time); }
  input.addEventListener('change', () => { selectedEnd = row.id; discardImage(); renderShare(); shareStatus(''); });
  host.append(label);
 }
 if (focusedEnd) [...host.querySelectorAll('input')].find(input => input.value === focusedEnd)?.focus({preventScroll:true});
 const group = rootNode('[data-player-visit-group]'); const previous = group.value;
 const existing = new Set(current.visits.map(visitGroup));
 group.replaceChildren(new Option('すべて', 'all'));
 for (const id of groupOrder) if (existing.has(id)) group.add(new Option(groupLabels[id], id));
 group.value = [...group.options].some(option => option.value === previous) ? previous : 'all';
 rootNode('[data-player-restart-section]').hidden = !current.ending;
 renderShare(); renderVisits();
}

async function copyText(text, status, field) {
 try {
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
  else {
   const target = field || document.createElement('textarea');
   const temporary = !field;
   if (temporary) { target.value = text; target.style.position = 'fixed'; target.style.top = '-1000px'; document.body.append(target); }
   target.focus(); target.select();
   const success = document.execCommand('copy');
   if (temporary) target.remove();
   if (!success) throw new Error('copy');
  }
  announce(status, '共有する本文をコピーしました。');
 } catch {
  if (field) { field.focus(); field.select(); }
  announce(status, field ? 'コピーできませんでした。本文を選択した状態からコピーしてください。' : 'コピーできませんでした。探索記録のページから本文を選択してコピーできます。', true);
 }
}
async function nativeShare(data, status) {
 try {
  await navigator.share({title:'あすなろ 探索記録', text:data.sentence + '\n#あすなろ探索記録', url:data.url});
  announce(status, '共有の操作を終えました。');
 } catch (error) {
  if (error.name !== 'AbortError') announce(status, '端末の共有を開けませんでした。本文のコピーや画像の保存をご利用ください。', true);
 }
}

function wrapCanvas(context, text, maxWidth) {
 const lines = []; let line = '';
 for (const letter of Array.from(text)) {
  if (line && context.measureText(line + letter).width > maxWidth) { lines.push(line); line = letter; }
  else line += letter;
 }
 if (line) lines.push(line);
 return lines;
}
async function createImage() {
 const root = activeRoot;
 const button = rootNode('[data-player-image-create]');
 if (!root || !button || button.disabled || !current) return;
 const data = shareData(); const requestId = ++imageRequest;
 button.disabled = true; announce(root.querySelector('[data-player-share-status]'), '画像を作成しています。');
 try {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  const font = '"Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
  context.fillStyle = '#f6f3e9'; context.fillRect(0, 0, 1200, 630);
  context.fillStyle = '#193e38'; context.textBaseline = 'alphabetic';
  context.font = '700 49px ' + font; context.fillText('あすなろ', 76, 108);
  context.font = '22px ' + font; context.fillStyle = '#596d63'; context.fillText('探索の記録', 78, 151);
  context.strokeStyle = '#bbc7b2'; context.lineWidth = 2; context.beginPath(); context.moveTo(76, 187); context.lineTo(1124, 187); context.stroke();
  context.fillStyle = '#193e38'; context.font = '700 ' + (data.label ? '78px ' : '62px ') + font;
  context.fillText(data.label ? data.label + ' に到達' : '探索を続けています', 76, 294);
  context.font = '34px ' + font; context.fillText('訪れたページ　' + data.count.toLocaleString('ja-JP') + ' 件', 78, 371);
  context.fillStyle = '#596d63'; context.font = '21px ' + font; context.fillText('物語の続きは、ご自身で。', 78, 438);
  context.font = '19px ' + font;
  const urlLines = wrapCanvas(context, data.url, 1040);
  urlLines.slice(0, 3).forEach((line, index) => context.fillText(line, 78, 499 + index * 25));
  context.font = '17px ' + font; context.fillText('ⓒYU-ZORA', 78, 594);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('png')), 'image/png'));
  if (!root.isConnected) return;
  if (requestId !== imageRequest || shareData().signature !== data.signature) {
   announce(root.querySelector('[data-player-share-status]'), '共有する記録が更新されました。画像を作成し直してください。');
   return;
  }
  if (imageResult) URL.revokeObjectURL(imageResult.url);
  const filename = 'asunaro-record' + (data.id ? '-' + data.id : '') + '.png';
  imageResult = {blob, url:URL.createObjectURL(blob), file:new File([blob], filename, {type:'image/png'}), signature:data.signature};
  const preview = root.querySelector('[data-player-image]'); preview.src = imageResult.url;
  preview.alt = '探索の記録。' + (data.label ? data.label + 'に到達。' : '') + '訪れたページ' + data.count + '件。';
  root.querySelector('[data-player-image-preview]').hidden = false;
  const download = root.querySelector('[data-player-image-download]'); download.href = imageResult.url; download.download = filename;
  root.querySelector('[data-player-image-open]').href = imageResult.url;
  root.querySelector('[data-player-image-actions]').hidden = false;
  root.querySelector('[data-player-image-help]').hidden = false;
  let canShare = false;
  try { canShare = typeof navigator.share === 'function' && !!navigator.canShare?.({files:[imageResult.file]}); } catch { /* File sharing is optional. */ }
  root.querySelector('[data-player-image-share]').hidden = !canShare;
  announce(root.querySelector('[data-player-share-status]'), '画像を作成しました。プレビューを確認して保存できます。');
 } catch {
  if (root.isConnected) announce(root.querySelector('[data-player-share-status]'), '画像を作成できませんでした。本文の共有は引き続きご利用いただけます。', true);
 } finally { if (button.isConnected) button.disabled = false; }
}

async function openRestart() {
 if (restartBusy) return;
 const button = rootNode('[data-player-restart-open]');
 if (!button || button.disabled) return;
 button.disabled = true;
 try {
  await loadContext({quiet:true});
  if (!current.ending || !activeRoot?.isConnected) return;
  const dialog = document.querySelector('[data-player-restart-dialog]');
  confirmation = {revision:current.revision, ending:current.ending};
  dialog.querySelector('[data-player-restart-current]').textContent = '現在の記録：' + endLabels[current.ending];
  announce(dialog.querySelector('[data-player-restart-status]'));
  dialog.querySelector('[data-player-restart-confirm]').disabled = false;
  dialog.showModal();
 } catch (error) { announce(rootNode('[data-player-status]'), error.message, true); }
 finally { if (button.isConnected) button.disabled = false; }
}
async function restart() {
 if (restartBusy || !confirmation || !current?.ending) return;
 const dialog = document.querySelector('[data-player-restart-dialog]');
 const status = dialog?.querySelector('[data-player-restart-status]');
 if (!dialog?.open || dialog.querySelector('[data-player-restart-confirm]').disabled) return;
 if (String(current.revision) !== String(confirmation.revision) || current.ending !== confirmation.ending) {
  announce(status, '探索記録が更新されました。戻す内容を確認し直してください。', true); return;
 }
 restartBusy = true;
 mutationEpoch++;
 let restarted = false;
 const buttons = [...dialog.querySelectorAll('button')]; buttons.forEach(button => { button.disabled = true; });
 dialog.setAttribute('aria-busy', 'true'); announce(status, '結末と提出状況を戻しています。');
 try {
  const data = await request('restart', {revision:confirmation.revision});
  confirmation = null; setContext(data);
  dialog.close();
  restarted = true;
  announce(rootNode('[data-player-status]'), '現在の結末と提出状況を戻しました。記録にあるページから探索を続けられます。');
 } catch (error) {
  announce(status, error.status === 409 ? '別のタブなどで記録が更新されました。いったん閉じ、戻す内容を確認し直してください。' : error.message, true);
  if (error.status === 409) {
   confirmation = null;
   try { await loadContext({quiet:true}); } catch { /* Preserve the visible record after a failed refresh. */ }
  }
 } finally {
  restartBusy = false; dialog.removeAttribute('aria-busy');
  buttons.forEach(button => { button.disabled = false; });
  if (!confirmation && dialog.open) dialog.querySelector('[data-player-restart-confirm]').disabled = true;
  if (restarted) {
   try { localStorage.setItem(updateStorageKey, String(Date.now()) + ':' + Math.random().toString(36).slice(2)); } catch { /* Focus and pageshow still refresh the record. */ }
   window.dispatchEvent(new CustomEvent('asunaro:player-change', {detail:{action:'restart'}}));
  }
 }
}

function bindRoot(root) {
 if (boundRoots.has(root)) return;
 boundRoots.add(root);
 root.querySelector('[data-player-reload]').addEventListener('click', () => { void loadContext().catch(() => {}); });
 root.querySelector('[data-player-visit-search]').addEventListener('input', renderVisits);
 root.querySelector('[data-player-visit-group]').addEventListener('change', renderVisits);
 root.querySelector('[data-player-copy]').addEventListener('click', () => { void copyText(shareData().text, root.querySelector('[data-player-share-status]'), root.querySelector('[data-player-share-text]')); });
 root.querySelector('[data-player-native-share]').addEventListener('click', () => { void nativeShare(shareData(), root.querySelector('[data-player-share-status]')); });
 root.querySelector('[data-player-image-create]').addEventListener('click', () => { void createImage(); });
 root.querySelector('[data-player-image-share]').addEventListener('click', () => {
  if (!imageResult || imageResult.signature !== shareData().signature) return;
  const status = root.querySelector('[data-player-share-status]');
  void navigator.share({title:'あすなろ 探索記録', files:[imageResult.file]}).catch(error => {
   if (error.name !== 'AbortError') announce(status, '画像の共有を開けませんでした。「PNGを保存」か「画像を開く」をご利用ください。', true);
  });
 });
 root.querySelector('[data-player-restart-open]').addEventListener('click', () => { void openRestart(); });
 const dialog = document.querySelector('[data-player-restart-dialog]');
 if (dialog) {
  dialog.querySelector('[data-player-restart-cancel]').addEventListener('click', () => { if (!restartBusy) dialog.close(); });
  dialog.querySelector('[data-player-restart-confirm]').addEventListener('click', () => { void restart(); });
  dialog.addEventListener('cancel', event => { if (restartBusy) event.preventDefault(); });
  dialog.addEventListener('close', () => { confirmation = null; });
 }
}

function renderEndingPanel() {
 const markerEnd = endingId(document.body.dataset.explorationEnding);
 const existing = document.getElementById('asunaro-ending-record');
 const show = document.body.dataset.playerPending !== 'true' && markerEnd && markerEnd === current?.ending && recordUrl();
 if (!show) { existing?.remove(); return; }
 const signature = [markerEnd, current?.visits.length, mainUrl()].join('|');
 if (existing?.dataset.signature === signature) return;
 existing?.remove();
 const footer = document.querySelector('.fiction-footer'); if (!footer) return;
 const panel = element('section', 'pr-ending-panel'); panel.id = 'asunaro-ending-record'; panel.dataset.ending = markerEnd;
 panel.dataset.signature = signature;
 panel.setAttribute('aria-labelledby', 'asunaro-ending-title');
 panel.append(element('p', 'pr-eyebrow', '探索の記録'));
 const heading = element('h2', '', endLabels[markerEnd]); heading.id = 'asunaro-ending-title'; panel.append(heading);
 panel.append(element('p', '', 'この結末を見届けました。記録を振り返ったり、探索のあとを共有できます。'));
 if (markerEnd === 'end2') {
  const url = routeUrl('main', '/news/staff-change/');
  if (url && new URL(url).pathname !== location.pathname) {
   const note = element('p', 'pr-ending-afterword');
   const aftermath = element('a', '', '施設のお知らせを読む'); aftermath.href = url;
   note.append(aftermath); panel.append(note);
  }
 }
 const actions = element('div', 'pr-actions');
 const link = element('a', 'pr-button', '探索記録と共有'); link.href = recordUrl(); actions.append(link);
 const data = {...shareData(), id:markerEnd, label:endLabels[markerEnd]};
 data.sentence = `『あすなろ』で${data.label}を見届けました。訪れたページは${data.count}件。`;
 data.text = data.sentence + '\n' + data.url + '\n#あすなろ探索記録';
 const x = element('a', 'pr-button pr-button-quiet', 'Xで共有'); x.href = xUrl(data); x.target = '_blank'; x.rel = 'noopener noreferrer'; actions.append(x);
 x.setAttribute('aria-label', 'Xで共有（別タブで開きます）');
 const status = element('p', 'pr-action-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
 if (typeof navigator.share === 'function') {
  const share = element('button', 'pr-button pr-button-quiet', '端末で共有'); share.type = 'button'; share.addEventListener('click', () => { void nativeShare(data, status); }); actions.append(share);
 }
 const copy = element('button', 'pr-button pr-button-quiet', '本文をコピー'); copy.type = 'button'; copy.addEventListener('click', () => { void copyText(data.text, status); }); actions.append(copy);
 panel.append(actions, status); footer.before(panel);
}

export async function initPlayerRecord() {
 activeRoot = document.querySelector('[data-player-record-root]');
 if (activeRoot) bindRoot(activeRoot);
 if (document.body.dataset.playerPending === 'true' || restartBusy) return;
 try {
  await loadContext({quiet:!!current});
  await recordVisiblePage();
 } catch { /* An unavailable record must not block the fictional website. */ }
}

document.addEventListener('asunaro:page-ready', () => { void initPlayerRecord(); });
document.addEventListener('asunaro:player-ready', () => { void initPlayerRecord(); });
window.addEventListener('focus', () => { void initPlayerRecord(); });
window.addEventListener('storage', event => { if (event.key === updateStorageKey || activeRoot?.isConnected || document.body.dataset.explorationEnding) void initPlayerRecord(); });
window.addEventListener('pageshow', event => { if (event.persisted) recordedMarker = ''; void initPlayerRecord(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) void initPlayerRecord(); });
void initPlayerRecord();
