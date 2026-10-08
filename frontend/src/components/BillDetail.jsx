import { inr, units, monthLabel, useCountUp } from '../format.js';

function Stat({ label, value, accent }) {
  return (
    <div className={`stat ${accent ? 'stat--accent' : ''}`}>
      <span className="stat__v">{value}</span>
      <span className="stat__l">{label}</span>
    </div>
  );
}

function Amount({ value }) {
  const v = useCountUp(value);
  return <>{inr(v)}</>;
}

export function Transfers({ transfers, nameOf, animate = true }) {
  if (!transfers.length) return <p className="notice notice--ok">All square. Nobody owes anyone.</p>;
  return (
    <div className="xfers">
      {transfers.map((t, i) => (
        <div key={`${t.from}-${t.to}`} className="xfer" style={{ '--d': `${i * 110}ms` }}>
          <b className="xfer__who">{nameOf[t.from]}</b>
          <span className="xfer__mid"><i /><em>pays</em><i /></span>
          <b className="xfer__who xfer__who--to">{nameOf[t.to]}</b>
          <span className="xfer__amt">{animate ? <Amount value={t.amount} /> : inr(t.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BillDetail({ bill, roommates, onClose }) {
  const nameOf = Object.fromEntries(roommates.map((r) => [r.id, r.name]));
  const r = bill.result;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="close" onClick={onClose} aria-label="Close">✕</button>
        <p className="eyebrow">Settlement</p>
        <h2 className="sheet__title">{monthLabel(bill.month)}</h2>

        <div className="stats">
          <Stat label="AC total" value={inr(r.acTotalCost)} accent />
          <Stat label="AC units" value={units(r.acUnitsTotal)} />
          <Stat label="Equal share" value={inr(r.acTotalCost / 3)} />
          <Stat label="Rate / unit" value={inr(r.rate)} />
        </div>

        <div className="group">
          <h3>Who pays whom</h3>
          <Transfers transfers={r.transfers} nameOf={nameOf} />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>AC units</th>
                <th>AC cost</th>
                <th>Equal share</th>
                <th>Settles</th>
              </tr>
            </thead>
            <tbody>
              {r.shares.map((s, i) => (
                <tr key={s.id} style={{ '--d': `${i * 90}ms` }}>
                  <td className="who">{nameOf[s.id]}</td>
                  <td>{units(s.acUnits)}</td>
                  <td>{inr(s.acCost)}</td>
                  <td>{inr(s.fairShare)}</td>
                  <td className={s.balance > 0 ? 'recv' : s.balance < 0 ? 'owes' : 'even'}>
                    {s.balance > 0 ? `Gets ${inr(s.balance)}` : s.balance < 0 ? `Pays ${inr(-s.balance)}` : 'Even'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="readings">
          <summary>
            Recharges this month · {inr(bill.totalPaid)}
            {bill.totalPaid > 0 && <> ({inr(bill.totalPaid / 3)} each)</>}
          </summary>
          {bill.payments?.length ? (
            <table className="table table--mini">
              <thead><tr><th>Date</th><th>Recharge</th><th>Each paid</th></tr></thead>
              <tbody>
                {bill.payments.map((p) => (
                  <tr key={p.id}><td>{p.date}</td><td>{inr(p.amount)}</td><td>{inr(p.amount / 3)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="hint">No recharge was recorded for this month.</p>}
        </details>

        <details className="readings">
          <summary>AC meter readings</summary>
          <table className="table table--mini">
            <thead><tr><th>Meter</th><th>Opening</th><th>Closing</th></tr></thead>
            <tbody>
              {roommates.map((m) => (
                <tr key={m.id}><td>{m.name} AC</td><td>{units(bill.opening[m.id])}</td><td>{units(bill.closing[m.id])}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="locked">🔒 Locked · saved {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
    </div>
  );
}
