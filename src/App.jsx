import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CountryPanel, HeroPanel } from "./components/CountryPanel";
import { RouteRail } from "./components/RouteRail";
import { SearchBar } from "./components/SearchBar";
import { useVisaDataset } from "./hooks/useVisaDataset";
import { getApiErrorMessage } from "./lib/api";
import { normalizeCountrySearch } from "./lib/countries";
import { getStrengthSummary } from "./lib/visa";

const MAX_GLOBE_ZOOM = 6;
const RECENT_ROUTES_STORAGE_KEY = "visa-visualiser-recent-routes";
const initialRoute = { passport: "", departure: "", destination: "" };
const initialInputState = { passport: "", departure: "", destination: "" };

const MAP_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#072a0e"
      }
    }
  ]
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getResponsiveMinGlobeZoom(container) {
  if (!container) {
    return 2.05;
  }

  const width = container.clientWidth || 0;
  const height = container.clientHeight || 0;
  const longestEdge = Math.max(width, height);

  return clamp(1.85 + Math.max(0, longestEdge - 1100) / 900, 1.85, 2.45);
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

function loadRecentRoutes() {
  const raw = window.localStorage.getItem(RECENT_ROUTES_STORAGE_KEY);
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
}

function App() {
  const [route, setRoute] = useState(initialRoute);
  const [inputs, setInputs] = useState(initialInputState);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredCountryCode, setHoveredCountryCode] = useState("");
  const [pinnedCountryCode, setPinnedCountryCode] = useState("");
  const [visaInfo, setVisaInfo] = useState(null);
  const [visaLoading, setVisaLoading] = useState(false);
  const [visaError, setVisaError] = useState("");
  const [recentRoutes, setRecentRoutes] = useState(loadRecentRoutes);

  const { countries, countriesLoading, countriesError, countryGeoJson } =
    useVisaDataset();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const minZoomRef = useRef(2.05);

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

    const initialMinZoom = getResponsiveMinGlobeZoom(mapContainerRef.current);
    minZoomRef.current = initialMinZoom;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [18, 18],
      zoom: initialMinZoom,
      pitch: 0,
      bearing: 0,
      maxZoom: MAX_GLOBE_ZOOM,
      minZoom: initialMinZoom,
      attributionControl: false,
      dragRotate: true
    });

    mapRef.current = map;
    map.scrollZoom.disable();
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );

    const canvasContainer = map.getCanvasContainer();
    const handleWheel = (event) => {
      const rect = canvasContainer.getBoundingClientRect();
      const point = [event.clientX - rect.left, event.clientY - rect.top];

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const nextZoom = clamp(
          map.getZoom() - event.deltaY * 0.01,
          minZoomRef.current,
          MAX_GLOBE_ZOOM
        );
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

    const resizeObserver = new ResizeObserver(() => {
      const nextMinZoom = getResponsiveMinGlobeZoom(mapContainerRef.current);
      minZoomRef.current = nextMinZoom;
      map.setMinZoom(nextMinZoom);

      if (map.getZoom() < nextMinZoom) {
        map.zoomTo(nextMinZoom, {
          duration: 0,
          essential: true
        });
      }
    });

    resizeObserver.observe(mapContainerRef.current);

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
      resizeObserver.disconnect();
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
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 5, 1.4]
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
          "text-size": ["interpolate", ["linear"], ["zoom"], 1.4, 9, 3, 11, 5, 13],
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
      zoom: Math.max(destinationCountry ? 3 : 2.2, minZoomRef.current),
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
          throw new Error(
            await getApiErrorMessage(response, "Unable to load visa details.")
          );
        }

        const payload = await response.json();
        if (!cancelled) {
          setVisaInfo(payload);
          setRecentRoutes((current) => {
            const next = [
              {
                passport: payload.origin.name,
                departure: countriesByCode.get(route.departure)?.name || "Not set",
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
              RECENT_ROUTES_STORAGE_KEY,
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
      eta: 0,
      eVisa: 0,
      noAdmission: 0,
      visaRequired: 0
    };

  return (
    <div className="app-shell">
      <div ref={mapContainerRef} className="map-root" />
      <div className="map-vignette" />

      <div className="hud-layer">
        <SearchBar
          route={route}
          inputs={inputs}
          countries={countries}
          countriesByCode={countriesByCode}
          supportedPassportCountries={supportedPassportCountries}
          countriesLoading={countriesLoading}
          onPassportChange={(country) => updateField("passport", country)}
          onInputChange={(field, value) =>
            setInputs((current) => ({
              ...current,
              [field]: value
            }))
          }
          onApplyInput={applyInput}
          onClearField={clearField}
        />

        {activeCountry ? (
          <CountryPanel
            country={activeCountry}
            status={activeStatus}
            onUseAsDeparture={() => updateField("departure", activeCountry)}
            onUseAsDestination={() => updateField("destination", activeCountry)}
          />
        ) : (
          <HeroPanel />
        )}

        <RouteRail
          route={route}
          departureCountry={departureCountry}
          destinationCountry={destinationCountry}
          passportCountry={passportCountry}
          visaInfo={visaInfo}
          visaLoading={visaLoading}
          visaError={visaError}
          onClearField={clearField}
          accessSummary={accessSummary}
          strengthSummary={strengthSummary}
          recentRoutes={recentRoutes}
          onSelectRecentRoute={(item) => {
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
        />

        {countriesError ? <div className="floating-alert">{countriesError}</div> : null}
      </div>
    </div>
  );
}

export default App;
