export const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KOURacingDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSessionData = async (id: string, data: Record<string, unknown>): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('sessions', 'readwrite');
  tx.objectStore('sessions').put({ id, data });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getSessionData = async (id: string): Promise<Record<string, unknown> | undefined> => {
  const db = await getDB();
  const tx = db.transaction('sessions', 'readonly');
  const request = tx.objectStore('sessions').get(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.data);
    request.onerror = () => reject(tx.error);
  });
};

export const deleteSessionData = async (id: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('sessions', 'readwrite');
  tx.objectStore('sessions').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
