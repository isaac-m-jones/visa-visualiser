import { getStatusLabel } from "../lib/visa";
import { formatArea, formatList, formatPopulation, getStatusTone } from "../lib/ui";

export function HeroPanel() {
  return (
    <section className="hero-panel">
      <p className="eyebrow">Map-first workspace</p>
      <h1>Explore visa access on a living globe.</h1>
      <p>
        Hover a country to inspect it, click to keep its details open, and use map
        clicks to set the start point first and the destination second.
      </p>
    </section>
  );
}

export function CountryPanel({ country, status, onUseAsDeparture, onUseAsDestination }) {
  return (
    <section className="hover-panel">
      <p className="panel-kicker">Country brief</p>
      <div className="panel-header">
        <h2>
          <span className="flag">{country.flag}</span>
          {country.name}
        </h2>
        <span className="status-pill" style={{ background: getStatusTone(status) }}>
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <span>Country code</span>
          <strong>{country.code}</strong>
        </div>
        <div>
          <span>Capital</span>
          <strong>{country.capital}</strong>
        </div>
        <div>
          <span>Region</span>
          <strong>{country.subregion || country.region}</strong>
        </div>
        <div>
          <span>Population</span>
          <strong>{formatPopulation(country.population)}</strong>
        </div>
        <div>
          <span>Area</span>
          <strong>{formatArea(country.area)}</strong>
        </div>
        <div>
          <span>Languages</span>
          <strong>{formatList(country.languages?.map((language) => language.name))}</strong>
        </div>
        <div>
          <span>Currencies</span>
          <strong>
            {formatList(
              country.currencies?.map((currency) =>
                currency.symbol
                  ? `${currency.name} (${currency.symbol})`
                  : currency.name
              )
            )}
          </strong>
        </div>
        <div>
          <span>Passport rating</span>
          <strong>{country.passportStrength}</strong>
        </div>
        <div>
          <span>Landlocked</span>
          <strong>{country.landlocked ? "Yes" : "No"}</strong>
        </div>
      </div>

      <div className="mini-stats">
        <div>
          <span>Visa-free</span>
          <strong>{country.mobilitySummary?.visaFree || 0}</strong>
        </div>
        <div>
          <span>Arrival</span>
          <strong>
            {(country.mobilitySummary?.visaOnArrival || 0) +
              (country.mobilitySummary?.eta || 0) +
              (country.mobilitySummary?.eVisa || 0)}
          </strong>
        </div>
        <div>
          <span>Required</span>
          <strong>{country.mobilitySummary?.visaRequired || 0}</strong>
        </div>
      </div>

      <div className="panel-actions">
        <button type="button" onClick={onUseAsDeparture}>
          Use as start
        </button>
        <button type="button" onClick={onUseAsDestination}>
          Use as destination
        </button>
      </div>
    </section>
  );
}
