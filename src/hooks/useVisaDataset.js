import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../lib/api";

const GEO_URL = "/countries.geo.json";

export function useVisaDataset() {
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");
  const [countryGeoJson, setCountryGeoJson] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        const response = await fetch("/api/countries");
        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(response, "Unable to load countries.")
          );
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

  return {
    countries,
    countriesLoading,
    countriesError,
    countryGeoJson
  };
}
