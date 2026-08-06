import { putAsset, readAsset } from "../assetsDatabase";
import { normalizeMentors } from "./catalog";
import type { Mentor } from "./types";

interface MentorPackAsset {
  key: string;
  mimeType: string;
  dataBase64: string;
}

export interface MentorPack {
  format: "gry-logiczne2-mentor-pack";
  version: 1;
  createdAt: string;
  mentor: Mentor;
  assets: MentorPackAsset[];
}

function assetKey(mediaUrl?: string): string | null {
  return mediaUrl?.startsWith("mentor-asset:") ? mediaUrl.slice("mentor-asset:".length) : null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return buffer;
}

export async function exportMentorPack(mentor: Mentor): Promise<string> {
  const keys = new Set<string>();
  const avatarKey = assetKey(mentor.avatarUrl);
  if (avatarKey) keys.add(avatarKey);
  for (const reaction of mentor.reactions) {
    const key = assetKey(reaction.mediaUrl);
    if (key) keys.add(key);
  }
  const assets: MentorPackAsset[] = [];
  for (const key of keys) {
    const blob = await readAsset("mentor-media", key);
    if (!blob) continue;
    assets.push({ key, mimeType: blob.type || "application/octet-stream", dataBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())) });
  }
  const pack: MentorPack = {
    format: "gry-logiczne2-mentor-pack",
    version: 1,
    createdAt: new Date().toISOString(),
    mentor: JSON.parse(JSON.stringify(mentor)) as Mentor,
    assets,
  };
  return JSON.stringify(pack, null, 2);
}

export function parseMentorPack(rawValue: string): MentorPack {
  const source = JSON.parse(rawValue) as Partial<MentorPack>;
  if (source.format !== "gry-logiczne2-mentor-pack" || source.version !== 1 || !source.mentor?.id) {
    throw new Error("To nie jest prawidłowy pakiet mentora.");
  }
  const normalized = normalizeMentors([source.mentor]);
  const mentor = normalized.find((entry) => entry.id === source.mentor?.id);
  if (!mentor) throw new Error("Pakiet nie zawiera prawidłowej postaci.");
  const assets = Array.isArray(source.assets)
    ? source.assets.filter((asset): asset is MentorPackAsset => Boolean(
      asset && typeof asset === "object"
      && typeof asset.key === "string" && asset.key.length <= 240
      && typeof asset.mimeType === "string" && asset.mimeType.startsWith("image/")
      && typeof asset.dataBase64 === "string" && asset.dataBase64.length <= 24 * 1024 * 1024,
    ))
    : [];
  if (assets.length > 20) throw new Error("Pakiet zawiera zbyt wiele grafik.");
  return {
    format: "gry-logiczne2-mentor-pack",
    version: 1,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : new Date().toISOString(),
    mentor,
    assets,
  };
}

export async function restoreMentorPack(pack: MentorPack): Promise<void> {
  let totalBytes = 0;
  const decoded = pack.assets.map((asset) => {
    const buffer = base64ToBuffer(asset.dataBase64);
    totalBytes += buffer.byteLength;
    return { ...asset, buffer };
  });
  if (totalBytes > 80 * 1024 * 1024) throw new Error("Pakiet mentora przekracza limit 80 MB.");
  for (const asset of decoded) await putAsset("mentor-media", asset.key, new Blob([asset.buffer], { type: asset.mimeType }));
}
