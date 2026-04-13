export function formatPopulation(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}

export function formatArea(value) {
  return `${new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0)} km²`;
}

export function formatList(values, emptyLabel = "Not listed") {
  if (!values?.length) {
    return emptyLabel;
  }

  return values.join(", ");
}

export function getStatusTone(status) {
  if (status === "Visa-free") {
    return "rgba(52, 211, 153, 0.86)";
  }

  if (status === "Visa on arrival" || status === "ETA" || status === "eVisa") {
    return "rgba(250, 204, 21, 0.86)";
  }

  if (status === "No admission") {
    return "rgba(185, 28, 28, 0.9)";
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

export function humanizeDecision(value) {
  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  return "Unknown";
}
