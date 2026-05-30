import { useState } from 'react';
import { useGame } from '../GameContext';
import { ROLES, TEAM_COLORS } from '../gameData';
import { getDisplayRole } from '../gameLogic';

export default function RoleReveal() {
  const { state, dispatch } = useGame();
  const { players, roleRevealIndex, nightInfo } = state;
  const [revealed, setRevealed] = useState(false);

  const player = players[roleRevealIndex];
  if (!player) return null;

  const displayRoleId = getDisplayRole(player);
  const role = ROLES[displayRoleId];
  const teamColor = role ? TEAM_COLORS[role.team] : '#666';
  const info = nightInfo[player.id];

  // Evil team knowledge — based on ACTUAL role (not display role for Drunk)
  const actualTeam = ROLES[player.roleId]?.team;
  const isDemon = actualTeam === 'demon';
  const isMinion = actualTeam === 'minion';

  // Demons know who the minions ARE (names only, no roles)
  const minionNames = isDemon
    ? players.filter(p => ROLES[p.roleId]?.team === 'minion').map(p => p.name)
    : [];

  // Minions know who the demon IS (name only, no role)
  const demonNames = isMinion
    ? players.filter(p => ROLES[p.roleId]?.team === 'demon').map(p => p.name)
    : [];

  function handleNext() {
    setRevealed(false);
    dispatch({ type: 'NEXT_ROLE_REVEAL' });
  }

  return (
    <div className="screen screen-dark">
      <div className="card">
        <h2 className="subtitle">Pass the device to:</h2>
        <h1 className="player-name-big">{player.name}</h1>

        {!revealed ? (
          <>
            <p className="hint">Only {player.name} should look at the screen.</p>
            <button className="btn-primary btn-wide btn-large" onClick={() => setRevealed(true)}>
              Reveal My Role
            </button>
          </>
        ) : (
          <>
            <div className="role-reveal-card" style={{ borderColor: teamColor }}>
              <div className="role-reveal-team" style={{ backgroundColor: teamColor }}>
                {role?.team?.toUpperCase()}
              </div>
              <div className="role-reveal-name">{role?.name || displayRoleId}</div>
              <p className="role-reveal-desc">{role?.description}</p>
            </div>

            {/* Evil team knowledge */}
            {isDemon && minionNames.length > 0 && (
              <div className="evil-info-box">
                <div className="evil-info-label">🔴 Your Minion{minionNames.length > 1 ? 's' : ''}:</div>
                <div className="evil-info-names">
                  {minionNames.map((name, i) => (
                    <span key={i} className="evil-name-chip">{name}</span>
                  ))}
                </div>
                <div className="evil-info-note">You know who they are but not their specific role.</div>
              </div>
            )}
            {isDemon && minionNames.length === 0 && (
              <div className="evil-info-box">
                <div className="evil-info-label">🔴 You have no Minions this game.</div>
              </div>
            )}
            {isMinion && (
              <div className="evil-info-box">
                <div className="evil-info-label">🔴 Your Demon:</div>
                <div className="evil-info-names">
                  {demonNames.map((name, i) => (
                    <span key={i} className="evil-name-chip">{name}</span>
                  ))}
                </div>
                <div className="evil-info-note">You know who they are but not their specific demon type.</div>
              </div>
            )}

            {/* Night 1 info (Washerwoman, Chef, etc.) */}
            {info && (
              <div className="info-box">
                <div className="info-label">Your starting information:</div>
                <div className="info-text">{info.result}</div>
              </div>
            )}

            <p className="hint-small">Memorize everything, then pass the device on.</p>

            <button className="btn-primary btn-wide" onClick={handleNext}>
              {roleRevealIndex < players.length - 1
                ? `Done → Pass to ${players[roleRevealIndex + 1]?.name}`
                : 'Begin Night 1 →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
