import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import CanteenSwitcher from "../components/CanteenSwitcher";
import useStaffCanteen from "../useStaffCanteen";

const PERIODS = [1, 7, 30];
const formatRupees = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function SalesReport() {
  const { canteens, canteen, canteenId, setCanteenId, error: canteenError } = useStaffCanteen();
  const [days, setDays] = useState(7);
  const [reportResult, setReportResult] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!canteenId) return undefined;

    let active = true;
    api
      .get("/orders/report", { params: { canteen: canteenId, days } })
      .then((res) => {
        if (active) {
          setReportResult({ canteenId, days, data: res.data });
          setRequestError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setRequestError({ canteenId, days, message: errorMessage(err) });
        }
      });

    return () => {
      active = false;
    };
  }, [canteenId, days, retry]);

  if (canteenError) return <p className="error">{canteenError}</p>;
  if (!canteenId) return <p className="center">Loading canteens...</p>;

  const report =
    reportResult?.canteenId === canteenId && reportResult.days === days
      ? reportResult.data
      : null;
  const error =
    requestError?.canteenId === canteenId && requestError.days === days
      ? requestError.message
      : "";
  const maxOrders = Math.max(1, ...(report?.hours || []).map((hour) => hour.orders));

  return (
    <section className="sales-report">
      <div className="dash-head">
        <div>
          <h1>Sales report</h1>
          <p className="muted">{canteen?.name}</p>
        </div>
      </div>

      <CanteenSwitcher canteens={canteens} canteenId={canteenId} onChange={setCanteenId} />

      <div className="chips" aria-label="Report period">
        {PERIODS.map((period) => (
          <button
            key={period}
            className={`chip${days === period ? " active" : ""}`}
            type="button"
            aria-pressed={days === period}
            onClick={() => setDays(period)}
          >
            {period === 1 ? "Today" : `${period} days`}
          </button>
        ))}
      </div>

      {error ? (
        <div>
          <p className="error" role="alert">{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !report ? (
        <p className="center" role="status">Loading report...</p>
      ) : (
        <>
          <div className="sales-summary">
            <article className="sales-card">
              <span className="muted">Orders</span>
              <strong>{report.orders}</strong>
            </article>
            <article className="sales-card">
              <span className="muted">Payments received</span>
              <strong>{formatRupees(report.revenue)}</strong>
            </article>
            <article className="sales-card">
              <span className="muted">Unpaid</span>
              <strong>{formatRupees(report.unpaid)}</strong>
            </article>
            <article className="sales-card">
              <span className="muted">Cancelled</span>
              <strong>{report.cancelled}</strong>
            </article>
            <article className="sales-card">
              <span className="muted">No-shows</span>
              <strong>{report.noShows}</strong>
            </article>
          </div>

          <div className="sales-sections">
            <section className="sales-panel">
              <h2>Best sellers</h2>
              {report.best.length === 0 ? (
                <p className="muted">No completed sales in this period.</p>
              ) : (
                <ol className="sales-best-list">
                  {report.best.map((item) => (
                    <li key={item.name}>
                      <span>
                        <strong>{item.name}</strong>
                        <small className="muted">{item.qty} sold</small>
                      </span>
                      <strong>{formatRupees(item.revenue)}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="sales-panel">
              <h2>Busiest pickup hours</h2>
              {report.hours.length === 0 ? (
                <p className="muted">No orders in this period.</p>
              ) : (
                <ul className="sales-hours">
                  {report.hours.map((hour) => (
                    <li key={hour.hour}>
                      <span>{String(hour.hour).padStart(2, "0")}:00</span>
                      <span className="sales-bar-track">
                        <span
                          className="sales-bar"
                          style={{ width: `${(hour.orders / maxOrders) * 100}%` }}
                        />
                      </span>
                      <strong>{hour.orders}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
