import { useEffect, useState } from "react";
import { loadMentorImage } from "./mentorMedia";
import type { Mentor, MentorReaction } from "./types";

interface MentorVisualProps {
  mentor: Mentor;
  reaction?: MentorReaction;
  className?: string;
  reducedMotion?: boolean;
}

export function MentorVisual({ mentor, reaction, className = "", reducedMotion = false }: MentorVisualProps) {
  const isSprite = reaction?.mediaType === "sprite";
  const mediaReference = isSprite
    ? reaction?.mediaUrl || mentor.spriteSheetUrl || mentor.avatarUrl
    : reaction?.mediaUrl || mentor.avatarUrl;
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void loadMentorImage(mediaReference).then((url) => {
      if (!active) {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url?.startsWith("blob:") ? url : null;
      setSource(url);
    }).catch(() => setSource(null));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaReference]);

  const isVideo = reaction?.mediaType === "webm" || reaction?.mediaType === "mp4";
  const sprite = reaction?.sprite;
  const columns = Math.max(1, sprite?.columns ?? mentor.spriteColumns ?? 1);
  const rows = Math.max(1, sprite?.rows ?? mentor.spriteRows ?? 1);
  const column = Math.min(columns - 1, Math.max(0, sprite?.column ?? 0));
  const row = Math.min(rows - 1, Math.max(0, sprite?.row ?? 0));
  const classes = [
    "mentor-visual",
    className,
    reaction?.effectId,
    reaction?.category ? `reaction-${reaction.category}` : "",
    reducedMotion ? "reduced-motion" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-label={`${mentor.displayName}${reaction ? `: ${reaction.label}` : ""}`}>
      {source && isSprite ? (
        <span
          className="mentor-sprite-frame"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${JSON.stringify(source)})`,
            backgroundSize: `${columns * 100}% ${rows * 100}%`,
            backgroundPosition: `${columns === 1 ? 0 : (column / (columns - 1)) * 100}% ${rows === 1 ? 0 : (row / (rows - 1)) * 100}%`,
          }}
        />
      ) : source && isVideo ? (
        <video src={source} autoPlay={!reducedMotion} muted loop={!reducedMotion} playsInline />
      ) : source ? (
        <img src={source} alt="" draggable={false} />
      ) : (
        <span className="mentor-visual-fallback" aria-hidden="true">
          {mentor.displayName.slice(0, 1).toLocaleUpperCase("pl")}
        </span>
      )}
    </div>
  );
}
