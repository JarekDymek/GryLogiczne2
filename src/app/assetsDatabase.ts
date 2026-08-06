const DATABASE_NAME = "gry-logiczne2-assets";
const DATABASE_VERSION = 3;

export const ASSET_STORES = ["textures", "mentor-media"] as const;
export type AssetStore = (typeof ASSET_STORES)[number];

export interface SerializedAsset {
  store: AssetStore;
  key: string;
  mimeType: string;
  dataBase64: string;
}

export interface AssetSnapshot {
  version: 1;
  assets: SerializedAsset[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const store of ASSET_STORES) {
        if (!database.objectStoreNames.contains(store)) database.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Nie udało się otworzyć pamięci grafik."));
  });
}

export async function putAsset(store: AssetStore, key: string, blob: Blob): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    transaction.objectStore(store).put(blob, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Nie udało się zapisać grafiki."));
  });
  database.close();
}

export async function readAsset(store: AssetStore, key: string): Promise<Blob | null> {
  const database = await openDatabase();
  const result = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(store, "readonly").objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error ?? new Error("Nie udało się odczytać grafiki."));
  });
  database.close();
  return result ?? null;
}

export async function deleteAsset(store: AssetStore, key: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    transaction.objectStore(store).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Nie udało się usunąć grafiki."));
  });
  database.close();
}

async function listStoreAssets(store: AssetStore): Promise<Array<{ key: string; blob: Blob }>> {
  const database = await openDatabase();
  const entries = await new Promise<Array<{ key: string; blob: Blob }>>((resolve, reject) => {
    const values: Array<{ key: string; blob: Blob }> = [];
    const request = database.transaction(store, "readonly").objectStore(store).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(values);
      if (typeof cursor.key === "string" && cursor.value instanceof Blob) {
        values.push({ key: cursor.key, blob: cursor.value });
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Nie udało się odczytać kopii grafik."));
  });
  database.close();
  return entries;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function exportAssetSnapshot(): Promise<AssetSnapshot> {
  const assets: SerializedAsset[] = [];
  for (const store of ASSET_STORES) {
    for (const { key, blob } of await listStoreAssets(store)) {
      assets.push({
        store,
        key,
        mimeType: blob.type || "application/octet-stream",
        dataBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
      });
    }
  }
  return { version: 1, assets };
}

export function normalizeAssetSnapshot(value: unknown): AssetSnapshot {
  if (!value || typeof value !== "object") return { version: 1, assets: [] };
  const source = value as Partial<AssetSnapshot>;
  const assets = Array.isArray(source.assets)
    ? source.assets.filter((asset): asset is SerializedAsset => Boolean(
      asset && typeof asset === "object"
      && ASSET_STORES.includes(asset.store as AssetStore)
      && typeof asset.key === "string" && asset.key.length > 0 && asset.key.length <= 240
      && typeof asset.mimeType === "string" && /^[-\w.]+\/[-+\w.]+$/.test(asset.mimeType)
      && typeof asset.dataBase64 === "string" && asset.dataBase64.length <= 24 * 1024 * 1024,
    ))
    : [];
  if (assets.length > 100) throw new Error("Kopia zawiera zbyt wiele plików graficznych.");
  return { version: 1, assets };
}

export async function restoreAssetSnapshot(value: unknown): Promise<number> {
  const snapshot = normalizeAssetSnapshot(value);
  let totalBytes = 0;
  const decoded = snapshot.assets.map((asset) => {
    const bytes = base64ToBytes(asset.dataBase64);
    totalBytes += bytes.byteLength;
    return { ...asset, bytes };
  });
  if (totalBytes > 80 * 1024 * 1024) throw new Error("Kopia grafik przekracza limit 80 MB.");
  for (const asset of decoded) {
    await putAsset(asset.store, asset.key, new Blob([copyToArrayBuffer(asset.bytes)], { type: asset.mimeType }));
  }
  return decoded.length;
}
