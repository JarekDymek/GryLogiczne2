import { Sparkles } from "lucide-react";
import { MentorVisual } from "./MentorVisual";
import { MENTOR_EVENT_LABELS, type MentorPresentation } from "./types";

export function MentorMoment({
  presentation,
  reducedMotion = false,
}: {
  presentation: MentorPresentation;
  reducedMotion?: boolean;
}) {
  return (
    <section className={`mentor-moment reaction-${presentation.reaction.category}`} aria-live="polite">
      <MentorVisual
        mentor={presentation.mentor}
        reaction={presentation.reaction}
        reducedMotion={reducedMotion}
      />
      <div>
        <span><Sparkles aria-hidden="true" /> {MENTOR_EVENT_LABELS[presentation.event]}</span>
        <small>{presentation.mentor.displayName}</small>
        <h2>{presentation.reaction.title}</h2>
        <p>{presentation.reaction.subtitle}</p>
      </div>
    </section>
  );
}
