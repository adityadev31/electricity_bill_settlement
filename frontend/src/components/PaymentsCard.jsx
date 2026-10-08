import { inr } from '../format.js';

const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function PaymentsCard({ payments, isAdmin, onAdd, onRemove, busyId }) {
  const total = payments.reduce((a, p) => a + p.amount, 0);

  return (
    <section className="pcard">
      <div className="pcard__head">
        <div>
          <p className="eyebrow">Recharges</p>
          <h2>Paid since the last settlement</h2>
        </div>
        <div className="pcard__total">
          <b>{inr(total, 0)}</b>
          <span>{payments.length ? `${inr(total / 3, 0)} each` : 'nothing yet'}</span>
        </div>
      </div>

      {payments.length > 0 && (
        <ul className="plist">
          {payments.map((p, i) => (
            <li key={p.id} style={{ '--d': `${i * 70}ms` }}>
              <span className="plist__date">{fmtDate(p.date)}</span>
              <span className="plist__amt">{inr(p.amount, 0)}</span>
              <span className="plist__each">{inr(p.amount / 3, 0)} each</span>
              {isAdmin && (
                <button className="plist__x" disabled={busyId === p.id} onClick={() => onRemove(p)} aria-label="Remove this payment" title="Remove (admin)">✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button className="cta cta--inline cta--ghost" onClick={onAdd}>+ Add recharge payment</button>
    </section>
  );
}
