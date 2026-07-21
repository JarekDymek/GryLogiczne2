import {
  ArrowLeft,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Save,
  Settings,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCustomMentor,
  isMentorUnlocked,
  normalizeMentors,
  normalizeMentorSettings,
} from "../mentors/catalog";
import { MentorVisual } from "../mentors/MentorVisual";
import { saveMentorImage } from "../mentors/mentorMedia";
import type { MentorRoute } from "../mentors/routes";
import {
  MENTOR_CATEGORY_LABELS,
  MENTOR_EVENT_LABELS,
  MENTOR_EVENTS,
  MENTOR_MEDIA_TYPES,
  MENTOR_REACTION_CATEGORIES,
  type Mentor,
  type MentorEvent,
  type MentorReaction,
} from "../mentors/types";
import { loadOwnerAccess } from "../owner/supabaseOwnerAuth";
import type { AppData, PlayerProfile } from "../types";
import { MowLogo } from "../components/Brand";

interface MentorsScreenProps {
  data: AppData;
  activeProfile: PlayerProfile;
  route: MentorRoute;
  managerAccess: "player" | "educator";
  onBack: () => void;
  onNavigate: (route: MentorRoute) => void;
  onReplaceData: (data: AppData) => void;
  onUpdateProfile: (profile: PlayerProfile) => void;
}

function cloneMentor(mentor: Mentor): Mentor {
  return JSON.parse(JSON.stringify(mentor)) as Mentor;
}

function emptyReaction(mentorId: string, index: number): MentorReaction {
  return {
    id: `${mentorId}-reaction-${Date.now()}-${index}`,
    mentorId,
    label: `Reakcja ${index}`,
    title: "Działaj dalej",
    subtitle: "Każda próba buduje doświadczenie.",
    category: "neutral",
    mediaType: "image",
    enabled: true,
    weight: 1,
  };
}

