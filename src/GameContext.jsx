import { createContext, useContext, useReducer, useEffect } from 'react';
import { assignRoles, setupDrunk, resolveNight, checkWin, shuffle, generateFirstNightInfo, generateAllNightInfo } from './gameLogic';
import { ROLES } from './gameData';

const GameContext = createContext(null);

const STORAGE_KEY = 'botc_saved';

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function makeFreshState(saved = {}) {
  const names = saved.playerNames || [];
  return {
    phase: 'setup_players',
    players: [],
    playerNames: names,
    playerCount: names.length >= 4 ? names.length : 5,
    rolePool: saved.rolePool || [],
    nightNum: 0,
    nightRound: 1,
    nightOrder: [],
    nightOrderIndex: 0,
    nightActions: {},
    nightInfo: {},
    pendingDeaths: [],
    nightEvents: [],
    executedToday: null,
    executionHappenedToday: false,
    gameLog: [],
    winResult: null,
    redHerringId: null,
    roleRevealIndex: 0,
    ravenKeeperDying: null, // player ID of Ravenkeeper if they will die this night
  };
}

const INITIAL_STATE = {
  phase: 'setup_players', // setup_players | setup_roles | seating | role_reveal | day | night | night_summary | game_over
  players: [],
  playerNames: [],
  playerCount: 5,
  rolePool: [],
  nightNum: 0,
  nightRound: 1,       // 1 = selection phase, 2 = information phase
  nightOrder: [],
  nightOrderIndex: 0,
  nightActions: {},
  nightInfo: {},
  pendingDeaths: [],
  nightEvents: [],
  executedToday: null,
  executionHappenedToday: false,
  gameLog: [],
  winResult: null,
  redHerringId: null,
  roleRevealIndex: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER_COUNT':
      return { ...state, playerCount: action.count };

    case 'CONFIRM_PLAYERS':
      return { ...state, phase: 'setup_roles', playerNames: action.names };

    case 'TOGGLE_ROLE': {
      const pool = [...state.rolePool];
      const idx = pool.indexOf(action.roleId);
      if (idx === -1) pool.push(action.roleId);
      else pool.splice(idx, 1);
      return { ...state, rolePool: pool };
    }

    case 'ADD_DUPLICATE_ROLE':
      return { ...state, rolePool: [...state.rolePool, action.roleId] };

    case '_SET_POOL':
      return { ...state, rolePool: action.pool };

    case 'START_GAME': {
      let players = assignRoles(state.playerNames, state.rolePool);
      players = setupDrunk(players, state.rolePool);

      const goodPlayers = players.filter(p =>
        ROLES[p.roleId]?.team === 'townsfolk' || ROLES[p.roleId]?.team === 'outsider'
      );
      const ftPlayer = players.find(p => p.roleId === 'fortuneTeller');
      const candidates = ftPlayer ? goodPlayers.filter(p => p.id !== ftPlayer.id) : goodPlayers;
      const redHerringId = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)].id
        : null;

      // Generate first-night info for the role-reveal screen (no poison yet)
      const nightInfo = {};
      for (const player of players) {
        const roleForInfo = player.isActualDrunk ? player.drunkRole : player.roleId;
        const info = generateFirstNightInfo(players, roleForInfo, player.id);
        if (info) nightInfo[player.id] = info;
      }

      return { ...state, players, redHerringId, nightInfo, phase: 'seating', roleRevealIndex: 0 };
    }

    case 'CONFIRM_SEATING':
      return { ...state, phase: 'role_reveal' };

    case 'NEXT_ROLE_REVEAL': {
      const nextIndex = state.roleRevealIndex + 1;
      if (nextIndex >= state.players.length) {
        return startNight({ ...state, roleRevealIndex: nextIndex }, 1);
      }
      return { ...state, roleRevealIndex: nextIndex };
    }

    case 'NIGHT_CONFIRM': {
      let nightActions = { ...state.nightActions };

      // Round 1: store selection actions
      if (state.nightRound === 1 && action.roleId && action.targetId != null) {
        nightActions[action.roleId] = action.targetId;
        if (action.secondTargetId != null) {
          nightActions[action.roleId + '_2'] = action.secondTargetId;
        }
      }
      // Round 2: Ravenkeeper pick (special — they act in Round 2 when dying)
      if (state.nightRound === 2 && action.roleId === 'ravenkeeper' && action.targetId != null) {
        nightActions.ravenkeeper = action.targetId;
      }

      // Store butler master from round 1
      let newPlayers = state.players;
      if (state.nightRound === 1) {
        const cur = state.players.find(p => p.id === state.nightOrder[state.nightOrderIndex]);
        if (cur?.roleId === 'butler' && action.targetId) {
          newPlayers = newPlayers.map(p =>
            p.id === cur.id ? { ...p, butlerMaster: action.targetId } : p
          );
        }
      }

      const nextIndex = state.nightOrderIndex + 1;
      const allDone = nextIndex >= state.nightOrder.length;

      if (allDone) {
        if (state.nightRound === 1) {
          return transitionToRound2({ ...state, players: newPlayers, nightActions, nightOrderIndex: nextIndex });
        } else {
          return resolveNightPhase({ ...state, players: newPlayers, nightOrderIndex: nextIndex });
        }
      }
      return { ...state, players: newPlayers, nightActions, nightOrderIndex: nextIndex };
    }

    case 'EXECUTE_PLAYER': {
      const target = state.players.find(p => p.id === action.playerId);
      if (!target) return state;

      let newPlayers = state.players.map(p =>
        p.id === action.playerId ? { ...p, alive: false } : p
      );
      const log = [`${target.name} was executed.`];

      // Virgin: if nominator is Townsfolk, they die immediately instead (no role name revealed publicly)
      if (target.roleId === 'virgin' && !target.virginNominated && action.nominatorId) {
        const nominator = state.players.find(p => p.id === action.nominatorId);
        if (nominator && ROLES[nominator.roleId]?.team === 'townsfolk') {
          newPlayers = newPlayers.map(p =>
            p.id === action.nominatorId ? { ...p, alive: false } : p
          );
          log.push(`${nominator.name} was immediately executed as the nominator.`);
        }
        newPlayers = newPlayers.map(p =>
          p.id === target.id ? { ...p, virginNominated: true } : p
        );
      }

      // Saint: execution causes evil to win (no role name in the public win message)
      if (target.roleId === 'saint') {
        return {
          ...state,
          players: newPlayers,
          executedToday: target,
          executionHappenedToday: true,
          winResult: { winner: 'evil', reason: 'The execution sealed evil\'s victory.' },
          phase: 'game_over',
          gameLog: [...state.gameLog, ...log],
        };
      }

      const win = checkWin(newPlayers, true);
      return {
        ...state,
        players: newPlayers,
        executedToday: target,
        executionHappenedToday: true,
        winResult: win,
        phase: win ? 'game_over' : 'day',
        gameLog: [...state.gameLog, ...log],
      };
    }

    case 'SLAYER_SHOT': {
      const target = state.players.find(p => p.id === action.targetId);
      const shooter = state.players.find(p => p.id === action.shooterId);
      if (!target || !shooter) return state;

      let newPlayers = state.players.map(p =>
        p.id === action.shooterId ? { ...p, usedOnceAbility: true } : p
      );

      const isDemon = ROLES[target.roleId]?.team === 'demon';
      if (isDemon) {
        newPlayers = newPlayers.map(p => p.id === target.id ? { ...p, alive: false } : p);
      }

      const log = isDemon
        ? [`${shooter.name} shot ${target.name}. They were the Demon — and they die!`]
        : [`${shooter.name} shot ${target.name}. Nothing happens.`];

      const win = isDemon ? checkWin(newPlayers, false) : null;
      return {
        ...state,
        players: newPlayers,
        winResult: win || state.winResult,
        phase: win ? 'game_over' : state.phase,
        gameLog: [...state.gameLog, ...log],
      };
    }

    case 'END_DAY':
      return startNight({ ...state, executedToday: null, executionHappenedToday: false }, state.nightNum + 1);

    case 'ACKNOWLEDGE_SUMMARY': {
      const win = checkWin(state.players, false);
      return {
        ...state,
        phase: win ? 'game_over' : 'day',
        winResult: win || state.winResult,
        nightActions: {},
        nightInfo: {},
      };
    }

    case 'RESET':
      return makeFreshState(loadSaved());

    default:
      return state;
  }
}

