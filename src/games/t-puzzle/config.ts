export const WORLD_UNIT = 1;

export const geometryTolerance = {
  epsilon: WORLD_UNIT * 0.0001,
  position: WORLD_UNIT * 0.08,
  snapDistance: WORLD_UNIT * 0.32,
  vertexSnapDistance: WORLD_UNIT * 0.24,
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
