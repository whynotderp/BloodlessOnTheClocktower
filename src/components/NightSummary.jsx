import { useGame } from '../GameContext';
import { ROLES } from '../gameData';

export default function NightSummary() {
  const { state, dispatch } = useGame();
  const { pendingDeaths, nightEvents, nightNum, players } = state;

  const noDeaths = pendingDeaths.length === 0;

  const eventMessages = nightEvents.map(e => {
    switch (e.type) {
      case 'monk_saved': return `🛡️ Someone was protected by the Monk.`;
      case 'soldier_safe': return `⚔️ The Demon attacked someone, but they survived.`;
      case 'mayor_bounce': return `🎩 The Mayor redirected the night attack.`;
      case 'imp_suicide': return `⚠️ The Imp met a strange fate...`;
      case 'fanggu_jump': return `⚠️ Something strange happened with the Demon...`;
      case 'scarlet_woman': return `💄 The demon role has shifted.`;
      default: return null;
    }
  }).filter(Boolean);

  return (
    <div className="screen">
      <div className="card">
        <h2 className="title">Dawn breaks...</h2>
        <p className="subtitle">Night {nightNum} Summary</p>

        {noDeaths ? (
          <div className="summary-box safe">
            <div className="summary-icon">🌅</div>
            <h3>No deaths last night.</h3>
            <p className="hint">All players survived the night.</p>
          </div>
        ) : (
          <div className="summary-box danger">
            <div className="summary-icon">💀</div>
            <h3>{pendingDeaths.length === 1 ? '1 player' : `${pendingDeaths.length} players`} died last night:</h3>
            <ul className="death-list">
              {pendingDeaths.map((name, i) => (
                <li key={i} className="death-entry">{name}</li>
              ))}
            </ul>
          </div>
        )}

        {eventMessages.length > 0 && (
          <div className="events-box">
            {eventMessages.map((msg, i) => (
              <div key={i} className="event-entry">{msg}</div>
            ))}
          </div>
        )}

        <div className="alive-list">
          <h3 className="section-title">Alive Players ({players.filter(p => p.alive).length})</h3>
          <div className="player-chips">
            {players.filter(p => p.alive).map(p => (
              <span key={p.id} className="player-chip">{p.name}</span>
            ))}
          </div>
        </div>

        <button className="btn-primary btn-wide" onClick={() => dispatch({ type: 'ACKNOWLEDGE_SUMMARY' })}>
          Begin Day {nightNum} →
        </button>
      </div>
    </div>
  );
}
