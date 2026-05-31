import { useState } from 'react';
import { useGame } from '../GameContext';
import { ROLES } from '../gameData';

export default function DayPhase() {
  const { state, dispatch } = useGame();
  const { players, nightNum, executionHappenedToday } = state;

  const [nomineeId, setNomineeId] = useState(null);
  const [nominatorId, setNominatorId] = useState(null);
  const [nominateStep, setNominateStep] = useState(null); // null | 'pick_nominee' | 'pick_nominator' | 'confirm'
  const [slayerMode, setSlayerMode] = useState(false);
  const [slayerTargetId, setSlayerTargetId] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const alivePlayers = players.filter(p => p.alive);
  const slayer = players.find(p => p.roleId === 'slayer' && p.alive && !p.usedOnceAbility);

  function startNomination() {
    setNomineeId(null);
    setNominatorId(null);
    setNominateStep('pick_nominee');
  }

  function confirmNominee(id) {
    setNomineeId(id);
    setNominateStep('pick_nominator');
  }

  function confirmNominator(id) {
    setNominatorId(id);
    setNominateStep('confirm');
  }

  function handleExecute() {
    if (!nomineeId) return;
    dispatch({ type: 'EXECUTE_PLAYER', playerId: nomineeId, nominatorId });
    setNominateStep(null);
    setNomineeId(null);
    setNominatorId(null);
  }

  function cancelExecution() {
    setNominateStep(null);
    setNomineeId(null);
    setNominatorId(null);
  }

  function handleSlayerShot() {
    if (!slayerTargetId || !slayer) return;
    dispatch({ type: 'SLAYER_SHOT', shooterId: slayer.id, targetId: slayerTargetId });
    setSlayerMode(false);
    setSlayerTargetId(null);
  }

  const nominee = players.find(p => p.id === nomineeId);

  return (
    <div className="screen">
      <div className="card">
        <div className="day-header">
          <span className="day-badge">Day {nightNum}</span>
          <span className="alive-count">{alivePlayers.length} alive</span>
        </div>

        <h2 className="section-title">Players — Seating Order (circular)</h2>
        <div className="players-list">
          {players.map(p => (
            <div key={p.id} className={`player-row ${!p.alive ? 'dead' : ''}`}>
              <span className="player-row-name">{p.name}</span>
              {!p.alive && <span className="dead-label">† Dead</span>}
              {p.alive && p.butlerMaster && (
                <span className="status-tag butler">
                  🔗 Master: {players.find(m => m.id === p.butlerMaster)?.name || '?'}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Slayer ability */}
        {slayer && !slayerMode && (
          <div className="ability-section">
            <h3 className="section-title">Day Abilities</h3>
            <button className="btn-ability" onClick={() => setSlayerMode(true)}>
              🎯 {slayer.name} (Slayer): Use Once-Per-Game Shot
            </button>
          </div>
        )}

        {slayerMode && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Slayer — Take Your Shot</h3>
              <p className="hint" style={{ textAlign: 'left', marginBottom: '0.75rem' }}>
                This is your <strong>one and only</strong> shot for the entire game.<br />
                If you choose the Demon, they die. If not, nothing happens.
              </p>
              <div className="player-picker">
                {alivePlayers.filter(p => p.id !== slayer.id).map(p => (
                  <button
                    key={p.id}
                    className={`pick-btn ${slayerTargetId === p.id ? 'pick-selected' : ''}`}
                    onClick={() => setSlayerTargetId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {slayerTargetId && (
                <div className="confirm-box">
                  <p>Shoot <strong>{players.find(p => p.id === slayerTargetId)?.name}</strong>?</p>
                  <div className="btn-row">
                    <button className="btn-secondary" onClick={() => { setSlayerMode(false); setSlayerTargetId(null); }}>Cancel</button>
                    <button className="btn-danger" onClick={handleSlayerShot}>🎯 Fire!</button>
                  </div>
                </div>
              )}
              {!slayerTargetId && (
                <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                  <button className="btn-secondary" onClick={() => setSlayerMode(false)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution */}
        {!executionHappenedToday && (
          <div className="execution-section">
            <h3 className="section-title">Execution</h3>

            {nominateStep === null && (
              <button className="btn-secondary btn-wide" onClick={startNomination}>
                ⚖️ Nominate a Player for Execution
              </button>
            )}

            {nominateStep === 'pick_nominee' && (
              <div className="nominate-box">
                <p className="label">Who is being nominated for execution?</p>
                <div className="player-picker">
                  {alivePlayers.map(p => (
                    <button
                      key={p.id}
                      className={`pick-btn pick-danger ${nomineeId === p.id ? 'pick-selected' : ''}`}
                      onClick={() => confirmNominee(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button className="btn-ghost" onClick={cancelExecution}>Cancel</button>
              </div>
            )}

            {nominateStep === 'pick_nominator' && nominee && (
              <div className="nominate-box">
                <p className="label">
                  <strong>{nominee.name}</strong> is nominated. Who is nominating them?
                </p>
                <div className="player-picker">
                  {alivePlayers.filter(p => p.id !== nomineeId).map(p => (
                    <button
                      key={p.id}
                      className={`pick-btn ${nominatorId === p.id ? 'pick-selected' : ''}`}
                      onClick={() => confirmNominator(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button className="btn-ghost" onClick={() => setNominateStep('pick_nominee')}>← Back</button>
              </div>
            )}

            {nominateStep === 'confirm' && nominee && (
              <div className="nominate-box">
                <p className="label">Confirm execution:</p>
                <div className="execution-confirm-row">
                  <span className="execution-name">{nominee.name}</span>
                  {nominatorId && (
                    <span className="hint-small">
                      nominated by {players.find(p => p.id === nominatorId)?.name}
                    </span>
                  )}
                </div>
                <div className="btn-row">
                  <button className="btn-secondary" onClick={cancelExecution}>Cancel</button>
                  <button className="btn-danger" onClick={handleExecute}>
                    ⚖️ Execute {nominee.name}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {executionHappenedToday && (
          <div className="executed-notice">
            ⚖️ An execution has already taken place today. Only one execution per day is allowed.
          </div>
        )}

        <div className="footer-actions">
          <button className="btn-ghost" onClick={() => setShowLog(s => !s)}>
            {showLog ? 'Hide' : 'Show'} Game Log
          </button>
          <button className="btn-primary" onClick={() => dispatch({ type: 'END_DAY' })}>
            End Day → Night {nightNum + 1}
          </button>
        </div>

        {showLog && (
          <div className="game-log">
            {state.gameLog.map((entry, i) => (
              <div key={i} className="log-entry">{entry}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
