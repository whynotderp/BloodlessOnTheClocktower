import { useState } from 'react';
import { useGame } from '../GameContext';
import { ROLES, TEAM_COLORS } from '../gameData';
import { getDisplayRole } from '../gameLogic';

// Roles that pick a target in Round 1
const ROUND1_SELECTION = ['monk', 'butler', 'poisoner', 'imp', 'fangGu', 'fortuneTeller'];
// Roles that receive information in Round 2
const ROUND2_INFO = ['fortuneTeller', 'empath', 'undertaker', 'spy', 'washerwoman', 'librarian', 'investigator', 'chef'];

export default function NightPhase() {
  const { state, dispatch } = useGame();
  // key resets local state whenever the turn or round advances
  return (
    <NightTurn
      key={`${state.nightNum}-${state.nightRound}-${state.nightOrderIndex}`}
      state={state}
      dispatch={dispatch}
    />
  );
}

function NightTurn({ state, dispatch }) {
  const { players, nightOrder, nightOrderIndex, nightNum, nightRound, nightInfo } = state;
  const [handedOff, setHandedOff] = useState(false);
  const [actionState, setActionState] = useState({});

  const currentPlayerId = nightOrder[nightOrderIndex];
  const player = players.find(p => p.id === currentPlayerId);
  if (!player) return null;

  const displayRoleId = getDisplayRole(player);
  const role = ROLES[displayRoleId];
  const isFirstNight = nightNum === 1;
  const teamColor = role ? TEAM_COLORS[role.team] : '#444';
  const nextPlayer = players.find(p => p.id === nightOrder[nightOrderIndex + 1]);
  const isLast = nightOrderIndex >= nightOrder.length - 1;

  // Does this player have something to do this round?
  const roleActsThisNight = role && (
    (isFirstNight && role.nightOrder.firstNight !== null) ||
    (!isFirstNight && role.nightOrder.otherNights !== null)
  );
  const hasRound1Action = nightRound === 1 && player.alive &&
    ROUND1_SELECTION.includes(displayRoleId) && roleActsThisNight;

  // Ravenkeeper gets a special Round 2 action if they're targeted to die
  const isRavenKeeperDying = nightRound === 2 && displayRoleId === 'ravenkeeper' &&
    state.ravenKeeperDying === player.id;

  const hasRound2Info = isRavenKeeperDying || (nightRound === 2 && (
    (player.alive && ROUND2_INFO.includes(displayRoleId)) ||
    (!player.alive && displayRoleId === 'spy')
  ) && (
    isFirstNight
      ? ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneTeller', 'spy'].includes(displayRoleId)
      : true
  ));

  const needsLock = (hasRound1Action && ROUND1_SELECTION.includes(displayRoleId)) || isRavenKeeperDying;
  const isReady = !needsLock || actionState.locked === true;

  function handleConfirm() {
    dispatch({
      type: 'NIGHT_CONFIRM',
      roleId: hasRound1Action ? displayRoleId : isRavenKeeperDying ? 'ravenkeeper' : null,
      targetId: actionState.targetId ?? null,
      secondTargetId: actionState.secondTargetId ?? null,
    });
  }

  const phaseLabel = nightRound === 1 ? 'Part 1 of 2' : 'Part 2 of 2';

  if (!handedOff) {
    return (
      <div className="screen screen-dark">
        <div className="card">
          <div className="night-header">
            <span className="night-badge">Night {nightNum}</span>
            <span className="phase-badge">{phaseLabel}</span>
          </div>
          <h2 className="subtitle">Pass the device to:</h2>
          <h1 className="player-name-big">{player.name}</h1>
          <p className="hint">Only {player.name} should look at the screen.</p>
          <button className="btn-primary btn-wide btn-large" onClick={() => setHandedOff(true)}>
            I'm {player.name} — Show My Screen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-dark">
      <div className="card">
        <div className="night-header">
          <span className="night-badge">Night {nightNum}</span>
          <span className="player-badge" style={{ backgroundColor: teamColor }}>{player.name}</span>
          <span className="phase-badge">{phaseLabel}</span>
        </div>

        {nightRound === 1 && hasRound1Action ? (
          <Round1Action
            player={player}
            players={players}
            displayRoleId={displayRoleId}
            role={role}
            isFirstNight={isFirstNight}
            actionState={actionState}
            setActionState={setActionState}
          />
        ) : nightRound === 2 && hasRound2Info ? (
          <Round2Info
            player={player}
            players={players}
            displayRoleId={displayRoleId}
            nightInfo={nightInfo}
            executedToday={state.executedToday}
            isRavenKeeperDying={isRavenKeeperDying}
            actionState={actionState}
            setActionState={setActionState}
          />
        ) : (
          <div className="no-action-box">
            <div className="moon-icon">🌙</div>
            <p>Nothing to do this phase.</p>
          </div>
        )}

        <button
          className="btn-primary btn-wide"
          onClick={handleConfirm}
          disabled={!isReady}
        >
          {isLast
            ? nightRound === 1 ? 'Done — Proceed to Part 2' : 'Done — Resolve Night'
            : `Confirm & Pass to ${nextPlayer?.name || 'next player'} →`}
        </button>
      </div>
    </div>
  );
}

// ─── Round 1: Selection actions ───────────────────────────────────────────

function Round1Action({ player, players, displayRoleId, role, isFirstNight, actionState, setActionState }) {
  const alivePlayers = players.filter(p => p.alive);
  const othersAlive = alivePlayers.filter(p => p.id !== player.id);

  if (displayRoleId === 'fortuneTeller') {
    return <FortuneTellerPicker players={players} alivePlayers={alivePlayers} actionState={actionState} setActionState={setActionState} />;
  }

  if (displayRoleId === 'monk') {
    return (
      <SinglePickAction
        title="Monk — Choose Protection"
        description="Choose a player to protect from the Demon tonight. If the Demon attacks them, they survive. You cannot choose yourself."
        players={othersAlive}
        actionState={actionState}
        setActionState={setActionState}
        lockLabel="🛡️ Confirm Protection"
      />
    );
  }

  if (displayRoleId === 'butler') {
    return (
      <SinglePickAction
        title="Butler — Choose Master"
        description="Choose your master. You may only vote for an execution tomorrow if your master votes first."
        players={othersAlive}
        actionState={actionState}
        setActionState={setActionState}
        lockLabel="🔗 Confirm Master"
      />
    );
  }

  if (displayRoleId === 'poisoner') {
    return (
      <SinglePickAction
        title="Poisoner — Choose Target"
        description="Choose a player to poison. They will receive unreliable information and their abilities may not work correctly."
        players={alivePlayers}
        actionState={actionState}
        setActionState={setActionState}
        lockLabel="☠️ Confirm Poison"
      />
    );
  }

  if (displayRoleId === 'imp') {
    return (
      <SinglePickAction
        title="Imp — Choose Victim"
        description="Choose a player to kill tonight. Choosing yourself passes the Imp role to a Minion. Protected or immune players can still be chosen — they just won't die."
        players={alivePlayers}
        actionState={actionState}
        setActionState={setActionState}
        lockLabel="💀 Confirm Kill"
      />
    );
  }

  if (displayRoleId === 'fangGu') {
    const alreadyJumped = players.some(p => p.fangGuJumped);
    return (
      <SinglePickAction
        title="Fang Gu — Choose Victim"
        description={alreadyJumped
          ? 'Choose a player to kill tonight. Protected or immune players can still be chosen — they just won\'t die.'
          : 'Choose a player to kill. If they are an Outsider, you die instead and they become the evil Fang Gu (once only). Protected or immune players can be chosen — they just won\'t die.'}
        players={alivePlayers}
        actionState={actionState}
        setActionState={setActionState}
        lockLabel="💀 Confirm Kill"
      />
    );
  }

  return null;
}

// ─── Round 2: Information delivery ────────────────────────────────────────

function Round2Info({ player, players, displayRoleId, nightInfo, executedToday, isRavenKeeperDying, actionState, setActionState }) {
  const info = nightInfo[player.id];

  // Ravenkeeper dying — special pick screen
  if (isRavenKeeperDying) {
    const locked = actionState.locked === true;
    const pickedPlayer = players.find(p => p.id === actionState.targetId);
    return (
      <div className="action-box">
        <h3 className="action-title">Ravenkeeper — You die tonight</h3>
        <p className="hint-small">
          You have been chosen to die. Before you pass, choose any player (living or dead) to learn their character.
        </p>
        {!locked ? (
          <>
            <div className="player-picker">
              {players.map(p => (
                <button
                  key={p.id}
                  className={`pick-btn ${actionState.targetId === p.id ? 'pick-selected' : ''}`}
                  onClick={() => setActionState({ targetId: p.id, locked: false })}
                >
                  {p.alive ? p.name : `${p.name} †`}
                </button>
              ))}
            </div>
            {pickedPlayer && (
              <div className="ft-confirm">
                <p className="hint-small">Learn <strong>{pickedPlayer.name}</strong>'s role?</p>
                <button
                  className="btn-ability"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setActionState(s => ({ ...s, locked: true }))}
                >
                  🦅 Reveal Their Role
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="info-box">
            <div className="info-text">
              <strong>{pickedPlayer?.name}</strong> is the{' '}
              <strong>{ROLES[pickedPlayer?.roleId]?.name ?? pickedPlayer?.roleId}</strong>.
            </div>
          </div>
        )}
      </div>
    );
  }

  // Spy always sees live grimoire regardless of poison
  if (displayRoleId === 'spy') {
    return (
      <div className="action-box">
        <h3 className="action-title">Grimoire</h3>
        <div className="grimoire-list">
          {players.map(p => (
            <div key={p.id} className={`grimoire-entry ${!p.alive ? 'dead' : ''}`}>
              <span className="grimoire-name">{p.name}{!p.alive ? ' †' : ''}</span>
              <span className="grimoire-role" style={{ color: TEAM_COLORS[ROLES[p.roleId]?.team] }}>
                {ROLES[p.roleId]?.name || p.roleId}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (info) {
    return (
      <div className="action-box">
        <h3 className="action-title">Your Information</h3>
        <div className="info-box">
          <div className="info-text">{info.result}</div>
        </div>
      </div>
    );
  }

  // Info role but nothing to show (e.g. Undertaker when no execution happened, or night 2+ for first-night roles)
  return (
    <div className="no-action-box">
      <div className="moon-icon">🌙</div>
      <p>Nothing to report this night.</p>
    </div>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────

function FortuneTellerPicker({ players, alivePlayers, actionState, setActionState }) {
  const picks = [actionState.targetId, actionState.secondTargetId].filter(id => id != null);
  const bothPicked = picks.length === 2;
  const locked = actionState.locked === true;

  function handlePick(ids) {
    if (locked) return;
    setActionState({ targetId: ids[0] ?? null, secondTargetId: ids[1] ?? null, locked: false });
  }

  return (
    <div className="action-box">
      <h3 className="action-title">Fortune Teller — Choose 2 Players</h3>
      <p className="hint-small">Choose 2 players to divine. You will receive your answer in the next phase. Lock in to confirm.</p>
      {!locked ? (
        <>
          <LockedPicker
            players={players}
            maxPicks={2}
            selected={picks}
            locked={false}
            onPick={handlePick}
          />
          {bothPicked && (
            <div className="ft-confirm">
              <p className="hint-small">
                Divining: <strong>{players.find(p => p.id === picks[0])?.name}</strong> &amp;{' '}
                <strong>{players.find(p => p.id === picks[1])?.name}</strong>
              </p>
              <button className="btn-ability" style={{ marginTop: '0.5rem' }}
                onClick={() => setActionState(s => ({ ...s, locked: true }))}>
                🔮 Lock In Picks
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="info-box">
          <div className="info-text">
            ✓ Picks locked: <strong>{players.find(p => p.id === picks[0])?.name}</strong> &amp;{' '}
            <strong>{players.find(p => p.id === picks[1])?.name}</strong>
            <br />
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>You will receive your answer in Part 2.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SinglePickAction({ title, description, players, actionState, setActionState, lockLabel }) {
  const locked = actionState.locked === true;
  const selectedId = actionState.targetId;
  const selectedPlayer = players.find(p => p.id === selectedId);

  return (
    <div className="action-box">
      <h3 className="action-title">{title}</h3>
      <p className="hint-small">{description}</p>
      {!locked ? (
        <>
          <div className="player-picker">
            {players.map(p => (
              <button
                key={p.id}
                className={`pick-btn ${selectedId === p.id ? 'pick-selected' : ''}`}
                onClick={() => !locked && setActionState({ targetId: p.id, locked: false })}
              >
                {p.name}
              </button>
            ))}
          </div>
          {selectedPlayer && (
            <div className="ft-confirm">
              <p className="hint-small">Selected: <strong>{selectedPlayer.name}</strong></p>
              <button className="btn-ability" style={{ marginTop: '0.5rem' }}
                onClick={() => setActionState(s => ({ ...s, locked: true }))}>
                {lockLabel}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="info-box">
          <div className="info-text">✓ Locked in: <strong>{selectedPlayer?.name}</strong></div>
        </div>
      )}
    </div>
  );
}

function LockedPicker({ players, maxPicks, selected, locked, onPick }) {
  function toggle(id) {
    if (locked) return;
    if (selected.includes(id)) {
      onPick(selected.filter(s => s !== id));
    } else if (selected.length < maxPicks) {
      onPick([...selected, id]);
    } else {
      // All slots full — drop oldest, add new
      onPick([...selected.slice(1), id]);
    }
  }

  return (
    <div className="player-picker">
      {players.map(p => (
        <button
          key={p.id}
          className={`pick-btn ${selected.includes(p.id) ? 'pick-selected' : ''} ${locked && !selected.includes(p.id) ? 'pick-locked' : ''}`}
          onClick={() => toggle(p.id)}
          disabled={locked && !selected.includes(p.id)}
        >
          {p.alive ? p.name : `${p.name} †`}
        </button>
      ))}
    </div>
  );
}
