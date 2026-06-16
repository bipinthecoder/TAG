const DB_NAME  = 'tag_db';
const DB_VER   = 1;
const BLOBS    = 'blobs';  // image blobs keyed by filename
const META     = 'meta';   // single JSON document keyed by META_KEY
const META_KEY = 'session';
const LS_FLAG  = 'tag_session'; // localStorage sentinel — avoids opening IDB on cold start

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
      if (!db.objectStoreNames.contains(META))  db.createObjectStore(META);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function dbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = (e) => resolve(e.target.result ?? null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function dbPut(db, store, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
  });
}

function dbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Synchronous check — avoids opening IDB when there is definitely no session. */
export function hasSession() {
  return localStorage.getItem(LS_FLAG) === '1';
}

/**
 * Persist annotation metadata to IndexedDB.
 * Only serialises groups + per-item labels/flags — no blob URLs.
 */
export async function saveAnnotations(groups, items) {
  try {
    const db = await openDB();
    const payload = {
      groups,
      items: items.map(({ id, file, labels, suggestedLabels, flagged }) => ({
        id,
        file,
        labels,
        suggestedLabels: suggestedLabels ?? {},
        flagged,
      })),
    };
    await dbPut(db, META, META_KEY, payload);
    localStorage.setItem(LS_FLAG, '1');
  } catch (e) {
    console.warn('[TAG] saveAnnotations:', e);
  }
}

/**
 * Cache image blobs from active blob-URLs into IndexedDB, in batches.
 * Runs in the background after import — does not block the UI.
 */
export async function persistBlobs(items) {
  try {
    const db = await openDB();
    const BATCH = 50;
    for (let i = 0; i < items.length; i += BATCH) {
      await Promise.all(
        items.slice(i, i + BATCH).map(async (item) => {
          if (!item.url) return;
          try {
            const blob = await fetch(item.url).then(r => r.blob());
            await dbPut(db, BLOBS, item.file, blob);
          } catch { /* skip individual failures silently */ }
        })
      );
      // Yield between batches to keep UI responsive
      await new Promise(r => setTimeout(r, 0));
    }
  } catch (e) {
    console.warn('[TAG] persistBlobs:', e);
  }
}

/**
 * Load saved session metadata. Returns { groups, items } with url: null on
 * every item (blobs are loaded lazily via loadBlobUrl). Returns null if no
 * session is saved.
 */
export async function loadSession() {
  try {
    const db   = await openDB();
    const meta = await dbGet(db, META, META_KEY);
    if (!meta?.items?.length) return null;
    return {
      groups: meta.groups ?? [],
      items:  meta.items.map(it => ({ ...it, url: null })),
    };
  } catch (e) {
    console.warn('[TAG] loadSession:', e);
    return null;
  }
}

/**
 * Fetch a single image blob from IndexedDB and create a blob URL.
 * Returns null if the blob is not cached (evicted or never stored).
 */
export async function loadBlobUrl(filename) {
  try {
    const db   = await openDB();
    const blob = await dbGet(db, BLOBS, filename);
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

/**
 * Read just the annotation metadata (no blobs). Used by handleImport to
 * merge saved labels onto re-imported items.
 */
export async function getSavedMeta() {
  try {
    const db = await openDB();
    return await dbGet(db, META, META_KEY);
  } catch {
    return null;
  }
}

/** Wipe both stores and the localStorage sentinel. */
export async function clearSession() {
  localStorage.removeItem(LS_FLAG);
  try {
    const db = await openDB();
    await Promise.all([dbClear(db, META), dbClear(db, BLOBS)]);
  } catch (e) {
    console.warn('[TAG] clearSession:', e);
  }
}
