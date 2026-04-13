export async function getApiErrorMessage(response, fallbackMessage) {
  try {
    const payload = await response.json();

    if (payload?.error) {
      return payload.error;
    }
  } catch {
    // Ignore invalid JSON and fall back to the default message.
  }

  return fallbackMessage;
}
