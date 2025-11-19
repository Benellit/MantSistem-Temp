// functions/index.js
import * as functions from "firebase-functions/v1";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { sendExpoPush } from "./src/sendExpoPush.js";

// Inicializar Admin SDK una sola vez
initializeApp();
const db = getFirestore();

/**
 * Extrae el UID desde un valor que puede ser:
 * - referencia a /USUARIO/{uid}
 * - string con el path "/USUARIO/uid"
 * - string directamente con el uid
 */
function getUidFromUserField(value) {
  if (!value) return null;

  // DocumentReference
  if (typeof value === "object" && value.id) {
    return value.id;
  }

  // String: puede ser "/USUARIO/uid" o solo "uid"
  if (typeof value === "string") {
    const parts = value.split("/");
    return parts[parts.length - 1];
  }

  return null;
}

/**
 * Devuelve los tokens de notificación de un usuario (campo expoPushToken).
 * Soporta string o array de strings.
 */
async function getUserPushTokens(uid) {
  if (!uid) return [];

  const snap = await db.collection("USUARIO").doc(uid).get();
  if (!snap.exists) {
    logger.warn("User not found when trying to get push tokens", { uid });
    return [];
  }

  const data = snap.data() || {};
  const tokenField = data.expoPushToken;

  if (!tokenField) return [];

  if (Array.isArray(tokenField)) return tokenField;
  if (typeof tokenField === "string") return [tokenField];

  return [];
}

/**
 * Obtiene todos los UIDs de técnicos asignados a una tarea,
 * leyendo la subcolección Tecnicos/{doc}.IDUsuario
 */
async function getTecnicosUidsForTask(taskRef) {
  const tecnicosRef = taskRef.collection("Tecnicos");
  const snap = await tecnicosRef.get();
  const uids = [];

  snap.forEach((doc) => {
    const data = doc.data() || {};
    const uid = getUidFromUserField(data.IDUsuario);
    if (uid) uids.push(uid);
  });

  return uids;
}

/**
 * Envía una notificación a todos los técnicos asignados a una tarea.
 */
async function notifyTecnicosForTask(taskRef, notification, extraData = {}) {
  const uids = await getTecnicosUidsForTask(taskRef);
  if (uids.length === 0) {
    logger.debug("No tecnicos for task", { path: taskRef.path });
    return;
  }

  // Juntar todos los tokens de todos los técnicos
  const tokensSet = new Set();
  for (const uid of uids) {
    const tokens = await getUserPushTokens(uid);
    tokens.forEach((t) => tokensSet.add(t));
  }

  const tokens = Array.from(tokensSet);
  if (tokens.length === 0) {
    logger.debug("Tecnicos have no tokens", { uids });
    return;
  }

  await sendExpoPush(tokens, {
    title: notification.title,
    body: notification.body,
    data: { ...extraData },
  });
}

/**
 * Envía una notificación a un único usuario (gestor, creador, etc.)
 */
async function notifySingleUser(uid, notification, extraData = {}) {
  const tokens = await getUserPushTokens(uid);
  if (!tokens || tokens.length === 0) {
    logger.debug("User has no tokens", { uid });
    return;
  }

  await sendExpoPush(tokens, {
    title: notification.title,
    body: notification.body,
    data: { ...extraData },
  });
}

/* -------------------------------------------------------------------------- */
/*  N1 – Nueva tarea asignada (al crear documento en subcolección Tecnicos)   */
/* -------------------------------------------------------------------------- */

// Para tareas simples: TAREA/{tareaId}/Tecnicos/{tecnicoDocId}
export const onTecnicoAsignadoEnTareaSimple = functions.firestore
  .document("TAREA/{tareaId}/Tecnicos/{tecnicoDocId}")
  .onCreate(async (snap, context) => {
    const { tareaId } = context.params;
    const tecnicoData = snap.data() || {};
    const taskRef = db.collection("TAREA").doc(tareaId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      logger.warn("Task not found for assignment (simple)", { tareaId });
      return;
    }

    const task = taskSnap.data() || {};
    const nombreTarea = task.nombre || "Tarea";
    const extraData = {
      taskId: tareaId,
      collection: "TAREA",
    };

    await notifyTecnicosForTask(
      taskRef,
      {
        title: "Nueva tarea asignada",
        body: `${nombreTarea} ha sido asignada a ti.`,
      },
      extraData
    );
  });

