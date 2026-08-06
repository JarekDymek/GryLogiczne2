import { Check, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createTwelveReactionSet } from "./catalog";
import { MentorVisual } from "./MentorVisual";
import { saveMentorBlob, saveMentorImage } from "./mentorMedia";
import { MENTOR_CATEGORY_LABELS, type Mentor } from "./types";
import { getOwnerAuthClient } from "../owner/supabaseOwnerAuth";

type StudioStyle = "friendly-illustration" | "caricature" | "realistic";

interface MentorStudioProps {
  mentor: Mentor;
  onCancel: () => void;
  onSave: (mentor: Mentor) => void;
}

const STYLE_LABELS: Record<StudioStyle, string> = {
  "friendly-illustration": "Przyjazna ilustracja",
  caricature: "Lekka karykatura",
  realistic: "Portret realistyczny",
};

function updatedMentor(mentor: Mentor): Mentor {
  return {
    ...mentor,
    reactions: createTwelveReactionSet(mentor.id, mentor.reactions),
    updatedAt: new Date().toISOString(),
  };
}

export function MentorStudio({ mentor, onCancel, onSave }: MentorStudioProps) {
  const [draft, setDraft] = useState(() => updatedMentor(mentor));
  const [references, setReferences] = useState<File[]>([]);
  const [style, setStyle] = useState<StudioStyle>("friendly-illustration");
  const [consent, setConsent] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const reactionInputRef = useRef<HTMLInputElement | null>(null);
  const pendingReactionIndex = useRef<number | null>(null);
  const previews = useMemo(() => references.map((file) => URL.createObjectURL(file)), [references]);
  const generatorUrl = import.meta.env.VITE_MENTOR_GENERATOR_URL?.trim();

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function updateReaction(index: number, mediaUrl: string) {
    setDraft((current) => ({
      ...current,
      reactions: current.reactions.map((reaction, reactionIndex) => (
        reactionIndex === index ? { ...reaction, mediaType: "image", mediaUrl } : reaction
      )),
      updatedAt: new Date().toISOString(),
    }));
  }

  function chooseReferences(files: FileList | null) {
    const selected = Array.from(files ?? []).slice(0, 3);
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setMessage("Wybierz wyłącznie zdjęcia JPG, PNG lub WebP.");
      return;
    }
    if (selected.some((file) => file.size > 8 * 1024 * 1024)) {
      setMessage("Jedno zdjęcie referencyjne może mieć najwyżej 8 MB.");
      return;
    }
    setReferences(selected);
    setMessage(selected.length ? `Wybrano ${selected.length} zdjęcie/zdjęcia referencyjne.` : "");
  }

  async function importReaction(index: number, file?: File) {
    if (!file) return;
    setBusyIndex(index);
    try {
      const reaction = draft.reactions[index];
      const mediaUrl = await saveMentorImage(`${draft.id}/reaction/${reaction.id}`, file);
      updateReaction(index, mediaUrl);
      setMessage(`Zapisano grafikę: ${reaction.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać grafiki.");
    } finally {
      setBusyIndex(null);
      if (reactionInputRef.current) reactionInputRef.current.value = "";
    }
  }

  async function generateReaction(index: number): Promise<void> {
    if (!generatorUrl) throw new Error("Generator AI nie jest jeszcze skonfigurowany na serwerze.");
    if (!consent) throw new Error("Zaznacz zgodę na jednorazowe wysłanie zdjęć do generatora.");
    if (references.length < 1) throw new Error("Dodaj od 1 do 3 zdjęć referencyjnych.");
    const client = getOwnerAuthClient();
    if (!client) throw new Error("Brak konfiguracji konta właściciela.");
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Zaloguj się jako właściciel, aby użyć generatora.");

    const reaction = draft.reactions[index];
    const form = new FormData();
    for (const file of references) form.append("reference", file, file.name);
    form.set("mentorName", draft.displayName);
    form.set("style", style);
    form.set("reactionLabel", reaction.label);
    form.set("reactionTitle", reaction.title);
    form.set("reactionCategory", reaction.category);
    const response = await fetch(generatorUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 240);
      throw new Error(detail || `Generator zwrócił błąd ${response.status}.`);
    }
    const blob = await response.blob();
    const mediaUrl = await saveMentorBlob(`${draft.id}/reaction/${reaction.id}`, blob);
    updateReaction(index, mediaUrl);
  }

  async function generateOne(index: number) {
    setBusyIndex(index);
    setMessage("");
    try {
      await generateReaction(index);
      setMessage(`Wygenerowano reakcję: ${draft.reactions[index].label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się wygenerować reakcji.");
    } finally {
      setBusyIndex(null);
    }
  }

  async function generateAll() {
    if (!window.confirm("Wygenerować 12 osobnych grafik? Operacja użyje płatnego API i może potrwać kilka minut.")) return;
    for (let index = 0; index < draft.reactions.length; index += 1) {
      setBusyIndex(index);
      setMessage(`Generowanie ${index + 1} z 12…`);
      try {
        await generateReaction(index);
      } catch (error) {
        setMessage(`Zatrzymano na reakcji ${index + 1}: ${error instanceof Error ? error.message : "błąd generatora"}`);
        setBusyIndex(null);
        return;
      }
    }
    setBusyIndex(null);
    setMessage("Gotowe — wygenerowano komplet 12 reakcji. Sprawdź je przed zapisaniem.");
  }

  return (
    <div className="mentor-editor-backdrop" role="presentation">
      <section className="mentor-studio" role="dialog" aria-modal="true" aria-labelledby="mentor-studio-title">
        <header>
          <div><span>STUDIO ZACIESZEK</span><h2 id="mentor-studio-title">12 emocji: {draft.displayName}</h2></div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Zamknij studio"><X /></button>
        </header>

        <section className="mentor-studio-intro">
          <div>
            <h3>1–3 zdjęcia referencyjne</h3>
            <p>Zdjęcia pozostają na urządzeniu. Są wysyłane do usługi AI dopiero po użyciu przycisku „Generuj”.</p>
            <label className="studio-upload"><Upload /> Wybierz zdjęcia<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => chooseReferences(event.target.files)} /></label>
            <div className="studio-reference-previews">{previews.map((url, index) => <img key={url} src={url} alt={`Zdjęcie referencyjne ${index + 1}`} />)}</div>
          </div>
          <div>
            <label>Styl<select value={style} onChange={(event) => setStyle(event.target.value as StudioStyle)}>{Object.entries(STYLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="studio-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Mam zgodę osoby ze zdjęć i zgadzam się na ich jednorazowe przesłanie do generatora AI.</label>
            <button type="button" className="primary" disabled={busyIndex !== null || !generatorUrl} onClick={() => void generateAll()}><Sparkles /> Generuj komplet 12</button>
            {!generatorUrl ? <small>Tryb AI wymaga adresu bezpiecznej funkcji serwerowej. Ręczny import grafik działa już teraz.</small> : null}
          </div>
        </section>

        <input
          ref={reactionInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => void importReaction(pendingReactionIndex.current ?? 0, event.target.files?.[0])}
        />
        <section className="mentor-studio-grid">
          {draft.reactions.map((reaction, index) => (
            <article key={reaction.id} className={reaction.mediaUrl ? "ready" : ""}>
              <MentorVisual mentor={draft} reaction={reaction} reducedMotion />
              <span>{index + 1}/12 · {MENTOR_CATEGORY_LABELS[reaction.category]}</span>
              <strong>{reaction.label}</strong>
              <small>{reaction.title}</small>
              <div>
                <button type="button" disabled={busyIndex !== null} onClick={() => { pendingReactionIndex.current = index; reactionInputRef.current?.click(); }}><Upload /> Wczytaj</button>
                <button type="button" disabled={busyIndex !== null || !generatorUrl} onClick={() => void generateOne(index)}><Sparkles /> {busyIndex === index ? "Pracuję…" : "Generuj"}</button>
              </div>
              {reaction.mediaUrl ? <i title="Grafika gotowa"><Check /></i> : null}
            </article>
          ))}
        </section>
        {message ? <p className="screen-note" aria-live="polite">{message}</p> : null}
        <footer><button type="button" onClick={onCancel}>Anuluj</button><button type="button" className="primary" onClick={() => onSave(draft)}><Check /> Zapisz zestaw 12 reakcji</button></footer>
      </section>
    </div>
  );
}
