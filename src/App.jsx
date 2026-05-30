import { GameProvider, useGame } from './GameContext';
import SetupPlayers from './components/SetupPlayers';
import SetupRoles from './components/SetupRoles';
import SeatingOrder from './components/SeatingOrder';
import RoleReveal from './components/RoleReveal';
import NightPhase from './components/NightPhase';
import NightSummary from './components/NightSummary';
import DayPhase from './components/DayPhase';
import GameOver from './components/GameOver';
import './App.css';

function GameRouter() {
  const { state } = useGame();
  switch (state.phase) {
    case 'setup_players': return <SetupPlayers />;
    case 'setup_roles': return <SetupRoles />;
    case 'seating': return <SeatingOrder />;
    case 'role_reveal': return <RoleReveal />;
    case 'night': return <NightPhase />;
    case 'night_summary': return <NightSummary />;
    case 'day': return <DayPhase />;
    case 'game_over': return <GameOver />;
    default: return <SetupPlayers />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
