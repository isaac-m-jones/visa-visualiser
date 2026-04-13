import { getDatabase, getDatasetUpdatedAt } from "./database.js";

function countPreviewStatuses(preview) {
  return preview.reduce(
    (accumulator, item) => {
      if (item.status === "Visa-free") {
        accumulator.visaFree += 1;
      } else if (item.status === "Visa on arrival") {
        accumulator.visaOnArrival += 1;
      } else if (item.status === "ETA") {
        accumulator.eta += 1;
      } else if (item.status === "eVisa") {
        accumulator.eVisa += 1;
      } else if (item.status === "No admission") {
        accumulator.noAdmission += 1;
      } else {
        accumulator.visaRequired += 1;
      }

      return accumulator;
    },
    {
      visaFree: 0,
      visaOnArrival: 0,
      eta: 0,
      eVisa: 0,
      noAdmission: 0,
      visaRequired: 0
    }
  );
}

function buildRouteMeta(matchType, origin, destination, confidence) {
  return {
    matchType,
    confidence,
    originRegion: origin.region,
    destinationRegion: destination.region,
    originPassportStrength: origin.passportStrength,
    destinationPassportStrength: destination.passportStrength,
    datasetUpdatedAt: getDatasetUpdatedAt()
  };
}

function deriveLegacyStatus(routeRecord) {
  if (routeRecord.tourism.requirementCode) {
    return routeRecord.tourism.requirementCode;
  }

  if (routeRecord.tourism.allowed === "yes") {
    if (routeRecord.tourism.note?.toLowerCase().includes("visa on arrival")) {
      return "Visa on arrival";
    }

    if (routeRecord.tourism.note?.toLowerCase().includes("evisa")) {
      return "eVisa";
    }

    return "Visa-free";
  }

  if (routeRecord.tourism.allowed === "no") {
    return "Visa required";
  }

  return "Unknown";
}

function buildRequirement(routeRecord, origin, destination, matchType) {
  const derivedStatus = deriveLegacyStatus(routeRecord);

  return {
    status: derivedStatus,
    duration:
      routeRecord.tourism.maxStayDays != null
        ? `${routeRecord.tourism.maxStayDays} days`
        : routeRecord.tourism.allowed === "yes"
          ? "Varies"
          : "Unknown",
    conditions:
      routeRecord.tourism.note ||
      "This simplified dataset only tracks whether a short tourism path exists.",
    officialSource: routeRecord.sourceUrl,
    lastUpdated: routeRecord.lastChecked,
    simplified: {
      tourism: routeRecord.tourism,
      study: routeRecord.study,
      work: routeRecord.work,
      sourceUrl: routeRecord.sourceUrl,
      confidence: routeRecord.confidence,
      lastChecked: routeRecord.lastChecked
    },
    routeMeta: buildRouteMeta(
      matchType,
      origin,
      destination,
      routeRecord.confidence
    )
  };
}

function buildFallbackRouteRecord(previewStatus) {
  if (previewStatus === "Visa-free") {
    return {
      tourism: {
        allowed: "yes",
        requirementCode: "Visa-free",
        maxStayDays: 90,
        note: "Tourism appears to be available without a standard pre-approved visa in this starter dataset."
      },
      study: { pathExists: "unknown" },
      work: { pathExists: "unknown" },
      sourceUrl: "https://www.iata.org/en/services/compliance/timatic/",
      confidence: "medium",
      lastChecked: getDatasetUpdatedAt()
    };
  }

  if (
    previewStatus === "Visa on arrival" ||
    previewStatus === "ETA" ||
    previewStatus === "eVisa"
  ) {
    return {
      tourism: {
        allowed: "yes",
        requirementCode:
          previewStatus === "ETA"
            ? "ETA"
            : previewStatus === "eVisa"
              ? "eVisa"
              : "Visa on arrival",
        maxStayDays: 30,
        note: "Tourism appears possible via a simplified arrival or online process in this starter dataset."
      },
      study: { pathExists: "unknown" },
      work: { pathExists: "unknown" },
      sourceUrl: "https://www.iata.org/en/services/compliance/timatic/",
      confidence: "medium",
      lastChecked: getDatasetUpdatedAt()
    };
  }

  return {
      tourism: {
        allowed: previewStatus === "No admission" ? "no" : "unknown",
        requirementCode: previewStatus === "No admission" ? "No admission" : "Unknown",
        maxStayDays: null,
        note: "This starter dataset does not yet have a verified tourism answer for this route."
      },
    study: { pathExists: "unknown" },
    work: { pathExists: "unknown" },
    sourceUrl: "https://www.iata.org/en/services/compliance/timatic/",
    confidence: "low",
    lastChecked: getDatasetUpdatedAt()
  };
}

