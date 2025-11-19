import AntDesign from "@expo/vector-icons/AntDesign"
import EvilIcons from "@expo/vector-icons/EvilIcons"
import Feather from "@expo/vector-icons/Feather"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import Ionicons from "@expo/vector-icons/Ionicons"
import { LinearGradient } from "expo-linear-gradient"
import { collection, collectionGroup, doc, getDoc, getDocs, getFirestore, orderBy, query, where,} from "firebase/firestore"
import { useEffect, useState } from "react"
import { ActivityIndicator, Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,} from "react-native"
import ModalFiltros from "../../components/ModalFiltros"
import BotonRegistrar from "../../components/BotonRegistrar"
import appFirebase from "../../credenciales/Credenciales"
import { useAuth } from "../login/AuthContext"

export default function TareasShared({ navigation }) {
    const db = getFirestore(appFirebase)
    const { profile } = useAuth()
    const screenHeight = Dimensions.get("window").height
    const [refreshing, setRefreshing] = useState(false)
    const [loadingFiltros, setLoadingFiltros] = useState(false)
    const [tareas, setTareas] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [openFiltros, setOpenFiltros] = useState(false)
    const [filtros, setFiltros] = useState({
        sucursal: null,
        prioridad: null,
        estado: null,
    })

    const onRefresh = () => {
        setRefreshing(true)
        setTimeout(() => {
            setRefreshing(false)
            getTareas()
        }, 1000)
    }

    useEffect(() => {
        setLoadingFiltros(true)
        getTareas()
    }, [busqueda, filtros])

    const getTareas = async () => {
        try {
            let tareaList = []

            if (profile.rol === "Administrador") {
                const constraints = [orderBy("fechaCreacion", "desc")]

                if (busqueda) {
                    constraints.push(where("nombre", ">=", busqueda))
                    constraints.push(where("nombre", "<=", busqueda + "\uf8ff"))
                }

                if (filtros.sucursal) {
                    const sucursalRef = doc(db, "SUCURSAL", filtros.sucursal)
                    constraints.push(where("IDSucursal", "==", sucursalRef))
                }
                if (filtros.prioridad) constraints.push(where("prioridad", "==", filtros.prioridad))
                if (filtros.estado) constraints.push(where("estado", "==", filtros.estado))

                const baseQuery = query(collection(db, "TAREA"), ...constraints)
                const response = await getDocs(baseQuery)
                tareaList = response.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            } else if (profile.rol === "Gestor") {
                const constraints = [
                    orderBy("fechaCreacion", "desc"),
                    where(
                        "IDSucursal",
                        "==",
                        profile.IDSucursal.referencePath
                            ? doc(db, profile.IDSucursal.referencePath.split("/")[0], profile.IDSucursal.referencePath.split("/")[1])
                            : profile.IDSucursal,
                    ),
                ]

                if (busqueda) {
                    constraints.push(where("nombre", ">=", busqueda))
                    constraints.push(where("nombre", "<=", busqueda + "\uf8ff"))
                }

                if (filtros.prioridad) constraints.push(where("prioridad", "==", filtros.prioridad))
                if (filtros.estado) constraints.push(where("estado", "==", filtros.estado))

                const baseQuery = query(collection(db, "TAREA"), ...constraints)
                const response = await getDocs(baseQuery)
                tareaList = response.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            } else if (profile.rol === "Tecnico") {
                const userRef = doc(db, "USUARIO", profile.id)
                const q = query(collectionGroup(db, "Tecnicos"), where("IDUsuario", "==", userRef))
                const response = await getDocs(q)

                tareaList = await Promise.all(
                    response.docs.map(async (docSnap) => {
                        const tecnicoData = docSnap.data()
                        const tareaRef = docSnap.ref.parent.parent
                        const tareaSnap = await getDoc(tareaRef)
                        const tareaData = { id: tareaRef.id, ...tareaSnap.data(), tecnico: { id: docSnap.id, ...tecnicoData } }

                        if (filtros.estado && tareaData.estado !== filtros.estado) return null
                        if (filtros.prioridad && tareaData.prioridad !== filtros.prioridad) return null
                        if (filtros.sucursal) {
                            const sucursalId = tareaData.IDSucursal.id || tareaData.IDSucursal
                            if (sucursalId !== filtros.sucursal) return null
                        }

                        if (busqueda && !tareaData.nombre.toLowerCase().includes(busqueda.toLowerCase())) return null

                        return tareaData
                    }),
                )

                tareaList = tareaList.filter((t) => t !== null)
            } else {
                navigation.navigate("Tabs")
                return
            }

            const tareasConTodo = await Promise.all(
                tareaList.map(async (tarea) => {
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
                                    console.error("Error cargando usuario:", err)
                                }
                            }
                            return { id: t.id, ...data, usuario }
                        }),
                    )

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

                    const totalReportes = repSnap.size + totalReportesSubtareas
                    const totalSubtareas = subtareasSnap.size

                    return {
                        ...tarea,
                        tecnicos,
                        totalReportes: totalReportes,
                        totalEvidencias: eviSnap.size,
                        totalFotografias: totalFotos,
                        totalSubtareas: totalSubtareas,
                    }
                }),
            )

            tareasConTodo.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0
                const fechaB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0
                return fechaB - fechaA
            })

            setTareas(tareasConTodo)
        } catch (error) {
            console.error("Error consiguiendo las Tareas:", error)
        } finally {
            setLoadingFiltros(false)
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

        return dateObj.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
    }

    const getEstadoStyle = (estado) => {
        if (!estado) return { backgroundColor: "#9E9E9E", color: profile.modoOscuro === true ? "black" : "#EDEDED" }
        const status = estado

        if (status === "Completada") {
            return {
                backgroundColor: "#47A997",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        } else if (status === "Revisada") {
            return {
                backgroundColor: "#B383E2",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        } else if (status === "Pendiente") {
            return {
                backgroundColor: "#F4C54C",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        } else if (status === "En Proceso") {
            return {
                backgroundColor: "#57A7FE",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        } else if (status === "No Entregada") {
            return {
                backgroundColor: "#F5615C",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        }

        return {
            backgroundColor: "#9E9E9E",
            color: profile.modoOscuro === true ? "black" : "white",
        }
    }

    const getPrioridadStyle = (prioridad) => {
        if (!prioridad) return { backgroundColor: "#9E9E9E", color: profile.modoOscuro === true ? "black" : "#EDEDED" }
        const status = prioridad

        if (status === "Alta") {
            return {
                backgroundColor: "#F5615C",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        } else if (status === "Media") {
            return {
                backgroundColor: "#F5C44C",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        } else if (status === "Baja") {
            return {
                backgroundColor: "#57A6FF",
                color: profile.modoOscuro === true ? "black" : "white",
            }
        }

        return {
            backgroundColor: "#9E9E9E",
            color: profile.modoOscuro === true ? "black" : "white",
        }
    }

    const navegarMas = (tareaID) => {
        navigation.navigate("TareaDetails", {
            id: tareaID,
            onGoBack: () => onRefresh(),
        })
    }

    useEffect(() => {
        if (busqueda === "") {
            onRefresh()
        }
    }, [busqueda])

    return (
        <LinearGradient
            colors={["#87aef0", "#9c8fc4"]}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
        >
            <View style={{ flex: 1 }}>
                <View style={profile.modoOscuro === true ? styles.headerOscuro : styles.headerClaro}>
                    <View>
                        <Text style={profile.modoOscuro === true ? styles.tituloOscuro : styles.tituloClaro}>Tareas</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 5 }}>
                        <View style={{ marginBottom: 0, marginVertical: 5, flex: 1 }}>
                            <TextInput
                                placeholder="Buscar"
                                placeholderTextColor={profile.modoOscuro === true ? "#FFFF" : "#1A1A1A"}
                                style={styles.inputBusqueda}
                                value={busqueda}
                                onChangeText={setBusqueda}
                            />
                            {busqueda !== "" && (
                                <TouchableOpacity
                                    disabled={refreshing}
                                    onPress={() => {
                                        setBusqueda("")
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: 3,
                                        right: 38,
                                        padding: 4,
                                        opacity: refreshing ? 0.5 : 1,
                                    }}
                                >
                                    <EvilIcons name="close" size={24} color={profile.modoOscuro === true ? "#FFFF" : "#1A1A1A"} />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                refreshing={refreshing}
                                onPress={onRefresh}
                                style={{
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    backgroundColor: "#87aef0",
                                    padding: 10,
                                    borderTopRightRadius: 20,
                                    borderBottomRightRadius: 20,
                                }}
                            >
                                <FontAwesome6
                                    name="magnifying-glass"
                                    size={16}
                                    color={profile.modoOscuro === true ? "black" : "#FFFF"}
                                />
                            </TouchableOpacity>
                        </View>
                        <View style={{ marginTop: 5, justifyContent: "center", alignContent: "center" }}>
                            <TouchableOpacity
                                style={styles.opciones}
                                onPress={() => {
                                    setOpenFiltros(true)
                                }}
                            >
                                <Ionicons name="options-outline" size={24} color={profile.modoOscuro === true ? "black" : "#FFFF"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <ScrollView
                    style={{
                        flex: 1,
                        paddingHorizontal: 15,
                        paddingVertical: 10,
                    }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {tareas.map((tarea) => (
                        <TouchableOpacity
                            onPress={() => navegarMas(tarea.id)}
                            key={tarea.id}
                            style={profile.modoOscuro ? styles.cardsTareasOscuro : styles.cardsTareasClaro}
                        >
                            <View>
                                <Text style={profile.modoOscuro ? styles.tituloCardOscuro : styles.tituloCardClaro}>
                                    {tarea.nombre}
                                </Text>

                                <View style={styles.badgesContainer}>
                                    <View style={styles.badgesGroup}>
                                        <View
                                            style={[
                                                styles.badge,
                                                {
                                                    backgroundColor: getEstadoStyle(tarea.estado).backgroundColor,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgeText,
                                                    {
                                                        color: getEstadoStyle(tarea.estado).color,
                                                    },
                                                ]}
                                            >
                                                {tarea.estado}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.badge,
                                                {
                                                    backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgeText,
                                                    {
                                                        color: getPrioridadStyle(tarea.prioridad).color,
                                                    },
                                                ]}
                                            >
                                                {tarea.prioridad}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.statsGroup}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="list-outline" size={18} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                            <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>
                                                {tarea.totalSubtareas}
                                            </Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Feather name="camera" size={18} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                            <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>
                                                {tarea.totalFotografias}
                                            </Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <AntDesign name="book" size={18} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                            <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>
                                                {tarea.totalReportes}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={profile.modoOscuro ? styles.dividerOscuro : styles.dividerClaro} />

                                <View style={styles.footerContainer}>
                                    <View style={styles.fechaContainer}>
                                        <Feather name="calendar" size={18} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                        <Text style={profile.modoOscuro ? styles.fechaOscuro : styles.fechaClaro}>
                                            {formatFecha(tarea.fechaCreacion)}
                                        </Text>
                                        <Text style={profile.modoOscuro ? styles.fechaSeparator : styles.fechaSeparator}>→</Text>
                                        <Text style={profile.modoOscuro ? styles.fechaOscuro : styles.fechaClaro}>
                                            {formatFecha(tarea.fechaEntrega)}
                                        </Text>
                                    </View>

                                    <View style={styles.avatarContainer}>
                                        {tarea.tecnicos.slice(0, 3).map((tecnico, index) => (
                                            <Image
                                                key={tecnico.id}
                                                style={[
                                                    styles.avatar,
                                                    {
                                                        marginLeft: index === 0 ? 0 : -8,
                                                        zIndex: tarea.tecnicos.length - index,
                                                    },
                                                ]}
                                                source={{
                                                    uri:
                                                        tecnico.usuario?.fotoPerfil && tecnico.usuario.fotoPerfil.trim() !== ""
                                                            ? tecnico.usuario.fotoPerfil
                                                            : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                                }}
                                            />
                                        ))}

                                        {tarea.tecnicos.length > 3 && (
                                            <View style={[styles.avatar, styles.avatarExtra, { marginLeft: -8 }]}>
                                                <Text style={styles.avatarExtraText}>+{tarea.tecnicos.length - 3}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {profile.rol === "Tecnico" ? <View></View> : <BotonRegistrar />}
                <>
                    {openFiltros ? (
                        <ModalFiltros
                            open={openFiltros}
                            setOpenFiltros={setOpenFiltros}
                            setFiltros={setFiltros}
                            filtros={filtros}
                        />
                    ) : (
                        <View />
                    )}
                </>

                {loadingFiltros && !refreshing && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#87aef0" />
                        </View>
                    </View>
                )}
            </View>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerClaro: {
        paddingTop: 15,
        paddingHorizontal: 15,
        paddingBottom: 5,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 16,
    },
    headerOscuro: {
        paddingTop: 15,
        paddingHorizontal: 15,
        paddingBottom: 5,
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
    inputBusqueda: {
        paddingLeft: 15,
        borderRadius: 20,
        borderColor: "#D9D9D9",
        borderWidth: 1,
        fontSize: 16,
        paddingBottom: 7,
        paddingTop: 7,
    },
    opciones: {
        padding: 7,
        borderRadius: 9,
        backgroundColor: "#87aef0",
    },
    estadoYPrioridad: {
        marginBottom: 10,
        flexDirection: "row",
        gap: 7,
    },
    cardsTareasClaro: {
        backgroundColor: "white",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardsTareasOscuro: {
        backgroundColor: "#2C2C2C",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    tituloCardClaro: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    tituloCardOscuro: {
        color: "#ffffff",
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    badgesContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    badgesGroup: {
        flexDirection: "row",
        gap: 8,
        flex: 1,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    badgeText: {
        fontWeight: "600",
        fontSize: 12,
        letterSpacing: 0.3,
    },
    statsGroup: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    numerosClaro: {
        fontSize: 13,
        color: "#666",
        fontWeight: "600",
    },
    numerosOscuro: {
        fontSize: 13,
        color: "#B0B0B0",
        fontWeight: "600",
    },
    dividerClaro: {
        height: 1,
        backgroundColor: "#f0f0f0",
        marginBottom: 4,
    },
    dividerOscuro: {
        height: 1,
        backgroundColor: "#404040",
        marginBottom: 4,
    },
    footerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    fechaContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    fechaClaro: {
        fontSize: 13,
        color: "#666",
        fontWeight: "500",
    },
    fechaOscuro: {
        fontSize: 13,
        color: "#B0B0B0",
        fontWeight: "500",
    },
    fechaSeparator: {
        fontSize: 12,
        color: "#999",
        marginHorizontal: 2,
    },
    avatarContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#B0B0B0",
    },
    avatarExtra: {
        backgroundColor: "#87aef0",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarExtraText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    item: {
        padding: 1,
        marginRight: 10,
        borderRadius: 5,
        fontSize: 14,
        width: "auto",
        fontWeight: "600",
        color: "gray",
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    loadingContainer: {
        backgroundColor: "transparent",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: "600",
        color: "#353335",
    },
})
