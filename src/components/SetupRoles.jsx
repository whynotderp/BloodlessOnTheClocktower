import { useState } from 'react';
import { useGame } from '../GameContext';
import { ROLES, TEAM_ORDER, TEAM_LABELS, TEAM_COLORS, getDistribution } from '../gameData';

export default function SetupRoles() {
  const { state, dispatch } = useGame();
  const { playerCount, rolePool } = state;
  const minimum = playerCount + 2;
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Count how many of each role is in the pool
  const roleCounts = {};
  for (const r of rolePool) {
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  }

  const selected = rolePool.length;
  const dist = getDistribution(playerCount);
  const [tf, out, min, dem] = dist;

  const teamCounts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveller: 0 };
  for (const r of rolePool) {
    const team = ROLES[r]?.team;
    if (team) teamCounts[team] = (teamCounts[team] || 0) + 1;
  }

  function handleRoleClick(roleId) {
    const count = roleCounts[roleId] || 0;
    if (count === 0) {
      // Add first copy
      dispatch({ type: 'TOGGLE_ROLE', roleId });
    } else if (allowDuplicates) {
      // Add another copy
      dispatch({ type: 'ADD_DUPLICATE_ROLE', roleId });
    } else {
      // Remove it
      dispatch({ type: 'TOGGLE_ROLE', roleId });
    }
  }

  function removeOneCopy(roleId) {
    const pool = [...rolePool];
    const idx = pool.lastIndexOf(roleId);
    if (idx !== -1) pool.splice(idx, 1);
    dispatch({ type: '_SET_POOL', pool });
  }

  const hasDemon = (teamCounts.demon || 0) >= 1;
  const canStart = selected >= minimum && hasDemon;
  const countColor = selected < minimum || !hasDemon ? '#d97706' : '#16a34a';

  return (
    <div className="screen">
      <div className="card">
        <h2 className="title">Select Roles</h2>
        <p className="hint">
          Select at least <strong>{minimum}</strong> roles for {playerCount} players.
          The game will randomly pick {playerCount} from your pool.
        </p>
        <div className="dist-hint">
          Suggested: {tf} Townsfolk · {out} Outsider{out !== 1 ? 's' : ''} · {min} Minion{min !== 1 ? 's' : ''} · {dem} Demon
        </div>

        <div className="setup-controls">
          <div className="selected-count" style={{ color: countColor }}>
            {selected} role{selected !== 1 ? 's' : ''} selected (need ≥ {minimum}){!hasDemon ? ' · ⚠ need ≥ 1 Demon' : ''}
          </div>
          <label className="duplicate-toggle">
            <input
              type="checkbox"
              checked={allowDuplicates}
              onChange={e => setAllowDuplicates(e.target.checked)}
            />
            <span>Allow duplicate roles</span>
          </label>
        </div>

        {allowDuplicates && (
          <div className="duplicate-hint">
            Duplicates on — clicking a selected role adds another copy. Use − to remove a copy.
          </div>
        )}

        {TEAM_ORDER.map(team => {
          const roles = Object.values(ROLES).filter(r => r.team === team);
          return (
            <div key={team} className="team-section">
              <h3 className="team-header" style={{ color: TEAM_COLORS[team] }}>
                {TEAM_LABELS[team]}
                <span className="team-count"> ({teamCounts[team] || 0})</span>
              </h3>
              <div className="roles-grid">
                {roles.map(role => {
                  const count = roleCounts[role.id] || 0;
                  const inPool = count > 0;
                  return (
                    <div
                      key={role.id}
                      className={`role-card ${inPool ? 'role-selected' : ''}`}
                      style={inPool ? { borderColor: TEAM_COLORS[team], backgroundColor: `${TEAM_COLORS[team]}18` } : {}}
                    >
                      <div className="role-card-header" onClick={() => handleRoleClick(role.id)}>
                        <span className="role-name">{role.name}</span>
                        <div className="role-card-right">
                          {inPool && (
                            <span className="check">
                              ✓{count > 1 ? ` ×${count}` : ''}
                            </span>
                          )}
                          {inPool && allowDuplicates && (
                            <button
                              className="btn-sm btn-danger"
                              onClick={e => { e.stopPropagation(); removeOneCopy(role.id); }}
                              title="Remove one copy"
                            >−</button>
                          )}
                        </div>
                      </div>
                      <p className="role-desc">{role.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="footer-actions">
          <button className="btn-secondary" onClick={() => dispatch({ type: 'RESET' })}>
            ← Back
          </button>
          <button
            className="btn-primary"
            disabled={!canStart}
            onClick={() => dispatch({ type: 'START_GAME' })}
          >
            Start Game →
          </button>
        </div>
      </div>
    </div>
  );
}
