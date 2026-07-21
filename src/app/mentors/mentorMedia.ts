const DATABASE_NAME = "gry-logiczne2-assets";
const STORE_NAME = "mentor-media";
const DATABASE_VERSION = 2;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_EDGE = 1280;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("textures")) {
        database.createObjectStore("textures");
      }
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Nie udało się otworzyć pamięci mentorów."));
  });
}

async function compressImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Dozwolone formaty to JPG, PNG i WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Plik jest za duży. Maksymalny rozmiar to 8 MB.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Urządzenie nie może przetworzyć tej grafiki.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Nie udało się przygotować grafiki."))),
      "image/webp",
      0.84,
    );
  });
}

export async function saveMentorImage(mentorId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(blob, mentorId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return `mentor-asset:${mentorId}`;
}

export async function loadMentorImage(mediaUrl: string): Promise<string | null> {
  if (!mediaUrl.startsWith("mentor-asset:")) {
    return mediaUrl ? new URL(mediaUrl, new URL(import.meta.env.BASE_URL, window.location.origin)).toString() : null;
  }
  const key = mediaUrl.slice("mentor-asset:".length);
  const database = await openDatabase();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return blob ? URL.createObjectURL(blob) : null;
}

export async function removeMentorImage(mentorId: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(mentorId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