function startNight(state, nightNum) {
  const allPlayers = state.players.filter(p => p.alive);
  const shuffled = shuffle(allPlayers.map(p => p.id));
  const deadSpies = state.players.filter(p => !p.alive && p.roleId === 'spy');
  const order = [...shuffled, ...deadSpies.map(p => p.id)];

  return {
    ...state,
    phase: 'night',
    nightNum,
    nightRound: 1,
    nightOrder: order,
    nightOrderIndex: 0,
    nightActions: {},
    nightInfo: {},
    pendingDeaths: [],
    nightEvents: [],
    ravenKeeperDying: null,
  };
}

// Called after Round 1: apply protection+poison, generate info for Round 2
function transitionToRound2(state) {
  const { players, nightActions, nightNum, executedToday, redHerringId } = state;

  // Apply Monk protection
  let newPlayers = players.map(p => ({ ...p, protected: false }));
  if (nightActions.monk) {
    newPlayers = newPlayers.map(p =>
      p.id === nightActions.monk ? { ...p, protected: true } : p
    );
  }

  // Apply Poisoner
  newPlayers = newPlayers.map(p => ({ ...p, poisoned: false }));
  if (nightActions.poisoner) {
    newPlayers = newPlayers.map(p =>
      p.id === nightActions.poisoner ? { ...p, poisoned: true } : p
    );
  }

  // Generate info for Round 2 (accounts for who is now poisoned)
  const nightInfo = generateAllNightInfo(newPlayers, nightActions, nightNum, executedToday, redHerringId);

  // Detect if the Ravenkeeper will die this night so Round 2 can show their ability
  const demonTargetId = nightActions.imp ?? nightActions.fangGu ?? null;
  const rkPlayer = newPlayers.find(p => p.roleId === 'ravenkeeper' && p.alive);
  let ravenKeeperDying = null;
  if (rkPlayer && demonTargetId === rkPlayer.id && !rkPlayer.protected) {
    ravenKeeperDying = rkPlayer.id;
  }

  return {
    ...state,
    players: newPlayers,
    nightInfo,
    nightRound: 2,
    nightOrderIndex: 0,
    ravenKeeperDying,
  };
}

// Called after Round 2: resolve kills, go to summary
function resolveNightPhase(state) {
  const { players, nightActions, nightNum } = state;

  const result = resolveNight(players, nightActions, nightNum);

  const logEntries = [
    `Night ${nightNum}:`,
    result.deaths.length > 0 ? `Deaths: ${result.deaths.join(', ')}` : 'No deaths.',
  ];

  return {
    ...state,
    players: result.players,
    pendingDeaths: result.deaths,
    nightEvents: result.events,
    gameLog: [...state.gameLog, ...logEntries],
    phase: 'night_summary',
  };
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => makeFreshState(loadSaved()));

  // Persist player names and role pool whenever they change
  useEffect(() => {
    if (state.playerNames.length > 0 || state.rolePool.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        playerNames: state.playerNames,
        rolePool: state.rolePool,
      }));
    }
  }, [state.playerNames, state.rolePool]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
