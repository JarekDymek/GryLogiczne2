export const WORLD_UNIT = 1;

export const geometryTolerance = {
  // Source vectors are rounded to three decimal places before being scaled
  // back to board units. 0.001 is visually sub-pixel, but avoids treating a
  // shared edge as a microscopic overlap during snapping.
  epsilon: WORLD_UNIT * 0.001,
  position: WORLD_UNIT * 0.08,
  snapDistance: WORLD_UNIT * 0.42,
  vertexSnapDistance: WORLD_UNIT * 0.32,
  minSharedContact: WORLD_UNIT * 0.25,
};

export const boardViewBox = {
  x: -4.2,
  y: -2.2,
  width: 10,
  height: 8.4,
};

export const mobileBoardViewBox = {
  x: -3.35,
  y: -0.35,
  width: 5.9,
  height: 8.35,
};
