import { TPuzzleGame } from "./games/t-puzzle/components/TPuzzleGame";
import { games } from "./games/registry";

export function App() {
  const game = games[0];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MOW Malbork</p>
          <h1>Gry logiczne</h1>
        </div>
        <div className="game-pill">{game.title}</div>
      </header>
      <TPuzzleGame />
    </main>
  );
}
