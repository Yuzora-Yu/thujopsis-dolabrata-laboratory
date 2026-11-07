const kinds = new Set(['main', 'archive', 'hozen', 'audit']);
const stages = new Set(['seed', 'root', 'sprout', 'sapling', 'branch', 'canopy', 'heartwood']);
const endingIds = new Set(['end1', 'end2', 'end3']);
export const maxPlayerVisits = 1000;

export class PlayerStateError extends Error {
 constructor(message, status = 400) { super(message); this.status = status; }
}
const timestamp = value => {
 const time = new Date(value);
 if (!Number.isFinite(time.getTime())) throw new PlayerStateError('記録日時を確認できませんでした。');
 return time.toISOString();
};
const storedTime = (value, fallback) => {
 try { return typeof value === 'string' ? timestamp(value) : fallback; } catch { return fallback; }
};
export function canonicalVisit(input) {
 if (!input || !kinds.has(input.kind) || typeof input.path !== 'string' || input.path.length > 1024
     || !input.path.startsWith('/') || input.path.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(input.path))
  throw new PlayerStateError('閲覧記録のページを確認できませんでした。');
 let url, decoded;
 try { url = new URL(input.path, 'https://player.invalid'); decoded = decodeURIComponent(url.pathname); }
 catch { throw new PlayerStateError('閲覧記録のページを確認できませんでした。'); }
 if (url.origin !== 'https://player.invalid' || /[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//'))
  throw new PlayerStateError('閲覧記録のページを確認できませんでした。');
 let path = url.pathname.replace(/\/{2,}/g, '/').replace(/\/index\.html$/, '/');
 if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
 const title = typeof input.title === 'string' ? input.title.replace(/\s+/g, ' ').trim() : '';
 const stage = typeof input.stage === 'string' ? input.stage.toLowerCase() : '';
 if (!title || title.length > 240 || /[<>\u0000-\u001f\u007f]/.test(title) || !stages.has(stage))
  throw new PlayerStateError('閲覧記録の見出しを確認できませんでした。');
 return {kind: input.kind, path, title, stage};
}

export function normalizePlayerState(state, now = Date.now()) {
 const at = timestamp(now);
 state.revision = Number.isSafeInteger(state.revision) && state.revision >= 0 ? state.revision : 0;
 const endings = new Map();
 for (const entry of Array.isArray(state.endings) ? state.endings : []) {
  if (!endingIds.has(entry?.id)) continue;
  const reachedAt = storedTime(entry.reachedAt, at), previous = endings.get(entry.id);
  if (!previous || reachedAt < previous.reachedAt) endings.set(entry.id, {id: entry.id, reachedAt});
 }
 if (endingIds.has(state.ending) && !endings.has(state.ending)) endings.set(state.ending, {id: state.ending, reachedAt: at});
 state.endings = [...endings.values()].sort((a, b) => a.reachedAt.localeCompare(b.reachedAt));
 const visits = new Map();
 for (const item of Array.isArray(state.visits) ? state.visits : []) {
  let page;
  try { page = canonicalVisit(item); } catch { continue; }
  const key = page.kind + ':' + page.path, previous = visits.get(key);
  const first = storedTime(item.firstVisitedAt, at), last = storedTime(item.lastVisitedAt, first);
  if (!previous && visits.size >= maxPlayerVisits) continue;
  const metadata = previous && previous.lastVisitedAt > last ? previous : page;
  visits.set(key, {...metadata, firstVisitedAt: previous && previous.firstVisitedAt < first ? previous.firstVisitedAt : first,
   lastVisitedAt: previous && previous.lastVisitedAt > last ? previous.lastVisitedAt : last < first ? first : last});
 }
 state.visits = [...visits.values()];
 return state;
}

export function recordEnding(state, ending, now = Date.now()) {
 if (!endingIds.has(ending)) throw new PlayerStateError('結末の記録を確認できませんでした。');
 normalizePlayerState(state, now);
 state.ending = ending;
 if (!state.endings.some(entry => entry.id === ending)) state.endings.push({id: ending, reachedAt: timestamp(now)});
 return ending;
}

export function addPlayerVisit(state, input, now = Date.now()) {
 const page = canonicalVisit(input);
 normalizePlayerState(state, now);
 const at = timestamp(now), previous = state.visits.find(entry => entry.kind === page.kind && entry.path === page.path);
 if (previous) Object.assign(previous, page, {lastVisitedAt: previous.lastVisitedAt > at ? previous.lastVisitedAt : at});
 else {
  if (state.visits.length >= maxPlayerVisits) throw new PlayerStateError('閲覧記録の保存件数が上限に達しました。', 409);
  state.visits.push({...page, firstVisitedAt: at, lastVisitedAt: at});
 }
}

export function requirePlayerRevision(state, revision) {
 const value = typeof revision === 'string' && /^(?:0|[1-9]\d*)$/.test(revision) ? Number(revision) : revision;
 if (!Number.isSafeInteger(value) || value < 0) throw new PlayerStateError('記録の版を確認できませんでした。');
 if (value !== state.revision) throw new PlayerStateError('別の画面で結末の状態が変更されました。ページを開き直してください。', 409);
}

export function restartPlayerState(state, revision, now = Date.now()) {
 normalizePlayerState(state, now);
 requirePlayerRevision(state, revision);
 if (!endingIds.has(state.ending)) throw new PlayerStateError('戻せる結末の状態はありません。', 409);
 if (state.revision === Number.MAX_SAFE_INTEGER) throw new PlayerStateError('記録の版を更新できませんでした。', 409);
 state.ending = '';
 delete state.officeReceipt;
 delete state.auditPending;
 state.revision += 1;
 return state;
}

export function playerSnapshot(state, {csrf = '', caseId = state.id || '', origins = {}, now = Date.now()} = {}) {
 normalizePlayerState(state, now);
 return {csrf, caseId: typeof caseId === 'string' ? caseId : '', ending: endingIds.has(state.ending) ? state.ending : '',
  endings: state.endings.map(entry => ({...entry})), visits: state.visits.map(entry => ({...entry})),
  revision: state.revision, origins: {...origins}};
}
