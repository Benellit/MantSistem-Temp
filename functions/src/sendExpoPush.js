import { logger } from "firebase-functions";

/**
 * Envía notificaciones push usando el servicio de Expo.
 * @param {string[]|string} tokens - Uno o varios Expo push tokens.
 * @param {{
 *   title: string,
 *   body: string,
 *   data?: any
 * }} notification
 */
export async function sendExpoPush(tokens, notification) {
  // Normalizar a array
  const arr = Array.isArray(tokens) ? tokens : [tokens];
  const validTokens = arr.filter(
    (t) => typeof t === "string" && t.startsWith("ExponentPushToken")
  );

  if (validTokens.length === 0) {
    logger.debug("No valid Expo tokens to send", { tokens: arr });
    return;
  }

  const messages = validTokens.map((to) => ({
    to,
    sound: "default",
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
  }));

  try {
    // En Cloud Functions (Node 18) `fetch` ya es global; no hace falta node-fetch.
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const json = await res.json().catch(() => null);
    logger.info("Expo push response", { status: res.status, json });
  } catch (err) {
    logger.error("Error sending Expo push", { error: err });
  }
}