import AntDesign from "@expo/vector-icons/AntDesign"
import Feather from "@expo/vector-icons/Feather"
import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { LinearGradient } from "expo-linear-gradient"
import { collection, getDocs, getFirestore, orderBy, query } from "firebase/firestore"
import { useEffect, useState } from "react"
import { ActivityIndicator, Dimensions, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import appFirebase from "../../credenciales/Credenciales"
import { useAuth } from "../login/AuthContext"

export default function DashboardAdministrador({ navigation }) {
    const db = getFirestore(appFirebase)
    const { profile } = useAuth()
    const screenWidth = Dimensions.get("window").width
    const [refreshing, setRefreshing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [modalVisible, setModalVisible] = useState(false)
    const [modalData, setModalData] = useState({ tipo: null, items: [], titulo: "", color: "" })
    const [dashboardData, setDashboardData] = useState({
        totalUsuarios: 0,
        totalSucursales: 0,
        tareasEnCurso: 0,
        tareasCompletadas: 0,
        distribucionRoles: {
            tecnicos: 0,
            gestores: 0,
            administradores: 0,
        },
        actividadReciente: [],
        alertas: [],
        ultimosUsuarios: [],
        ultimasTareas: [],
        tareasVencidas: [],
        usuariosInactivos: [],
        tareasProximas: [],
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

            // Obtener todos los usuarios SIN orderBy para evitar errores si no tienen fechaCreacion
            const usuariosRef = collection(db, "USUARIO")
            const usuariosSnapshot = await getDocs(usuariosRef)
            const usuariosList = usuariosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

            console.log("👥 Total usuarios obtenidos:", usuariosList.length)
            console.log("📋 Ejemplo de usuario:", usuariosList[0])

            const totalUsuarios = usuariosList.length
            
            // Contar por rol exactamente como aparece en la base de datos
            const tecnicos = usuariosList.filter((u) => u.rol === "Tecnico").length
            const gestores = usuariosList.filter((u) => u.rol === "Gestor").length
            const administradores = usuariosList.filter((u) => u.rol === "Administrador").length

            console.log("📊 Distribución de roles:", { tecnicos, gestores, administradores, totalUsuarios })

            // Ordenar por fecha de creación manualmente (si existe)
            const usuariosOrdenados = usuariosList.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0
                const fechaB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0
                return fechaB - fechaA
            })

            // Últimos 5 usuarios registrados
            const ultimosUsuarios = usuariosOrdenados.slice(0, 5)

            // Obtener todas las sucursales
            const sucursalesRef = collection(db, "SUCURSAL")
            const sucursalesSnapshot = await getDocs(sucursalesRef)
            const totalSucursales = sucursalesSnapshot.size

            console.log("🏢 Total sucursales:", totalSucursales)

            // Obtener todas las tareas SIN orderBy
            const tareasRef = collection(db, "TAREA")
            const tareasSnapshot = await getDocs(tareasRef)
            const tareasList = tareasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

            console.log("📋 Total tareas:", tareasList.length)

            const tareasEnCurso = tareasList.filter(
                (t) => t.estado === "En Proceso" || t.estado === "Pendiente"
            ).length
            const tareasCompletadas = tareasList.filter(
                (t) => t.estado === "Completada" || t.estado === "Revisada"
            ).length

            // Ordenar tareas manualmente
            const tareasOrdenadas = tareasList.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0
                const fechaB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0
                return fechaB - fechaA
            })

            // Últimas 5 tareas
            const ultimasTareas = tareasOrdenadas.slice(0, 5)

            // Generar alertas
            const alertas = []
            const hoy = new Date()

            // Tareas vencidas
            const tareasVencidasList = tareasList.filter((t) => {
                if (!t.fechaEntrega) return false
                const fechaEntrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega)
                return fechaEntrega < hoy && t.estado !== "Completada" && t.estado !== "Revisada"
            })

            // Ordenar por fecha de entrega (más vencida primero)
            tareasVencidasList.sort((a, b) => {
                const fechaA = a.fechaEntrega.toDate ? a.fechaEntrega.toDate() : new Date(a.fechaEntrega)
                const fechaB = b.fechaEntrega.toDate ? b.fechaEntrega.toDate() : new Date(b.fechaEntrega)
                return fechaA - fechaB
            })

            if (tareasVencidasList.length > 0) {
                alertas.push({
                    id: "tareas-vencidas",
                    tipo: "error",
                    icono: "alert-circle",
                    mensaje: `${tareasVencidasList.length} tarea${tareasVencidasList.length > 1 ? "s" : ""} vencida${tareasVencidasList.length > 1 ? "s" : ""}`,
                    color: "#F5615C",
                })
            }

            // Usuarios inactivos
            const usuariosInactivosList = usuariosList.filter((u) => u.estado === "Inactivo")
            
            // Ordenar alfabéticamente
            usuariosInactivosList.sort((a, b) => {
                const nombreA = `${a.primerNombre || ""} ${a.primerApellido || ""}`.trim().toLowerCase()
                const nombreB = `${b.primerNombre || ""} ${b.primerApellido || ""}`.trim().toLowerCase()
                return nombreA.localeCompare(nombreB)
            })

            if (usuariosInactivosList.length > 0) {
                alertas.push({
                    id: "usuarios-inactivos",
                    tipo: "warning",
                    icono: "person-remove",
                    mensaje: `${usuariosInactivosList.length} usuario${usuariosInactivosList.length > 1 ? "s" : ""} inactivo${usuariosInactivosList.length > 1 ? "s" : ""}`,
                    color: "#F4C54C",
                })
            }

            // Tareas próximas a vencer (7 días)
            const sieteDiasMs = 7 * 24 * 60 * 60 * 1000
            const tareasProximasList = tareasList.filter((t) => {
                if (!t.fechaEntrega) return false
                const fechaEntrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega)
                const diferencia = fechaEntrega - hoy
                return diferencia > 0 && diferencia <= sieteDiasMs && t.estado !== "Completada" && t.estado !== "Revisada"
            })

            // Ordenar por fecha de entrega (más próxima primero)
            tareasProximasList.sort((a, b) => {
                const fechaA = a.fechaEntrega.toDate ? a.fechaEntrega.toDate() : new Date(a.fechaEntrega)
                const fechaB = b.fechaEntrega.toDate ? b.fechaEntrega.toDate() : new Date(b.fechaEntrega)
                return fechaA - fechaB
            })

            if (tareasProximasList.length > 0) {
                alertas.push({
                    id: "tareas-proximas",
                    tipo: "info",
                    icono: "time",
                    mensaje: `${tareasProximasList.length} tarea${tareasProximasList.length > 1 ? "s" : ""} vence${tareasProximasList.length > 1 ? "n" : ""} en 7 días`,
                    color: "#57A7FE",
                })
            }

            // Actividad reciente (mezcla de usuarios y tareas)
            const actividadReciente = [
                ...ultimosUsuarios.slice(0, 3).map((u) => ({
                    id: `user-${u.id}`,
                    tipo: "usuario",
                    titulo: `${u.primerNombre || ""} ${u.primerApellido || ""}`.trim() || "Usuario sin nombre",
                    subtitulo: `Nuevo ${u.rol || "Usuario"}`,
                    fecha: u.fechaCreacion,
                    icono: "person-add",
                    color: "#47A997",
                })),
                ...ultimasTareas.slice(0, 3).map((t) => ({
                    id: `task-${t.id}`,
                    tipo: "tarea",
                    titulo: t.nombre || "Tarea sin nombre",
                    subtitulo: `Estado: ${t.estado || "Sin estado"}`,
                    fecha: t.fechaCreacion,
                    icono: "clipboard",
                    color: "#57A7FE",
                })),
            ]
                .sort((a, b) => {
                    const fechaA = a.fecha?.toMillis ? a.fecha.toMillis() : 0
                    const fechaB = b.fecha?.toMillis ? b.fecha.toMillis() : 0
                    return fechaB - fechaA
                })
                .slice(0, 6)

            console.log("✅ Dashboard data actualizada correctamente")

            setDashboardData({
                totalUsuarios,
                totalSucursales,
                tareasEnCurso,
                tareasCompletadas,
                distribucionRoles: {
                    tecnicos,
                    gestores,
                    administradores,
                },
                actividadReciente,
                alertas,
                ultimosUsuarios,
                ultimasTareas,
                tareasVencidas: tareasVencidasList,
                usuariosInactivos: usuariosInactivosList,
                tareasProximas: tareasProximasList,
            })
        } catch (error) {
            console.error("❌ Error obteniendo datos del dashboard:", error)
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

    const formatFechaRelativa = (fecha) => {
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

        const ahora = new Date()
        const diferencia = ahora - dateObj
        const minutos = Math.floor(diferencia / 60000)
        const horas = Math.floor(diferencia / 3600000)
        const dias = Math.floor(diferencia / 86400000)

        if (minutos < 60) return `Hace ${minutos} min`
        if (horas < 24) return `Hace ${horas} h`
        if (dias < 7) return `Hace ${dias} día${dias > 1 ? "s" : ""}`
        return formatFecha(fecha)
    }

    const calcularPorcentajeRol = (cantidad) => {
        if (dashboardData.totalUsuarios === 0) return 0
        return Math.round((cantidad / dashboardData.totalUsuarios) * 100)
    }

    const navegarUsuario = (usuarioID) => {
        navigation.navigate("PerfilUsuarioShared", { userId: usuarioID })
    }

    const navegarTarea = (tareaID) => {
        navigation.navigate("TareaDetails", { id: tareaID })
    }

    const abrirModal = (tipo) => {
        let items = []
        let titulo = ""
        let color = ""

        if (tipo === "tareas-vencidas") {
            items = dashboardData.tareasVencidas
            titulo = "Tareas Vencidas"
            color = "#F5615C"
        } else if (tipo === "usuarios-inactivos") {
            items = dashboardData.usuariosInactivos
            titulo = "Usuarios Inactivos"
            color = "#F4C54C"
        } else if (tipo === "tareas-proximas") {
            items = dashboardData.tareasProximas
            titulo = "Tareas Próximas a Vencer"
            color = "#57A7FE"
        }

        setModalData({ tipo, items, titulo, color })
        setModalVisible(true)
    }

    const calcularDiasVencido = (fecha) => {
        if (!fecha) return 0
        const fechaEntrega = fecha.toDate ? fecha.toDate() : new Date(fecha)
        const hoy = new Date()
        const diferencia = hoy - fechaEntrega
        return Math.floor(diferencia / (24 * 60 * 60 * 1000))
    }

    const calcularDiasFaltantes = (fecha) => {
        if (!fecha) return 0
        const fechaEntrega = fecha.toDate ? fecha.toDate() : new Date(fecha)
        const hoy = new Date()
        const diferencia = fechaEntrega - hoy
        return Math.ceil(diferencia / (24 * 60 * 60 * 1000))
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

    if (loading) {
        return (
            <LinearGradient colors={["#87aef0", "#9c8fc4"]} start={{ x: 0.5, y: 0.4 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#87aef0" />
                    <Text style={styles.loadingText}>Cargando dashboard...</Text>
                </View>
            </LinearGradient>
        )
    }

    return (
        <LinearGradient colors={["#87aef0", "#9c8fc4"]} start={{ x: 0.5, y: 0.4 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <View style={profile.modoOscuro ? styles.headerOscuro : styles.headerClaro}>
                    <Text style={profile.modoOscuro ? styles.tituloOscuro : styles.tituloClaro}>Panel de Control</Text>
                    <Text style={profile.modoOscuro ? styles.subtituloOscuro : styles.subtituloClaro}>
                        Administración General
                    </Text>
                </View>

                <ScrollView
                    style={styles.scrollContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Resumen general del sistema */}
                    <View style={styles.section}>
                        <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                            Resumen General
                        </Text>
                        <View style={styles.tarjetasGrid}>
                            <TouchableOpacity
                                style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}
                                onPress={() => navigation.navigate("Usuarios")}
                            >
                                <Ionicons name="people" size={32} color="#47A997" />
                                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                                    {dashboardData.totalUsuarios}
                                </Text>
                                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>
                                    Usuarios
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}
                                onPress={() => navigation.navigate("Sucursales")}
                            >
                                <Ionicons name="business" size={32} color="#57A7FE" />
                                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                                    {dashboardData.totalSucursales}
                                </Text>
                                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>
                                    Sucursales
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}
                                onPress={() => navigation.navigate("Tareas")}
                            >
                                <Ionicons name="time" size={32} color="#F4C54C" />
                                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                                    {dashboardData.tareasEnCurso}
                                </Text>
                                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>
                                    En Curso
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tarjetaResumen, profile.modoOscuro && styles.tarjetaResumenOscuro]}
                                onPress={() => navigation.navigate("Tareas")}
                            >
                                <Ionicons name="checkmark-done" size={32} color="#47A997" />
                                <Text style={[styles.numeroTarjeta, profile.modoOscuro && styles.numeroTarjetaOscuro]}>
                                    {dashboardData.tareasCompletadas}
                                </Text>
                                <Text style={[styles.labelTarjeta, profile.modoOscuro && styles.labelTarjetaOscuro]}>
                                    Completadas
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Alertas importantes */}
                    {dashboardData.alertas.length > 0 && (
                        <View style={styles.section}>
                            <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                                Alertas del Sistema
                            </Text>
                            {dashboardData.alertas.map((alerta) => (
                                <TouchableOpacity
                                    key={alerta.id}
                                    style={[
                                        styles.tarjetaAlerta,
                                        profile.modoOscuro && styles.tarjetaAlertaOscuro,
                                        { borderLeftColor: alerta.color },
                                    ]}
                                    onPress={() => abrirModal(alerta.id)}
                                >
                                    <View style={[styles.iconoAlerta, { backgroundColor: `${alerta.color}20` }]}>
                                        <Ionicons name={alerta.icono} size={24} color={alerta.color} />
                                    </View>
                                    <Text style={[styles.mensajeAlerta, profile.modoOscuro && styles.mensajeAlertaOscuro]}>
                                        {alerta.mensaje}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={profile.modoOscuro ? "#666" : "#999"} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Distribución de usuarios por rol */}
                    <View style={styles.section}>
                        <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                            Usuarios por Rol
                        </Text>
                        <View style={[styles.tarjetaDistribucion, profile.modoOscuro && styles.tarjetaDistribucionOscuro]}>
                            {/* Técnicos */}
                            <View style={styles.rolItem}>
                                <View style={styles.rolHeader}>
                                    <View style={styles.rolIcono}>
                                        <Ionicons name="construct" size={20} color="#47A997" />
                                    </View>
                                    <View style={styles.rolInfo}>
                                        <Text style={[styles.rolNombre, profile.modoOscuro && styles.rolNombreOscuro]}>
                                            Técnicos
                                        </Text>
                                        <Text style={[styles.rolCantidad, profile.modoOscuro && styles.rolCantidadOscuro]}>
                                            {dashboardData.distribucionRoles.tecnicos} usuarios
                                        </Text>
                                    </View>
                                    <Text style={[styles.rolPorcentaje, { color: "#47A997" }]}>
                                        {calcularPorcentajeRol(dashboardData.distribucionRoles.tecnicos)}%
                                    </Text>
                                </View>
                                <View style={styles.barraRolContainer}>
                                    <View
                                        style={[
                                            styles.barraRol,
                                            {
                                                width: `${calcularPorcentajeRol(dashboardData.distribucionRoles.tecnicos)}%`,
                                                backgroundColor: "#47A997",
                                            },
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Gestores */}
                            <View style={styles.rolItem}>
                                <View style={styles.rolHeader}>
                                    <View style={styles.rolIcono}>
                                        <Ionicons name="briefcase" size={20} color="#57A7FE" />
                                    </View>
                                    <View style={styles.rolInfo}>
                                        <Text style={[styles.rolNombre, profile.modoOscuro && styles.rolNombreOscuro]}>
                                            Gestores
                                        </Text>
                                        <Text style={[styles.rolCantidad, profile.modoOscuro && styles.rolCantidadOscuro]}>
                                            {dashboardData.distribucionRoles.gestores} usuarios
                                        </Text>
                                    </View>
                                    <Text style={[styles.rolPorcentaje, { color: "#57A7FE" }]}>
                                        {calcularPorcentajeRol(dashboardData.distribucionRoles.gestores)}%
                                    </Text>
                                </View>
                                <View style={styles.barraRolContainer}>
                                    <View
                                        style={[
                                            styles.barraRol,
                                            {
                                                width: `${calcularPorcentajeRol(dashboardData.distribucionRoles.gestores)}%`,
                                                backgroundColor: "#57A7FE",
                                            },
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Administradores */}
                            <View style={styles.rolItem}>
                                <View style={styles.rolHeader}>
                                    <View style={styles.rolIcono}>
                                        <Ionicons name="shield-checkmark" size={20} color="#B383E2" />
                                    </View>
                                    <View style={styles.rolInfo}>
                                        <Text style={[styles.rolNombre, profile.modoOscuro && styles.rolNombreOscuro]}>
                                            Administradores
                                        </Text>
                                        <Text style={[styles.rolCantidad, profile.modoOscuro && styles.rolCantidadOscuro]}>
                                            {dashboardData.distribucionRoles.administradores} usuarios
                                        </Text>
                                    </View>
                                    <Text style={[styles.rolPorcentaje, { color: "#B383E2" }]}>
                                        {calcularPorcentajeRol(dashboardData.distribucionRoles.administradores)}%
                                    </Text>
                                </View>
                                <View style={styles.barraRolContainer}>
                                    <View
                                        style={[
                                            styles.barraRol,
                                            {
                                                width: `${calcularPorcentajeRol(dashboardData.distribucionRoles.administradores)}%`,
                                                backgroundColor: "#B383E2",
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Actividad reciente del sistema */}
                    {dashboardData.actividadReciente.length > 0 && (
                        <View style={styles.section}>
                            <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                                Actividad Reciente
                            </Text>
                            {dashboardData.actividadReciente.map((actividad) => (
                                <TouchableOpacity
                                    key={actividad.id}
                                    style={[styles.tarjetaActividad, profile.modoOscuro && styles.tarjetaActividadOscuro]}
                                    onPress={() => {
                                        if (actividad.tipo === "usuario") {
                                            navegarUsuario(actividad.id.replace("user-", ""))
                                        } else if (actividad.tipo === "tarea") {
                                            navegarTarea(actividad.id.replace("task-", ""))
                                        }
                                    }}
                                >
                                    <View style={[styles.actividadIcono, { backgroundColor: `${actividad.color}20` }]}>
                                        <Ionicons name={actividad.icono} size={24} color={actividad.color} />
                                    </View>
                                    <View style={styles.actividadContenido}>
                                        <Text style={[styles.actividadTitulo, profile.modoOscuro && styles.actividadTituloOscuro]}>
                                            {actividad.titulo}
                                        </Text>
                                        <Text style={[styles.actividadSubtitulo, profile.modoOscuro && styles.actividadSubtituloOscuro]}>
                                            {actividad.subtitulo}
                                        </Text>
                                    </View>
                                    <Text style={[styles.actividadFecha, profile.modoOscuro && styles.actividadFechaOscuro]}>
                                        {formatFechaRelativa(actividad.fecha)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Últimos usuarios registrados */}
                    {dashboardData.ultimosUsuarios.length > 0 && (
                        <View style={styles.section}>
                            <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                                Últimos Usuarios Registrados
                            </Text>
                            {dashboardData.ultimosUsuarios.slice(0, 3).map((usuario) => (
                                <TouchableOpacity
                                    key={usuario.id}
                                    style={[styles.tarjetaUsuario, profile.modoOscuro && styles.tarjetaUsuarioOscuro]}
                                    onPress={() => navegarUsuario(usuario.id)}
                                >
                                    <Image
                                        style={styles.avatarUsuario}
                                        source={{
                                            uri:
                                                usuario.fotoPerfil && usuario.fotoPerfil.trim() !== ""
                                                    ? usuario.fotoPerfil
                                                    : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                        }}
                                    />
                                    <View style={styles.usuarioInfo}>
                                        <Text style={[styles.usuarioNombre, profile.modoOscuro && styles.usuarioNombreOscuro]}>
                                            {`${usuario.primerNombre || ""} ${usuario.primerApellido || ""}`.trim()}
                                        </Text>
                                        <Text style={[styles.usuarioEmail, profile.modoOscuro && styles.usuarioEmailOscuro]}>
                                            {usuario.email}
                                        </Text>
                                        <View
                                            style={[
                                                styles.badgeRol,
                                                {
                                                    backgroundColor:
                                                        usuario.rol === "Administrador"
                                                            ? "#B383E2"
                                                            : usuario.rol === "Gestor"
                                                            ? "#57A7FE"
                                                            : "#47A997",
                                                },
                                            ]}
                                        >
                                            <Text style={styles.badgeRolText}>{usuario.rol}</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color={profile.modoOscuro ? "#666" : "#ccc"} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={{ height: 30 }} />
                </ScrollView>

                {/* Modal de detalles de alerta */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContainer, profile.modoOscuro && styles.modalContainerOscuro]}>
                            {/* Header del modal */}
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitulo, profile.modoOscuro && styles.modalTituloOscuro]}>
                                    {modalData.titulo}
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                                    <Ionicons name="close" size={28} color={profile.modoOscuro ? "white" : "black"} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.modalSubtitulo, profile.modoOscuro && styles.modalSubtituloOscuro]}>
                                {modalData.items.length} {modalData.tipo === "usuarios-inactivos" ? "usuario" : "tarea"}
                                {modalData.items.length !== 1 ? "s" : ""}
                            </Text>

                            {/* Contenido del modal */}
                            <ScrollView style={styles.modalScrollView}>
                                {modalData.tipo === "usuarios-inactivos" ? (
                                    // Mostrar usuarios inactivos
                                    modalData.items.map((usuario) => (
                                        <TouchableOpacity
                                            key={usuario.id}
                                            style={[styles.modalItem, profile.modoOscuro && styles.modalItemOscuro]}
                                            onPress={() => {
                                                setModalVisible(false)
                                                navegarUsuario(usuario.id)
                                            }}
                                        >
                                            <Image
                                                style={styles.modalAvatar}
                                                source={{
                                                    uri:
                                                        usuario.fotoPerfil && usuario.fotoPerfil.trim() !== ""
                                                            ? usuario.fotoPerfil
                                                            : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                                }}
                                            />
                                            <View style={styles.modalItemInfo}>
                                                <Text style={[styles.modalItemTitulo, profile.modoOscuro && styles.modalItemTituloOscuro]}>
                                                    {`${usuario.primerNombre || ""} ${usuario.segundoNombre || ""} ${
                                                        usuario.primerApellido || ""
                                                    } ${usuario.segundoApellido || ""}`.trim()}
                                                </Text>
                                                <Text style={[styles.modalItemSubtitulo, profile.modoOscuro && styles.modalItemSubtituloOscuro]}>
                                                    {usuario.email}
                                                </Text>
                                                <View style={styles.modalItemBadges}>
                                                    <View
                                                        style={[
                                                            styles.modalBadge,
                                                            {
                                                                backgroundColor:
                                                                    usuario.rol === "Administrador"
                                                                        ? "#B383E2"
                                                                        : usuario.rol === "Gestor"
                                                                        ? "#57A7FE"
                                                                        : "#47A997",
                                                            },
                                                        ]}
                                                    >
                                                        <Text style={styles.modalBadgeText}>{usuario.rol}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={profile.modoOscuro ? "#666" : "#ccc"} />
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    // Mostrar tareas
                                    modalData.items.map((tarea) => (
                                        <TouchableOpacity
                                            key={tarea.id}
                                            style={[styles.modalItem, profile.modoOscuro && styles.modalItemOscuro]}
                                            onPress={() => {
                                                setModalVisible(false)
                                                navegarTarea(tarea.id)
                                            }}
                                        >
                                            <View style={styles.modalItemInfo}>
                                                <Text style={[styles.modalItemTitulo, profile.modoOscuro && styles.modalItemTituloOscuro]}>
                                                    {tarea.nombre}
                                                </Text>
                                                <View style={styles.modalItemRow}>
                                                    <Feather name="calendar" size={14} color={modalData.color} />
                                                    <Text style={[styles.modalItemFecha, { color: modalData.color }]}>
                                                        {formatFecha(tarea.fechaEntrega)}
                                                    </Text>
                                                    {modalData.tipo === "tareas-vencidas" && (
                                                        <Text style={[styles.modalItemDias, { color: modalData.color }]}>
                                                            • Vencida hace {calcularDiasVencido(tarea.fechaEntrega)} día
                                                            {calcularDiasVencido(tarea.fechaEntrega) !== 1 ? "s" : ""}
                                                        </Text>
                                                    )}
                                                    {modalData.tipo === "tareas-proximas" && (
                                                        <Text style={[styles.modalItemDias, { color: modalData.color }]}>
                                                            • Vence en {calcularDiasFaltantes(tarea.fechaEntrega)} día
                                                            {calcularDiasFaltantes(tarea.fechaEntrega) !== 1 ? "s" : ""}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={styles.modalItemBadges}>
                                                    <View
                                                        style={[
                                                            styles.modalBadge,
                                                            { backgroundColor: getEstadoStyle(tarea.estado).backgroundColor },
                                                        ]}
                                                    >
                                                        <Text style={[styles.modalBadgeText, { color: getEstadoStyle(tarea.estado).color }]}>
                                                            {tarea.estado}
                                                        </Text>
                                                    </View>
                                                    {tarea.prioridad && (
                                                        <View
                                                            style={[
                                                                styles.modalBadge,
                                                                { backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.modalBadgeText,
                                                                    { color: getPrioridadStyle(tarea.prioridad).color },
                                                                ]}
                                                            >
                                                                {tarea.prioridad}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={profile.modoOscuro ? "#666" : "#ccc"} />
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
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
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 16,
    },
    headerOscuro: {
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: "#1A1A1A",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 16,
    },
    tituloClaro: {
        color: "black",
        fontSize: 26,
        fontWeight: 900,
        marginTop: 10,
    },
    tituloOscuro: {
        color: "white",
        fontSize: 26,
        fontWeight: 900,
        marginTop: 10,
    },
    subtituloClaro: {
        color: "black",
        fontSize: 16,
        fontWeight: "600",
        marginTop: 2,
    },
    subtituloOscuro: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
        marginTop: 2,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 15,
    },
    section: {
        marginTop: 20,
    },
    tituloSeccionClaro: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 12,
    },
    tituloSeccionOscuro: {
        fontSize: 20,
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: 12,
    },
    tarjetasGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "space-between",
    },
    tarjetaResumen: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        width: "48%",
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tarjetaResumenOscuro: {
        backgroundColor: "#2C2C2C",
    },
    numeroTarjeta: {
        fontSize: 36,
        fontWeight: "900",
        color: "#1a1a1a",
        marginTop: 8,
    },
    numeroTarjetaOscuro: {
        color: "#ffffff",
    },
    labelTarjeta: {
        fontSize: 13,
        fontWeight: "600",
        color: "#666",
        marginTop: 4,
    },
    labelTarjetaOscuro: {
        color: "#B0B0B0",
    },
    tarjetaAlerta: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 4,
    },
    tarjetaAlertaOscuro: {
        backgroundColor: "#2C2C2C",
    },
    iconoAlerta: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    mensajeAlerta: {
        flex: 1,
        fontSize: 15,
        fontWeight: "700",
        color: "#1a1a1a",
    },
    mensajeAlertaOscuro: {
        color: "#ffffff",
    },
    tarjetaDistribucion: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tarjetaDistribucionOscuro: {
        backgroundColor: "#2C2C2C",
    },
    rolItem: {
        marginBottom: 16,
    },
    rolHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    rolIcono: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    rolInfo: {
        flex: 1,
    },
    rolNombre: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 2,
    },
    rolNombreOscuro: {
        color: "#ffffff",
    },
    rolCantidad: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
    },
    rolCantidadOscuro: {
        color: "#B0B0B0",
    },
    rolPorcentaje: {
        fontSize: 20,
        fontWeight: "800",
        marginLeft: 8,
    },
    barraRolContainer: {
        width: "100%",
        height: 8,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
        overflow: "hidden",
    },
    barraRol: {
        height: "100%",
        borderRadius: 4,
    },
    tarjetaActividad: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tarjetaActividadOscuro: {
        backgroundColor: "#2C2C2C",
    },
    actividadIcono: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        marginBottom: 2,
    },
    actividadTituloOscuro: {
        color: "#ffffff",
    },
    actividadSubtitulo: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
    },
    actividadSubtituloOscuro: {
        color: "#B0B0B0",
    },
    actividadFecha: {
        fontSize: 12,
        fontWeight: "600",
        color: "#999",
    },
    actividadFechaOscuro: {
        color: "#808080",
    },
    tarjetaUsuario: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tarjetaUsuarioOscuro: {
        backgroundColor: "#2C2C2C",
    },
    avatarUsuario: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "#87aef0",
    },
    usuarioInfo: {
        flex: 1,
    },
    usuarioNombre: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    usuarioNombreOscuro: {
        color: "#ffffff",
    },
    usuarioEmail: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
        marginBottom: 6,
    },
    usuarioEmailOscuro: {
        color: "#B0B0B0",
    },
    badgeRol: {
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignSelf: "flex-start",
    },
    badgeRolText: {
        color: "white",
        fontSize: 11,
        fontWeight: "700",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
        paddingTop: 20,
    },
    modalContainerOscuro: {
        backgroundColor: "#1A1A1A",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    modalTitulo: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1a1a1a",
    },
    modalTituloOscuro: {
        color: "#ffffff",
    },
    modalCloseButton: {
        padding: 4,
    },
    modalSubtitulo: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    modalSubtituloOscuro: {
        color: "#B0B0B0",
    },
    modalScrollView: {
        paddingHorizontal: 20,
    },
    modalItem: {
        backgroundColor: "#f9f9f9",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    modalItemOscuro: {
        backgroundColor: "#2C2C2C",
    },
    modalAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: "#87aef0",
    },
    modalItemInfo: {
        flex: 1,
    },
    modalItemTitulo: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    modalItemTituloOscuro: {
        color: "#ffffff",
    },
    modalItemSubtitulo: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
        marginBottom: 6,
    },
    modalItemSubtituloOscuro: {
        color: "#B0B0B0",
    },
    modalItemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    modalItemFecha: {
        fontSize: 13,
        fontWeight: "700",
    },
    modalItemDias: {
        fontSize: 12,
        fontWeight: "600",
    },
    modalItemBadges: {
        flexDirection: "row",
        gap: 6,
        flexWrap: "wrap",
    },
    modalBadge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    modalBadgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
})