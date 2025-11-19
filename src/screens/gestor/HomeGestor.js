import AntDesign from "@expo/vector-icons/AntDesign"
import EvilIcons from "@expo/vector-icons/EvilIcons"
import Feather from "@expo/vector-icons/Feather"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { LinearGradient } from "expo-linear-gradient"
import { collection, collectionGroup, doc, getDoc, getDocs, getFirestore, orderBy, query, where } from "firebase/firestore"
import { useEffect, useState } from "react"
import { ActivityIndicator, Dimensions, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import appFirebase from "../../credenciales/Credenciales"
import { useAuth } from "../login/AuthContext"

export default function DashboardGestor({ navigation }) {
    const db = getFirestore(appFirebase)
    const { profile } = useAuth()
    const screenWidth = Dimensions.get("window").width
    const [refreshing, setRefreshing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [modalVisible, setModalVisible] = useState(false)
    const [tareasAtrasadasList, setTareasAtrasadasList] = useState([])
    const [dashboardData, setDashboardData] = useState({
        totalTareas: 0,
        tareasEnProceso: 0,
        tareasCompletadas: 0,
        tareasAtrasadas: 0,
        tareasPendientes: 0,
        tareasProximas: [],
        actividadReciente: [],
        ultimosUsuarios: [],
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

            // Obtener todas las tareas de la sucursal del gestor
            const sucursalRef = profile.IDSucursal.referencePath
                ? doc(db, profile.IDSucursal.referencePath.split("/")[0], profile.IDSucursal.referencePath.split("/")[1])
                : profile.IDSucursal

            // Obtener tareas SIN orderBy
            const tareasRef = collection(db, "TAREA")
            const tareasSnapshot = await getDocs(tareasRef)
            const todasLasTareas = tareasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

            // Filtrar tareas por sucursal manualmente
            const tareasList = todasLasTareas.filter((tarea) => {
                const tareaIDSucursal = tarea.IDSucursal?.id || tarea.IDSucursal?.path?.split("/")[1]
                const gestorIDSucursal = sucursalRef?.id || sucursalRef?.path?.split("/")[1]
                return tareaIDSucursal === gestorIDSucursal
            })

            // Ordenar por fecha manualmente
            tareasList.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0
                const fechaB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0
                return fechaB - fechaA
            })

            console.log("📋 Tareas de la sucursal:", tareasList.length)

            // Obtener todos los usuarios SIN orderBy
            const usuariosRef = collection(db, "USUARIO")
            const usuariosSnapshot = await getDocs(usuariosRef)
            const todosLosUsuarios = usuariosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

            // Filtrar usuarios por sucursal manualmente
            const usuariosSucursal = todosLosUsuarios.filter((usuario) => {
                const usuarioIDSucursal = usuario.IDSucursal?.id || usuario.IDSucursal?.path?.split("/")[1]
                const gestorIDSucursal = sucursalRef?.id || sucursalRef?.path?.split("/")[1]
                return usuarioIDSucursal === gestorIDSucursal
            })

            // Ordenar por fecha manualmente
            usuariosSucursal.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0
                const fechaB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0
                return fechaB - fechaA
            })

            const ultimosUsuarios = usuariosSucursal.slice(0, 5)

            console.log("👥 Usuarios de la sucursal:", usuariosSucursal.length)
            console.log("📋 Últimos 5 usuarios:", ultimosUsuarios.length)

            // Contadores de estado de tareas
            const totalTareas = tareasList.length
            const tareasEnProceso = tareasList.filter((t) => t.estado === "En Proceso").length
            const tareasCompletadas = tareasList.filter((t) => t.estado === "Completada" || t.estado === "Revisada").length
            const tareasPendientes = tareasList.filter((t) => t.estado === "Pendiente").length

            const hoy = new Date()
            const tareasAtrasadasData = tareasList.filter((t) => {
                if (!t.fechaEntrega) return false
                const fechaEntrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega)
                return fechaEntrega < hoy && t.estado !== "Completada" && t.estado !== "Revisada"
            })

            // Ordenar por fecha de entrega (más vencida primero)
            tareasAtrasadasData.sort((a, b) => {
                const fechaA = a.fechaEntrega.toDate ? a.fechaEntrega.toDate() : new Date(a.fechaEntrega)
                const fechaB = b.fechaEntrega.toDate ? b.fechaEntrega.toDate() : new Date(b.fechaEntrega)
                return fechaA - fechaB
            })

            const tareasAtrasadas = tareasAtrasadasData.length
            setTareasAtrasadasList(tareasAtrasadasData)

            // Tareas próximas a vencer (dentro de 48 horas)
            const dosDiasMs = 48 * 60 * 60 * 1000
            const tareasProximasData = await Promise.all(
                tareasList
                    .filter((t) => {
                        if (!t.fechaEntrega) return false
                        const fechaEntrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega)
                        const diferencia = fechaEntrega - hoy
                        return diferencia > 0 && diferencia <= dosDiasMs && t.estado !== "Completada" && t.estado !== "Revisada"
                    })
                    .slice(0, 5)
                    .map(async (tarea) => {
                        const tareaRef = doc(db, "TAREA", tarea.id)
                        const tecnicosSnap = await getDocs(collection(tareaRef, "Tecnicos"))
                        const tecnicos = await Promise.all(
                            tecnicosSnap.docs.map(async (t) => {
                                const data = t.data()
                                let usuario = null
                                if (data.IDUsuario) {
                                    try {
                                        const userSnap = await getDoc(data.IDUsuario)
                                        if (userSnap.exists()) usuario = userSnap.data()
                                    } catch (err) {
                                        console.error("Error:", err)
                                    }
                                }
                                return usuario
                            })
                        )
                        return { ...tarea, tecnicos: tecnicos.filter((t) => t !== null) }
                    })
            )

            // Actividad reciente
            const actividadReciente = tareasList.slice(0, 5).map((tarea) => ({
                id: tarea.id,
                nombre: tarea.nombre,
                estado: tarea.estado,
                fecha: tarea.fechaCreacion,
                tipo: "tarea",
            }))

            console.log("✅ Dashboard gestor actualizado correctamente")

            setDashboardData({
                totalTareas,
                tareasEnProceso,
                tareasCompletadas,
                tareasAtrasadas,
                tareasPendientes,
                tareasProximas: tareasProximasData,
                actividadReciente,
                ultimosUsuarios,
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

    const calcularProgresoGeneral = () => {
        if (dashboardData.totalTareas === 0) return 0
        return Math.round((dashboardData.tareasCompletadas / dashboardData.totalTareas) * 100)
    }

    const calcularDiasVencido = (fecha) => {
        if (!fecha) return 0
        const fechaEntrega = fecha.toDate ? fecha.toDate() : new Date(fecha)
        const hoy = new Date()
        const diferencia = hoy - fechaEntrega
        return Math.floor(diferencia / (24 * 60 * 60 * 1000))
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
                    <Text style={profile.modoOscuro ? styles.tituloOscuro : styles.tituloClaro}>Panel de Gestión</Text>
                    <Text style={profile.modoOscuro ? styles.subtituloOscuro : styles.subtituloClaro}>
                        Supervisión de Equipo
                    </Text>
                </View>

                <ScrollView
                    style={styles.scrollContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                   

                    {/* Estado general de tareas */}
                    <View style={styles.section}>
                        <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                            Estado General de Tareas
                        </Text>

                        <View style={[styles.tarjetaProgreso, profile.modoOscuro && styles.tarjetaProgresoOscuro]}>
                            <Text style={[styles.porcentajeProgreso, profile.modoOscuro && styles.porcentajeProgresoOscuro]}>
                                {calcularProgresoGeneral()}%
                            </Text>
                            <Text style={[styles.labelProgreso, profile.modoOscuro && styles.labelProgresoOscuro]}>
                                Cumplimiento General
                            </Text>
                            <View style={styles.barraProgresoContainer}>
                                <View
                                    style={[
                                        styles.barraProgreso,
                                        {
                                            width: `${calcularProgresoGeneral()}%`,
                                            backgroundColor:
                                                calcularProgresoGeneral() >= 75
                                                    ? "#47A997"
                                                    : calcularProgresoGeneral() >= 50
                                                    ? "#57A7FE"
                                                    : "#F4C54C",
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        <View style={styles.tarjetasGrid}>
                            <View style={[styles.tarjetaEstado, profile.modoOscuro && styles.tarjetaEstadoOscuro]}>
                                <Ionicons name="apps" size={24} color="#87aef0" />
                                <Text style={[styles.numeroEstado, profile.modoOscuro && styles.numeroEstadoOscuro]}>
                                    {dashboardData.totalTareas}
                                </Text>
                                <Text style={[styles.labelEstado, profile.modoOscuro && styles.labelEstadoOscuro]}>Total</Text>
                            </View>

                            <View style={[styles.tarjetaEstado, profile.modoOscuro && styles.tarjetaEstadoOscuro]}>
                                <Ionicons name="time-outline" size={24} color="#57A7FE" />
                                <Text style={[styles.numeroEstado, profile.modoOscuro && styles.numeroEstadoOscuro]}>
                                    {dashboardData.tareasEnProceso}
                                </Text>
                                <Text style={[styles.labelEstado, profile.modoOscuro && styles.labelEstadoOscuro]}>En Proceso</Text>
                            </View>

                            <View style={[styles.tarjetaEstado, profile.modoOscuro && styles.tarjetaEstadoOscuro]}>
                                <Ionicons name="checkmark-done" size={24} color="#47A997" />
                                <Text style={[styles.numeroEstado, profile.modoOscuro && styles.numeroEstadoOscuro]}>
                                    {dashboardData.tareasCompletadas}
                                </Text>
                                <Text style={[styles.labelEstado, profile.modoOscuro && styles.labelEstadoOscuro]}>Completadas</Text>
                            </View>

                            <View style={[styles.tarjetaEstado, profile.modoOscuro && styles.tarjetaEstadoOscuro]}>
                                <Ionicons name="ellipse-outline" size={24} color="#F4C54C" />
                                <Text style={[styles.numeroEstado, profile.modoOscuro && styles.numeroEstadoOscuro]}>
                                    {dashboardData.tareasPendientes}
                                </Text>
                                <Text style={[styles.labelEstado, profile.modoOscuro && styles.labelEstadoOscuro]}>Pendientes</Text>
                            </View>
                        </View>
                    </View>

                    {/* Banner de tareas atrasadas */}
                    {dashboardData.tareasAtrasadas > 0 && (
                        <View style={styles.section}>
                            <TouchableOpacity
                                style={styles.alertBannerAtrasadas}
                                onPress={() => setModalVisible(true)}
                            >
                                <View style={styles.alertBannerContent}>
                                    <View style={styles.alertBannerIcono}>
                                        <Ionicons name="alert-circle" size={24} color="#F5615C" />
                                    </View>
                                    <Text style={styles.alertBannerText}>
                                        {dashboardData.tareasAtrasadas} tarea{dashboardData.tareasAtrasadas > 1 ? "s" : ""} atrasada
                                        {dashboardData.tareasAtrasadas > 1 ? "s" : ""}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#F5615C" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Tareas próximas a vencer */}
                    {dashboardData.tareasProximas.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.alertBanner}>
                                <Ionicons name="timer" size={24} color="#F4C54C" />
                                <Text style={styles.alertText}>
                                    {dashboardData.tareasProximas.length} tarea{dashboardData.tareasProximas.length > 1 ? "s" : ""} próxima
                                    {dashboardData.tareasProximas.length > 1 ? "s" : ""} a vencer (&lt;48h)
                                </Text>
                            </View>
                            {dashboardData.tareasProximas.map((tarea) => (
                                <TouchableOpacity
                                    key={tarea.id}
                                    style={[styles.tarjetaTarea, profile.modoOscuro && styles.tarjetaTareaOscuro]}
                                    onPress={() => navegarTarea(tarea.id)}
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
                                        </View>
                                    </View>
                                    <View style={styles.tarjetaTareaFooter}>
                                        <View style={styles.fechaContainer}>
                                            <Feather name="calendar" size={16} color="#F4C54C" />
                                            <Text style={styles.fechaUrgente}>{formatFecha(tarea.fechaEntrega)}</Text>
                                        </View>
                                        {tarea.tecnicos.length > 0 && (
                                            <View style={styles.avatarContainer}>
                                                {tarea.tecnicos.slice(0, 2).map((tecnico, index) => (
                                                    <Image
                                                        key={index}
                                                        style={[
                                                            styles.avatarSmall,
                                                            {
                                                                marginLeft: index === 0 ? 0 : -6,
                                                                zIndex: tarea.tecnicos.length - index,
                                                            },
                                                        ]}
                                                        source={{
                                                            uri:
                                                                tecnico?.fotoPerfil && tecnico.fotoPerfil.trim() !== ""
                                                                    ? tecnico.fotoPerfil
                                                                    : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                                        }}
                                                    />
                                                ))}
                                                {tarea.tecnicos.length > 2 && (
                                                    <View style={[styles.avatarSmall, styles.avatarExtra, { marginLeft: -6 }]}>
                                                        <Text style={styles.avatarExtraTextSmall}>+{tarea.tecnicos.length - 2}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Actividad reciente */}
                    {dashboardData.actividadReciente.length > 0 && (
                        <View style={styles.section}>
                            <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                                Actividad Reciente
                            </Text>
                            {dashboardData.actividadReciente.map((actividad) => (
                                <TouchableOpacity
                                    key={actividad.id}
                                    style={[styles.tarjetaActividad, profile.modoOscuro && styles.tarjetaActividadOscuro]}
                                    onPress={() => navegarTarea(actividad.id)}
                                >
                                    <View style={styles.actividadIcono}>
                                        <MaterialCommunityIcons
                                            name="clipboard-text-outline"
                                            size={24}
                                            color={profile.modoOscuro ? "#B0B0B0" : "#666"}
                                        />
                                    </View>
                                    <View style={styles.actividadContenido}>
                                        <Text style={[styles.actividadTitulo, profile.modoOscuro && styles.actividadTituloOscuro]}>
                                            {actividad.nombre}
                                        </Text>
                                        <Text style={[styles.actividadFecha, profile.modoOscuro && styles.actividadFechaOscuro]}>
                                            {formatFecha(actividad.fecha)}
                                        </Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: getEstadoStyle(actividad.estado).backgroundColor }]}>
                                        <Text style={[styles.badgeText, { color: getEstadoStyle(actividad.estado).color }]}>
                                            {actividad.estado}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                     {/* Últimos usuarios asignados */}
                    <View style={styles.section}>
                        <Text style={profile.modoOscuro ? styles.tituloSeccionOscuro : styles.tituloSeccionClaro}>
                            Últimos Usuarios Asignados
                        </Text>
                        {dashboardData.ultimosUsuarios.length > 0 ? (
                            dashboardData.ultimosUsuarios.map((usuario) => (
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
                                            {`${usuario.primerNombre || ""} ${usuario.segundoNombre || ""} ${usuario.primerApellido || ""} ${
                                                usuario.segundoApellido || ""
                                            }`.trim()}
                                        </Text>
                                        <Text style={[styles.usuarioEmail, profile.modoOscuro && styles.usuarioEmailOscuro]}>
                                            {usuario.email}
                                        </Text>
                                        <View style={styles.usuarioBadges}>
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
                                            <View
                                                style={[
                                                    styles.badgeEstado,
                                                    {
                                                        backgroundColor: usuario.estado === "Activo" ? "#47A997" : "#F5615C",
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.badgeEstadoText}>{usuario.estado}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color={profile.modoOscuro ? "#666" : "#ccc"} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, profile.modoOscuro && styles.emptyTextOscuro]}>
                                    No hay usuarios asignados a esta sucursal
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>

                {/* Modal de tareas atrasadas */}
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
                                    Tareas Atrasadas
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                                    <Ionicons name="close" size={28} color={profile.modoOscuro ? "white" : "black"} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.modalSubtitulo, profile.modoOscuro && styles.modalSubtituloOscuro]}>
                                {tareasAtrasadasList.length} tarea{tareasAtrasadasList.length !== 1 ? "s" : ""}
                            </Text>

                            {/* Contenido del modal */}
                            <ScrollView style={styles.modalScrollView}>
                                {tareasAtrasadasList.map((tarea) => (
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
                                                <Feather name="calendar" size={14} color="#F5615C" />
                                                <Text style={[styles.modalItemFecha, { color: "#F5615C" }]}>
                                                    {formatFecha(tarea.fechaEntrega)}
                                                </Text>
                                                <Text style={[styles.modalItemDias, { color: "#F5615C" }]}>
                                                    • Vencida hace {calcularDiasVencido(tarea.fechaEntrega)} día
                                                    {calcularDiasVencido(tarea.fechaEntrega) !== 1 ? "s" : ""}
                                                </Text>
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
                                ))}
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
    usuarioBadges: {
        flexDirection: "row",
        gap: 6,
    },
    badgeRol: {
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    badgeRolText: {
        color: "white",
        fontSize: 11,
        fontWeight: "700",
    },
    badgeEstado: {
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    badgeEstadoText: {
        color: "white",
        fontSize: 11,
        fontWeight: "700",
    },
    emptyContainer: {
        padding: 20,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    emptyTextOscuro: {
        color: "#B0B0B0",
    },
    tarjetasGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "space-between",
    },
    tarjetaProgreso: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 12,
    },
    tarjetaProgresoOscuro: {
        backgroundColor: "#2C2C2C",
    },
    porcentajeProgreso: {
        fontSize: 48,
        fontWeight: "900",
        color: "#87aef0",
    },
    porcentajeProgresoOscuro: {
        color: "#87aef0",
    },
    labelProgreso: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginTop: 4,
    },
    labelProgresoOscuro: {
        color: "#B0B0B0",
    },
    barraProgresoContainer: {
        width: "100%",
        height: 8,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
        marginTop: 16,
        overflow: "hidden",
    },
    barraProgreso: {
        height: "100%",
        borderRadius: 4,
    },
    tarjetaEstado: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 12,
        width: "48%",
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tarjetaEstadoOscuro: {
        backgroundColor: "#2C2C2C",
    },
    numeroEstado: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1a1a1a",
        marginTop: 6,
    },
    numeroEstadoOscuro: {
        color: "#ffffff",
    },
    labelEstado: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
        marginTop: 4,
    },
    labelEstadoOscuro: {
        color: "#B0B0B0",
    },
    alertBanner: {
        backgroundColor: "#FFF9E6",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#F4C54C",
    },
    alertText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#F4C54C",
        flex: 1,
    },
    tarjetaTarea: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
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
        gap: 6,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    badgeText: {
        fontWeight: "600",
        fontSize: 11,
        letterSpacing: 0.3,
    },
    tarjetaTareaFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    fechaContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    fechaUrgente: {
        fontSize: 13,
        color: "#F4C54C",
        fontWeight: "700",
    },
    avatarContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#B0B0B0",
    },
    avatarExtra: {
        backgroundColor: "#87aef0",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarExtraTextSmall: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "700",
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
        width: 40,
        height: 40,
        borderRadius: 20,
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
        marginBottom: 2,
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
    alertBannerAtrasadas: {
        backgroundColor: "#FFF3F3",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderLeftWidth: 4,
        borderLeftColor: "#F5615C",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    alertBannerContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    alertBannerIcono: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFEBEB",
        justifyContent: "center",
        alignItems: "center",
    },
    alertBannerText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#F5615C",
        flex: 1,
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