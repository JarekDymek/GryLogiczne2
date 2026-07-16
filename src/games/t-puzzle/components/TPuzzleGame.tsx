import {
  BookOpenCheck,
  Check,
  ChevronRight,
  Download,
  FlipHorizontal2,
  Lock,
  Play,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Trash2,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { boardViewBox, mobileBoardViewBox } from "../config";
import { hasAnyOverlap, pathFromPoints, transformedVertices } from "../geometry";
import { getTPuzzleLevels } from "../levels";
import { createInitialPieceStates, piecesByFamily, puzzleFamilies } from "../pieces";
import {
  defaultProgress,
  loadStoredProgress,
  resetStoredProgress,
  saveStoredProgress,
  SOCIAL_GRADES,
  solvedCountForLevel,
  targetKey,
  TIME_LIMITS,
  unlockAfterSolvedLevel,
  withBestTime,
  type AttemptState,
  type SocialGrade,
  type StoredProgress,
} from "../progress";
import { applyDeltaToStates, findSnap } from "../snap";
import type { PieceDefinition, PieceId, PieceRotation, PieceState, PieceTransform, Point, PuzzleFamilyId, TargetDefinition } from "../types";
import { isTargetSolved } from "../validation";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function rotateValue(rotation: PieceRotation, delta: 45 | -45 | 90 | -90): PieceRotation {
  return ((rotation + delta + 360) % 360) as PieceRotation;
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

  if (!matrix) {
    return { x: 0, y: 0 };
  }

  return point.matrixTransform(matrix.inverse());
}

function groupIdsFor(states: PieceState[], pieceId: string): Set<string> {
  const groupId = states.find((state) => state.pieceId === pieceId)?.groupId;
  return new Set(states.filter((state) => state.groupId === groupId).map((state) => state.pieceId));
}

function publicAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
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

function solutionPolygons(
  target: TargetDefinition,
  pieces: Record<PieceId, PieceDefinition>,
): Point[][] {
  const solution = target.solutions[0];
  if (!solution) {
    return [];
  }

  return statesFromSolution(solution).map((state) =>
    transformedVertices(pieces[state.pieceId], state),
  );
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

export function TPuzzleGame() {
  const storedProgress = useMemo(() => loadStoredProgress(), []);
  const [familyId, setFamilyId] = useState<PuzzleFamilyId>(storedProgress.puzzleFamilyId);
  const [levelIndex, setLevelIndex] = useState(storedProgress.levelIndex);
  const [targetIndex, setTargetIndex] = useState(storedProgress.targetIndex);
  const [states, setStates] = useState<PieceState[]>(() => createInitialPieceStates());
  const [selectedPieceId, setSelectedPieceId] = useState<string>("blue-bar");
  const [message, setMessage] = useState("Uloz cztery elementy w sylwetke celu.");
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [socialGrade, setSocialGrade] = useState<SocialGrade>(storedProgress.socialGrade);
  const [remainingSeconds, setRemainingSeconds] = useState(TIME_LIMITS[storedProgress.socialGrade]);
  const [attemptState, setAttemptState] = useState<AttemptState>("idle");
  const [attemptStartedAt, setAttemptStartedAt] = useState<number | null>(null);
  const [attemptEndsAt, setAttemptEndsAt] = useState<number | null>(null);
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(storedProgress.highestUnlockedLevel);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(
    () => new Set(storedProgress.completedLevels),
  );
  const [completedTargets, setCompletedTargets] = useState<Set<string>>(
    () => new Set(storedProgress.completedTargets),
  );
  const [bestTimes, setBestTimes] = useState<StoredProgress["bestTimes"]>(
    storedProgress.bestTimes,
  );
  const [isSolutionCatalogOpen, setIsSolutionCatalogOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [introPhase, setIntroPhase] = useState<"assembled" | "launching" | "scattered">("assembled");
  const [usesMobileBoard, setUsesMobileBoard] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 520px)").matches,
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const introTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPoint: Point;
    startStates: PieceState[];
    activeIds: Set<string>;
  } | null>(null);

  const tPuzzleLevels = getTPuzzleLevels(familyId);
  const piecesById = piecesByFamily[familyId];
  const level = tPuzzleLevels[levelIndex];
  const target = level.targets[targetIndex];
  const currentTargetKey = targetKey(level.id, target.id);
  const targetPolygons = useMemo(() => solutionPolygons(target, piecesById), [piecesById, target]);
  const previewBounds = useMemo(
    () => (target.outline ? boundsForPolygons([target.outline]) : boundsForPolygons(targetPolygons)),
    [target.outline, targetPolygons],
  );
  const sortedStates = useMemo(
    () => [...states].sort((a, b) => a.zIndex - b.zIndex),
    [states],
  );
  const activeBoardViewBox = usesMobileBoard ? mobileBoardViewBox : boardViewBox;
  const isFinalLevel = levelIndex === tPuzzleLevels.length - 1;
  const timeLimit = TIME_LIMITS[socialGrade];
  const timeExpired = attemptState === "expired";
  const canInteract = attemptState === "running" && !isSolved;
  const solvedTargetsInLevel = solvedCountForLevel(levelIndex, completedTargets);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 520px)");
    const updateBoardMode = () => setUsesMobileBoard(query.matches);

    updateBoardMode();
    query.addEventListener("change", updateBoardMode);
    return () => query.removeEventListener("change", updateBoardMode);
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (attemptState !== "running" || attemptEndsAt === null) {
      return undefined;
    }

    const updateRemainingTime = () => {
      const nextRemaining = Math.max(0, Math.ceil((attemptEndsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      if (nextRemaining === 0) {
        dragRef.current = null;
        setAttemptState("expired");
        setAttemptEndsAt(null);
        setMessage("Czas minął. Próba zakończona. Uruchom ją ponownie.");
      }
    };

    updateRemainingTime();
    const interval = window.setInterval(updateRemainingTime, 200);
    return () => window.clearInterval(interval);
  }, [attemptEndsAt, attemptState]);

  useEffect(() => {
    saveStoredProgress({
      puzzleFamilyId: familyId,
      levelIndex,
      targetIndex,
      highestUnlockedLevel,
      completedLevels: Array.from(completedLevels),
      completedTargets: Array.from(completedTargets),
      socialGrade,
      bestTimes,
    });
  }, [
    bestTimes,
    completedLevels,
    completedTargets,
    familyId,
    highestUnlockedLevel,
    levelIndex,
    socialGrade,
    targetIndex,
  ]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "q") {
        rotateSelected(-45);
      }

      if (event.key.toLowerCase() === "e") {
        rotateSelected(45);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    return () => {
      clearScheduledAdvance();
      clearIntroTimer();
    };
  }, []);

  function clearScheduledAdvance() {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function resetAttempt(nextGrade = socialGrade) {
    clearIntroTimer();
    setAttemptState("idle");
    setAttemptStartedAt(null);
    setAttemptEndsAt(null);
    setRemainingSeconds(TIME_LIMITS[nextGrade]);
    dragRef.current = null;
    setIntroPhase("assembled");
  }

  function startAttempt() {
    const now = Date.now();
    clearScheduledAdvance();
    clearIntroTimer();
    if (attemptState === "expired" || attemptState === "solved") {
      setStates(createInitialPieceStates());
      setSelectedPieceId("blue-bar");
      setMoves(0);
    }
    setAttemptState("running");
    setAttemptStartedAt(now);
    setAttemptEndsAt(now + timeLimit * 1000);
    setRemainingSeconds(timeLimit);
    setIsSolved(false);
    setIntroPhase("launching");
    introTimerRef.current = window.setTimeout(() => {
      setIntroPhase("scattered");
      introTimerRef.current = null;
    }, 640);
    setMessage(`Start. Masz ${timeLimit} sekund w trybie ${socialGrade}.`);
  }

  function resetBoard(nextMessage = "Figura zresetowana.") {
    clearScheduledAdvance();
    setStates(createInitialPieceStates());
    setSelectedPieceId("blue-bar");
    setIsSolved(false);
    setMoves(0);
    setMessage(nextMessage);
    resetAttempt();
  }

  function isLevelUnlocked(index: number): boolean {
    return index <= highestUnlockedLevel;
  }

  function isTargetUnlocked(index: number): boolean {
    return index >= 0 && index < level.targets.length;
  }

  function changeSocialGrade(nextGrade: SocialGrade) {
    if (attemptState === "running") {
      return;
    }

    setSocialGrade(nextGrade);
    resetAttempt(nextGrade);
    setMessage(`Tryb ${nextGrade}: ${TIME_LIMITS[nextGrade]} sekund.`);
  }

  function changePuzzleFamily(nextFamilyId: PuzzleFamilyId) {
    if (nextFamilyId === familyId) {
      return;
    }

    clearScheduledAdvance();
    setFamilyId(nextFamilyId);
    setLevelIndex(0);
    setTargetIndex(0);
    setStates(createInitialPieceStates());
    setSelectedPieceId("blue-bar");
    setIsSolved(false);
    setMoves(0);
    setIsSolutionCatalogOpen(false);
    resetAttempt();
    const family = puzzleFamilies.find((entry) => entry.id === nextFamilyId);
    setMessage(`${family?.name ?? "T-puzzle"}: wybierz wariant i rozpocznij próbę.`);
  }

  function clearIntroTimer() {
    if (introTimerRef.current !== null) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  }

  async function installApplication() {
    if (!installPrompt) {
      setMessage("Instalacja nie jest teraz dostępna. Otwórz grę w Chrome i wybierz Zainstaluj aplikację.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setMessage(choice.outcome === "accepted" ? "Instalacja aplikacji została uruchomiona." : "Instalacja została anulowana.");
  }

  function resetProgress() {
    if (!window.confirm("Wyzerować zapisane poziomy, warianty i czasy?")) {
      return;
    }

    resetStoredProgress();
    const freshProgress = defaultProgress();
    setLevelIndex(freshProgress.levelIndex);
    setTargetIndex(freshProgress.targetIndex);
    setHighestUnlockedLevel(freshProgress.highestUnlockedLevel);
    setCompletedLevels(new Set(freshProgress.completedLevels));
    setCompletedTargets(new Set(freshProgress.completedTargets));
    setBestTimes(freshProgress.bestTimes);
    setFamilyId(freshProgress.puzzleFamilyId);
    setSocialGrade(freshProgress.socialGrade);
    resetBoard("Postęp wyzerowany. Dostępny jest poziom 1.");
  }

  function selectLevel(index: number) {
    if (!isLevelUnlocked(index)) {
      return;
    }

    const nextLevel = tPuzzleLevels[index];
    setLevelIndex(index);
    setTargetIndex(0);
    resetBoard(`Poziom ${nextLevel.displayNumber}: ${nextLevel.targets[0].name}`);
  }

  function selectTarget(index: number) {
    if (!isTargetUnlocked(index)) {
      return;
    }

    setTargetIndex(index);
    resetBoard(`Figura ${index + 1}/${level.targets.length}: ${level.targets[index].name}`);
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
        setMessage("Obrot powoduje nalozenie elementow.");
        return detached;
      }

      setMoves((value) => value + 1);
      setTimeout(() => checkTarget(next), 0);
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
        setMessage("Odbicie powoduje nalozenie elementow.");
        return detached;
      }

      setMoves((value) => value + 1);
      setTimeout(() => checkTarget(next), 0);
      return next;
    });
  }

  function completeTarget() {
    setCompletedTargets((current) => {
      const next = new Set(current);
      next.add(currentTargetKey);
      return next;
    });
  }

  function completeLevel() {
    setCompletedLevels((current) => {
      const next = new Set(current);
      next.add(levelIndex);
      return next;
    });
    setHighestUnlockedLevel((current) => unlockAfterSolvedLevel(current, levelIndex));
  }

  function scheduleAdvance() {
    if (isFinalLevel) {
      return;
    }

    clearScheduledAdvance();
    advanceTimerRef.current = window.setTimeout(() => {
      goToNextLevel();
    }, 900);
  }

  function checkTarget(nextStates = states) {
    if (attemptState !== "running") {
      setMessage(timeExpired ? "Czas minął. Uruchom próbę ponownie." : "Najpierw uruchom próbę.");
      return;
    }

    if (hasAnyOverlap(nextStates, piecesById)) {
      setMessage("Elementy nachodzą na siebie. Popraw układ.");
      setIsSolved(false);
      return;
    }

    const solved = isTargetSolved(target, level.validation, nextStates);
    setIsSolved(solved);

    if (solved) {
      const elapsedSeconds = attemptStartedAt
        ? Math.min(timeLimit, Math.max(0, Math.ceil((Date.now() - attemptStartedAt) / 1000)))
        : Math.max(0, timeLimit - remainingSeconds);
      setAttemptState("solved");
      setAttemptEndsAt(null);
      completeTarget();
      completeLevel();
      setBestTimes((current) => withBestTime(current, currentTargetKey, socialGrade, elapsedSeconds));
      setMessage(
        isFinalLevel
          ? "Poprawnie. Wszystkie plansze zostały odblokowane."
          : `Poprawnie. Poziom zaliczony w trybie ${socialGrade}.`,
      );
      return;
    }

    setMessage("Jeszcze nie. Zbuduj jednolitą sylwetkę celu.");
  }

  function goToNextLevel() {
    clearScheduledAdvance();

    if (!isSolved && highestUnlockedLevel < levelIndex + 1) {
      return;
    }

    if (isFinalLevel) {
      setMessage("Wszystkie dostępne poziomy zaliczone.");
      return;
    }

    const nextLevelIndex = levelIndex + 1;
    const nextLevel = tPuzzleLevels[nextLevelIndex];
    setLevelIndex(nextLevelIndex);
    setTargetIndex(0);
    resetBoard(`Poziom ${nextLevel.displayNumber}: wybierz jeden z wariantów.`);
  }

  function onPointerDown(event: ReactPointerEvent<SVGPolygonElement>, pieceId: string) {
    if (!svgRef.current || !canInteract) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    selectAndLift(pieceId);
    const startPoint = svgPoint(svgRef.current, event);
    const activeIds = groupIdsFor(states, pieceId);
    dragRef.current = {
      pointerId: event.pointerId,
      startPoint,
      startStates: states,
      activeIds,
    };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const currentPoint = svgPoint(svgRef.current, event);
    const delta = {
      x: currentPoint.x - dragRef.current.startPoint.x,
      y: currentPoint.y - dragRef.current.startPoint.y,
    };
    const draggedStates = applyDeltaToStates(
      dragRef.current.startStates,
      dragRef.current.activeIds,
      delta,
    );
    const magneticSnap = findSnap(draggedStates, piecesById, dragRef.current.activeIds);
    const nextStates = magneticSnap
      ? applyDeltaToStates(draggedStates, dragRef.current.activeIds, magneticSnap.delta)
      : draggedStates;
    setStates(nextStates);
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const activeIds = dragRef.current.activeIds;
    setStates((current) => {
      const snap = findSnap(current, piecesById, activeIds);
      const snapped = snap ? applyDeltaToStates(current, activeIds, snap.delta) : current;

      if (hasAnyOverlap(snapped, piecesById, activeIds)) {
        setMessage("Ten ruch naklada elementy. Cofam do ostatniej dobrej pozycji.");
        return current.map((state) =>
          activeIds.has(state.pieceId) ? { ...state, position: state.lastValidPosition } : state,
        );
      }

      const activeGroup = current.find((state) => activeIds.has(state.pieceId))?.groupId ?? "active";
      const merged = snap?.contact === "edge"
        ? snapped.map((state) =>
            activeIds.has(state.pieceId) || state.groupId === snap.targetGroupId
              ? { ...state, groupId: activeGroup }
              : state,
          )
        : snapped;
      const withLastValid = merged.map((state) =>
        activeIds.has(state.pieceId) ? { ...state, lastValidPosition: state.position } : state,
      );

      setMoves((value) => value + 1);
      setTimeout(() => checkTarget(withLastValid), 0);
      return withLastValid;
    });
    dragRef.current = null;
  }

  function renderControls(className: string) {
    return (
      <div className={`controls ${className}`} aria-label="Sterowanie klockiem">
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(-90)} title="Obroc o 90 stopni w lewo">
          <RotateCcw size={20} />
          <span>90° lewo</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={flipSelected} title="Odbij element">
          <FlipHorizontal2 size={20} />
          <span>Odbij</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(90)} title="Obroc o 90 stopni w prawo">
          <RotateCw size={20} />
          <span>90° prawo</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(-45)} title="Obroc o 45 stopni w lewo">
          <RotateCcw size={20} />
          <span>45° lewo</span>
        </button>
        <button type="button" onClick={() => resetBoard()} title="Resetuj figure">
          <RefreshCcw size={20} />
          <span>Reset</span>
        </button>
        <button type="button" disabled={!canInteract} onClick={() => rotateSelected(45)} title="Obroc o 45 stopni w prawo">
          <RotateCw size={20} />
          <span>45° prawo</span>
        </button>
      </div>
    );
  }

  function renderFamilyTabs(className: string) {
    return (
      <div className={`family-tabs ${className}`} aria-label="Wersja T-puzzle">
        {puzzleFamilies.map((family) => (
          <button
            key={family.id}
            type="button"
            className={family.id === familyId ? "family-tab active" : "family-tab"}
            onClick={() => changePuzzleFamily(family.id)}
          >
            {family.shortName}
          </button>
        ))}
      </div>
    );
  }

  function renderLevelTabs(className: string) {
    return (
      <div className={`level-tabs ${className}`} aria-label="Lista poziomow">
        {tPuzzleLevels.map((entry, index) => {
          const unlocked = isLevelUnlocked(index);
          const solvedCount = solvedCountForLevel(index, completedTargets);
          const completed = solvedCount === entry.targets.length;
          const partial = solvedCount > 0 && !completed;
          return (
            <button
              key={entry.id}
              type="button"
              className={[
                "level-tab",
                index === levelIndex ? "active" : "",
                !unlocked ? "locked" : "",
                partial ? "partial" : "",
                completed ? "completed" : "",
              ].filter(Boolean).join(" ")}
              disabled={!unlocked}
              onClick={() => selectLevel(index)}
              title={unlocked ? `${entry.name}: ${solvedCount}/3` : `${entry.name}: zablokowany`}
            >
              <span>{unlocked ? entry.displayNumber : <Lock size={15} />}</span>
              <small>{completed ? "3/3" : partial ? `${solvedCount}/3` : entry.difficulty}</small>
            </button>
          );
        })}
      </div>
    );
  }

  function renderTargetTabs(className: string) {
    return (
      <div className={`target-tabs ${className}`} aria-label="Warianty figury">
        {level.targets.map((entry, index) => {
          const unlocked = isTargetUnlocked(index);
          const completed = completedTargets.has(targetKey(level.id, entry.id));
          return (
            <button
              key={entry.id}
              type="button"
              className={index === targetIndex ? "target-tab active" : "target-tab"}
              disabled={!unlocked}
              onClick={() => selectTarget(index)}
              title={entry.name}
            >
              <span>{index + 1}</span>
              {completed ? <Check size={14} /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  function renderTargetVisual(className = "", instanceId = "default") {
    if (target.previewImagePath) {
      return (
        <img
          src={publicAssetUrl(target.previewImagePath)}
          className={`preview-image ${className}`.trim()}
          alt={`Jednolity podglad figury ${target.displayNumber}`}
          draggable={false}
        />
      );
    }

    const silhouettePolygons = target.outline ? [target.outline] : targetPolygons;

    return (
      <svg
        viewBox={`${previewBounds.x} ${previewBounds.y} ${previewBounds.width} ${previewBounds.height}`}
        className={`preview-svg ${className}`.trim()}
        aria-label="Jednolity podglad figury docelowej"
      >
        <g className="target-silhouette" strokeLinejoin="round">
          {silhouettePolygons.map((points, index) => (
            <polygon
              key={`${target.id}-silhouette-${instanceId}-${index}`}
              points={pathFromPoints(points)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
    );
  }

  function renderTargetPreview(instanceId: string) {
    return (
      <div className="target-preview" aria-label="Podgląd figury docelowej">
        {renderTargetVisual("", instanceId)}
      </div>
    );
  }

  function renderSolutionCatalogButton(className = "solution-button") {
    return (
      <button
        type="button"
        className={className}
        onClick={() => setIsSolutionCatalogOpen(true)}
        aria-label="Otwórz planszę poprawnych rozwiązań"
      >
        <BookOpenCheck size={18} />
        <span>Rozwiązania</span>
      </button>
    );
  }

  function renderInstallButton(className = "install-button") {
    if (!installPrompt) {
      return null;
    }

    return (
      <button type="button" className={className} onClick={() => void installApplication()}>
        <Download size={18} />
        <span>Zainstaluj</span>
      </button>
    );
  }

  function renderVerifiedSolution(targetEntry: TargetDefinition) {
    if (targetEntry.solutionImagePath) {
      return (
        <figure className="verified-solution-card" key={targetEntry.id}>
          <figcaption>{targetEntry.displayNumber}. {targetEntry.name}</figcaption>
          <img
            src={publicAssetUrl(targetEntry.solutionImagePath)}
            alt={`Rozwiązanie: ${targetEntry.name}`}
            draggable={false}
          />
        </figure>
      );
    }

    const solutionStates = statesFromSolution(targetEntry.solutions[0]);
    const polygons = solutionStates.map((state) =>
      transformedVertices(piecesById[state.pieceId], state),
    );
    const bounds = boundsForPolygons(polygons);

    return (
      <figure className="verified-solution-card" key={targetEntry.id}>
        <figcaption>{targetEntry.displayNumber}</figcaption>
        <svg viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} aria-label={`Rozwiązanie figury ${targetEntry.displayNumber}`}>
          {solutionStates.map((state) => (
            <polygon
              key={state.pieceId}
              points={pathFromPoints(transformedVertices(piecesById[state.pieceId], state))}
              className={`verified-solution-piece piece-${piecesById[state.pieceId].workColor}`}
            />
          ))}
        </svg>
      </figure>
    );
  }

  return (
    <section className="game-layout">
      {isSolutionCatalogOpen ? (
        <div
          className="solution-catalog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Plansza poprawnych rozwiązań"
        >
          <header className="solution-catalog-header">
            <strong>
              {puzzleFamilies.find((entry) => entry.id === familyId)?.name}: 102 rozwiązania
            </strong>
            <button
              type="button"
              className="solution-catalog-close"
              onClick={() => setIsSolutionCatalogOpen(false)}
              aria-label="Zamknij planszę rozwiązań"
            >
              <X size={22} />
            </button>
          </header>
          <div className="solution-catalog-scroll">
            <div className="verified-solution-grid">
              {tPuzzleLevels.flatMap((entry) => entry.targets).map(renderVerifiedSolution)}
            </div>
          </div>
        </div>
      ) : null}
      <aside className="side-panel">
        <div className="panel-section level-header">
          <div>
            <p className="eyebrow">Poziom {level.displayNumber} · {level.name}</p>
            <h2>{target.name}</h2>
          </div>
          <div className={isSolved ? "status status-ok" : "status"}>
            {isSolved ? <Check size={18} /> : null}
            <span>{message}</span>
          </div>
        </div>

        <div className="panel-section preview-section">
          <p className="section-label">Cel {targetIndex + 1}/{level.targets.length}</p>
          {renderTargetPreview("desktop")}
        </div>

        {renderFamilyTabs("panel-section")}

        <div className="panel-section stats-row" aria-label="Wynik">
          <div className={remainingSeconds <= 10 && attemptState === "running" ? "timer-warning" : ""}>
            <span className="stat-label">Czas</span>
            <strong>
              <Timer size={16} />
              {formatTime(remainingSeconds)}
            </strong>
          </div>
          <div>
            <span className="stat-label">Ruchy</span>
            <strong>{moves}</strong>
          </div>
        </div>

        <div className="panel-section attempt-actions">
          <button
            type="button"
            className="start-button"
            disabled={attemptState === "running"}
            onClick={startAttempt}
          >
            <Play size={18} />
            <span>
              {attemptState === "expired"
                ? "Ponów próbę"
                : attemptState === "solved"
                  ? "Nowa próba"
                  : "Start próby"}
            </span>
          </button>
          {renderInstallButton()}
          <button type="button" className="danger-button" onClick={resetProgress}>
            <Trash2 size={18} />
            <span>Wyzeruj postęp</span>
          </button>
          <p className="progress-note">
            Warianty: {solvedTargetsInLevel}/3. Odblokowane poziomy: {highestUnlockedLevel + 1}/
            {tPuzzleLevels.length}.
          </p>
        </div>

        <div className="panel-section grade-section">
          <p className="section-label">Stopień uspołecznienia</p>
          <div className="grade-tabs" aria-label="Wybór limitu czasu">
            {SOCIAL_GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                className={grade === socialGrade ? "grade-tab active" : "grade-tab"}
                disabled={attemptState === "running"}
                onClick={() => changeSocialGrade(grade)}
              >
                <strong>{grade}</strong>
                <small>{TIME_LIMITS[grade]} s</small>
              </button>
            ))}
          </div>
        </div>

        {renderLevelTabs("panel-section")}

        {renderTargetTabs("panel-section")}

        {renderSolutionCatalogButton()}

        {renderControls("panel-section desktop-controls")}

        <button
          type="button"
          className="next-button"
          disabled={!isSolved || isFinalLevel}
          onClick={goToNextLevel}
        >
          <span>Następny poziom</span>
          <ChevronRight size={20} />
        </button>
      </aside>

      <div className={isSolved ? "board-wrap solved" : "board-wrap"}>
        {isSolved ? (
          <div className="success-burst" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} style={{ "--burst-index": index } as CSSProperties} />
            ))}
          </div>
        ) : null}
        <div className="mobile-objective">
          <div className="mobile-objective-copy">
            <p className="eyebrow">{puzzleFamilies.find((entry) => entry.id === familyId)?.shortName} · Poziom {level.displayNumber}</p>
            <strong>{target.name}</strong>
            <span>Wariant {targetIndex + 1}/{level.targets.length}</span>
            <span className={remainingSeconds <= 10 && attemptState === "running" ? "mobile-timer warning" : "mobile-timer"}>
              {socialGrade} · {formatTime(remainingSeconds)} · {attemptState === "running" ? "trwa" : "start"}
            </span>
          </div>
          <div className="mobile-objective-preview">
            {renderTargetPreview("mobile")}
          </div>
          <button
            type="button"
            className="mobile-start"
            disabled={attemptState === "running"}
            onClick={startAttempt}
          >
            <Play size={16} />
            <span>{attemptState === "running" ? "Trwa" : "Start"}</span>
          </button>
          {renderInstallButton("mobile-install-button")}
          {renderSolutionCatalogButton("mobile-solution-button")}
          <div className="mobile-pickers">
            {renderFamilyTabs("mobile-tabs mobile-family-tabs")}
            {renderLevelTabs("mobile-tabs")}
            {renderTargetTabs("mobile-tabs")}
          </div>
        </div>
        {introPhase !== "scattered" && !isSolved ? (
          <div className={`assembled-target-overlay ${introPhase === "launching" ? "launching" : ""}`} aria-hidden="true">
            {renderTargetVisual("assembled-target-visual", "assembled")}
          </div>
        ) : null}
        {introPhase === "launching" ? (
          <div className="start-burst" aria-hidden="true">
            {Array.from({ length: 20 }, (_, index) => (
              <span key={index} style={{ "--start-index": index } as CSSProperties} />
            ))}
          </div>
        ) : null}
        <svg
          ref={svgRef}
          viewBox={`${activeBoardViewBox.x} ${activeBoardViewBox.y} ${activeBoardViewBox.width} ${activeBoardViewBox.height}`}
          className="puzzle-board"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Plansza T-Puzzle"
        >
          <defs>
            <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path
                d="M 1 0 L 0 0 0 1"
                fill="none"
                stroke="rgba(31, 41, 55, 0.1)"
                strokeWidth="0.025"
              />
            </pattern>
          </defs>
          <rect
            x={activeBoardViewBox.x}
            y={activeBoardViewBox.y}
            width={activeBoardViewBox.width}
            height={activeBoardViewBox.height}
            fill="url(#grid)"
          />
          {sortedStates.map((state) => {
            const piece = piecesById[state.pieceId];
            const vertices = transformedVertices(piece, state);
            const selected = selectedPieceId === state.pieceId;
            return (
              <polygon
                key={state.pieceId}
                points={pathFromPoints(vertices)}
                className={`piece board-piece piece-${piece.workColor}${selected ? " selected" : ""}${introPhase === "assembled" ? " prestart-hidden" : ""}${introPhase === "launching" ? ` scatter-launch scatter-${state.pieceId}` : ""}`}
                onPointerDown={(event) => onPointerDown(event, state.pieceId)}
                onDoubleClick={flipSelected}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {renderControls("mobile-controls")}
      </div>
    </section>
  );
}