// Para tareas repetitivas / jerárquicas: TAREA_REPETITIVAS/{tareaId}/Tecnicos/{tecnicoDocId}
export const onTecnicoAsignadoEnTareaRepetitiva = functions.firestore
  .document("TAREA_REPETITIVAS/{tareaId}/Tecnicos/{tecnicoDocId}")
  .onCreate(async (snap, context) => {
    const { tareaId } = context.params;
    const tecnicoData = snap.data() || {};
    const taskRef = db.collection("TAREA_REPETITIVAS").doc(tareaId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      logger.warn("Task not found for assignment (repetitiva)", { tareaId });
      return;
    }

    const task = taskSnap.data() || {};
    const nombreTarea = task.nombre || "Tarea";
    const extraData = {
      taskId: tareaId,
      collection: "TAREA_REPETITIVAS",
    };

    await notifyTecnicosForTask(
      taskRef,
      {
        title: "Nueva tarea asignada",
        body: `${nombreTarea} ha sido asignada a ti.`,
      },
      extraData
    );
  });

/* -------------------------------------------------------------------------- */
/*  N2 / N3 / N? – Cambios de estado y actualización de datos                 */
/* -------------------------------------------------------------------------- */

const CAMPOS_IMPORTANTES_TAREA = [
  "nombre",
  "descripcion",
  "fechaEntrega",
  "prioridad",
  "frecuencia",
  "IDSupervisor", // ejemplo, ajusta según tu modelo
];

/**
 * Revisa si cambiaron campos importantes (excluyendo estado).
 */
function haveImportantFieldsChanged(before, after) {
  for (const field of CAMPOS_IMPORTANTES_TAREA) {
    const vBefore = before[field];
    const vAfter = after[field];

    const normalizedBefore =
      vBefore instanceof Date ? vBefore.getTime() : JSON.stringify(vBefore);
    const normalizedAfter =
      vAfter instanceof Date ? vAfter.getTime() : JSON.stringify(vAfter);

    if (normalizedBefore !== normalizedAfter) {
      return true;
    }
  }
  return false;
}

