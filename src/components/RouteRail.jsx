import { getStatusTone, humanizeDecision } from "../lib/ui";

function CurrentRoutePanel({
  route,
  departureCountry,
  destinationCountry,
  passportCountry,
  visaInfo,
  visaLoading,
  visaError,
  onClearField
}) {
  return (
    <section className="panel-card">
      <p className="panel-kicker">Current route</p>
      <div className="route-tokens">
        <span>
          {departureCountry?.name || "Start"}
          {departureCountry ? (
            <button type="button" onClick={() => onClearField("departure")}>
              Clear
            </button>
          ) : null}
        </span>
        <span>
          {destinationCountry?.name || "Destination"}
          {destinationCountry ? (
            <button type="button" onClick={() => onClearField("destination")}>
              Clear
            </button>
          ) : null}
        </span>
      </div>

      {!route.passport || !route.departure || !route.destination ? (
        <div className="empty-state">
          Select a passport, then choose both a start and destination country.
        </div>
      ) : visaLoading ? (
        <div className="empty-state">Loading visa guidance...</div>
      ) : visaError ? (
        <div className="empty-state">{visaError}</div>
      ) : visaInfo ? (
        <div className="route-content">
          <div className="panel-header">
            <h2>
              {departureCountry?.name || "Start"} to{" "}
              {destinationCountry?.name || visaInfo.destination.name}
            </h2>
            <span
              className="status-pill"
              style={{ background: getStatusTone(visaInfo.requirement.status) }}
            >
              {visaInfo.requirement.status}
            </span>
          </div>

          <p className="route-copy">
            {visaInfo.requirement.simplified?.tourism.note ||
              visaInfo.requirement.conditions}
          </p>

          <div className="detail-grid">
            <div>
              <span>Passport held</span>
              <strong>{passportCountry?.name || "Not set"}</strong>
            </div>
            <div>
              <span>Tourism stay</span>
              <strong>
                {visaInfo.requirement.simplified?.tourism.maxStayDays != null
                  ? `${visaInfo.requirement.simplified.tourism.maxStayDays} days`
                  : "Unknown"}
              </strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{visaInfo.requirement.routeMeta?.confidence || "n/a"}</strong>
            </div>
            <div>
              <span>Study path</span>
              <strong>
                {humanizeDecision(visaInfo.requirement.simplified?.study.pathExists)}
              </strong>
            </div>
            <div>
              <span>Work path</span>
              <strong>
                {humanizeDecision(visaInfo.requirement.simplified?.work.pathExists)}
              </strong>
            </div>
            <div>
              <span>Match type</span>
              <strong>{visaInfo.requirement.routeMeta?.matchType || "n/a"}</strong>
            </div>
            <div>
              <span>Last checked</span>
              <strong>{visaInfo.requirement.simplified?.lastChecked || "Unknown"}</strong>
            </div>
          </div>

          <a
            className="official-link"
            href={visaInfo.requirement.simplified?.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open source guidance
          </a>
        </div>
      ) : null}
    </section>
  );
}

function PassportSnapshotPanel({ accessSummary, strengthSummary }) {
  return (
    <section className="panel-card">
      <p className="panel-kicker">Passport access snapshot</p>
      <div className="summary-grid">
        <div>
          <span>Visa-free</span>
          <strong>{accessSummary.visaFree}</strong>
        </div>
        <div>
          <span>Arrival</span>
          <strong>
            {accessSummary.visaOnArrival + accessSummary.eta + accessSummary.eVisa}
          </strong>
        </div>
        <div>
          <span>Required</span>
          <strong>{accessSummary.visaRequired}</strong>
        </div>
        <div>
          <span>Rating</span>
          <strong>{strengthSummary.label}</strong>
        </div>
      </div>
    </section>
  );
}

function RecentRoutesPanel({ recentRoutes, onSelectRecentRoute }) {
  return (
    <section className="panel-card">
      <p className="panel-kicker">Recent route checks</p>
      {recentRoutes.length ? (
        <div className="recent-routes">
          {recentRoutes.map((item, index) => (
            <button
              key={`${item.passport || "unknown"}-${item.destination || "unknown"}-${index}`}
              className="recent-route"
              onClick={() => onSelectRecentRoute(item)}
            >
              <span>{item.departure || "Start not set"}</span>
              <span>{item.destination || "Unknown destination"}</span>
              <strong>{item.status}</strong>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">Your last few route checks will appear here.</div>
      )}
    </section>
  );
}

export function RouteRail(props) {
  return (
    <aside className="route-rail">
      <CurrentRoutePanel {...props} />
      <PassportSnapshotPanel
        accessSummary={props.accessSummary}
        strengthSummary={props.strengthSummary}
      />
      <RecentRoutesPanel
        recentRoutes={props.recentRoutes}
        onSelectRecentRoute={props.onSelectRecentRoute}
      />
    </aside>
  );
}
