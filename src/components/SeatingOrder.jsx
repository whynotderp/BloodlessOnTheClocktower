import { useGame } from '../GameContext';

export default function SeatingOrder() {
  const { state, dispatch } = useGame();
  const { players } = state;

  // players array order IS the seating order (randomised during role assignment)
  const n = players.length;

  // Compute positions around a circle for the SVG diagram
  const cx = 140, cy = 140, r = 105;
  const seats = players.map((p, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2; // start at top
    return {
      ...p,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <div className="screen">
      <div className="card">
        <h2 className="title">Seating Order</h2>
        <p className="hint">
          Players must sit in this exact circle before the game begins.<br />
          Neighbour relationships (Empath, Chef, etc.) are based on who sits next to who.
        </p>

        {/* Circle diagram */}
        <div className="seating-circle-wrap">
          <svg viewBox="0 0 280 280" className="seating-svg">
            {/* Lines between neighbours */}
            {seats.map((s, i) => {
              const next = seats[(i + 1) % n];
              return (
                <line
                  key={i}
                  x1={s.x} y1={s.y}
                  x2={next.x} y2={next.y}
                  stroke="#3a2010" strokeWidth="1.5"
                />
              );
            })}
            {/* Player dots + labels */}
            {seats.map((s, i) => (
              <g key={s.id}>
                <circle cx={s.x} cy={s.y} r="18" fill="#2a1208" stroke="#d4a843" strokeWidth="1.5" />
                <text
                  x={s.x} y={s.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="#f0e8d8"
                  fontFamily="Georgia, serif"
                >
                  {s.name.length > 6 ? s.name.slice(0, 5) + '…' : s.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Linear list for clarity */}
        <div className="seating-list-wrap">
          <p className="label" style={{ marginBottom: '0.4rem' }}>Reading clockwise:</p>
          <div className="seating-list">
            {players.map((p, i) => {
              const prev = players[(i - 1 + n) % n];
              const next = players[(i + 1) % n];
              return (
                <div key={p.id} className="seating-row">
                  <span className="seating-num">{i + 1}</span>
                  <span className="seating-name">{p.name}</span>
                  <span className="seating-neighbours">
                    sits between <em>{prev.name}</em> and <em>{next.name}</em>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="hint-small" style={{ marginTop: '0.75rem' }}>
          Once everyone is seated correctly, tap below to privately reveal roles.
        </p>

        <button className="btn-primary btn-wide" onClick={() => dispatch({ type: 'CONFIRM_SEATING' })}>
          Everyone is seated → Reveal Roles
        </button>
      </div>
    </div>
  );
}
