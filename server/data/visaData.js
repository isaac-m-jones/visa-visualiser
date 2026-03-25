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

export const visaMatrix = {
  NZL: {
    JPN: {
      status: "Visa-free",
      duration: "90 days",
      conditions:
        "Tourism and short business visits are generally allowed without a visa. Proof of onward travel and sufficient funds may be requested.",
      officialSource: "https://www.mofa.go.jp/j_info/visit/visa/",
      lastUpdated: "March 25, 2026"
    },
    USA: {
      status: "eVisa",
      duration: "90 days",
      conditions:
        "Travel typically requires an approved ESTA before boarding under the Visa Waiver Program.",
      officialSource: "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html",
      lastUpdated: "March 25, 2026"
    },
    IND: {
      status: "eVisa",
      duration: "30 days",
      conditions:
        "Eligible travelers can usually apply online for a short-stay eVisa before departure.",
      officialSource: "https://indianvisaonline.gov.in/",
      lastUpdated: "March 25, 2026"
    }
  },
  JPN: {
    NZL: {
      status: "Visa-free",
      duration: "90 days",
      conditions:
        "Short tourist visits are generally visa-free. Border officers can still ask for onward tickets and accommodation details.",
      officialSource: "https://www.immigration.govt.nz/",
      lastUpdated: "March 25, 2026"
    },
    BRA: {
      status: "Visa-free",
      duration: "90 days",
      conditions:
        "Tourism and business entry are commonly visa-free for short stays, subject to current bilateral arrangements.",
      officialSource: "https://www.gov.br/mre/en",
      lastUpdated: "March 25, 2026"
    }
  },
  USA: {
    CAN: {
      status: "Visa-free",
      duration: "180 days",
      conditions:
        "Most short visits do not require a visa, though border agents may request travel details and proof of ties to home.",
      officialSource: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html",
      lastUpdated: "March 25, 2026"
    },
    IND: {
      status: "eVisa",
      duration: "30 days",
      conditions:
        "Eligible applicants can obtain an eVisa online before travel for limited tourism or business use.",
      officialSource: "https://indianvisaonline.gov.in/",
      lastUpdated: "March 25, 2026"
    }
  },
  IND: {
    IDN: {
      status: "Visa on arrival",
      duration: "30 days",
      conditions:
        "Travelers can generally obtain a visa on arrival at designated Indonesian entry points.",
      officialSource: "https://www.imigrasi.go.id/en/",
      lastUpdated: "March 25, 2026"
    },
    THA: {
      status: "Visa-free",
      duration: "30 days",
      conditions:
        "Tourism entry is typically visa-free for a short stay, depending on current temporary measures and entry method.",
      officialSource: "https://www.thaievisa.go.th/",
      lastUpdated: "March 25, 2026"
    }
  },
  BRA: {
    EGY: {
      status: "Visa on arrival",
      duration: "30 days",
      conditions:
        "A visa on arrival may be available at major airports. Entry requirements can differ by airline and route.",
      officialSource: "https://www.visa2egypt.gov.eg/",
      lastUpdated: "March 25, 2026"
    }
  },
  NGA: {
    GHA: {
      status: "Visa-free",
      duration: "90 days",
      conditions:
        "ECOWAS free movement rules usually allow short stays without a visa for member-state citizens.",
      officialSource: "https://www.ghanaimmigration.org/",
      lastUpdated: "March 25, 2026"
    }
  },
  ARE: {
    IND: {
      status: "Visa-free",
      duration: "14 days",
      conditions:
        "Entry policies can depend on residency, passport validity, and bilateral arrangements. Travelers should verify before booking.",
      officialSource: "https://www.mofa.gov.ae/en",
      lastUpdated: "March 25, 2026"
    }
  },
  DEU: {
    USA: {
      status: "Visa-free",
      duration: "90 days",
      conditions:
        "Short visits normally travel under the Visa Waiver Program with ESTA approval before departure.",
      officialSource: "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html",
      lastUpdated: "March 25, 2026"
    }
  }
};
