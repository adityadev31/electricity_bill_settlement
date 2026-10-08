export const ROOMMATES = [
  { id: 'shagun', name: 'Shagun' },
  { id: 'saumya', name: 'Saumya' },
  { id: 'muskan', name: 'Muskan' },
];

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Month-end settlement.
 *
 * Everyone pays the same into every recharge, so common usage cancels out and only the AC
 * meters matter:   AC cost = (closing - opening) x rate     (per person)
 * The total AC cost is shared equally, so each person's balance is:
 *     balance = equal share - own AC cost
 *   balance > 0  -> receives money      balance < 0  -> pays money
 *
 * opening / closing: { shagun, saumya, muskan } AC meter readings
 * rate: price per unit
 * All money is computed in whole paise so balances always sum to exactly zero.
 */
export function compute({ opening, closing, rate }) {
  const ids = ROOMMATES.map((r) => r.id);
  if (!(rate > 0)) throw new Error('Rate per unit is not configured.');

  const acUnits = {};
  for (const id of ids) {
    acUnits[id] = round2(closing[id] - opening[id]);
    if (acUnits[id] < 0) throw new Error(`${cap(id)}'s AC reading is lower than the last one.`);
  }

  const costP = Object.fromEntries(ids.map((id) => [id, Math.round(acUnits[id] * rate * 100)]));
  const totalP = ids.reduce((s, id) => s + costP[id], 0);

  // Equal split in paise; any leftover paise go one each to the first people in order.
  const base = Math.floor(totalP / ids.length);
  let extra = totalP - base * ids.length;
  const shares = ids.map((id) => {
    const fairP = base + (extra-- > 0 ? 1 : 0);
    return {
      id,
      acUnits: acUnits[id],
      acCost: costP[id] / 100,
      fairShare: fairP / 100,
      balance: (fairP - costP[id]) / 100, // + receives, - pays
    };
  });

  return {
    rate,
    acUnitsTotal: round2(ids.reduce((s, id) => s + acUnits[id], 0)),
    acTotalCost: totalP / 100,
    shares,
    transfers: settle(shares),
  };
}

/** Fewest payments that clear everyone: repeatedly match the biggest debtor with the biggest creditor. */
export function settle(shares) {
  const toP = (n) => Math.round(n * 100);
  const debtors = shares.filter((s) => s.balance < 0).map((s) => ({ id: s.id, p: -toP(s.balance) }));
  const creditors = shares.filter((s) => s.balance > 0).map((s) => ({ id: s.id, p: toP(s.balance) }));
  const out = [];
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.p - a.p);
    creditors.sort((a, b) => b.p - a.p);
    const d = debtors[0], c = creditors[0];
    const p = Math.min(d.p, c.p);
    out.push({ from: d.id, to: c.id, amount: p / 100 });
    d.p -= p;
    c.p -= p;
    if (d.p === 0) debtors.shift();
    if (c.p === 0) creditors.shift();
  }
  return out;
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
