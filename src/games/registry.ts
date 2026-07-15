export interface LogicGame {
  id: string;
  title: string;
  route: string;
  status: "prototype" | "planned";
}

export const games: LogicGame[] = [
  {
    id: "t-puzzle",
    title: "T-Puzzle",
    route: "/games/t-puzzle",
    status: "prototype",
  },
];
