export const sampleCountryMetadata = [
  {
    code: "NZL",
    name: "New Zealand",
    passportStrength: "High",
    preview: [
      { destinationCode: "JPN", status: "Visa-free" },
      { destinationCode: "GBR", status: "Visa-free" },
      { destinationCode: "USA", status: "eVisa" },
      { destinationCode: "AUS", status: "Visa-free" },
      { destinationCode: "CAN", status: "eVisa" },
      { destinationCode: "IND", status: "eVisa" },
      { destinationCode: "VNM", status: "eVisa" },
      { destinationCode: "ZAF", status: "Visa-free" }
    ]
  },
  {
    code: "JPN",
    name: "Japan",
    passportStrength: "Very high",
    preview: [
      { destinationCode: "NZL", status: "Visa-free" },
      { destinationCode: "USA", status: "Visa-free" },
      { destinationCode: "AUS", status: "eVisa" },
      { destinationCode: "BRA", status: "Visa-free" },
      { destinationCode: "IND", status: "eVisa" },
      { destinationCode: "DEU", status: "Visa-free" }
    ]
  },
  {
    code: "USA",
    name: "United States of America",
    passportStrength: "High",
    preview: [
      { destinationCode: "CAN", status: "Visa-free" },
      { destinationCode: "MEX", status: "Visa-free" },
      { destinationCode: "BRA", status: "Visa-free" },
      { destinationCode: "CHN", status: "Visa required" },
      { destinationCode: "IND", status: "eVisa" },
      { destinationCode: "ZAF", status: "Visa-free" }
    ]
  },
  {
    code: "IND",
    name: "India",
    passportStrength: "Growing",
    preview: [
      { destinationCode: "NPL", status: "Visa-free" },
      { destinationCode: "IDN", status: "Visa on arrival" },
      { destinationCode: "LKA", status: "eVisa" },
      { destinationCode: "JPN", status: "Visa required" },
      { destinationCode: "THA", status: "Visa-free" },
      { destinationCode: "KEN", status: "eVisa" }
    ]
  },
  {
    code: "BRA",
    name: "Brazil",
    passportStrength: "High",
    preview: [
      { destinationCode: "ARG", status: "Visa-free" },
      { destinationCode: "GBR", status: "Visa-free" },
      { destinationCode: "AUS", status: "eVisa" },
      { destinationCode: "EGY", status: "Visa on arrival" },
      { destinationCode: "CHN", status: "Visa required" }
    ]
  },
  {
    code: "NGA",
    name: "Nigeria",
    passportStrength: "Limited",
    preview: [
      { destinationCode: "GHA", status: "Visa-free" },
      { destinationCode: "KEN", status: "eVisa" },
      { destinationCode: "ARE", status: "Visa required" },
      { destinationCode: "ZAF", status: "Visa required" },
      { destinationCode: "RWA", status: "Visa on arrival" }
    ]
  },
  {
    code: "ARE",
    name: "United Arab Emirates",
    passportStrength: "Very high",
    preview: [
      { destinationCode: "SAU", status: "Visa-free" },
      { destinationCode: "GBR", status: "Visa-free" },
      { destinationCode: "AUS", status: "eVisa" },
      { destinationCode: "IND", status: "Visa-free" },
      { destinationCode: "EGY", status: "Visa on arrival" }
    ]
  },
  {
    code: "DEU",
    name: "Germany",
    passportStrength: "Very high",
    preview: [
      { destinationCode: "FRA", status: "Visa-free" },
      { destinationCode: "USA", status: "Visa-free" },
      { destinationCode: "EGY", status: "Visa on arrival" },
      { destinationCode: "IND", status: "eVisa" },
      { destinationCode: "CHN", status: "Visa required" }
    ]
  }
];

export const simplifiedRouteMatrix = {
  NZL: {
    JPN: {
      tourism: {
        allowed: "yes",
        maxStayDays: 90,
        note: "Short tourism and business visits are generally allowed without a visa."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.mofa.go.jp/j_info/visit/visa/",
      confidence: "high",
      lastChecked: "2026-03-25"
    },
    USA: {
      tourism: {
        allowed: "yes",
        maxStayDays: 90,
        note: "Travel generally requires ESTA approval before boarding."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl:
        "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html",
      confidence: "high",
      lastChecked: "2026-03-25"
    },
    IND: {
      tourism: {
        allowed: "yes",
        maxStayDays: 30,
        note: "Short-stay tourism is commonly available via eVisa."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://indianvisaonline.gov.in/",
      confidence: "medium",
      lastChecked: "2026-03-25"
    }
  },
  JPN: {
    NZL: {
      tourism: {
        allowed: "yes",
        maxStayDays: 90,
        note: "Short tourist visits are generally visa-free."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.immigration.govt.nz/",
      confidence: "high",
      lastChecked: "2026-03-25"
    },
    BRA: {
      tourism: {
        allowed: "yes",
        maxStayDays: 90,
        note: "Tourism and short business entry are commonly visa-free."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.gov.br/mre/en",
      confidence: "medium",
      lastChecked: "2026-03-25"
    }
  },
  USA: {
    CAN: {
      tourism: {
        allowed: "yes",
        maxStayDays: 180,
        note: "Most short visits do not require a visa."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl:
        "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html",
      confidence: "high",
      lastChecked: "2026-03-25"
    },
    IND: {
      tourism: {
        allowed: "yes",
        maxStayDays: 30,
        note: "Eligible applicants can commonly obtain an eVisa online."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://indianvisaonline.gov.in/",
      confidence: "medium",
      lastChecked: "2026-03-25"
    }
  },
  IND: {
    IDN: {
      tourism: {
        allowed: "yes",
        maxStayDays: 30,
        note: "Travelers can generally enter on visa on arrival for short tourism."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.imigrasi.go.id/en/",
      confidence: "medium",
      lastChecked: "2026-03-25"
    },
    THA: {
      tourism: {
        allowed: "yes",
        maxStayDays: 30,
        note: "Tourism entry is typically visa-free for a short stay."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.thaievisa.go.th/",
      confidence: "medium",
      lastChecked: "2026-03-25"
    }
  },
  BRA: {
    EGY: {
      tourism: {
        allowed: "yes",
        maxStayDays: 30,
        note: "A visa on arrival may be available at major airports."
      },
      study: {
        pathExists: "unknown"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.visa2egypt.gov.eg/",
      confidence: "medium",
      lastChecked: "2026-03-25"
    }
  },
  NGA: {
    GHA: {
      tourism: {
        allowed: "yes",
        maxStayDays: 90,
        note: "ECOWAS free movement rules usually allow short stays without a visa."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.ghanaimmigration.org/",
      confidence: "medium",
      lastChecked: "2026-03-25"
    }
  },
  ARE: {
    IND: {
      tourism: {
        allowed: "yes",
        maxStayDays: 14,
        note: "Entry policies vary, but short tourism is commonly available."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl: "https://www.mofa.gov.ae/en",
      confidence: "medium",
      lastChecked: "2026-03-25"
    }
  },
  DEU: {
    USA: {
      tourism: {
        allowed: "yes",
        maxStayDays: 90,
        note: "Short visits typically travel under the Visa Waiver Program with ESTA."
      },
      study: {
        pathExists: "yes"
      },
      work: {
        pathExists: "yes"
      },
      sourceUrl:
        "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html",
      confidence: "high",
      lastChecked: "2026-03-25"
    }
  }
};
