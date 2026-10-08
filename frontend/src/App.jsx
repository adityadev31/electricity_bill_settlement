import { useCallback, useEffect, useState } from 'react';
import Splash from './components/Splash.jsx';
import Calendar from './components/Calendar.jsx';
import BillDetail from './components/BillDetail.jsx';
import PaymentsCard from './components/PaymentsCard.jsx';
import LatestSettlement from './components/LatestSettlement.jsx';
import AddEntry from './components/AddEntry.jsx';
import AddPayment from './components/AddPayment.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import { api } from './api.js';
import { inr, monthLabel } from './format.js';

export default function App() {
  const [splash, setSplash] = useState(true);
  const [status, setStatus] = useState(null);
  const [bills, setBills] = useState([]);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [selected, setSelected] = useState(null); // settlement
  const [adding, setAdding] = useState(false); // readings form
  const [paying, setPaying] = useState(false); // recharge form
  const [removing, setRemoving] = useState('');
  const [toast, setToast] = useState('');
  const [adminView, setAdminView] = useState(null); // 'login' | 'panel'

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([api.status(), api.bills()]);
      setStatus(s);
      setBills(b);
      setYear(Number(s.month.slice(0, 4)));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3600);
  };

  const pick = (key, bill) => {
    if (bill) return setSelected(bill);
    if (status && key === status.entryMonth) return setAdding(true);
    if (status && key === status.month) return showToast(lockedMsg(status));
    showToast('No settlement was recorded for this month.');
  };

  const savedReadings = async (bill, onboarding) => {
    setAdding(false);
    await load();
    if (onboarding) return showToast('Starting readings saved. The first settlement happens on the last day of the month.');
    setSelected(bill);
  };

  const savedPayment = async (p) => {
    setPaying(false);
    await load();
    showToast(`Recharge of ${inr(p.amount, 0)} recorded (${inr(p.amount / 3, 0)} each).`);
  };

  const removePayment = async (p) => {
    if (!window.confirm(`Remove the ${inr(p.amount, 0)} recharge from ${p.date}?`)) return;
    setRemoving(p.id);
    try {
      await api.removePayment(p.id);
      await load();
    } catch (e) {
      showToast(e.message);
    }
    setRemoving('');
  };

  const latest = bills.length ? bills[bills.length - 1] : null;

  return (
    <>
      {splash && <Splash onDone={() => setSplash(false)} />}
      <div className="bg" aria-hidden="true"><i /><i /><i /></div>

      <main className={`app ${splash ? 'app--hidden' : ''}`}>
        <button
          className={`admin-btn ${status?.isAdmin ? 'admin-btn--on' : ''}`}
          onClick={() => setAdminView(status?.isAdmin ? 'panel' : 'login')}
          disabled={!status}
        >
          <i /> {status?.isAdmin ? 'Admin' : 'Admin login'}
        </button>

        <header className="top">
          <div>
            <p className="eyebrow">Flat {status?.flat || 'CM4-302'}</p>
            <h1 className="brand">Electricity <span>Bill</span></h1>
            <div className="crew">
              {(status?.roommates || []).map((r) => <span key={r.id} className="chip">{r.name}</span>)}
            </div>
          </div>
        </header>

        {status?.mode === 'test' && (
          <div className="notice notice--warn">Test mode: sample data for demo. These are not real settlements.</div>
        )}

        {error && (
          <div className="notice notice--err">
            {error} <button className="link" onClick={load}>Retry</button>
          </div>
        )}

        {status && (
          <section className={`entry ${status.canAdd ? 'entry--open' : ''}`}>
            <div className="entry__txt">
              <h2>{entryTitle(status)}</h2>
              <p>{entryHint(status)}</p>
            </div>
            <button className="cta cta--inline" disabled={!status.canAdd} onClick={() => setAdding(true)}>
              {entryButton(status)}
            </button>
          </section>
        )}

        {status && <PaymentsCard payments={status.payments} isAdmin={status.isAdmin} busyId={removing} onAdd={() => setPaying(true)} onRemove={removePayment} />}

        {status && latest && <LatestSettlement bill={latest} roommates={status.roommates} onOpen={() => setSelected(latest)} />}

        {status && <Calendar year={year} setYear={setYear} bills={bills} currentMonth={status.month} startMonth={status.startMonth} entryMonth={status.entryMonth} onPick={pick} />}

        <footer className="foot">
          <span className={`dot dot--${status?.db || 'off'}`} />
          {status ? (status.db === 'mongo' ? 'Connected to MongoDB' : 'Local mode · no database') : 'Connecting…'}
          {status?.mode === 'test' && <b className="badge">TEST MODE</b>}
        </footer>
        <p className="credit">Made by Aditya with <span className="heart" aria-label="love">♥</span></p>
      </main>

      {selected && status && <BillDetail bill={selected} roommates={status.roommates} onClose={() => setSelected(null)} />}
      {adding && status && <AddEntry status={status} onClose={() => setAdding(false)} onSaved={savedReadings} />}
      {paying && status && <AddPayment status={status} onClose={() => setPaying(false)} onSaved={savedPayment} />}
      {adminView === 'login' && <AdminLogin onClose={() => setAdminView(null)} onSuccess={async () => { await load(); setAdminView('panel'); }} />}
      {adminView === 'panel' && status?.isAdmin && (
        <AdminPanel status={status} onClose={() => setAdminView(null)} onChanged={load} onLogout={() => { setAdminView(null); load(); }} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function lockedMsg(s) {
  return s.alreadyAdded ? 'This month is already settled.' : `AC readings open on ${s.lastDayDate} (last day of the month).`;
}

function entryTitle(s) {
  if (s.entryKind === 'baseline') return 'Welcome! Enter today’s AC readings';
  if (s.unlocked) return `${monthLabel(s.unlocked.month)} is unlocked`;
  if (s.alreadyAdded) return `${monthLabel(s.month)} is settled ✓`;
  return s.canAdd ? 'Settlement day' : 'Settlement opens on the last day';
}

function entryHint(s) {
  if (s.entryKind === 'baseline') return `Open until the first readings are saved. They are the starting point; the first settlement is on ${s.lastDayDate}.`;
  if (s.unlocked) return 'Admin reopened this month for late entry. Read the three AC meters now and enter them.';
  if (s.alreadyAdded) return 'Tap the month below to see who pays whom.';
  if (s.canAdd) return s.isLastDay ? 'Read the three AC meters and enter them to see who pays whom.' : 'Test mode is on, so you can settle any day.';
  if (s.baseline) return `Starting readings were saved on ${s.baseline.date}. Enter the AC readings on ${s.lastDayDate} to settle.`;
  return `AC readings can only be entered on ${s.lastDayDate}, so nobody can under-report.`;
}

function entryButton(s) {
  if (s.canAdd) return s.entryKind === 'baseline' ? 'Enter today’s readings' : `Settle ${monthLabel(s.entryMonth).split(' ')[0]}`;
  return s.alreadyAdded ? 'Settled' : `🔒 ${s.daysLeft}d to go`;
}
