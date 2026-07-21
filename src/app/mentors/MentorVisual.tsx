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
  const mediaReference = reaction?.mediaUrl || mentor.avatarUrl;
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
  const classes = [
    "mentor-visual",
    className,
    reaction?.effectId,
    reaction?.category ? `reaction-${reaction.category}` : "",
    reducedMotion ? "reduced-motion" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-label={`${mentor.displayName}${reaction ? `: ${reaction.label}` : ""}`}>
      {source && isVideo ? (
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
