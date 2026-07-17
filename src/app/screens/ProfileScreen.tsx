import {
  ArrowLeft,
  Camera,
  Check,
  Download,
  ImagePlus,
  Lock,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRef, useState } from "react";
import { ACHIEVEMENTS } from "../achievements";
import { loadCustomTexture, removeCustomTexture, saveCustomTexture } from "../customTexture";
import { PIECE_SKINS } from "../skins";
import type { PlayerProfile } from "../types";
import { AVATAR_OPTIONS, MowLogo, PlayerAvatar } from "../components/Brand";

interface ProfileScreenProps {
  profiles: PlayerProfile[];
  activeProfile: PlayerProfile;
  allowCustomTextures: boolean;
  onBack: () => void;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: () => void;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onTextureChanged: (url: string | null) => void;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nie udało się przygotować karty."));
    image.src = source;
  });
}

export function ProfileScreen({
  profiles,
  activeProfile,
  allowCustomTextures,
  onBack,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onTextureChanged,
}: ProfileScreenProps) {
  const [draft, setDraft] = useState(activeProfile);
  const [textureMessage, setTextureMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function switchProfile(profileId: string) {
    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return;
    }
    onSelectProfile(profileId);
    setDraft(profile);
    void loadCustomTexture(profileId).then(onTextureChanged);
  }

  function saveProfile() {
    const next = {
      ...draft,
      nickname: draft.nickname.trim() || activeProfile.nickname,
      groupName: draft.groupName.trim() || activeProfile.groupName,
    };
    onUpdateProfile(next);
    setDraft(next);
  }

  async function uploadTexture(file?: File) {
    if (!file || !allowCustomTextures) {
      return;
    }
    try {
      await saveCustomTexture(activeProfile.id, file);
      const url = await loadCustomTexture(activeProfile.id);
      onTextureChanged(url);
      const unlocked = Array.from(new Set([...activeProfile.unlockedSkinIds, "custom"]));
      const skinUnlockedAt = {
        ...activeProfile.skinUnlockedAt,
        custom: activeProfile.skinUnlockedAt.custom ?? new Date().toISOString(),
      };
      onUpdateProfile({
        ...activeProfile,
        unlockedSkinIds: unlocked,
        skinUnlockedAt,
        activeSkinId: "custom",
      });
      setDraft((current) => ({
        ...current,
        unlockedSkinIds: unlocked,
        skinUnlockedAt,
        activeSkinId: "custom",
      }));
      setTextureMessage("Własna tekstura została zapisana tylko na tym urządzeniu.");
    } catch (error) {
      setTextureMessage(error instanceof Error ? error.message : "Nie udało się dodać grafiki.");
    }
  }

  async function deleteTexture() {
    if (!window.confirm("Usunąć własną teksturę z tego urządzenia?")) {
      return;
    }
    await removeCustomTexture(activeProfile.id);
    onTextureChanged(null);
    const nextSkin = activeProfile.activeSkinId === "custom" ? "classic" : activeProfile.activeSkinId;
    onUpdateProfile({ ...activeProfile, activeSkinId: nextSkin });
    setDraft((current) => ({ ...current, activeSkinId: nextSkin }));
    setTextureMessage("Własna tekstura została usunięta.");
  }

  async function createPlayerCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 640;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const gradient = context.createLinearGradient(0, 0, 1080, 640);
    gradient.addColorStop(0, "#111d2d");
    gradient.addColorStop(0.72, "#1d3557");
    gradient.addColorStop(1, "#0b1220");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f1cc09";
    context.fillRect(0, 0, 20, canvas.height);
    context.fillRect(0, 0, canvas.width, 12);

    try {
      const logo = await loadImage(`${import.meta.env.BASE_URL}assets/mow-logo.jpg`);
      context.drawImage(logo, 62, 54, 150, 150);
    } catch {
      // The card still remains useful if an old browser blocks local image decoding.
    }

    context.fillStyle = "#94a3b8";
    context.font = "700 28px system-ui";
    context.fillText("MOW MALBORK · KARTA ZAWODNIKA", 250, 86);
    context.fillStyle = "#ffffff";
    context.font = "800 68px system-ui";
    context.fillText(activeProfile.nickname, 250, 166);
    context.fillStyle = "#f1cc09";
    context.font = "800 42px system-ui";
    context.fillText(`POZIOM ${activeProfile.experienceLevel}`, 64, 286);
    context.fillStyle = "#ffffff";
    context.font = "800 56px system-ui";
    context.fillText(`${activeProfile.totalPoints.toLocaleString("pl-PL")} pkt`, 64, 365);
    context.fillStyle = "#cbd5e1";
    context.font = "700 30px system-ui";
    context.fillText(`${activeProfile.wins} zwycięstw · seria ${activeProfile.winStreak}`, 64, 424);
    context.fillText(`Skórka: ${activeProfile.activeSkinId}`, 64, 474);

    activeProfile.featuredAchievementIds.slice(0, 3).forEach((id, index) => {
      const achievement = ACHIEVEMENTS.find((entry) => entry.id === id);
      if (!achievement) {
        return;
      }
      context.fillStyle = "#233550";
      context.fillRect(610, 240 + index * 102, 400, 78);
      context.fillStyle = "#f1cc09";
      context.font = "800 23px system-ui";
      context.fillText(achievement.name, 638, 273 + index * 102);
      context.fillStyle = "#e2e8f0";
      context.font = "500 18px system-ui";
      context.fillText(achievement.description.slice(0, 38), 638, 301 + index * 102);
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        return;
      }
      const file = new File([blob], `karta-${activeProfile.nickname}.png`, { type: "image/png" });
      if ("share" in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Karta zawodnika", files: [file] });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <main className="screen-shell profile-screen">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć">
          <ArrowLeft />
        </button>
        <div>
          <span>PROFIL I KOLEKCJA</span>
          <h1>{activeProfile.nickname}</h1>
        </div>
        <MowLogo className="header-logo" />
      </header>

      <section className="profile-switcher">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={profile.id === activeProfile.id ? "active" : ""}
            onClick={() => switchProfile(profile.id)}
          >
            <PlayerAvatar avatarId={profile.avatarId} />
            <span>{profile.nickname}</span>
          </button>
        ))}
        <button type="button" onClick={onCreateProfile}>
          <UserPlus />
          <span>Nowy</span>
        </button>
      </section>

      <section className="profile-editor">
        <PlayerAvatar avatarId={draft.avatarId} className="profile-avatar-large" />
        <label>
          Pseudonim
          <input
            type="text"
            value={draft.nickname}
            maxLength={24}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="next"
            onChange={(event) => setDraft({ ...draft, nickname: event.target.value })}
          />
        </label>
        <label>
          Numer zawodnika
          <input
            type="text"
            value={draft.playerNumber ?? ""}
            maxLength={12}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="next"
            onChange={(event) => setDraft({ ...draft, playerNumber: event.target.value })}
          />
        </label>
        <label>
          Grupa
          <input
            type="text"
            value={draft.groupName}
            maxLength={28}
            autoComplete="organization"
            autoCapitalize="words"
            enterKeyHint="done"
            onChange={(event) => setDraft({ ...draft, groupName: event.target.value })}
          />
        </label>
        <div className="avatar-picker" aria-label="Wybór avatara">
          {AVATAR_OPTIONS.map((avatarId) => (
            <button
              key={avatarId}
              type="button"
              className={draft.avatarId === avatarId ? "active" : ""}
              onClick={() => setDraft({ ...draft, avatarId })}
              aria-label={`Avatar ${avatarId}`}
            >
              <PlayerAvatar avatarId={avatarId} />
            </button>
          ))}
        </div>
        <button type="button" className="profile-save" onClick={saveProfile}>
          <Check />
          Zapisz profil
        </button>
      </section>

      <section className="collection-section">
        <div className="section-heading">
          <div>
            <span>MOJA KOLEKCJA</span>
            <h2>Skórki klocków</h2>
          </div>
          <strong>{activeProfile.unlockedSkinIds.length}/{PIECE_SKINS.length}</strong>
        </div>
        <div className="skin-grid">
          {PIECE_SKINS.map((skin) => {
            const unlocked = activeProfile.unlockedSkinIds.includes(skin.id);
            const active = activeProfile.activeSkinId === skin.id;
            return (
              <button
                type="button"
                key={skin.id}
                className={`skin-card rarity-${skin.rarity}${active ? " active" : ""}`}
                disabled={!unlocked}
                onClick={() => {
                  onUpdateProfile({ ...activeProfile, activeSkinId: skin.id });
                  setDraft((current) => ({ ...current, activeSkinId: skin.id }));
                }}
              >
                <span className="skin-swatches">
                  {skin.palette.map((color, index) => (
                    <i key={`${skin.id}-${index}`} style={{ background: color }} />
                  ))}
                </span>
                <strong>{skin.name}</strong>
                <small>{unlocked ? skin.description : skin.unlockLabel}</small>
                {unlocked && activeProfile.skinUnlockedAt[skin.id] ? (
                  <small className="skin-unlock-date">
                    Zdobyta{" "}
                    {new Date(activeProfile.skinUnlockedAt[skin.id]).toLocaleDateString("pl-PL")}
                  </small>
                ) : null}
                {active ? <Check /> : unlocked ? null : <Lock />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="custom-texture-section">
        <div>
          <span>WŁASNA GRAFIKA</span>
          <h2>Tekstura z urządzenia</h2>
          <p>
            Obraz pozostaje lokalnie, jest kompresowany i nie zmienia geometrii klocków.
          </p>
        </div>
        {allowCustomTextures ? (
          <div className="texture-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => void uploadTexture(event.target.files?.[0])}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus />
              Dodaj grafikę
            </button>
            <button type="button" onClick={() => void deleteTexture()}>
              <Trash2 />
              Usuń
            </button>
          </div>
        ) : (
          <p className="locked-note"><Lock /> Własne grafiki zostały wyłączone przez wychowawcę.</p>
        )}
        {textureMessage ? <p className="texture-message">{textureMessage}</p> : null}
      </section>

      <section className="achievement-collection">
        <div className="section-heading">
          <div>
            <span>GABLOTA</span>
            <h2>Osiągnięcia</h2>
          </div>
          <strong>{activeProfile.achievementIds.length}/{ACHIEVEMENTS.length}</strong>
        </div>
        <div className="achievement-grid">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = activeProfile.achievementIds.includes(achievement.id);
            const featured = activeProfile.featuredAchievementIds.includes(achievement.id);
            return (
              <button
                type="button"
                key={achievement.id}
                disabled={!unlocked}
                className={`${unlocked ? "unlocked" : "locked"}${featured ? " featured" : ""}`}
                onClick={() => {
                  const current = activeProfile.featuredAchievementIds;
                  const next = featured
                    ? current.filter((id) => id !== achievement.id)
                    : [...current.filter((id) => id !== achievement.id), achievement.id].slice(-3);
                  onUpdateProfile({ ...activeProfile, featuredAchievementIds: next });
                }}
              >
                {unlocked ? <Check /> : <Lock />}
                <strong>{achievement.name}</strong>
                <small>{achievement.description}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="player-card-actions">
        <Camera />
        <div>
          <strong>Karta zawodnika</strong>
          <small>Wygeneruj PNG z wynikiem, skórką i trzema odznakami.</small>
        </div>
        <button type="button" onClick={() => void createPlayerCard()}>
          {"share" in navigator ? <Share2 /> : <Download />}
          Utwórz
        </button>
      </section>
    </main>
  );
}
