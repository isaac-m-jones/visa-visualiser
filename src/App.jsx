import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getStatusLabel, getStrengthSummary } from "./lib/visa";

const GEO_URL = "/countries.geo.json";

const MAP_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#072a0e"//"#07111f"
      }
    }
  ]
};

const initialRoute = { passport: "", departure: "", destination: "" };
const initialInputState = { passport: "", departure: "", destination: "" };

function formatPopulation(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}

function formatArea(value) {
  return `${new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0)} km²`;
}

function formatList(values, emptyLabel = "Not listed") {
  if (!values?.length) {
    return emptyLabel;
  }

  return values.join(", ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCountrySearch(value) {
  return value.trim().toLowerCase();
}

function getStatusTone(status) {
  if (status === "Visa-free") {
    return "rgba(52, 211, 153, 0.86)";
  }

  if (status === "Visa on arrival" || status === "eVisa") {
    return "rgba(250, 204, 21, 0.86)";
  }

  if (status === "Passport selected") {
    return "rgba(96, 165, 250, 0.92)";
  }

  if (status === "Start point") {
    return "rgba(251, 191, 36, 0.92)";
  }

  if (status === "Destination selected") {
    return "rgba(248, 113, 113, 0.92)";
  }

  return "rgba(251, 113, 133, 0.82)";
}

function humanizeDecision(value) {
  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  return "Unknown";
}

function buildCountryFeatureCollection(countryGeoJson, route) {
  return {
    ...countryGeoJson,
    features: countryGeoJson.features.map((feature, index) => {
      const code = feature.properties["ISO3166-1-Alpha-3"];

      return {
        ...feature,
        id: code || index,
        properties: {
          ...feature.properties,
          countryCode: code,
          isPassport: code === route.passport ? 1 : 0,
          isDeparture: code === route.departure ? 1 : 0,
          isDestination: code === route.destination ? 1 : 0
        }
      };
    })
  };
}

function App() {
  const [route, setRoute] = useState(initialRoute);
  const [inputs, setInputs] = useState(initialInputState);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");
  const [countryGeoJson, setCountryGeoJson] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredCountryCode, setHoveredCountryCode] = useState("");
  const [pinnedCountryCode, setPinnedCountryCode] = useState("");
  const [visaInfo, setVisaInfo] = useState(null);
  const [visaLoading, setVisaLoading] = useState(false);
  const [visaError, setVisaError] = useState("");
  const [recentRoutes, setRecentRoutes] = useState(() => {
    const raw = window.localStorage.getItem("visa-visualiser-recent-routes");
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);

      return parsed.map((item) => ({
        passport: item.passport || item.origin || "",
        departure: item.departure || "",
        destination: item.destination || "",
        status: item.status || ""
      }));
    } catch {
      return [];
    }
  });

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

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

    async function loadCountryGeoJson() {
      try {
        const response = await fetch(GEO_URL);
        if (!response.ok) {
          throw new Error("Unable to load world boundaries.");
        }

        const payload = await response.json();
        if (!cancelled) {
          setCountryGeoJson(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setCountriesError(error.message);
        }
      }
    }

    loadCountries();
    loadCountryGeoJson();

    return () => {
      cancelled = true;
    };
  }, []);

  const countriesByCode = useMemo(
    () => new Map(countries.map((country) => [country.code, country])),
    [countries]
  );

  const countriesByName = useMemo(
    () =>
      new Map(
        countries.flatMap((country) => [
          [normalizeCountrySearch(country.name), country],
          [normalizeCountrySearch(country.officialName || ""), country],
          [normalizeCountrySearch(country.code), country]
        ])
      ),
    [countries]
  );

  const supportedPassportCountries = useMemo(
    () => countries.filter((country) => country.preview?.length),
    [countries]
  );

  const supportedPassportsByName = useMemo(
    () =>
      new Map(
        supportedPassportCountries.flatMap((country) => [
          [normalizeCountrySearch(country.name), country],
          [normalizeCountrySearch(country.officialName || ""), country],
          [normalizeCountrySearch(country.code), country]
        ])
      ),
    [supportedPassportCountries]
  );

  const passportCountry = countriesByCode.get(route.passport) || null;
  const departureCountry = countriesByCode.get(route.departure) || null;
  const destinationCountry = countriesByCode.get(route.destination) || null;
  const hoveredCountry = countriesByCode.get(hoveredCountryCode) || null;
  const pinnedCountry = countriesByCode.get(pinnedCountryCode) || null;
  const activeCountry = pinnedCountry || hoveredCountry;

  const strengthSummary = useMemo(
    () => getStrengthSummary(route.passport, countries),
    [countries, route.passport]
  );

  const mapColors = useMemo(() => {
    if (!passportCountry?.preview) {
      return {};
    }

    return Object.fromEntries(
      passportCountry.preview.map((item) => [item.destinationCode, item.status])
    );
  }, [passportCountry]);

  useEffect(() => {
    setInputs({
      passport: passportCountry?.name || "",
      departure: departureCountry?.name || "",
      destination: destinationCountry?.name || ""
    });
  }, [departureCountry, destinationCountry, passportCountry]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [18, 18],
      zoom: 1.55,
      pitch: 0,
      bearing: 0,
      maxZoom: 6,
      minZoom: 1.1,
      attributionControl: false,
      dragRotate: true
    });

    mapRef.current = map;
    map.scrollZoom.disable();

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    const canvasContainer = map.getCanvasContainer();
    const handleWheel = (event) => {
      const rect = canvasContainer.getBoundingClientRect();
      const point = [event.clientX - rect.left, event.clientY - rect.top];

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const nextZoom = clamp(map.getZoom() - event.deltaY * 0.01, 1.1, 6);
        map.zoomTo(nextZoom, {
          around: map.unproject(point),
          duration: 0,
          essential: true
        });
        return;
      }

      event.preventDefault();
      map.panBy([-event.deltaX, -event.deltaY], {
        duration: 0,
        essential: true
      });
    };

    canvasContainer.addEventListener("wheel", handleWheel, { passive: false });

    map.on("style.load", () => {
      map.setProjection({ type: "globe" });

      if (typeof map.setFog === "function") {
        map.setFog({
          color: "rgb(8, 14, 26)",
          "high-color": "rgb(15, 28, 46)",
          "space-color": "rgb(2, 5, 13)",
          "star-intensity": 0.06,
          horizonBlend: 0.08
        });
      }

      setMapReady(true);
    });

    return () => {
      canvasContainer.removeEventListener("wheel", handleWheel);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady || !countryGeoJson) {
      return;
    }

    const data = buildCountryFeatureCollection(countryGeoJson, route);

    if (!map.getSource("countries")) {
      map.addSource("countries", {
        type: "geojson",
        data
      });

      map.addLayer({
        id: "country-hit-area",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": "rgba(0, 0, 0, 0)",
          "fill-opacity": 0.01
        }
      });

        map.addLayer({
          id: "country-base-fill",
          type: "fill",
          source: "countries",
          paint: {
          "fill-color": "rgba(136, 157, 184, 0.28)"
          }
        });

      map.addLayer({
        id: "country-selected-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "isPassport"], 1],
            "rgba(96, 165, 250, 0.2)",
            ["==", ["get", "isDeparture"], 1],
            "rgba(251, 191, 36, 0.18)",
            ["==", ["get", "isDestination"], 1],
            "rgba(248, 113, 113, 0.18)",
            "rgba(0, 0, 0, 0)"
          ]
        }
      });

      map.addLayer({
        id: "country-borders",
        type: "line",
        source: "countries",
        paint: {
          "line-color": "rgba(214, 226, 242, 0.72)",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            0.5,
            5,
            1.4
          ]
        }
      });

      map.addLayer({
        id: "country-selected-outline",
        type: "line",
        source: "countries",
        filter: [
          "any",
          ["==", ["get", "isPassport"], 1],
          ["==", ["get", "isDeparture"], 1],
          ["==", ["get", "isDestination"], 1]
        ],
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "isPassport"], 1],
            "#60a5fa",
            ["==", ["get", "isDeparture"], 1],
            "#fbbf24",
            "#f87171"
          ],
          "line-width": 2.2
        }
      });

      map.addLayer({
        id: "country-hover-outline",
        type: "line",
        source: "countries",
        filter: ["==", ["get", "countryCode"], ""],
        paint: {
          "line-color": "#e0f2fe",
          "line-width": 2.8
        }
      });

      map.addLayer({
        id: "country-labels",
        type: "symbol",
        source: "countries",
        minzoom: 1.4,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1.4,
            9,
            3,
            11,
            5,
            13
          ],
          "text-letter-spacing": 0.03,
          "text-max-width": 8,
          "text-allow-overlap": false
        },
        paint: {
          "text-color": "rgba(235, 243, 255, 0.82)",
          "text-halo-color": "rgba(4, 9, 21, 0.95)",
          "text-halo-width": 1.2
        }
      });

      const syncHoveredCountry = (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: ["country-hit-area"]
        })[0];

        if (!feature?.properties?.countryCode) {
          if (map.getLayer("country-hover-outline")) {
            setHoveredCountryCode("");
            map.setFilter("country-hover-outline", ["==", ["get", "countryCode"], ""]);
          }

          map.getCanvas().style.cursor = "";
          return;
        }

        const nextCode = feature.properties.countryCode;
        setHoveredCountryCode((current) => {
          if (current !== nextCode && map.getLayer("country-hover-outline")) {
            map.setFilter("country-hover-outline", [
              "==",
              ["get", "countryCode"],
              nextCode
            ]);
          }

          return nextCode;
        });
        map.getCanvas().style.cursor = "pointer";
      };

      map.on("mousemove", syncHoveredCountry);
      map.on("mouseout", () => {
        setHoveredCountryCode("");
        if (map.getLayer("country-hover-outline")) {
          map.setFilter("country-hover-outline", ["==", ["get", "countryCode"], ""]);
        }
        map.getCanvas().style.cursor = "";
      });

      map.on("click", (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: ["country-hit-area"]
        })[0];
        const countryCode = feature?.properties?.countryCode;

        if (!countryCode) {
          return;
        }

        setPinnedCountryCode(countryCode);
        setRoute((current) => {
          if (current.destination === countryCode) {
            return { ...current, destination: "" };
          }

          if (current.departure === countryCode) {
            return { ...current, departure: "" };
          }

          if (!current.departure) {
            return { ...current, departure: countryCode };
          }

          if (!current.destination) {
            return { ...current, destination: countryCode };
          }

          return { ...current, destination: countryCode };
        });
      });
    } else {
      map.getSource("countries").setData(data);
    }
  }, [countryGeoJson, mapReady, route]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady || !map.isStyleLoaded() || !map.getLayer("country-hover-outline")) {
      return;
    }

    map.setFilter("country-hover-outline", [
      "==",
      ["get", "countryCode"],
      hoveredCountryCode || ""
    ]);
  }, [hoveredCountryCode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const focusCountry = destinationCountry || departureCountry || passportCountry;

    if (!map || !focusCountry?.latlng?.length) {
      return;
    }

    map.flyTo({
      center: [focusCountry.latlng[1], focusCountry.latlng[0]],
      zoom: destinationCountry ? 3 : 2.2,
      duration: 1000,
      essential: true
    });
  }, [departureCountry, destinationCountry, passportCountry]);

  useEffect(() => {
    if (!route.passport || !route.departure || !route.destination) {
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
          origin: route.passport,
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
                passport: payload.origin.name,
                departure:
                  countriesByCode.get(route.departure)?.name || "Not set",
                destination: payload.destination.name,
                status: payload.requirement.status
              },
              ...current.filter(
                (item) =>
                  !(
                    item.passport === payload.origin.name &&
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
  }, [countriesByCode, route.departure, route.destination, route.passport]);

  const resolveCountry = (rawValue, lookup = countriesByName) => {
    const normalizedValue = normalizeCountrySearch(rawValue);
    const exactMatch = lookup.get(normalizedValue);
    if (exactMatch) {
      return exactMatch;
    }

    const pool = lookup === countriesByName ? countries : supportedPassportCountries;

    return pool.find((country) =>
      country.name.toLowerCase().startsWith(normalizedValue)
    );
  };

  const updateField = (field, country) => {
    if (!country) {
      return;
    }

    setRoute((current) => {
      const next = { ...current, [field]: country.code };

      if (field === "passport" && country.code === current.destination) {
        next.destination = "";
      }

      if (field === "departure" && country.code === current.destination) {
        next.destination = "";
      }

      if (field === "destination" && country.code === current.departure) {
        next.departure = "";
      }

      return next;
    });

    setPinnedCountryCode(country.code);
  };

  const clearField = (field) => {
    setRoute((current) => ({
      ...current,
      [field]: ""
    }));

    setInputs((current) => ({
      ...current,
      [field]: ""
    }));
  };

  const applyInput = (field) => {
    const country = resolveCountry(
      inputs[field],
      field === "passport" ? supportedPassportsByName : countriesByName
    );
    if (country) {
      updateField(field, country);
    }
  };

  const activeStatus = activeCountry
    ? activeCountry.code === route.passport
      ? "Passport selected"
      : activeCountry.code === route.departure
        ? "Start point"
        : activeCountry.code === route.destination
          ? "Destination selected"
          : route.passport
            ? mapColors[activeCountry.code] || "Visa required"
            : "Set a passport to preview access"
    : "";

  const accessSummary =
    passportCountry?.mobilitySummary || {
      visaFree: 0,
      visaOnArrival: 0,
      eVisa: 0,
      visaRequired: 0
    };

  return (
    <div className="app-shell">
      <div ref={mapContainerRef} className="map-root" />
      <div className="map-vignette" />

      <div className="hud-layer">
        <header className="search-bar">
          <div className="brand-chip">
            <span className="eyebrow">Visa map</span>
            <strong>Route intelligence</strong>
          </div>

          {["passport", "departure", "destination"].map((field) => (
            <label key={field} className="search-field">
              <span className="search-label">
                {field === "passport"
                  ? "Passport held"
                  : field === "departure"
                    ? "Starting from"
                    : "Destination"}
              </span>
              {field === "passport" ? (
                <select
                  value={route.passport}
                  onChange={(event) => {
                    const country = countriesByCode.get(event.target.value) || null;

                    if (country) {
                      updateField("passport", country);
                    } else {
                      clearField("passport");
                    }
                  }}
                  disabled={countriesLoading}
                >
                  <option value="">Select a passport</option>
                  {supportedPassportCountries.map((country) => (
                    <option key={`passport-${country.code}`} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    list={`${field}-options`}
                    value={inputs[field]}
                    onChange={(event) =>
                      setInputs((current) => ({
                        ...current,
                        [field]: event.target.value
                      }))
                    }
                    onBlur={() => applyInput(field)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyInput(field);
                      }
                    }}
                    placeholder={field === "departure" ? "United Arab Emirates" : "Japan"}
                    disabled={countriesLoading}
                  />
                  <datalist id={`${field}-options`}>
                    {countries.map((country, index) => (
                      <option
                        key={`${field}-${country.code || country.name}-${index}`}
                        value={country.name}
                      />
                    ))}
                  </datalist>
                </>
              )}
            </label>
          ))}
        </header>

        <section className="hero-panel">
          <p className="eyebrow">Map-first workspace</p>
          <h1>Explore visa access on a living globe.</h1>
          <p>
            Hover a country to inspect it, click to keep its details open, and use map
            clicks to set the start point first and the destination second.
          </p>
        </section>

        <section className="hover-panel">
          <p className="panel-kicker">Country brief</p>
          {activeCountry ? (
            <>
              <div className="panel-header">
                <h2>
                  <span className="flag">{activeCountry.flag}</span>
                  {activeCountry.name}
                </h2>
                <span
                  className="status-pill"
                  style={{ background: getStatusTone(activeStatus) }}
                >
                  {getStatusLabel(activeStatus)}
                </span>
              </div>

              <div className="detail-grid">
                <div>
                  <span>Country code</span>
                  <strong>{activeCountry.code}</strong>
                </div>
                <div>
                  <span>Capital</span>
                  <strong>{activeCountry.capital}</strong>
                </div>
                <div>
                  <span>Region</span>
                  <strong>{activeCountry.subregion || activeCountry.region}</strong>
                </div>
                <div>
                  <span>Population</span>
                  <strong>{formatPopulation(activeCountry.population)}</strong>
                </div>
                <div>
                  <span>Area</span>
                  <strong>{formatArea(activeCountry.area)}</strong>
                </div>
                <div>
                  <span>Languages</span>
                  <strong>
                    {formatList(activeCountry.languages?.map((language) => language.name))}
                  </strong>
                </div>
                <div>
                  <span>Currencies</span>
                  <strong>
                    {formatList(
                      activeCountry.currencies?.map((currency) =>
                        currency.symbol
                          ? `${currency.name} (${currency.symbol})`
                          : currency.name
                      )
                    )}
                  </strong>
                </div>
                <div>
                  <span>Passport rating</span>
                  <strong>{activeCountry.passportStrength}</strong>
                </div>
                <div>
                  <span>Landlocked</span>
                  <strong>{activeCountry.landlocked ? "Yes" : "No"}</strong>
                </div>
              </div>

              <div className="mini-stats">
                <div>
                  <span>Visa-free</span>
                  <strong>{activeCountry.mobilitySummary?.visaFree || 0}</strong>
                </div>
                <div>
                  <span>Arrival</span>
                  <strong>
                    {(activeCountry.mobilitySummary?.visaOnArrival || 0) +
                      (activeCountry.mobilitySummary?.eVisa || 0)}
                  </strong>
                </div>
                <div>
                  <span>Required</span>
                  <strong>{activeCountry.mobilitySummary?.visaRequired || 0}</strong>
                </div>
              </div>

              <div className="panel-actions">
                <button type="button" onClick={() => updateField("departure", activeCountry)}>
                  Use as start
                </button>
                <button
                  type="button"
                  onClick={() => updateField("destination", activeCountry)}
                >
                  Use as destination
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              Hover a country on the map to preview it, then click to keep its brief open.
            </div>
          )}
        </section>

        <aside className="route-rail">
          <section className="panel-card">
            <p className="panel-kicker">Current route</p>
            <div className="route-tokens">
              <span>
                {departureCountry?.name || "Start"}
                {departureCountry ? (
                  <button type="button" onClick={() => clearField("departure")}>
                    Clear
                  </button>
                ) : null}
              </span>
              <span>
                {destinationCountry?.name || "Destination"}
                {destinationCountry ? (
                  <button type="button" onClick={() => clearField("destination")}>
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
                    style={{
                      background: getStatusTone(
                        visaInfo.requirement.simplified?.tourism.allowed === "yes"
                          ? "Visa-free"
                          : visaInfo.requirement.simplified?.tourism.allowed === "no"
                            ? "Visa required"
                            : "Unknown"
                      )
                    }}
                  >
                    Tourism:{" "}
                    {humanizeDecision(visaInfo.requirement.simplified?.tourism.allowed)}
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
                      {humanizeDecision(
                        visaInfo.requirement.simplified?.study.pathExists
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Work path</span>
                    <strong>
                      {humanizeDecision(
                        visaInfo.requirement.simplified?.work.pathExists
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Match type</span>
                    <strong>{visaInfo.requirement.routeMeta?.matchType || "n/a"}</strong>
                  </div>
                  <div>
                    <span>Last checked</span>
                    <strong>
                      {visaInfo.requirement.simplified?.lastChecked || "Unknown"}
                    </strong>
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

          <section className="panel-card">
            <p className="panel-kicker">Passport access snapshot</p>
            <div className="summary-grid">
              <div>
                <span>Visa-free</span>
                <strong>{accessSummary.visaFree}</strong>
              </div>
              <div>
                <span>Arrival</span>
                <strong>{accessSummary.visaOnArrival + accessSummary.eVisa}</strong>
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

          <section className="panel-card">
            <p className="panel-kicker">Recent route checks</p>
            {recentRoutes.length ? (
              <div className="recent-routes">
                {recentRoutes.map((item, index) => (
                  <button
                    key={`${item.passport || "unknown"}-${item.destination || "unknown"}-${index}`}
                    className="recent-route"
                    onClick={() => {
                      const passport = resolveCountry(item.passport);
                      const departure = resolveCountry(item.departure);
                      const destination = resolveCountry(item.destination);

                      if (passport && destination) {
                        setRoute({
                          passport: passport.code,
                          departure: departure?.code || "",
                          destination: destination.code
                        });
                      }
                    }}
                    >
                    <span>{item.departure || "Start not set"}</span>
                    <span>{item.destination || "Unknown destination"}</span>
                    <strong>{item.status}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                Your last few route checks will appear here.
              </div>
            )}
          </section>
        </aside>

        {countriesError ? <div className="floating-alert">{countriesError}</div> : null}
      </div>
    </div>
  );
}

export default App;
