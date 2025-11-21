// src/lib/registerPushTokenForUser.js
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseApp";

export async function registerPushTokenForUser(uid) {
  if (!uid) return;

  // 🟡 1) Si estamos en Expo Go, no intentamos registrar token
  if (Constants.appOwnership === "expo") {
    console.log(
      "[Push] Ejecutando en Expo Go: se omite registro de token (no hay push remoto en SDK 53)."
    );
    return;
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    let finalStatus = permission.status;

    if (finalStatus !== "granted") {
      const request = await Notifications.requestPermissionsAsync();
      finalStatus = request.status;
    }

    if (finalStatus !== "granted") {
      console.log("Permisos de notificación no concedidos");
      return;
    }

    // 🟡 2) Intentar obtener projectId desde la config de EAS / app
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    console.log("projectId para notificaciones:", projectId);


    if (!projectId) {
      console.log(
        '[Push] No se encontró "projectId". En Expo Go esto es normal; en un development build sí debería existir.'
      );
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const expoPushToken = tokenResponse?.data;

    if (!expoPushToken) {
      console.log("No se obtuvo un token de notificación");
      return;
    }

    await updateDoc(doc(db, "USUARIO", uid), { expoPushToken });
    console.log("[Push] Token registrado en Firestore:", expoPushToken);
  } catch (error) {
    console.log("Error registrando el token de notificaciones", error);
  }
}
