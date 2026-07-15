# T-Puzzle Level Format

Levels are data, not React component code.

```ts
interface LevelDefinition {
  id: string;
  displayNumber: number;
  name: string;
  difficulty: "easy" | "medium" | "hard" | "master";
  sourceReference: {
    file: string;
    figure: number;
  };
  previewScale: number;
  solutions: PieceTransform[][];
  validation: {
    allowGlobalRotation: boolean;
    allowGlobalMirror: boolean;
    positionTolerance: number;
  };
  timeOptions: Array<0 | 30 | 45 | 60>;
  unlockRules: {
    unlockNextOnComplete: boolean;
  };
}
```

Level 1 currently has one canonical solution. Global translation is ignored
during validation. Global rotation and mirror are disabled by default.
