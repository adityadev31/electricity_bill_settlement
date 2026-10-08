import { useState } from 'react';
import { api } from '../api.js';
import { inr } from '../format.js';

export default function AddPayment({ status, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(status.rechargeAmount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const saved = await api.addPayment(amount);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet sheet--narrow" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="close" onClick={onClose} aria-label="Close">✕</button>
        <p className="eyebrow">Recharge</p>
        <h2 className="sheet__title">Add a payment</h2>
        {status.mode === 'test' && <p className="notice notice--warn">Test mode: this is sample data.</p>}
        <p className="hint">Record a recharge that was just done. Everyone pays an equal share, so nobody owes anything for it. Dated today ({status.date}).</p>

        <label className="field field--money">
          <span>Total recharge amount</span>
          <div className="money"><b>₹</b>
            <input type="number" inputMode="decimal" min="1" step="any" value={amount} autoFocus
              onChange={(e) => setAmount(e.target.value)} required />
          </div>
        </label>

        {valid && <div className="preview"><div className="preview__meta"><span>{inr(n / 3)} from each of the three</span></div></div>}
        {error && <p className="notice notice--err">{error}</p>}
        <button className="cta" disabled={!valid || busy}>{busy ? 'Saving…' : 'Save recharge'}</button>
      </form>
    </div>
  );
}