function MentorEditor({
  mentor,
  onCancel,
  onSave,
}: {
  mentor: Mentor;
  onCancel: () => void;
  onSave: (mentor: Mentor) => void;
}) {
  const [draft, setDraft] = useState(() => cloneMentor(mentor));
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function updateReaction(index: number, patch: Partial<MentorReaction>) {
    setDraft((current) => ({
      ...current,
      reactions: current.reactions.map((entry, reactionIndex) =>
        reactionIndex === index ? { ...entry, ...patch, mentorId: current.id } : entry,
      ),
    }));
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    try {
      const avatarUrl = await saveMentorImage(draft.id, file);
      setDraft((current) => ({ ...current, avatarUrl }));
      setMessage("Grafika została przygotowana i zapisana na tym urządzeniu.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać grafiki.");
    }
  }

  function submit() {
    const displayName = draft.displayName.trim();
    if (!displayName) {
      setMessage("Podaj nazwę wyświetlaną mentora.");
      return;
    }
    if (!draft.reactions.some((entry) => entry.enabled)) {
      setMessage("Mentor musi mieć co najmniej jedną aktywną reakcję.");
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim() || displayName.toLocaleLowerCase("pl").replaceAll(/\s+/g, "-"),
      displayName,
      reactions: draft.reactions.map((entry) => ({ ...entry, mentorId: draft.id })),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="mentor-editor-backdrop" role="presentation">
      <section className="mentor-editor" role="dialog" aria-modal="true" aria-labelledby="mentor-editor-title">
        <header>
          <div>
            <span>EDYCJA POSTACI</span>
            <h2 id="mentor-editor-title">{draft.displayName}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Zamknij edycję"><X /></button>
        </header>

        <div className="mentor-editor-main">
          <MentorVisual mentor={draft} />
          <div className="mentor-editor-fields">
            <label>Nazwa wyświetlana<input value={draft.displayName} maxLength={80} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label>
            <label>Identyfikator opisowy<input value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>Opis<textarea value={draft.description ?? ""} maxLength={240} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label>Adres grafiki<input value={draft.avatarUrl} onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })} /></label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()}><Upload /> Wczytaj grafikę z urządzenia</button>
            <div className="mentor-editor-toggles">
              <label><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Aktywny</label>
              <label><input type="checkbox" checked={draft.allowedForPlayers} onChange={(event) => setDraft({ ...draft, allowedForPlayers: event.target.checked })} /> Widoczny dla graczy</label>
            </div>
            <div className="mentor-unlock-editor">
              <label>Odblokowanie<select value={draft.unlock.type} onChange={(event) => setDraft({ ...draft, unlock: { ...draft.unlock, type: event.target.value as Mentor["unlock"]["type"] } })}>
                <option value="always">Od początku</option><option value="wins">Liczba wygranych</option><option value="experience-level">Poziom doświadczenia</option>
              </select></label>
              {draft.unlock.type !== "always" ? <label>Wartość<input type="number" min="1" max="999" value={draft.unlock.value} onChange={(event) => setDraft({ ...draft, unlock: { ...draft.unlock, value: Math.max(1, Number(event.target.value) || 1) } })} /></label> : null}
              <label>Opis warunku<input value={draft.unlock.label} maxLength={100} onChange={(event) => setDraft({ ...draft, unlock: { ...draft.unlock, label: event.target.value } })} /></label>
            </div>
          </div>
        </div>

        <div className="mentor-reaction-editor">
          <div className="section-heading">
            <div><span>BIBLIOTEKA GESTÓW</span><h3>Reakcje postaci</h3></div>
            <button type="button" onClick={() => setDraft((current) => ({ ...current, reactions: [...current.reactions, emptyReaction(current.id, current.reactions.length + 1)] }))}><Plus /> Dodaj reakcję</button>
          </div>
          {draft.reactions.map((entry, index) => (
            <article key={entry.id}>
              <label>Etykieta<input value={entry.label} maxLength={60} onChange={(event) => updateReaction(index, { label: event.target.value })} /></label>
              <label>Kategoria<select value={entry.category} onChange={(event) => updateReaction(index, { category: event.target.value as MentorReaction["category"] })}>{MENTOR_REACTION_CATEGORIES.map((category) => <option key={category} value={category}>{MENTOR_CATEGORY_LABELS[category]}</option>)}</select></label>
              <label>Nagłówek<input value={entry.title} maxLength={80} onChange={(event) => updateReaction(index, { title: event.target.value })} /></label>
              <label>Wiadomość<textarea value={entry.subtitle} maxLength={220} onChange={(event) => updateReaction(index, { subtitle: event.target.value })} /></label>
              <label>Typ medium<select value={entry.mediaType} onChange={(event) => updateReaction(index, { mediaType: event.target.value as MentorReaction["mediaType"] })}>{MENTOR_MEDIA_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label>Adres medium<input value={entry.mediaUrl ?? ""} placeholder="Puste = portret mentora" onChange={(event) => updateReaction(index, { mediaUrl: event.target.value || undefined })} /></label>
              <label>Waga losowania<input type="number" min="0.1" max="20" step="0.1" value={entry.weight} onChange={(event) => updateReaction(index, { weight: Number(event.target.value) || 1 })} /></label>
              <label className="reaction-enabled"><input type="checkbox" checked={entry.enabled} onChange={(event) => updateReaction(index, { enabled: event.target.checked })} /> Aktywna</label>
              <button type="button" className="icon-button danger" onClick={() => setDraft((current) => ({ ...current, reactions: current.reactions.filter((_, reactionIndex) => reactionIndex !== index) }))} aria-label={`Usuń reakcję ${entry.label}`}><Trash2 /></button>
            </article>
          ))}
        </div>
        {message ? <p className="screen-note">{message}</p> : null}
        <footer><button type="button" onClick={onCancel}>Anuluj</button><button type="button" className="primary" onClick={submit}><Save /> Zapisz mentora</button></footer>
      </section>
    </div>
  );
}

