import { useGame } from '../GameContext';
import { ROLES, TEAM_COLORS } from '../gameData';

export default function GameOver() {
  const { state, dispatch } = useGame();
  const { winResult, players, gameLog, redHerringId } = state;

  const goodWin = winResult?.winner === 'good';
  const ftInGame = players.some(p => p.roleId === 'fortuneTeller');
  const redHerringPlayer = redHerringId ? players.find(p => p.id === redHerringId) : null;
  const drunkPlayers = players.filter(p => p.isActualDrunk);

  return (
    <div className="screen">
      <div className="card">
        <div className={`win-banner ${goodWin ? 'win-good' : 'win-evil'}`}>
          <div className="win-icon">{goodWin ? '☀️' : '💀'}</div>
          <h1 className="win-title">{goodWin ? 'Good Wins!' : 'Evil Wins!'}</h1>
          <p className="win-reason">{winResult?.reason}</p>
        </div>

        <h3 className="section-title">All Roles Revealed</h3>
        <div className="reveal-list">
          {players.map(p => {
            const role = ROLES[p.roleId];
            const isRedHerring = p.id === redHerringId;
            return (
              <div key={p.id} className={`reveal-row ${!p.alive ? 'dead' : ''}`}>
                <span className="reveal-name">{p.name}{!p.alive ? ' †' : ''}</span>
                <span className="reveal-role" style={{ color: TEAM_COLORS[role?.team] }}>
                  {role?.name || p.roleId}
                </span>
                <div className="reveal-notes">
                  {p.isActualDrunk && (
                    <span className="reveal-tag tag-drunk">
                      Drunk — thought they were {ROLES[p.drunkRole]?.name}
                    </span>
                  )}
                  {isRedHerring && ftInGame && (
                    <span className="reveal-tag tag-herring">
                      🔮 FT Red Herring
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(ftInGame || drunkPlayers.length > 0) && (
          <div className="reveal-footnotes">
            {ftInGame && redHerringPlayer && (
              <div className="footnote-box">
                <span className="footnote-icon">🔮</span>
                <div>
                  <strong>Fortune Teller Red Herring:</strong> {redHerringPlayer.name} registered as the Demon to the Fortune Teller all game, even though they were innocent.
                </div>
              </div>
            )}
            {drunkPlayers.map(p => (
              <div key={p.id} className="footnote-box">
                <span className="footnote-icon">🍺</span>
                <div>
                  <strong>The Drunk:</strong> {p.name} thought they were the {ROLES[p.drunkRole]?.name} but had no ability. Any information they received may have been false.
                </div>
              </div>
            ))}
          </div>
        )}

        <details className="log-details">
          <summary>Game Log</summary>
          <div className="game-log">
            {gameLog.map((entry, i) => (
              <div key={i} className="log-entry">{entry}</div>
            ))}
          </div>
        </details>

        <button className="btn-primary btn-wide" onClick={() => dispatch({ type: 'RESET' })}>
          Play Again
        </button>
      </div>
    </div>
  );
}
