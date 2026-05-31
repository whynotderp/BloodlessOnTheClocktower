import { useGame } from '../GameContext';
import SeatingCircle from './SeatingCircle';

export default function SeatingOrder() {
  const { state, dispatch } = useGame();
  const { players } = state;
  const n = players.length;

  return (
    <div className="screen">
      <div className="card">
        <h2 className="title">Seating Order</h2>
        <p className="hint">
          Players must sit in this exact circle before the game begins.<br />
          Neighbour relationships (Empath, Chef, etc.) are based on who sits next to who.
        </p>

        <div className="seating-circle-wrap">
          <SeatingCircle players={players} />
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