export function MentorsScreen({
  data,
  activeProfile,
  route,
  managerAccess,
  onBack,
  onNavigate,
  onReplaceData,
  onUpdateProfile,
}: MentorsScreenProps) {
  const [ownerAuthorized, setOwnerAuthorized] = useState(false);
  const [editing, setEditing] = useState<Mentor | null>(null);
  const canManage = managerAccess === "educator" || ownerAuthorized;

  useEffect(() => {
    let active = true;
    void loadOwnerAccess().then((access) => {
      if (active) setOwnerAuthorized(access.status === "authorized");
    });
    return () => { active = false; };
  }, []);

  const visibleMentors = useMemo(
    () => canManage ? data.mentors : data.mentors.filter((mentor) => mentor.allowedForPlayers),
    [canManage, data.mentors],
  );
  const selectedMentor = route.view === "detail"
    ? data.mentors.find((mentor) => mentor.id === route.mentorId)
    : undefined;

  function saveMentor(mentor: Mentor) {
    const exists = data.mentors.some((entry) => entry.id === mentor.id);
    const mentors = normalizeMentors(
      exists
        ? data.mentors.map((entry) => entry.id === mentor.id ? mentor : entry)
        : [...data.mentors, mentor],
    );
    onReplaceData({
      ...data,
      mentors,
      mentorSettings: normalizeMentorSettings(data.mentorSettings, mentors),
    });
    setEditing(null);
    onNavigate({ view: "detail", mentorId: mentor.id });
  }

  function deleteMentor(mentor: Mentor) {
    if (mentor.source === "built-in" || !window.confirm(`Usunąć postać ${mentor.displayName}?`)) return;
    const mentors = data.mentors.filter((entry) => entry.id !== mentor.id);
    const fallbackId = mentors.find((entry) => entry.isDefault)?.id ?? mentors[0]?.id ?? "mentor-fokus";
    onReplaceData({
      ...data,
      mentors,
      mentorSettings: normalizeMentorSettings(data.mentorSettings, mentors),
      profiles: data.profiles.map((profile) => profile.activeMentorId === mentor.id ? { ...profile, activeMentorId: fallbackId } : profile),
    });
    onNavigate({ view: "library" });
  }

  function selectMentor(mentor: Mentor) {
    if (!mentor.enabled || !isMentorUnlocked(mentor, activeProfile)) return;
    onUpdateProfile({ ...activeProfile, activeMentorId: mentor.id, mentorMode: "fixed" });
  }

  function updateAssignment(event: MentorEvent, mentorId: string) {
    const eventAssignments = { ...data.mentorSettings.eventAssignments };
    if (!mentorId) delete eventAssignments[event];
    else eventAssignments[event] = { mentorId };
    onReplaceData({ ...data, mentorSettings: { eventAssignments } });
  }

  function updateAssignedReaction(event: MentorEvent, reactionId: string) {
    const assignment = data.mentorSettings.eventAssignments[event];
    if (!assignment) return;
    onReplaceData({
      ...data,
      mentorSettings: {
        eventAssignments: {
          ...data.mentorSettings.eventAssignments,
          [event]: { ...assignment, reactionId: reactionId || undefined },
        },
      },
    });
  }

  return (
    <main className="screen-shell mentors-screen">
      <header className="screen-header mentors-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Wróć"><ArrowLeft /></button>
        <MowLogo className="header-logo" />
        <div><span>POSTACIE I GESTY</span><h1>Mentorzy i reakcje</h1></div>
        {canManage ? <span className="manager-badge">ZARZĄDZANIE</span> : null}
      </header>

      <nav className="mentor-tabs" aria-label="Widoki mentorów">
        <button type="button" className={route.view !== "settings" ? "active" : ""} onClick={() => onNavigate({ view: "library" })}><Sparkles /> Biblioteka</button>
        <button type="button" className={route.view === "settings" ? "active" : ""} onClick={() => onNavigate({ view: "settings" })}><Settings /> Ustawienia</button>
      </nav>

      {route.view === "settings" ? (
        <>
          <section className="mentor-selection-panel">
            <div><Shuffle /><span><strong>Mentor po rundzie</strong><small>Stała postać albo losowanie spośród odblokowanych.</small></span></div>
            <div className="segmented-control">
              <button type="button" className={activeProfile.mentorMode === "fixed" ? "active" : ""} onClick={() => onUpdateProfile({ ...activeProfile, mentorMode: "fixed" })}>Wybrany</button>
              <button type="button" className={activeProfile.mentorMode === "random" ? "active" : ""} onClick={() => onUpdateProfile({ ...activeProfile, mentorMode: "random" })}>Losowy</button>
            </div>
          </section>
          {canManage ? (
            <section className="mentor-event-settings">
              <div className="section-heading"><div><span>REGUŁY WYDARZEŃ</span><h2>Przypisania reakcji</h2></div><Settings /></div>
              <p>Przypisanie ma pierwszeństwo przed wyborem gracza. Puste pole pozostawia wybór automatyczny.</p>
              {MENTOR_EVENTS.map((event) => {
                const assignment = data.mentorSettings.eventAssignments[event];
                const mentor = data.mentors.find((entry) => entry.id === assignment?.mentorId);
                return (
                  <article key={event}>
                    <strong>{MENTOR_EVENT_LABELS[event]}</strong>
                    <select value={assignment?.mentorId ?? ""} onChange={(change) => updateAssignment(event, change.target.value)} aria-label={`Mentor: ${MENTOR_EVENT_LABELS[event]}`}>
                      <option value="">Automatycznie</option>
                      {data.mentors.filter((entry) => entry.enabled).map((entry) => <option key={entry.id} value={entry.id}>{entry.displayName}</option>)}
                    </select>
                    <select value={assignment?.reactionId ?? ""} disabled={!mentor} onChange={(change) => updateAssignedReaction(event, change.target.value)} aria-label={`Reakcja: ${MENTOR_EVENT_LABELS[event]}`}>
                      <option value="">Dobierz do kategorii</option>
                      {mentor?.reactions.filter((entry) => entry.enabled).map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                    </select>
                  </article>
                );
              })}
            </section>
          ) : (
            <p className="mentor-permission-note"><Lock /> Reguły wydarzeń może zmieniać wychowawca lub właściciel.</p>
          )}
        </>
      ) : selectedMentor ? (
        <section className="mentor-detail">
          <div className="mentor-detail-hero">
            <MentorVisual mentor={selectedMentor} />
            <div>
              <span>{selectedMentor.enabled ? "AKTYWNY" : "WYŁĄCZONY"}</span>
              <h2>{selectedMentor.displayName}</h2>
              <p>{selectedMentor.description}</p>
              <small>{selectedMentor.unlock.label}</small>
              <div>
                {isMentorUnlocked(selectedMentor, activeProfile) && selectedMentor.enabled ? <button type="button" className="primary" onClick={() => selectMentor(selectedMentor)}>{activeProfile.activeMentorId === selectedMentor.id && activeProfile.mentorMode === "fixed" ? <Check /> : <Sparkles />} {activeProfile.activeMentorId === selectedMentor.id && activeProfile.mentorMode === "fixed" ? "Wybrany mentor" : "Wybierz mentora"}</button> : <span className="mentor-locked"><Lock /> {selectedMentor.unlock.label}</span>}
                {canManage ? <button type="button" onClick={() => setEditing(selectedMentor)}><Edit3 /> Edytuj</button> : null}
                {canManage && selectedMentor.source === "custom" ? <button type="button" className="danger" onClick={() => deleteMentor(selectedMentor)}><Trash2 /> Usuń</button> : null}
              </div>
            </div>
          </div>
          {canManage || isMentorUnlocked(selectedMentor, activeProfile) ? (
            <div className="mentor-reaction-library">
              <div className="section-heading"><div><span>GESTY I KOMUNIKATY</span><h2>{selectedMentor.reactions.length} reakcji</h2></div></div>
              {selectedMentor.reactions.map((entry) => (
                <article key={entry.id} className={entry.enabled ? "" : "disabled"}>
                  <MentorVisual mentor={selectedMentor} reaction={entry} reducedMotion />
                  <div><span>{MENTOR_CATEGORY_LABELS[entry.category]}</span><strong>{entry.label}</strong><h3>{entry.title}</h3><p>{entry.subtitle}</p></div>
                  {entry.enabled ? <Eye aria-label="Aktywna" /> : <EyeOff aria-label="Wyłączona" />}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className="mentor-library-heading">
            <div><span>WYBIERZ POSTAĆ</span><h2>{visibleMentors.length} mentorów</h2><p>Każda postać ma własny styl motywowania i zestaw reakcji.</p></div>
            {canManage ? <button type="button" onClick={() => setEditing(createCustomMentor(data.mentors.length + 1))}><Plus /> Dodaj postać</button> : null}
          </section>
          <section className="mentor-grid">
            {visibleMentors.map((mentor) => {
              const unlocked = isMentorUnlocked(mentor, activeProfile);
              const selected = activeProfile.mentorMode === "fixed" && activeProfile.activeMentorId === mentor.id;
              return (
                <article key={mentor.id} className={`${selected ? "selected" : ""}${!mentor.enabled ? " disabled" : ""}`}>
                  <button type="button" className="mentor-card-main" onClick={() => onNavigate({ view: "detail", mentorId: mentor.id })}>
                    <MentorVisual mentor={mentor} reducedMotion />
                    <span>{mentor.reactions.filter((entry) => entry.enabled).length} reakcji</span>
                    <strong>{mentor.displayName}</strong>
                    <small>{mentor.description}</small>
                  </button>
                  <footer>
                    {!mentor.enabled ? <span><EyeOff /> Wyłączony</span> : unlocked ? <button type="button" onClick={() => selectMentor(mentor)}>{selected ? <Check /> : <Sparkles />} {selected ? "Wybrany" : "Wybierz"}</button> : <span><Lock /> {mentor.unlock.label}</span>}
                    {canManage ? <button type="button" className="icon-button" onClick={() => setEditing(mentor)} aria-label={`Edytuj ${mentor.displayName}`}><Edit3 /></button> : null}
                  </footer>
                </article>
              );
            })}
          </section>
        </>
      )}

      {editing ? <MentorEditor key={editing.id} mentor={editing} onCancel={() => setEditing(null)} onSave={saveMentor} /> : null}
    </main>
  );
}
