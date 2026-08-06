import { deleteAsset, putAsset, readAsset } from "./assetsDatabase";

const STORE_NAME = "textures";
const MAX_SOURCE_BYTES = 6 * 1024 * 1024;
const MAX_OUTPUT_EDGE = 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function compressImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Dozwolone formaty to JPG, PNG i WebP.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Plik jest za duży. Maksymalny rozmiar to 6 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Urządzenie nie może przetworzyć tej grafiki.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Nie udało się skompresować grafiki."))),
      "image/webp",
      0.82,
    );
  });
}

export async function saveCustomTexture(profileId: string, file: File): Promise<string> {
  await putAsset(STORE_NAME, profileId, await compressImage(file));
  return profileId;
}

export async function loadCustomTexture(profileId: string): Promise<string | null> {
  const blob = await readAsset(STORE_NAME, profileId);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function removeCustomTexture(profileId: string): Promise<void> {
  await deleteAsset(STORE_NAME, profileId);
}
