import { Transfers } from './BillDetail.jsx';
import { inr, monthLabel } from '../format.js';

export default function LatestSettlement({ bill, roommates, onOpen }) {
  const nameOf = Object.fromEntries(roommates.map((r) => [r.id, r.name]));
  return (
    <section className="next">
      <div className="next__head">
        <div>
          <p className="eyebrow">Latest settlement</p>
          <h2>{monthLabel(bill.month)}: who pays whom</h2>
        </div>
        <div className="next__total">
          <span>AC total</span>
          <b>{inr(bill.result.acTotalCost, 0)}</b>
        </div>
      </div>
      <Transfers transfers={bill.result.transfers} nameOf={nameOf} />
      <button className="link next__more" onClick={onOpen}>See the full breakdown</button>
    </section>
  );
}
