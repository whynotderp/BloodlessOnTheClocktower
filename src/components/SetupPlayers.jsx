import { useState } from 'react';
import { useGame } from '../GameContext';

export default function SetupPlayers() {
  const { state, dispatch } = useGame();
  const [count, setCount] = useState(state.playerCount);
  const [names, setNames] = useState(
    Array.from({ length: state.playerCount }, (_, i) => state.playerNames[i] || '')
  );

  function handleCountChange(val) {
    const n = Math.max(4, Math.min(15, parseInt(val) || 4));
    setCount(n);
    setNames(prev => {
      const next = [...prev];
      while (next.length < n) next.push('');
      return next.slice(0, n);
    });
    dispatch({ type: 'SET_PLAYER_COUNT', count: n });
  }

  function handleName(i, val) {
    setNames(prev => prev.map((n, idx) => idx === i ? val : n));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const filled = names.map((n, i) => n.trim() || `Player ${i + 1}`);
    dispatch({ type: 'CONFIRM_PLAYERS', names: filled });
  }

  return (
    <div className="screen">
      <div className="card">
        <h1 className="title">Blood on the Clocktower</h1>
        <h2 className="subtitle">Player Setup</h2>

        <div className="field">
          <label className="label">Number of Players</label>
          <div className="count-row">
            <button className="btn-icon" onClick={() => handleCountChange(count - 1)} disabled={count <= 4}>−</button>
            <span className="count-display">{count}</span>
            <button className="btn-icon" onClick={() => handleCountChange(count + 1)} disabled={count >= 15}>+</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="names-grid">
            {names.map((name, i) => (
              <div key={i} className="name-field">
                <label className="label-sm">Player {i + 1}</label>
                <input
                  className="input"
                  value={name}
                  onChange={e => handleName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  maxLength={20}
                />
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary btn-wide">
            Next: Select Roles →
          </button>
        </form>
      </div>
    </div>
  );
}
