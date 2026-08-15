import { putAsset, readAsset } from "../assetsDatabase";

const STORE_NAME = "mentor-media";
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_EDGE = 1280;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function compressImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Dozwolone formaty to JPG, PNG i WebP.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Plik jest za duży. Maksymalny rozmiar to 8 MB.");
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

export async function saveMentorImage(assetId: string, file: File): Promise<string> {
  await putAsset(STORE_NAME, assetId, await compressImage(file));
  return `mentor-asset:${assetId}`;
}

export async function saveMentorBlob(assetId: string, blob: Blob): Promise<string> {
  if (!blob.type.startsWith("image/")) throw new Error("Generator nie zwrócił prawidłowego obrazu.");
  if (blob.size > 12 * 1024 * 1024) throw new Error("Wygenerowany obraz przekracza limit 12 MB.");
  await putAsset(STORE_NAME, assetId, blob);
  return `mentor-asset:${assetId}`;
}

export async function readMentorBlob(mediaUrl: string): Promise<Blob | null> {
  if (!mediaUrl.startsWith("mentor-asset:")) return null;
  return readAsset(STORE_NAME, mediaUrl.slice("mentor-asset:".length));
}

export async function cacheRemoteMentorBlob(storagePath: string, blob: Blob): Promise<string> {
  const assetId = `supabase/${storagePath}`;
  await putAsset(STORE_NAME, assetId, blob);
  return `mentor-asset:${assetId}`;
}

export function cachedRemoteMentorUrl(storagePath: string): string {
  return `mentor-asset:supabase/${storagePath}`;
}

export async function loadMentorImage(mediaUrl: string): Promise<string | null> {
  if (!mediaUrl.startsWith("mentor-asset:")) {
    return mediaUrl ? new URL(mediaUrl, new URL(import.meta.env.BASE_URL, window.location.origin)).toString() : null;
  }
  const blob = await readAsset(STORE_NAME, mediaUrl.slice("mentor-asset:".length));
  return blob ? URL.createObjectURL(blob) : null;
}
