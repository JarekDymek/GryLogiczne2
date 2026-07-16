import {
  BrainCircuit,
  Crown,
  Flame,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import type { AvatarId } from "../types";

const AVATAR_ICONS = {
  bolt: Zap,
  target: Target,
  brain: BrainCircuit,
  shield: Shield,
  flame: Flame,
  crown: Crown,
};

export function MowLogo({ className = "" }: { className?: string }) {
  return (
    <img
      className={`mow-logo ${className}`.trim()}
      src={`${import.meta.env.BASE_URL}assets/mow-logo.jpg`}
      alt="Logo Młodzieżowego Ośrodka Wychowawczego w Malborku"
      draggable={false}
    />
  );
}

export function PlayerAvatar({
  avatarId,
  className = "",
}: {
  avatarId: AvatarId;
  className?: string;
}) {
  const Icon = AVATAR_ICONS[avatarId] ?? Zap;
  return (
    <span className={`player-avatar avatar-${avatarId} ${className}`.trim()} aria-hidden="true">
      <Icon />
    </span>
  );
}

export const AVATAR_OPTIONS = Object.keys(AVATAR_ICONS) as AvatarId[];
