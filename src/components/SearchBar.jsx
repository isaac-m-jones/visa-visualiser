export function SearchBar({
  route,
  inputs,
  countries,
  countriesByCode,
  supportedPassportCountries,
  countriesLoading,
  onPassportChange,
  onInputChange,
  onApplyInput,
  onClearField
}) {
  return (
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
                  onPassportChange(country);
                } else {
                  onClearField("passport");
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
                onChange={(event) => onInputChange(field, event.target.value)}
                onBlur={() => onApplyInput(field)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onApplyInput(field);
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
  );
}