function shapeCountryRows(countryRows) {
  const grouped = new Map();

  for (const row of countryRows) {
    if (!grouped.has(row.code)) {
      grouped.set(row.code, {
        code: row.code,
        name: row.name,
        officialName: row.official_name,
        flag: row.flag,
        region: row.region,
        subregion: row.subregion,
        capital: row.capital,
        population: row.population,
        area: row.area,
        latlng:
          row.lat != null && row.lng != null ? [Number(row.lat), Number(row.lng)] : [],
        landlocked: Boolean(row.landlocked),
        currencies: [],
        languages: [],
        passportStrength: row.passport_strength,
        preview: [],
        mobilitySummary: {
          visaFree: 0,
          visaOnArrival: 0,
          eta: 0,
          eVisa: 0,
          noAdmission: 0,
          visaRequired: 0
        },
        metadataSource: row.metadata_source
      });
    }

    const country = grouped.get(row.code);

    if (row.language_code) {
      const alreadyPresent = country.languages.some(
        (language) => language.code === row.language_code
      );

      if (!alreadyPresent) {
        country.languages.push({
          code: row.language_code,
          name: row.language_name
        });
      }
    }

    if (row.currency_code) {
      const alreadyPresent = country.currencies.some(
        (currency) => currency.code === row.currency_code
      );

      if (!alreadyPresent) {
        country.currencies.push({
          code: row.currency_code,
          name: row.currency_name,
          symbol: row.currency_symbol
        });
      }
    }

    if (row.preview_destination_code) {
      const alreadyPresent = country.preview.some(
        (preview) => preview.destinationCode === row.preview_destination_code
      );

      if (!alreadyPresent) {
        country.preview.push({
          destinationCode: row.preview_destination_code,
          status: row.preview_status
        });
      }
    }
  }

  return [...grouped.values()]
    .map((country) => ({
      ...country,
      mobilitySummary: countPreviewStatuses(country.preview)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function queryCountryRows(whereClause = "", parameters = {}) {
  const database = getDatabase();

  return database
    .prepare(`
      SELECT
        c.code,
        c.name,
        c.official_name,
        c.flag,
        c.region,
        c.subregion,
        c.capital,
        c.population,
        c.area,
        c.lat,
        c.lng,
        c.landlocked,
        c.passport_strength,
        c.metadata_source,
        cl.language_code,
        cl.name AS language_name,
        cc.currency_code,
        cc.name AS currency_name,
        cc.symbol AS currency_symbol,
        pp.destination_code AS preview_destination_code,
        pp.status AS preview_status
      FROM countries c
      LEFT JOIN country_languages cl ON cl.country_code = c.code
      LEFT JOIN country_currencies cc ON cc.country_code = c.code
      LEFT JOIN passport_previews pp ON pp.origin_code = c.code
      ${whereClause}
      ORDER BY c.name, cl.language_code, cc.currency_code, pp.destination_code
    `)
    .all(parameters);
}

export function listCountries() {
  return shapeCountryRows(queryCountryRows());
}

export function getCountry(code) {
  const countries = shapeCountryRows(
    queryCountryRows("WHERE c.code = :code", { code })
  );

  return countries[0];
}

function getExactVisaRecord(originCode, destinationCode) {
  const database = getDatabase();

  return database
    .prepare(`
      SELECT
        tourism_allowed,
        tourism_requirement_code,
        tourism_max_stay_days,
        tourism_note,
        study_path_exists,
        work_path_exists,
        source_url,
        confidence,
        last_checked
      FROM visa_requirements
      WHERE origin_code = ? AND destination_code = ?
    `)
    .get(originCode, destinationCode);
}

function getPreviewStatus(originCode, destinationCode) {
  const database = getDatabase();
  const row = database
    .prepare(`
      SELECT status
      FROM passport_previews
      WHERE origin_code = ? AND destination_code = ?
    `)
    .get(originCode, destinationCode);

  return row?.status || null;
}

function shapeVisaRecord(record) {
  return {
    tourism: {
      allowed: record.tourism_allowed,
      requirementCode: record.tourism_requirement_code,
      maxStayDays: record.tourism_max_stay_days,
      note: record.tourism_note
    },
    study: {
      pathExists: record.study_path_exists
    },
    work: {
      pathExists: record.work_path_exists
    },
    sourceUrl: record.source_url,
    confidence: record.confidence,
    lastChecked: record.last_checked
  };
}

export function getVisaRequirement(originCode, destinationCode) {
  const origin = getCountry(originCode);
  const destination = getCountry(destinationCode);

  if (!origin || !destination) {
    return null;
  }

  if (originCode === destinationCode) {
    const selfRecord = {
      tourism: {
        allowed: "yes",
        requirementCode: "Visa-free",
        maxStayDays: null,
        note: "Domestic travel does not require a visa."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.iata.org/",
      confidence: "high",
      lastChecked: getDatasetUpdatedAt()
    };

    return {
      origin,
      destination,
      requirement: buildRequirement(selfRecord, origin, destination, "self")
    };
  }

  const exactMatch = getExactVisaRecord(originCode, destinationCode);
  if (exactMatch) {
    return {
      origin,
      destination,
      requirement: buildRequirement(
        shapeVisaRecord(exactMatch),
        origin,
        destination,
        "matrix"
      )
    };
  }

  const previewStatus = getPreviewStatus(originCode, destinationCode);
  if (previewStatus) {
    return {
      origin,
      destination,
      requirement: buildRequirement(
        buildFallbackRouteRecord(previewStatus),
        origin,
        destination,
        "preview"
      )
    };
  }

  return {
    origin,
    destination,
    requirement: buildRequirement(
      buildFallbackRouteRecord("unknown"),
      origin,
      destination,
      "fallback"
    )
  };
}
