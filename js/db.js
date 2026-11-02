// Small wrapper around IndexedDB. Everything lives on this device only.

const DB_NAME = 'affirmations';
const DB_VERSION = 1;

let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('themes', { keyPath: 'id' });
        db.createObjectStore('affirmations', { keyPath: 'id' }).createIndex('themeId', 'themeId');
        db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(stores, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result;
    Promise.resolve(fn(t)).then((r) => { result = r; }, (err) => { t.abort(); reject(err); });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const db = {
  getAll: (store) => run([store], 'readonly', (t) => request(t.objectStore(store).getAll())),

  async getMeta(key) {
    const row = await run(['meta'], 'readonly', (t) => request(t.objectStore('meta').get(key)));
    return row ? row.value : undefined;
  },

  setMeta: (key, value) => db.write({ meta: { put: [{ key, value }] } }),

  // Applies several changes in one transaction, so they all succeed or none do.
  // changes = { storeName: { clear?: true, put?: [...], delete?: [...] } }
  write(changes) {
    return run(Object.keys(changes), 'readwrite', (t) => {
      for (const [name, change] of Object.entries(changes)) {
        const store = t.objectStore(name);
        if (change.clear) store.clear();
        (change.put || []).forEach((value) => store.put(value));
        (change.delete || []).forEach((key) => store.delete(key));
      }
    });
  },
};
