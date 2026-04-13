const palette = {
  base: "#27445d",
  baseStroke: "rgba(255,255,255,0.18)",
  hover: "#7dd3fc",
  origin: "#3b82f6",
  destination: "#ef4444",
  visaFree: "#22c55e",
  visaOnArrival: "#f59e0b",
  eVisa: "#fbbf24",
  visaRequired: "#fb7185"
};

export function statusPriority(status) {
  if (status === "Visa-free") {
    return 3;
  }

  if (status === "Visa on arrival" || status === "eVisa") {
    return 2;
  }

  return 1;
}

export function getStatusLabel(status) {
  return status || "Visa required";
}

export function getStatusAppearance(status, originCode, destinationCode, geoCode) {
  if (originCode && geoCode === originCode) {
    return {
      fill: palette.origin,
      hoverFill: "#60a5fa",
      stroke: "#dbeafe",
      strokeWidth: 1.3
    };
  }

  if (destinationCode && geoCode === destinationCode) {
    return {
      fill: palette.destination,
      hoverFill: "#f87171",
      stroke: "#fee2e2",
      strokeWidth: 1.3
    };
  }

  if (status === "Visa-free") {
    return {
      fill: "rgba(34,197,94,0.8)",
      hoverFill: "#4ade80",
      stroke: "rgba(187,247,208,0.7)",
      strokeWidth: 0.6
    };
  }

  if (status === "Visa on arrival" || status === "ETA" || status === "eVisa") {
    return {
      fill:
        status === "eVisa"
          ? "rgba(251,191,36,0.8)"
          : status === "ETA"
            ? "rgba(245, 208, 84, 0.8)"
            : "rgba(245,158,11,0.8)",
      hoverFill: "#fbbf24",
      stroke: "rgba(253,230,138,0.7)",
      strokeWidth: 0.6
    };
  }

  if (status === "No admission") {
    return {
      fill: "rgba(127, 29, 29, 0.82)",
      hoverFill: "#dc2626",
      stroke: "rgba(254, 202, 202, 0.7)",
      strokeWidth: 0.6
    };
  }

  if (status === "Visa required") {
    return {
      fill: "rgba(244,63,94,0.72)",
      hoverFill: "#fb7185",
      stroke: "rgba(254,205,211,0.7)",
      strokeWidth: 0.6
    };
  }

  return {
    fill: palette.base,
    hoverFill: palette.hover,
    stroke: palette.baseStroke,
    strokeWidth: 0.6
  };
}

export function getStrengthSummary(originCode, countries) {
  const selected = countries.find((country) => country.code === originCode);

  if (!selected) {
    return {
      label: "Choose a passport",
      items: [
        { label: "Visa-free", value: "0" },
        { label: "Arrival / eVisa", value: "0" },
        { label: "Visa required", value: "0" }
      ]
    };
  }

  const totals = selected.preview.reduce(
    (accumulator, item) => {
      if (item.status === "Visa-free") {
        accumulator.visaFree += 1;
      } else if (
        item.status === "Visa on arrival" ||
        item.status === "ETA" ||
        item.status === "eVisa"
      ) {
        accumulator.arrival += 1;
      } else {
        accumulator.required += 1;
      }

      return accumulator;
    },
    { visaFree: 0, arrival: 0, required: 0 }
  );

  return {
    label: `${selected.passportStrength} access`,
    items: [
      { label: "Visa-free", value: String(totals.visaFree) },
      { label: "Arrival / eVisa", value: String(totals.arrival) },
      { label: "Visa required", value: String(totals.required) }
    ]
  };
}