async function handleTaskStatusChange(change, context, collectionName) {
  const before = change.before.data() || {};
  const after = change.after.data() || {};
  const taskId = context.params.tareaId;

  const estadoAntes = (before.estado || "").toLowerCase();
  const estadoDespues = (after.estado || "").toLowerCase();

  const taskRef = db.collection(collectionName).doc(taskId);

  /* -------- N3 – Tarea rechazada → técnicos ------------------------------ */
  if (estadoAntes !== "rechazada" && estadoDespues === "rechazada") {
    const nombreTarea = after.nombre || "Tarea";

    await notifyTecnicosForTask(
      taskRef,
      {
        title: "Tarea rechazada",
        body: `Se rechazó la tarea ${nombreTarea}. Revisa los comentarios.`,
      },
      { taskId, collection: collectionName, tipo: "rechazada" }
    );

    // En este caso paramos aquí
    return;
  }

  /* -------- N2 – Tarea completada → gestor ------------------------------- */
  if (estadoAntes !== "completada" && estadoDespues === "completada") {
    const nombreTarea = after.nombre || "Tarea";
    const creadorField = after.IDCreador;
    const uidCreador = getUidFromUserField(creadorField);

    if (!uidCreador) {
      logger.warn("IDCreador not found on completed task", {
        collection: collectionName,
        taskId,
      });
      return;
    }

    // En el cuerpo usamos el nombre del técnico si lo conocemos
    let nombreTecnico = null;
    try {
      const tecnicosUids = await getTecnicosUidsForTask(taskRef);
      if (tecnicosUids.length > 0) {
        const snapTec = await db
          .collection("USUARIO")
          .doc(tecnicosUids[0])
          .get();
        const dataTec = snapTec.data() || {};
        nombreTecnico = dataTec.nombre || dataTec.displayName || null;
      }
    } catch (e) {
      logger.warn("Error getting tecnico for completed task", { e });
    }

    const body = nombreTecnico
      ? `${nombreTecnico} completó la tarea ${nombreTarea}.`
      : `Se completó la tarea ${nombreTarea}.`;

    await notifySingleUser(
      uidCreador,
      {
        title: "Tarea completada",
        body,
      },
      { taskId, collection: collectionName, tipo: "completada" }
    );

    // No retornamos aquí porque puede interesar también la noti de "actualización"
    // si en el mismo cambio el admin modificó otros campos importantes.
  }

  /* -------- Nueva notificación: Tarea actualizada → técnicos ------------- */

  // Solo revisamos campos importantes (no estado)
  if (haveImportantFieldsChanged(before, after)) {
    const nombreTarea = after.nombre || "Tarea";

    await notifyTecnicosForTask(
      taskRef,
      {
        title: "Tarea actualizada",
        body: `Se actualizaron los detalles de la tarea ${nombreTarea}.`,
      },
      { taskId, collection: collectionName, tipo: "actualizacion" }
    );
  }
}

// Para TAREA (simples)
export const onTareaSimpleUpdated = functions.firestore
  .document("TAREA/{tareaId}")
  .onUpdate(async (change, context) => {
    await handleTaskStatusChange(change, context, "TAREA");
  });

// Para TAREA_REPETITIVAS (plantillas / rutas / jerárquicas)
export const onTareaRepetitivaUpdated = functions.firestore
  .document("TAREA_REPETITIVAS/{tareaId}")
  .onUpdate(async (change, context) => {
    await handleTaskStatusChange(change, context, "TAREA_REPETITIVAS");
  });

/* -------------------------------------------------------------------------- */
/*  N4 – Nuevo reporte en tarea → gestor                                      */
/* -------------------------------------------------------------------------- */

async function handleNuevoReporte(snap, context, collectionName) {
  const { tareaId, reporteId } = context.params;
  const reporteData = snap.data() || {};
  const taskRef = db.collection(collectionName).doc(tareaId);
  const taskSnap = await taskRef.get();

  if (!taskSnap.exists) {
    logger.warn("Task not found for new report", { collectionName, tareaId });
    return;
  }

  const task = taskSnap.data() || {};
  const nombreTarea = task.nombre || "Tarea";
  const creadorField = task.IDCreador;
  const uidCreador = getUidFromUserField(creadorField);

  if (!uidCreador) {
    logger.warn("IDCreador not found on task with new report", {
      collectionName,
      tareaId,
    });
    return;
  }

  await notifySingleUser(
    uidCreador,
    {
      title: "Nuevo reporte registrado",
      body: `Se añadió un reporte en la tarea ${nombreTarea}.`,
    },
    {
      taskId: tareaId,
      collection: collectionName,
      reporteId,
      tipo: "nuevo_reporte",
    }
  );
}

// Reporte en tarea simple
export const onReporteEnTareaSimple = functions.firestore
  .document("TAREA/{tareaId}/Reportes/{reporteId}")
  .onCreate(async (snap, context) => {
    await handleNuevoReporte(snap, context, "TAREA");
  });

// Reporte en tarea repetitiva / jerárquica
export const onReporteEnTareaRepetitiva = functions.firestore
  .document("TAREA_REPETITIVAS/{tareaId}/Reportes/{reporteId}")
  .onCreate(async (snap, context) => {
    await handleNuevoReporte(snap, context, "TAREA_REPETITIVAS");
  });
