import {
  ArrowLeft,
  Eye,
  FlipHorizontal2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Timer,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { responsiveBoardViewBox } from "../../../app/boardScale";
import type { GameRoundResult, GameSession } from "../../../app/types";
import { hasAnyOverlap, pathFromPoints, transformedVertices } from "../geometry";
import { getTPuzzleLevels } from "../levels";
import { createInitialPieceStates, piecesByFamily, puzzleFamiliesById } from "../pieces";
import {
  loadStoredProgress,
  saveStoredProgress,
  targetKey,
  TIME_LIMITS,
  unlockAfterSolvedLevel,
  withBestTime,
  type AttemptState,
} from "../progress";
import { applyDeltaToStates, findSnap } from "../snap";
import type {
  PieceDefinition,
  PieceId,
  PieceRotation,
  PieceState,
  PieceTransform,
  Point,
  TargetDefinition,
} from "../types";
import { isTargetSolved } from "../validation";

interface TPuzzleGameProps {
  session: GameSession;
  playerName: string;
  skinId: string;
  customTextureUrl?: string | null;
  reducedEffects?: boolean;
  onFinish: (result: GameRoundResult) => void;
  onExit: () => void;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function rotateValue(rotation: PieceRotation, delta: 45 | -45 | 90 | -90): PieceRotation {
  return ((rotation + delta + 360) % 360) as PieceRotation;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function svgPoint(svg: SVGSVGElement, event: PointerEvent | ReactPointerEvent): Point {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();
  return matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
}

function groupIdsFor(states: PieceState[], pieceId: string): Set<string> {
  const groupId = states.find((state) => state.pieceId === pieceId)?.groupId;
  return new Set(states.filter((state) => state.groupId === groupId).map((state) => state.pieceId));
}

function statesFromSolution(solution: PieceTransform[]): PieceState[] {
  return solution.map((transform, index) => ({
    pieceId: transform.pieceId,
    position: { x: transform.x, y: transform.y },
    rotation: transform.rotation,
    flipped: transform.flipped,
    zIndex: index + 1,
    groupId: "target",
    lastValidPosition: { x: transform.x, y: transform.y },
  }));
}

function boundsForPoints(points: Point[]): Bounds {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function solutionPolygons(
  target: TargetDefinition,
  pieces: Record<PieceId, PieceDefinition>,
): Point[][] {
  return target.solutions[0]
    ? statesFromSolution(target.solutions[0]).map((state) =>
        transformedVertices(pieces[state.pieceId], state),
      )
    : [];
}

function boundsForPolygons(polygons: Point[][]) {
  const points = polygons.flat();
  if (points.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const bounds = boundsForPoints(points);
  const padding = 0.18;
  return {
    x: bounds.minX - padding,
    y: bounds.minY - padding,
    width: bounds.maxX - bounds.minX + padding * 2,
    height: bounds.maxY - bounds.minY + padding * 2,
  };
}

function publicAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function TPuzzleGame({
  session,
  playerName,
  skinId,
  customTextureUrl,
  reducedEffects = false,
  onFinish,
  onExit,
}: TPuzzleGameProps) {
  const levels = useMemo(() => getTPuzzleLevels(session.familyId), [session.familyId]);
  const level = levels[session.levelIndex];
  const target = level.targets[session.targetIndex];
  const piecesById = piecesByFamily[session.familyId];
  const initialStates = useMemo(() => createInitialPieceStates(), [session]);
  const [states, setStates] = useState<PieceState[]>(initialStates);
  const [selectedPieceId, setSelectedPieceId] = useState<string>("blue-bar");
  const [attemptState, setAttemptState] = useState<AttemptState>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(TIME_LIMITS[session.socialGrade]);
  const [attemptStartedAt, setAttemptStartedAt] = useState<number | null>(null);
  const [attemptEndsAt, setAttemptEndsAt] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [resets, setResets] = useState(0);
  const [message, setMessage] = useState("Przygotuj się.");
  const [introPhase, setIntroPhase] = useState<"assembled" | "launching" | "scattered">(
    "assembled",
  );
  const [showTarget, setShowTarget] = useState(false);
  const [feedback, setFeedback] = useState<"none" | "snap" | "error">("none");
  const [actionTick, setActionTick] = useState(0);
  const [viewBox, setViewBox] = useState(() =>
    responsiveBoardViewBox(initialStates, piecesById, 390, 620),
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const boardFrameRef = useRef<HTMLDivElement | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const finishSentRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startPoint: Point;
    startStates: PieceState[];
    activeIds: Set<string>;
  } | null>(null);
  const timeLimit = TIME_LIMITS[session.socialGrade];
  const canInteract = attemptState === "running";
  const currentTargetKey = targetKey(level.id, target.id);
  const targetPolygons = useMemo(
    () => solutionPolygons(target, piecesById),
    [piecesById, target],
  );
  const previewBounds = useMemo(
    () =>
      target.outline
        ? boundsForPolygons([target.outline])
        : boundsForPolygons(targetPolygons),
    [target.outline, targetPolygons],
  );
  const sortedStates = useMemo(
    () => [...states].sort((first, second) => first.zIndex - second.zIndex),
    [states],
  );

  const finishRound = useCallback(
    (success: boolean, finalStates: PieceState[] = states) => {
      if (finishSentRef.current) {
        return;
      }
      finishSentRef.current = true;
      const elapsedSeconds = attemptStartedAt
        ? Math.min(timeLimit, Math.max(0, Math.ceil((Date.now() - attemptStartedAt) / 1000)))
        : Math.max(0, timeLimit - remainingSeconds);
      const result: GameRoundResult = {
        success,
        targetKey: currentTargetKey,
        familyId: session.familyId,
        levelIndex: session.levelIndex,
        targetIndex: session.targetIndex,
        grade: session.socialGrade,
        elapsedSeconds,
        remainingSeconds: Math.max(0, timeLimit - elapsedSeconds),
        moves,
        resets,
      };

      if (success) {
        const stored = loadStoredProgress();
        const completedTargets = new Set(stored.completedTargets);
        const completedLevels = new Set(stored.completedLevels);
        completedTargets.add(currentTargetKey);
        completedLevels.add(session.levelIndex);
        saveStoredProgress({
          ...stored,
          puzzleFamilyId: session.familyId,
          levelIndex: session.levelIndex,
          targetIndex: session.targetIndex,
          highestUnlockedLevel: unlockAfterSolvedLevel(
            stored.highestUnlockedLevel,
            session.levelIndex,
          ),
          completedTargets: Array.from(completedTargets),
          completedLevels: Array.from(completedLevels),
          socialGrade: session.socialGrade,
          bestTimes: withBestTime(
            stored.bestTimes,
            currentTargetKey,
            session.socialGrade,
            elapsedSeconds,
          ),
        });
      }

      finishTimerRef.current = window.setTimeout(
        () => onFinish(result),
        reducedEffects ? 150 : success ? 900 : 450,
      );
      void finalStates;
    },
    [
      attemptStartedAt,
      currentTargetKey,
      moves,
      onFinish,
      reducedEffects,
      remainingSeconds,
      resets,
      session,
      states,
      timeLimit,
    ],
  );

  const startAttempt = useCallback(() => {
    const now = Date.now();
    setAttemptState("running");
    setAttemptStartedAt(now);
    setAttemptEndsAt(now + timeLimit * 1000);
    setRemainingSeconds(timeLimit);
    setIntroPhase(reducedEffects ? "scattered" : "launching");
    setMessage("Układaj.");
    if (!reducedEffects) {
      startTimerRef.current = window.setTimeout(() => setIntroPhase("scattered"), 620);
    }
  }, [reducedEffects, timeLimit]);

  useEffect(() => {
    startTimerRef.current = window.setTimeout(startAttempt, reducedEffects ? 50 : 500);
  }, [reducedEffects, startAttempt]);

  useEffect(() => {
    if (attemptState !== "running" || attemptEndsAt === null) {
      return;
    }
    const update = () => {
      const next = Math.max(0, Math.ceil((attemptEndsAt - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) {
        dragRef.current = null;
        setAttemptState("expired");
        setAttemptEndsAt(null);
        setMessage("Czas minął.");
        finishRound(false);
      }
    };
    update();
    const interval = window.setInterval(update, 200);
    return () => window.clearInterval(interval);
  }, [attemptEndsAt, attemptState, finishRound]);

  useEffect(() => {
    const frame = boardFrameRef.current;
    if (!frame) {
      return;
    }
    const update = () => {
      const rect = frame.getBoundingClientRect();
      setViewBox(
        responsiveBoardViewBox(
          initialStates,
          piecesById,
          Math.max(1, rect.width),
          Math.max(1, rect.height),
        ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [initialStates, piecesById]);

  useEffect(
    () => () => {
      if (startTimerRef.current !== null) {
        window.clearTimeout(startTimerRef.current);
      }
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
      }
    },
    [],
  );

  function flash(next: "snap" | "error") {
    setFeedback("none");
    window.requestAnimationFrame(() => setFeedback(next));
    window.setTimeout(() => setFeedback("none"), 260);
  }

  function selectAndLift(pieceId: string) {
    setSelectedPieceId(pieceId);
    setStates((current) => {
      const maxZ = Math.max(...current.map((state) => state.zIndex));
      const activeIds = groupIdsFor(current, pieceId);
      return current.map((state) =>
        activeIds.has(state.pieceId) ? { ...state, zIndex: maxZ + 1 } : state,
      );
    });
  }

  function detachSelected(current: PieceState[]): PieceState[] {
    return current.map((state) =>
      state.pieceId === selectedPieceId
        ? { ...state, groupId: `group-${state.pieceId}-${Date.now()}` }
        : state,
    );
  }

  function checkTarget(nextStates: PieceState[]) {
    if (attemptState !== "running" || hasAnyOverlap(nextStates, piecesById)) {
      return;
    }
    if (isTargetSolved(target, level.validation, nextStates)) {
      setAttemptState("solved");
      setAttemptEndsAt(null);
      setMessage("ZALICZONE");
      finishRound(true, nextStates);
    }
  }

  function rotateSelected(delta: 45 | -45 | 90 | -90) {
    if (!canInteract) {
      return;
    }
    setStates((current) => {
      const detached = detachSelected(current);
      const next = detached.map((state) =>
        state.pieceId === selectedPieceId
          ? { ...state, rotation: rotateValue(state.rotation, delta) }
          : state,
      );
      if (hasAnyOverlap(next, piecesById, new Set([selectedPieceId]))) {
        setMessage("Brak miejsca na obrót.");
        flash("error");
        return detached;
      }
      setMoves((value) => value + 1);
      setActionTick((value) => value + 1);
      window.setTimeout(() => checkTarget(next), 0);
      return next;
    });
  }

  function flipSelected() {
    if (!canInteract) {
      return;
    }
    setStates((current) => {
      const detached = detachSelected(current);
      const next = detached.map((state) =>
        state.pieceId === selectedPieceId ? { ...state, flipped: !state.flipped } : state,
      );
      if (hasAnyOverlap(next, piecesById, new Set([selectedPieceId]))) {
        setMessage("Brak miejsca na odbicie.");
        flash("error");
        return detached;
      }
      setMoves((value) => value + 1);
      setActionTick((value) => value + 1);
      window.setTimeout(() => checkTarget(next), 0);
      return next;
    });
  }

  function resetBoard() {
    if (!canInteract) {
      return;
    }
    setStates(initialStates);
    setSelectedPieceId("blue-bar");
    setResets((value) => value + 1);
    setMoves((value) => value + 1);
    setMessage("Plansza zresetowana.");
  }

  function onPointerDown(event: ReactPointerEvent<SVGPolygonElement>, pieceId: string) {
    if (!svgRef.current || !canInteract) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectAndLift(pieceId);
    dragRef.current = {
      pointerId: event.pointerId,
      startPoint: svgPoint(svgRef.current, event),
      startStates: states,
      activeIds: groupIdsFor(states, pieceId),
    };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || !svgRef.current || drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const current = svgPoint(svgRef.current, event);
    const delta = {
      x: current.x - drag.startPoint.x,
      y: current.y - drag.startPoint.y,
    };
    const dragged = applyDeltaToStates(drag.startStates, drag.activeIds, delta);
    const snap = findSnap(dragged, piecesById, drag.activeIds);
    setStates(snap ? applyDeltaToStates(dragged, drag.activeIds, snap.delta) : dragged);
  }

  function finishDrag(event: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    if (cancelled) {
      setStates(drag.startStates);
      dragRef.current = null;
      return;
    }

    const activeIds = drag.activeIds;
    setStates((current) => {
      const snap = findSnap(current, piecesById, activeIds);
      const snapped = snap ? applyDeltaToStates(current, activeIds, snap.delta) : current;
      if (hasAnyOverlap(snapped, piecesById, activeIds)) {
        flash("error");
        return current.map((state) =>
          activeIds.has(state.pieceId)
            ? { ...state, position: state.lastValidPosition }
            : state,
        );
      }
      const activeGroup =
        current.find((state) => activeIds.has(state.pieceId))?.groupId ?? "active";
      const merged =
        snap?.contact === "edge"
          ? snapped.map((state) =>
              activeIds.has(state.pieceId) || state.groupId === snap.targetGroupId
                ? { ...state, groupId: activeGroup }
                : state,
            )
          : snapped;
      const valid = merged.map((state) =>
        activeIds.has(state.pieceId)
          ? { ...state, lastValidPosition: state.position }
          : state,
      );
      if (snap) {
        flash("snap");
      }
      setMoves((value) => value + 1);
      window.setTimeout(() => checkTarget(valid), 0);
      return valid;
    });
    dragRef.current = null;
  }

  function renderTargetVisual(className = "") {
    if (target.previewImagePath) {
      const maskImage = `url("${publicAssetUrl(target.previewImagePath)}")`;
      return (
        <span
          className={`${className} target-mask-frame`}
          role="img"
          aria-label={`Jednolity wzór figury ${target.name}`}
        >
          <span
            className="target-mask-shape"
            style={{ maskImage, WebkitMaskImage: maskImage }}
            aria-hidden="true"
          />
        </span>
      );
    }
    const polygons = target.outline ? [target.outline] : targetPolygons;
    return (
      <svg
        className={className}
        viewBox={`${previewBounds.x} ${previewBounds.y} ${previewBounds.width} ${previewBounds.height}`}
        aria-label={`Jednolity wzór figury ${target.name}`}
      >
        <g className="arena-target-shape">
          {polygons.map((points, index) => (
            <polygon key={`${target.id}-${index}`} points={pathFromPoints(points)} />
          ))}
        </g>
      </svg>
    );
  }

  const urgent = attemptState === "running" && remainingSeconds <= 10;
  const critical = attemptState === "running" && remainingSeconds <= 5;

  return (
    <section
      className={`arena skin-${skinId}${reducedEffects ? " reduced-effects" : ""}`}
      aria-label="Rozgrywka T-Puzzle"
    >
      <header className="arena-hud">
        <button type="button" className="icon-button" onClick={onExit} aria-label="Wyjdź do menu">
          <ArrowLeft />
        </button>
        <div className="arena-title">
          <span>
            {puzzleFamiliesById[session.familyId].shortName} · poziom {level.displayNumber}
          </span>
          <strong>{target.name}</strong>
          <small>{playerName} · wariant {session.targetIndex + 1}/3</small>
        </div>
        <button
          type="button"
          className="target-chip"
          onClick={() => setShowTarget(true)}
          aria-label="Pokaż większy wzór celu"
        >
          {renderTargetVisual("target-chip-image")}
          <Eye size={16} />
        </button>
        <div className={`arena-timer${urgent ? " urgent" : ""}${critical ? " critical" : ""}`}>
          <Timer size={18} />
          <strong>{formatTime(remainingSeconds)}</strong>
          <span>{session.socialGrade}</span>
        </div>
      </header>

      <div
        ref={boardFrameRef}
        className={`arena-board-frame feedback-${feedback}`}
        data-action-tick={actionTick}
      >
        {introPhase !== "scattered" && attemptState !== "solved" ? (
          <div className={`arena-assembled ${introPhase}`}>
            {renderTargetVisual("arena-assembled-target")}
          </div>
        ) : null}
        {introPhase === "launching" && !reducedEffects ? (
          <div className="arena-start-burst" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} style={{ "--particle": index } as CSSProperties} />
            ))}
          </div>
        ) : null}
        {attemptState === "solved" ? (
          <div className="arena-success-wave" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => (
              <span key={index} style={{ "--particle": index } as CSSProperties} />
            ))}
          </div>
        ) : null}
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="arena-board"
          onPointerMove={onPointerMove}
          onPointerUp={(event) => finishDrag(event, false)}
          onPointerCancel={(event) => finishDrag(event, true)}
          aria-label="Plansza z czterema klockami"
        >
          <defs>
            <pattern id="arena-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" className="arena-grid-line" />
            </pattern>
            {customTextureUrl ? (
              <pattern id="custom-piece-texture" width="1" height="1" patternUnits="objectBoundingBox">
                <image
                  href={customTextureUrl}
                  x="0"
                  y="0"
                  width="1"
                  height="1"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ) : null}
          </defs>
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            fill="url(#arena-grid)"
          />
          {sortedStates.map((state) => {
            const piece = piecesById[state.pieceId];
            const selected = state.pieceId === selectedPieceId;
            const custom = skinId === "custom" && customTextureUrl;
            return (
              <polygon
                key={state.pieceId}
                points={pathFromPoints(transformedVertices(piece, state))}
                className={[
                  "arena-piece",
                  `piece-${piece.workColor}`,
                  selected ? "selected" : "",
                  introPhase === "assembled" ? "prestart-hidden" : "",
                  introPhase === "launching" ? `scatter scatter-${state.pieceId}` : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={custom ? { fill: "url(#custom-piece-texture)" } : undefined}
                onPointerDown={(event) => onPointerDown(event, state.pieceId)}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div className={`arena-message state-${attemptState}`} aria-live="polite">
          {message}
        </div>
      </div>

      <div className="arena-controls" aria-label="Sterowanie wybranym klockiem">
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(-90)}>
          <RotateCcw />
          <span>90°</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={flipSelected}>
          <FlipHorizontal2 />
          <span>Odbij</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(90)}>
          <RotateCw />
          <span>90°</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(-45)}>
          <RotateCcw />
          <span>45°</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={resetBoard}>
          <RefreshCcw />
          <span>Reset</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(45)}>
          <RotateCw />
          <span>45°</span>
        </button>
      </div>

      {showTarget ? (
        <div className="target-dialog" role="dialog" aria-modal="true" aria-label="Wzór figury">
          <button
            type="button"
            className="icon-button target-dialog-close"
            onClick={() => setShowTarget(false)}
            aria-label="Zamknij wzór"
          >
            <X />
          </button>
          <div>
            <span>CEL</span>
            <strong>{target.name}</strong>
          </div>
          {renderTargetVisual("target-dialog-image")}
        </div>
      ) : null}
    </section>
  );
}
