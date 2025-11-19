"use client"

import AntDesign from "@expo/vector-icons/AntDesign"
import Feather from "@expo/vector-icons/Feather"
import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { LinearGradient } from "expo-linear-gradient"
import { collection, collectionGroup, doc, getDoc, getDocs, getFirestore, query, where } from "firebase/firestore"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import appFirebase from "../../credenciales/Credenciales"
import { useAuth } from "../login/AuthContext"

export default function DashboardTecnico({ navigation }) {
  const db = getFirestore(appFirebase)
  const { profile } = useAuth()
  const screenWidth = Dimensions.get("window").width
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    totalTareas: 0,
    tareasEnProceso: 0,
    tareasCompletadas: 0,
    tareasPendientes: 0,
    tareasNoEntregadas: 0,
    tareasRevisadas: 0,
    tareasProximas: [],
    tareasAtrasadas: [],
    actividadReciente: [],
    totalReportes: 0,
    totalFotografias: 0,
    totalSubtareas: 0,
  })

  const onRefresh = () => {
    setRefreshing(true)
    getDashboardData()
  }

  useEffect(() => {
    getDashboardData()
  }, [])

  const getDashboardData = async () => {
    try {
      setLoading(true)
      const userRef = doc(db, "USUARIO", profile.id)
      const q = query(collectionGroup(db, "Tecnicos"), where("IDUsuario", "==", userRef))
      const response = await getDocs(q)

      const tareasList = await Promise.all(
        response.docs.map(async (docSnap) => {
          const tareaRef = docSnap.ref.parent.parent
          const tareaSnap = await getDoc(tareaRef)
          return { id: tareaRef.id, ...tareaSnap.data() }
        }),
      )

      // Contadores por estado
      const totalTareas = tareasList.length
      const tareasEnProceso = tareasList.filter((t) => t.estado === "En Proceso").length
      const tareasCompletadas = tareasList.filter((t) => t.estado === "Completada").length
      const tareasPendientes = tareasList.filter((t) => t.estado === "Pendiente").length
      const tareasNoEntregadas = tareasList.filter((t) => t.estado === "No Entregada").length
      const tareasRevisadas = tareasList.filter((t) => t.estado === "Revisada").length

      // Obtener datos adicionales de cada tarea
      const tareasConDetalles = await Promise.all(
        tareasList.map(async (tarea) => {
          const tareaRef = doc(db, "TAREA", tarea.id)

          const [subtareasSnap, repSnap, eviSnap] = await Promise.all([
            getDocs(collection(tareaRef, "Subtareas")),
            getDocs(collection(tareaRef, "Reportes")),
            getDocs(collection(tareaRef, "Evidencias")),
          ])

          let totalFotos = 0
          eviSnap.forEach((doc) => {
            const data = doc.data()
            if (Array.isArray(data.fotografias)) {
              totalFotos += data.fotografias.length
            }
          })

          let totalReportesSubtareas = 0
          for (const subtareaDoc of subtareasSnap.docs) {
            const subtareaRef = subtareaDoc.ref
            const [reportesSubtareaSnap, evidenciasSubtareaSnap] = await Promise.all([
              getDocs(collection(subtareaRef, "Reportes")),
              getDocs(collection(subtareaRef, "Evidencias")),
            ])

            totalReportesSubtareas += reportesSubtareaSnap.size

            evidenciasSubtareaSnap.forEach((evidenciaDoc) => {
              const evidenciaData = evidenciaDoc.data()
              if (Array.isArray(evidenciaData.fotografias)) {
                totalFotos += evidenciaData.fotografias.length
              }
            })
          }

          return {
            ...tarea,
            totalReportes: repSnap.size + totalReportesSubtareas,
            totalFotografias: totalFotos,
            totalSubtareas: subtareasSnap.size,
          }
        }),
      )

      // Tareas próximas a vencer (top 5, ordenadas por fecha de entrega)
      const hoy = new Date()
      const tareasProximas = tareasConDetalles
        .filter((t) => {
          if (!t.fechaEntrega) return false
          const fechaEntrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega)
          return fechaEntrega >= hoy && t.estado !== "Completada" && t.estado !== "Revisada"
        })
        .sort((a, b) => {
          const fechaA = a.fechaEntrega.toDate ? a.fechaEntrega.toDate() : new Date(a.fechaEntrega)
          const fechaB = b.fechaEntrega.toDate ? b.fechaEntrega.toDate() : new Date(b.fechaEntrega)
          return fechaA - fechaB
        })
        .slice(0, 5)

      // Tareas atrasadas
      const tareasAtrasadas = tareasConDetalles.filter((t) => {
        if (!t.fechaEntrega) return false
        const fechaEntrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega)
        return fechaEntrega < hoy && t.estado !== "Completada" && t.estado !== "Revisada"
      })

      // Actividad reciente (últimas 5 tareas modificadas o completadas)
      const actividadReciente = tareasConDetalles
        .filter((t) => t.fechaCreacion)
        .sort((a, b) => {
          const fechaA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0
          const fechaB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0
          return fechaB - fechaA
        })
        .slice(0, 5)

      // KPIs totales
      const totalReportes = tareasConDetalles.reduce((sum, t) => sum + (t.totalReportes || 0), 0)
      const totalFotografias = tareasConDetalles.reduce((sum, t) => sum + (t.totalFotografias || 0), 0)
      const totalSubtareas = tareasConDetalles.reduce((sum, t) => sum + (t.totalSubtareas || 0), 0)

      setDashboardData({
        totalTareas,
        tareasEnProceso,
        tareasCompletadas,
        tareasPendientes,
        tareasNoEntregadas,
        tareasRevisadas,
        tareasProximas,
        tareasAtrasadas,
        actividadReciente,
        totalReportes,
        totalFotografias,
        totalSubtareas,
      })
    } catch (error) {
      console.error("Error obteniendo datos del dashboard:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatFecha = (fecha) => {
    if (!fecha) return ""
    let dateObj
    if (typeof fecha.toDate === "function") {
      dateObj = fecha.toDate()
    } else if (typeof fecha === "string") {
      dateObj = new Date(fecha)
    } else if (fecha instanceof Date) {
      dateObj = fecha
    } else {
      return ""
    }
    return dateObj.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getEstadoStyle = (estado) => {
    const estilos = {
      Completada: { backgroundColor: "#47A997", color: profile.modoOscuro ? "black" : "white" },
      Revisada: { backgroundColor: "#B383E2", color: profile.modoOscuro ? "black" : "white" },
      Pendiente: { backgroundColor: "#F4C54C", color: profile.modoOscuro ? "black" : "white" },
      "En Proceso": { backgroundColor: "#57A7FE", color: profile.modoOscuro ? "black" : "white" },
      "No Entregada": { backgroundColor: "#F5615C", color: profile.modoOscuro ? "black" : "white" },
    }
    return estilos[estado] || { backgroundColor: "#9E9E9E", color: profile.modoOscuro ? "black" : "white" }
  }

  const getPrioridadStyle = (prioridad) => {
    const estilos = {
      Alta: { backgroundColor: "#F5615C", color: profile.modoOscuro ? "black" : "white" },
      Media: { backgroundColor: "#F5C44C", color: profile.modoOscuro ? "black" : "white" },
      Baja: { backgroundColor: "#57A6FF", color: profile.modoOscuro ? "black" : "white" },
    }
    return estilos[prioridad] || { backgroundColor: "#9E9E9E", color: profile.modoOscuro ? "black" : "white" }
  }

  const navegarTarea = (tareaID) => {
    navigation.navigate("TareaDetails", {
      id: tareaID,
      onGoBack: () => onRefresh(),
    })
  }

  const calcularProgreso = () => {
    if (dashboardData.totalTareas === 0) return 0
    return Math.round(
      ((dashboardData.tareasCompletadas + dashboardData.tareasRevisadas) / dashboardData.totalTareas) * 100,
    )
  }

  if (loading) {
    return (
      <LinearGradient
        colors={["#87aef0", "#9c8fc4"]}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#87aef0" />
          <Text style={styles.loadingText}>Cargando dashboard...</Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={["#87aef0", "#9c8fc4"]}
      start={{ x: 0.5, y: 0.4 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <View style={profile.modoOscuro ? styles.headerOscuro : styles.headerClaro}>
          <Text style={profile.modoOscuro ? styles.saludoOscuro : styles.saludoClaro}>Dashboard</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Resumen de tareas */}
          <View style={styles.section}>
            <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
              Resumen de tus tareas
            </Text>
            <View style={styles.tarjetasGrid}>
              <View style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}>
                <Ionicons name="apps-outline" size={32} color="#87aef0" />
                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                  {dashboardData.totalTareas}
                </Text>
                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>Total</Text>
              </View>

              <View style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}>
                <Ionicons name="time-outline" size={32} color="#57A7FE" />
                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                  {dashboardData.tareasEnProceso}
                </Text>
                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>En Proceso</Text>
              </View>

              <View style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#47A997" />
                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                  {dashboardData.tareasCompletadas}
                </Text>
                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>Completadas</Text>
              </View>

              <View style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}>
                <Ionicons name="ellipse-outline" size={32} color="#F4C54C" />
                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                  {dashboardData.tareasPendientes}
                </Text>
                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>Pendientes</Text>
              </View>

              <View style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}>
                <Ionicons name="alert-circle-outline" size={32} color="#F5615C" />
                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                  {dashboardData.tareasNoEntregadas}
                </Text>
                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>
                  No Entregadas
                </Text>
              </View>

              <View style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}>
                <Ionicons name="eye-outline" size={32} color="#B383E2" />
                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                  {dashboardData.tareasRevisadas}
                </Text>
                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>Revisadas</Text>
              </View>
            </View>
          </View>

          {/* Progreso de cumplimiento */}
          <View style={styles.section}>
            <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
              Progreso de cumplimiento
            </Text>
            <View style={[styles.tarjetaProgreso, profile.modoOscuro && styles.tarjetaProgresoOscuro]}>
              <Text style={[styles.porcentajeProgreso, profile.modoOscuro && styles.porcentajeProgresoOscuro]}>
                {calcularProgreso()}%
              </Text>
              <Text style={[styles.labelProgreso, profile.modoOscuro && styles.labelProgresoOscuro]}>
                de tus tareas completadas
              </Text>
              <View style={styles.barraProgresoContainer}>
                <View
                  style={[
                    styles.barraProgreso,
                    {
                      width: `${calcularProgreso()}%`,
                      backgroundColor:
                        calcularProgreso() >= 75 ? "#47A997" : calcularProgreso() >= 50 ? "#57A7FE" : "#F4C54C",
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Tareas atrasadas */}
          {dashboardData.tareasAtrasadas.length > 0 && (
            <View style={styles.section}>
              <View style={styles.alertBanner}>
                <Ionicons name="warning" size={24} color="#F5615C" />
                <Text style={styles.alertText}>
                  Tienes {dashboardData.tareasAtrasadas.length} tarea
                  {dashboardData.tareasAtrasadas.length > 1 ? "s" : ""} atrasada
                  {dashboardData.tareasAtrasadas.length > 1 ? "s" : ""}
                </Text>
              </View>
              {dashboardData.tareasAtrasadas.slice(0, 3).map((tarea) => (
                <TouchableOpacity
                  key={tarea.id}
                  style={[styles.tarjetaTarea, profile.modoOscuro && styles.tarjetaTareaOscuro]}
                  onPress={() => navegarTarea(tarea.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tarjetaTareaHeader}>
                    <Text style={[styles.tarjetaTareaTitulo, profile.modoOscuro && styles.tarjetaTareaTituloOscuro]}>
                      {tarea.nombre}
                    </Text>
                    <View style={styles.tarjetaTareaBadges}>
                      <View
                        style={[styles.badge, { backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor }]}
                      >
                        <Text style={[styles.badgeText, { color: getPrioridadStyle(tarea.prioridad).color }]}>
                          {tarea.prioridad}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.tarjetaTareaFooter}>
                    <View style={styles.fechaContainer}>
                      <Feather name="calendar" size={16} color="#F5615C" />
                      <Text style={styles.fechaAtrasada}>{formatFecha(tarea.fechaEntrega)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Próximas entregas */}
          {dashboardData.tareasProximas.length > 0 && (
            <View style={styles.section}>
              <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                Próximas entregas
              </Text>
              {dashboardData.tareasProximas.map((tarea) => (
                <TouchableOpacity
                  key={tarea.id}
                  style={[styles.tarjetaTarea, profile.modoOscuro && styles.tarjetaTareaOscuro]}
                  onPress={() => navegarTarea(tarea.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tarjetaTareaHeader}>
                    <Text style={[styles.tarjetaTareaTitulo, profile.modoOscuro && styles.tarjetaTareaTituloOscuro]}>
                      {tarea.nombre}
                    </Text>
                    <View style={styles.tarjetaTareaBadges}>
                      <View style={[styles.badge, { backgroundColor: getEstadoStyle(tarea.estado).backgroundColor }]}>
                        <Text style={[styles.badgeText, { color: getEstadoStyle(tarea.estado).color }]}>
                          {tarea.estado}
                        </Text>
                      </View>
                      <View
                        style={[styles.badge, { backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor }]}
                      >
                        <Text style={[styles.badgeText, { color: getPrioridadStyle(tarea.prioridad).color }]}>
                          {tarea.prioridad}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.tarjetaTareaFooter}>
                    <View style={styles.fechaContainer}>
                      <Feather name="calendar" size={16} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                      <Text style={profile.modoOscuro ? styles.fechaOscuro : styles.fechaClaro}>
                        {formatFecha(tarea.fechaEntrega)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Indicadores personales */}
          <View style={styles.section}>
            <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
              Tus indicadores
            </Text>
            <View style={styles.kpisGrid}>
              <View style={[styles.tarjetaKpi, profile.modoOscuro && styles.tarjetaKpiOscuro]}>
                <AntDesign name="book" size={36} color="#87aef0" />
                <Text style={[styles.numeroKpi, profile.modoOscuro && styles.numeroKpiOscuro]}>
                  {dashboardData.totalReportes}
                </Text>
                <Text style={[styles.labelKpi, profile.modoOscuro && styles.labelKpiOscuro]}>Reportes</Text>
              </View>

              <View style={[styles.tarjetaKpi, profile.modoOscuro && styles.tarjetaKpiOscuro]}>
                <Feather name="camera" size={36} color="#57A7FE" />
                <Text style={[styles.numeroKpi, profile.modoOscuro && styles.numeroKpiOscuro]}>
                  {dashboardData.totalFotografias}
                </Text>
                <Text style={[styles.labelKpi, profile.modoOscuro && styles.labelKpiOscuro]}>Fotografías</Text>
              </View>

              <View style={[styles.tarjetaKpi, profile.modoOscuro && styles.tarjetaKpiOscuro]}>
                <Ionicons name="list-outline" size={36} color="#47A997" />
                <Text style={[styles.numeroKpi, profile.modoOscuro && styles.numeroKpiOscuro]}>
                  {dashboardData.totalSubtareas}
                </Text>
                <Text style={[styles.labelKpi, profile.modoOscuro && styles.labelKpiOscuro]}>Subtareas</Text>
              </View>
            </View>
          </View>

          {/* Actividad reciente */}
          {dashboardData.actividadReciente.length > 0 && (
            <View style={styles.section}>
              <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                Actividad reciente
              </Text>
              {dashboardData.actividadReciente.map((tarea) => (
                <TouchableOpacity
                  key={tarea.id}
                  style={[styles.tarjetaActividad, profile.modoOscuro && styles.tarjetaActividadOscuro]}
                  onPress={() => navegarTarea(tarea.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.actividadIcono}>
                    <MaterialCommunityIcons
                      name="clipboard-text-outline"
                      size={24}
                      color={profile.modoOscuro ? "#87aef0" : "#57A7FE"}
                    />
                  </View>
                  <View style={styles.actividadContenido}>
                    <Text style={[styles.actividadTitulo, profile.modoOscuro && styles.actividadTituloOscuro]}>
                      {tarea.nombre}
                    </Text>
                    <Text style={[styles.actividadFecha, profile.modoOscuro && styles.actividadFechaOscuro]}>
                      {formatFecha(tarea.fechaCreacion)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getEstadoStyle(tarea.estado).backgroundColor }]}>
                    <Text style={[styles.badgeText, { color: getEstadoStyle(tarea.estado).color }]}>
                      {tarea.estado}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  headerClaro: {
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 16,
  },
  headerOscuro: {
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#1A1A1A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 16,
  },
  saludoClaro: {
    color: "black",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10,
  },
  saludoOscuro: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10,
  },
  subtituloClaro: {
    color: "black",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  subtituloOscuro: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  section: {
    marginTop: 22,
  },
  tituloSeccionClaro: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  tituloSeccionOscuro: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  tarjetasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  tarjetaResumen: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 18,
    width: "31%",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  tarjetaResumenOscuro: {
    backgroundColor: "#2C2C2C",
  },
  numeroTarjeta: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 10,
  },
  numeroTarjetaOscuro: {
    color: "#ffffff",
  },
  labelTarjeta: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  labelTarjetaOscuro: {
    color: "#B0B0B0",
  },
  tarjetaProgreso: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  tarjetaProgresoOscuro: {
    backgroundColor: "#2C2C2C",
  },
  porcentajeProgreso: {
    fontSize: 52,
    fontWeight: "900",
    color: "#87aef0",
  },
  porcentajeProgresoOscuro: {
    color: "#87aef0",
  },
  labelProgreso: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    marginTop: 8,
  },
  labelProgresoOscuro: {
    color: "#B0B0B0",
  },
  barraProgresoContainer: {
    width: "100%",
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginTop: 18,
    overflow: "hidden",
  },
  barraProgreso: {
    height: "100%",
    borderRadius: 5,
  },
  alertBanner: {
    backgroundColor: "#FFF3F3",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#F5615C",
  },
  alertText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F5615C",
    flex: 1,
  },
  tarjetaTarea: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tarjetaTareaOscuro: {
    backgroundColor: "#2C2C2C",
  },
  tarjetaTareaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tarjetaTareaTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },
  tarjetaTareaTituloOscuro: {
    color: "#ffffff",
  },
  tarjetaTareaBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 6,
  },
  badgeText: {
    fontWeight: "600",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  tarjetaTareaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fechaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  fechaClaro: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  fechaOscuro: {
    fontSize: 13,
    color: "#B0B0B0",
    fontWeight: "500",
  },
  fechaAtrasada: {
    fontSize: 13,
    color: "#F5615C",
    fontWeight: "700",
  },
  kpisGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  tarjetaKpi: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 18,
    flex: 1,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  tarjetaKpiOscuro: {
    backgroundColor: "#2C2C2C",
  },
  numeroKpi: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 10,
  },
  numeroKpiOscuro: {
    color: "#ffffff",
  },
  labelKpi: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  labelKpiOscuro: {
    color: "#B0B0B0",
  },
  tarjetaActividad: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tarjetaActividadOscuro: {
    backgroundColor: "#2C2C2C",
  },
  actividadIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  actividadContenido: {
    flex: 1,
  },
  actividadTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  actividadTituloOscuro: {
    color: "#ffffff",
  },
  actividadFecha: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
  },
  actividadFechaOscuro: {
    color: "#808080",
  },
})
