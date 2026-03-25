import { useEffect, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
  ZoomableGroup
} from "react-simple-maps";
import {
  getStatusAppearance,
  getStatusLabel,
  getStrengthSummary
} from "./lib/visa";

const GEO_URL =
  "https://datahub.io/core/geo-countries/r/data/countries.geojson";

const initialRoute = { origin: "", destination: "" };

function App() {
  const [route, setRoute] = useState(initialRoute);
  const [hoveredCountry, setHoveredCountry] = useState("");
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");
  const [visaInfo, setVisaInfo] = useState(null);
  const [visaLoading, setVisaLoading] = useState(false);
  const [visaError, setVisaError] = useState("");
  const [recentRoutes, setRecentRoutes] = useState(() => {
    const raw = window.localStorage.getItem("visa-visualiser-recent-routes");
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        const response = await fetch("/api/countries");
        if (!response.ok) {
          throw new Error("Unable to load countries.");
        }

        const payload = await response.json();
        if (!cancelled) {
          setCountries(payload.countries);
        }
      } catch (error) {
        if (!cancelled) {
          setCountriesError(error.message);
        }
      } finally {
        if (!cancelled) {
          setCountriesLoading(false);
        }
      }
    }

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!route.origin || !route.destination) {
      setVisaInfo(null);
      setVisaError("");
      return;
    }

    let cancelled = false;

    async function loadVisaInfo() {
      setVisaLoading(true);
      setVisaError("");

      try {
        const params = new URLSearchParams({
          origin: route.origin,
          destination: route.destination
        });
        const response = await fetch(`/api/visa?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Unable to load visa details.");
        }

        const payload = await response.json();
        if (!cancelled) {
          setVisaInfo(payload);
          setRecentRoutes((current) => {
            const next = [
              {
                origin: payload.origin.name,
                destination: payload.destination.name,
                status: payload.requirement.status
              },
              ...current.filter(
                (item) =>
                  !(
                    item.origin === payload.origin.name &&
                    item.destination === payload.destination.name
                  )
              )
            ].slice(0, 5);

            window.localStorage.setItem(
              "visa-visualiser-recent-routes",
              JSON.stringify(next)
            );

            return next;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setVisaError(error.message);
          setVisaInfo(null);
        }
      } finally {
        if (!cancelled) {
          setVisaLoading(false);
        }
      }
    }

    loadVisaInfo();

    return () => {
      cancelled = true;
    };
  }, [route.destination, route.origin]);

  const countryOptions = useMemo(
    () =>
      [...countries].sort((left, right) => left.name.localeCompare(right.name)),
    [countries]
  );

  const strengthSummary = useMemo(
    () => getStrengthSummary(route.origin, countries),
    [countries, route.origin]
  );

  const mapColors = useMemo(() => {
    if (!route.origin) {
      return {};
    }

    const selectedOrigin = countries.find((country) => country.code === route.origin);
    if (!selectedOrigin) {
      return {};
    }

    return Object.fromEntries(
      selectedOrigin.preview.map((item) => [item.destinationCode, item.status])
    );
  }, [countries, route.origin]);

  const handleOriginChange = (event) => {
    const origin = event.target.value;
    setRoute((current) => ({
      origin,
      destination: origin === current.destination ? "" : current.destination
    }));
  };

  const handleDestinationChange = (event) => {
    const destination = event.target.value;
    setRoute((current) => ({
      ...current,
      destination
    }));
  };

  const handleCountryClick = (countryCode) => {
    const country = countryOptions.find((item) => item.code === countryCode);
    if (!country) {
      return;
    }

    setRoute((current) => {
      if (!current.origin || current.origin === country.code) {
        return {
          origin: country.code,
          destination: current.destination === country.code ? "" : current.destination
        };
      }

      if (!current.destination || current.destination === country.code) {
        return {
          ...current,
          destination: country.code
        };
      }

      return {
        origin: country.code,
        destination: ""
      };
    });
  };

  const originName =
    countries.find((country) => country.code === route.origin)?.name || "Select a passport";
  const destinationName =
    countries.find((country) => country.code === route.destination)?.name ||
    "Select a destination";

  return (
    <div className="app-shell">
      <div className="aurora aurora-left" />
      <div className="aurora aurora-right" />

      <header className="hero">
        <div>
          <p className="eyebrow">Global mobility explorer</p>
          <h1>Visa Visualiser</h1>
          <p className="hero-copy">
            Explore visa access between passports and destinations with a live world
            map, synced selectors, and route-by-route requirement details.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Passport</span>
            <strong>{originName}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Destination</span>
            <strong>{destinationName}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Preview</span>
            <strong>{strengthSummary.label}</strong>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="map-card">
          <div className="toolbar">
            <div className="control-group">
              <label htmlFor="origin">Origin passport</label>
              <select
                id="origin"
                value={route.origin}
                onChange={handleOriginChange}
                disabled={countriesLoading}
              >
                <option value="">Choose an origin</option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label htmlFor="destination">Destination</label>
              <select
                id="destination"
                value={route.destination}
                onChange={handleDestinationChange}
                disabled={countriesLoading}
              >
                <option value="">Choose a destination</option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="legend">
            <span>
              <i className="legend-swatch visa-free" />
              Visa-free
            </span>
            <span>
              <i className="legend-swatch visa-on-arrival" />
              Visa on arrival / eVisa
            </span>
            <span>
              <i className="legend-swatch visa-required" />
              Visa required
            </span>
          </div>

          <div className="map-frame">
            {countriesError ? (
              <div className="empty-state">{countriesError}</div>
            ) : (
              <>
                <ComposableMap projectionConfig={{ scale: 155 }} className="world-map">
                  <ZoomableGroup center={[8, 14]} zoom={1}>
                    <Sphere stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
                    <Graticule stroke="rgba(255,255,255,0.05)" strokeWidth={0.4} />
                    <Geographies geography={GEO_URL}>
                      {({ geographies }) =>
                        geographies.map((geography) => {
                          const geoName = geography.properties.name;
                          const geoCode = geography.properties["ISO3166-1-Alpha-3"];
                          const appearance = getStatusAppearance(
                            mapColors[geoCode],
                            route.origin,
                            route.destination,
                            geoCode
                          );

                          return (
                            <Geography
                              key={geography.rsmKey}
                              geography={geography}
                              onMouseEnter={() => setHoveredCountry(geoName)}
                              onMouseLeave={() => setHoveredCountry("")}
                              onClick={() => handleCountryClick(geoCode)}
                              style={{
                                default: {
                                  fill: appearance.fill,
                                  stroke: appearance.stroke,
                                  strokeWidth: appearance.strokeWidth,
                                  outline: "none"
                                },
                                hover: {
                                  fill: appearance.hoverFill,
                                  stroke: "#f8fafc",
                                  strokeWidth: 1.2,
                                  outline: "none",
                                  cursor: "pointer"
                                },
                                pressed: {
                                  fill: appearance.hoverFill,
                                  outline: "none"
                                }
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>

                <div className="map-overlay">
                  <span>{hoveredCountry || "Hover over a country"}</span>
                  <span className="map-hint">
                    First click sets origin, second click sets destination.
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="info-panel">
          <section className="panel-card">
            <p className="panel-kicker">Route details</p>
            {!route.origin || !route.destination ? (
              <div className="empty-state">
                Pick an origin and destination to inspect visa requirements.
              </div>
            ) : visaLoading ? (
              <div className="empty-state">Loading visa guidance...</div>
            ) : visaError ? (
              <div className="empty-state">{visaError}</div>
            ) : visaInfo ? (
              <div className="route-content">
                <div className="route-badge-row">
                  <span
                    className="status-pill"
                    style={{
                      background: getStatusAppearance(
                        visaInfo.requirement.status,
                        route.origin,
                        route.destination,
                        route.destination
                      ).fill
                    }}
                  >
                    {getStatusLabel(visaInfo.requirement.status)}
                  </span>
                  <span className="duration-pill">{visaInfo.requirement.duration}</span>
                </div>

                <h2>
                  {visaInfo.origin.name} to {visaInfo.destination.name}
                </h2>
                <p className="panel-copy">{visaInfo.requirement.conditions}</p>

                <dl className="details-grid">
                  <div>
                    <dt>Status</dt>
                    <dd>{visaInfo.requirement.status}</dd>
                  </div>
                  <div>
                    <dt>Maximum stay</dt>
                    <dd>{visaInfo.requirement.duration}</dd>
                  </div>
                  <div>
                    <dt>Passport strength</dt>
                    <dd>{visaInfo.origin.passportStrength}</dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{visaInfo.requirement.lastUpdated}</dd>
                  </div>
                </dl>

                <a
                  className="official-link"
                  href={visaInfo.requirement.officialSource}
                  target="_blank"
                  rel="noreferrer"
                >
                  View official immigration guidance
                </a>
              </div>
            ) : null}
          </section>

          <section className="panel-card">
            <p className="panel-kicker">Passport strength view</p>
            <div className="strength-grid">
              {strengthSummary.items.map((item) => (
                <div key={item.label} className="strength-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <p className="panel-kicker">Recent routes</p>
            {recentRoutes.length ? (
              <div className="recent-routes">
                {recentRoutes.map((item) => (
                  <button
                    key={`${item.origin}-${item.destination}`}
                    className="recent-route"
                    onClick={() => {
                      const origin = countries.find((country) => country.name === item.origin);
                      const destination = countries.find(
                        (country) => country.name === item.destination
                      );

                      if (origin && destination) {
                        setRoute({
                          origin: origin.code,
                          destination: destination.code
                        });
                      }
                    }}
                  >
                    <span>{item.origin}</span>
                    <span>{item.destination}</span>
                    <strong>{item.status}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">Your latest route checks will appear here.</div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
