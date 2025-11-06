"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import AntDesign from "@expo/vector-icons/AntDesign"
import Feather from "@expo/vector-icons/Feather"
import FontAwesome from "@expo/vector-icons/FontAwesome"
import FontAwesome5 from "@expo/vector-icons/FontAwesome5"
import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import axios from "axios"
import * as ImagePicker from "expo-image-picker"
import {
    addDoc,
    arrayRemove,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    updateDoc,
    where,
} from "firebase/firestore"
import Toast from "react-native-toast-message"
import appFirebase, { cloudinaryConfig } from "../../credenciales/Credenciales"
import { useAuth } from "../login/AuthContext"

const { height } = Dimensions.get("window")
const windowWidth = Dimensions.get("window").width

const TareaDetails = ({ route, navigation }) => {
    const db = getFirestore(appFirebase)
    const { profile } = useAuth()
    const { id, onGoBack } = route.params
    const flatListRef = useRef(null)

    const [loading, setLoading] = useState(true)
    const [tarea, setTarea] = useState({})
    const [creador, setCreador] = useState({})
    const [tecnicos, setTecnicos] = useState([])
    const [expandido, setExpandido] = useState({})
    const [visibleModal, setVisibleModal] = useState(false)
    const [foto, setFoto] = useState([])

    const [modalVisible, setModalVisible] = useState(false)
    const [carouselItems, setCarouselItems] = useState([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [heights, setHeights] = useState({})

    const [modalVisibleSubtarea, setModalVisibleSubtarea] = useState(false)
    const [subtareaPendienteCambio, setSubtareaPendienteCambio] = useState(null)
    const [nuevoEstadoSubtarea, setNuevoEstadoSubtarea] = useState(null)

    const [textoPrincipal, setTextoPrincipal] = useState("")
    const [textoSecundario, setTextoSecundario] = useState("")
    const [subtareas, setSubtareas] = useState([])

    const [visible, setVisible] = useState(false)
    const translateY = useRef(new Animated.Value(height)).current

    const openModal = (imagenes, index) => {
        if (!Array.isArray(imagenes) || imagenes.length === 0) {
            console.warn("No hay imágenes para mostrar")
            return
        }
        setCarouselItems(imagenes)
        setActiveIndex(index)
        setModalVisible(true)
    }

    useEffect(() => {
        if (carouselItems.length === 0) return

        carouselItems.forEach((uri) => {
            Image.getSize(
                uri,
                (width, height) => {
                    const aspectRatio = height / width
                    setHeights((prev) => ({
                        ...prev,
                        [uri]: windowWidth * aspectRatio,
                    }))
                },
                (error) => console.log("Error al obtener tamaño:", error),
            )
        })
    }, [carouselItems])

    const saveEvidencias = async (urls) => {
        if (!urls || urls.length === 0) {
            console.warn("No hay URLs para guardar")
            return
        }

        try {
            const evidenciasRef = collection(db, "TAREA", id, "Evidencias")

            await addDoc(evidenciasRef, {
                IDUsuario: profile.id,
                fechaDeEntrega: new Date(),
                fotografias: urls,
            })

            console.log("✅ Evidencias guardadas en Firestore")
            Toast.show({
                type: "success",
                text1: "Éxito",
                text2: "Evidencias guardadas correctamente",
            })

            await cargarDatos()
        } catch (error) {
            console.error("❌ Error al guardar evidencias:", error)
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudieron guardar las evidencias",
            })
        }
    }

    const fotografias = async () => {
        try {
            // 1. Pedir permiso para acceder a la galería
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permiso requerido", "Necesitas otorgar permiso para acceder a la galería.")
                return
            }

            // 2. Abrir galería con selección múltiple
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 1,
            })

            console.log("📸 Resultado:", result)

            if (result.canceled) {
                console.log("Usuario canceló la selección")
                return
            }

            if (!result.assets || result.assets.length === 0) {
                console.warn("No se seleccionaron imágenes")
                return
            }

            // Mostrar indicador de carga
            Toast.show({
                type: "info",
                text1: "Subiendo imágenes...",
                text2: "Por favor espera",
            })

            const urls = []

            for (const asset of result.assets) {
                const data = new FormData()
                data.append("file", {
                    uri: asset.uri,
                    type: "image/jpeg",
                    name: asset.fileName || `foto_${Date.now()}.jpg`,
                })
                data.append("upload_preset", cloudinaryConfig.uploadPreset)

                const res = await axios.post(
                    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                    data,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                        timeout: 30000, // 30 segundos de timeout
                    },
                )

                urls.push(res.data.secure_url)
                console.log("✅ Imagen subida:", res.data.secure_url)
            }

            Toast.show({
                type: "success",
                text1: "Éxito",
                text2: `${urls.length} imagen(es) subida(s) correctamente`,
            })

            setFoto(urls)
            await saveEvidencias(urls)
            closeSheet()
        } catch (err) {
            console.error("❌ Error al subir imágenes:", err.response?.data || err.message)
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudieron subir las imágenes",
            })
        }
    }

    const eliminarEvidencia = (idTarea, idEvidenciaDoc, urlFoto) => {
        Alert.alert("Eliminar imagen", "¿Deseas eliminar esta imagen?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: async () => {
                    try {
                        console.log("Intentando eliminar...", { idTarea, idEvidenciaDoc, urlFoto })

                        const evidenciaRef = doc(db, "TAREA", idTarea, "Evidencias", idEvidenciaDoc)
                        await updateDoc(evidenciaRef, {
                            fotografias: arrayRemove(urlFoto),
                        })

                        console.log("✅ Imagen eliminada correctamente")

                        Toast.show({
                            type: "success",
                            text1: "Éxito",
                            text2: "Imagen eliminada correctamente",
                        })

                        await cargarDatos()
                    } catch (error) {
                        console.error("❌ Error al eliminar evidencia:", error)
                        Toast.show({
                            type: "error",
                            text1: "Error",
                            text2: "No se pudo eliminar la imagen",
                        })
                    }
                },
            },
        ])
    }

    const cargarDatos = useCallback(async () => {
        if (!id) {
            console.warn("No hay ID de tarea")
            return
        }

        setLoading(true)

        try {
            // 1. Cargar documento principal de la tarea
            const docRef = doc(db, "TAREA", id)
            const responseTarea = await getDoc(docRef)

            let tareaData = {}
            if (responseTarea.exists()) {
                tareaData = responseTarea.data()
                setTarea(tareaData)
            } else {
                console.error("La tarea no existe")
                setLoading(false)
                return
            }

            // 2. Cargar datos del creador
            if (tareaData?.IDCreador) {
                try {
                    const creadorRef = doc(db, "USUARIO", tareaData.IDCreador.id)
                    const creadorSnap = await getDoc(creadorRef)
                    if (creadorSnap.exists()) {
                        setCreador(creadorSnap.data())
                    }
                } catch (error) {
                    console.error("Error cargando creador:", error)
                }
            }

            // 3. Cargar técnicos asignados
            const refTecnicos = collection(db, "TAREA", id, "Tecnicos")
            const snap = await getDocs(refTecnicos)

            const tecnicosData = await Promise.all(
                snap.docs.map(async (d) => {
                    const data = d.data()
                    let usuario = null
                    let idUsuario = null

                    // Obtener referencia del usuario
                    let userRef = null
                    if (typeof data.IDUsuario === "string") {
                        userRef = doc(db, "USUARIO", data.IDUsuario)
                        idUsuario = data.IDUsuario
                    } else if (data.IDUsuario?.path) {
                        userRef = data.IDUsuario
                        idUsuario = data.IDUsuario.id
                    }

                    if (userRef) {
                        try {
                            const userSnap = await getDoc(userRef)
                            if (userSnap.exists()) {
                                usuario = userSnap.data()
                                idUsuario = userSnap.id
                            }
                        } catch (error) {
                            console.error("Error cargando usuario:", error)
                        }
                    }

                    // Cargar evidencias del técnico
                    const evidencias = []
                    if (idUsuario) {
                        try {
                            const evidenciasRef = collection(db, "TAREA", id, "Evidencias")
                            const q = query(evidenciasRef, where("IDUsuario", "==", idUsuario))
                            const evidenciasSnap = await getDocs(q)

                            evidenciasSnap.docs.forEach((docE) => {
                                const ev = docE.data()
                                evidencias.push({
                                    idEvidenciaDoc: docE.id,
                                    fotografias: Array.isArray(ev.fotografias) ? ev.fotografias : [],
                                    fechaDeEntrega: ev.fechaDeEntrega?.toDate?.() || new Date(),
                                })
                            })
                        } catch (error) {
                            console.error("Error cargando evidencias:", error)
                        }
                    }

                    return {
                        id: d.id,
                        idUsuario,
                        ...data,
                        usuario,
                        evidencias: Array.isArray(evidencias) ? evidencias : [],
                    }
                }),
            )

            setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : [])

            // 4. Cargar subtareas
            try {
                const refSubtareas = collection(db, "TAREA", id, "Subtareas")
                const snapshotSubtareas = await getDocs(refSubtareas)
                const subtareasData = snapshotSubtareas.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }))

                console.log("📋 Subtareas cargadas:", subtareasData.length)
                setSubtareas(subtareasData)
            } catch (error) {
                console.error("❌ Error al cargar subtareas:", error)
                setSubtareas([])
            }
        } catch (error) {
            console.error("❌ Error cargando datos:", error)
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudieron cargar los datos",
            })
        } finally {
            setLoading(false)
        }
    }, [id, db])

    useEffect(() => {
        cargarDatos()
    }, [cargarDatos])

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

        return dateObj.toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        })
    }

    const getEstadoStyle = (estado) => {
        if (!estado) {
            return {
                backgroundColor: profile.modoOscuro ? "#333" : "#EEE",
                color: profile.modoOscuro ? "white" : "black",
            }
        }

        const estilos = {
            Completada: { backgroundColor: "#47A997", color: "white" },
            Revisada: { backgroundColor: "#B383E2", color: "white" },
            Pendiente: { backgroundColor: "#F4C54C", color: "black" },
            "En Proceso": { backgroundColor: "#57A7FE", color: "white" },
            "No Entregada": { backgroundColor: "#F5615C", color: "white" },
        }

        return (
            estilos[estado] || {
                backgroundColor: profile.modoOscuro ? "#333" : "#EEE",
                color: profile.modoOscuro ? "white" : "black",
            }
        )
    }

    const getPrioridadStyle = (prioridad) => {
        if (!prioridad) {
            return {
                backgroundColor: profile.modoOscuro ? "#333" : "#EEE",
                color: profile.modoOscuro ? "white" : "black",
            }
        }

        const estilos = {
            Alta: { backgroundColor: "#F5615C", color: "white" },
            Media: { backgroundColor: "#F5C44C", color: "white" },
            Baja: { backgroundColor: "#57A6FF", color: "white" },
        }

        return (
            estilos[prioridad] || {
                backgroundColor: profile.modoOscuro ? "#333" : "#EEE",
                color: profile.modoOscuro ? "white" : "black",
            }
        )
    }

    const updateEstado = async (modalOupdate) => {
        try {
            const refTarea = doc(db, "TAREA", id)
            let cambio = false

            if (profile.rol === "Tecnico") {
                switch (tarea.estado) {
                    case "Pendiente":
                        if (modalOupdate) {
                            setTextoPrincipal("¿Deseas cambiar el estado de esta tarea a En Proceso?")
                            setTextoSecundario("Si lo cambias, ya no podrás regresar el estado a pendiente.")
                            setVisibleModal(true)
                        } else {
                            await updateDoc(refTarea, { estado: "En Proceso" })
                            cambio = true
                            setVisibleModal(false)
                            Toast.show({
                                type: "success",
                                text1: "Tarea En Proceso",
                                text2: "¡Buen trabajo, sigue así!",
                            })
                        }
                        break

                    case "En Proceso":
                        if (modalOupdate) {
                            setTextoPrincipal("¿Deseas cambiar el estado de esta tarea a completada?")
                            setTextoSecundario("Si lo cambias, ya no podrás adjuntar más evidencias a esta tarea.")
                            setVisibleModal(true)
                        } else {
                            await updateDoc(refTarea, { estado: "Completada" })
                            cambio = true
                            setVisibleModal(false)
                            Toast.show({
                                type: "success",
                                text1: "Tarea completada",
                                text2: "¡Buen trabajo, sigue así!",
                            })
                        }
                        break

                    case "Completada":
                        if (modalOupdate) {
                            setTextoPrincipal("¿Deseas anular la entrega?")
                            setTextoSecundario("Recuerda entregar la tarea antes de la fecha límite.")
                            setVisibleModal(true)
                        } else {
                            await updateDoc(refTarea, { estado: "En Proceso" })
                            cambio = true
                            setVisibleModal(false)
                            Toast.show({
                                type: "success",
                                text1: "Entrega Cancelada",
                                text2: "¡Asegúrate de entregarla a tiempo!",
                            })
                        }
                        break

                    default:
                        console.log("Estado no reconocido:", tarea.estado)
                        break
                }
            }

            if (profile.rol === "Administrador" || profile.rol === "Gestor") {
                if (tarea.estado === "Completada") {
                    if (modalOupdate) {
                        setTextoPrincipal("¿Deseas cambiar el estado de esta tarea a revisada?")
                        setTextoSecundario("Si lo cambias, ya no podrás cambiarlo.")
                        setVisibleModal(true)
                    } else {
                        await updateDoc(refTarea, { estado: "Revisada" })
                        cambio = true
                        setVisibleModal(false)
                        Toast.show({
                            type: "success",
                            text1: "Tarea Revisada",
                            text2: "¡Buen trabajo!",
                        })
                    }
                } else if (tarea.estado === "Revisada") {
                    if (modalOupdate) {
                        setTextoPrincipal("¿Deseas cancelar la revisión?")
                        setTextoSecundario("Si lo cambias, cambiará a completada.")
                        setVisibleModal(true)
                    } else {
                        await updateDoc(refTarea, { estado: "Completada" })
                        cambio = true
                        setVisibleModal(false)
                        Toast.show({
                            type: "success",
                            text1: "Revisión Cancelada",
                            text2: "¡Asegúrate de Revisarla!",
                        })
                    }
                }
            }

            if (cambio) {
                if (typeof onGoBack === "function") {
                    onGoBack()
                }
                console.log("✅ Estado actualizado correctamente")
                await cargarDatos()
            }
        } catch (error) {
            console.error("❌ Error actualizando estado:", error)
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudo actualizar el estado",
            })
        }
    }

    const updateEstadoSubtarea = async (modalOupdate, IDSubtarea, estadoSubtarea) => {
        try {
            if (!IDSubtarea) {
                console.error("❌ IDSubtarea no definido")
                return
            }

            const refTarea = doc(db, "TAREA", id)
            const docSubtarea = doc(refTarea, "Subtareas", IDSubtarea)

            if (modalOupdate) {
                let mensajePrincipal = ""
                let mensajeSecundario = ""
                let nuevoEstado = ""

                switch (estadoSubtarea) {
                    case "Pendiente":
                        mensajePrincipal = "¿Deseas cambiar el estado de esta subtarea a En Proceso?"
                        mensajeSecundario = "Si lo cambias, ya no podrás volverla a Pendiente."
                        nuevoEstado = "En Proceso"
                        break
                    case "En Proceso":
                        mensajePrincipal = "¿Deseas marcar esta subtarea como Completada?"
                        mensajeSecundario = "Una vez completada, no podrás adjuntar más evidencias."
                        nuevoEstado = "Completada"
                        break
                    case "Completada":
                        mensajePrincipal = "¿Deseas anular la entrega de esta subtarea?"
                        mensajeSecundario = "Volverá al estado En Proceso."
                        nuevoEstado = "En Proceso"
                        break
                    default:
                        console.warn("Estado no reconocido:", estadoSubtarea)
                        return
                }

                setTextoPrincipal(mensajePrincipal)
                setTextoSecundario(mensajeSecundario)
                setNuevoEstadoSubtarea(nuevoEstado)
                setSubtareaPendienteCambio(IDSubtarea)
                setModalVisibleSubtarea(true)
                return
            }

            // Actualizar estado de la subtarea
            await updateDoc(docSubtarea, { estado: nuevoEstadoSubtarea })
            setModalVisibleSubtarea(false)

            Toast.show({
                type: "success",
                text1: nuevoEstadoSubtarea === "Completada" ? "Subtarea completada ✅" : "Estado actualizado",
                text2: nuevoEstadoSubtarea === "Completada" ? "¡Buen trabajo, sigue así!" : "Estado cambiado correctamente",
            })

            // Actualizar estado local
            setSubtareas((prev) => prev.map((s) => (s.id === IDSubtarea ? { ...s, estado: nuevoEstadoSubtarea } : s)))

            // Verificar si se debe actualizar el estado de la tarea principal
            const refSubtareas = collection(refTarea, "Subtareas")
            const snapshot = await getDocs(refSubtareas)
            const estados = snapshot.docs.map((d) => d.data().estado)

            // Si alguna está "En Proceso", la tarea pasa a "En Proceso"
            if (estados.includes("En Proceso") && tarea.estado === "Pendiente") {
                await updateDoc(refTarea, { estado: "En Proceso" })
                Toast.show({
                    type: "info",
                    text1: "Tarea en proceso",
                    text2: "Una subtarea ha comenzado su ejecución.",
                })
            }

            // Si todas están "Completadas", la tarea pasa a "Completada"
            const todasCompletadas = estados.every((e) => e === "Completada")
            if (todasCompletadas && estados.length > 0) {
                await updateDoc(refTarea, { estado: "Completada" })
                Toast.show({
                    type: "success",
                    text1: "🎉 Tarea completada",
                    text2: "Todas las subtareas han sido finalizadas.",
                })
            }

            await cargarDatos()
        } catch (error) {
            console.error("❌ Error actualizando estado de subtarea:", error)
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudo actualizar el estado",
            })
        }
    }

    const toggleExpandir = (id) => {
        setExpandido((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    const openSheet = () => {
        setVisible(true)
        Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }

    const closeSheet = () => {
        Animated.timing(translateY, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setVisible(false))
    }

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) translateY.setValue(gesture.dy)
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > 100) {
                    closeSheet()
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start()
                }
            },
        }),
    ).current

    const screenWidth = Dimensions.get("window").width
    useEffect(() => {
        if (tarea.imagenAdjuntaInstrucciones && tarea.imagenAdjuntaInstrucciones.length > 0) {
            tarea.imagenAdjuntaInstrucciones.forEach((url, index) => {
                Image.getSize(
                    url,
                    (width, height) => {
                        const scaleFactor = screenWidth / width
                        const imageHeight = height * scaleFactor

                        setHeights((prev) => ({
                            ...prev,
                            [index]: imageHeight,
                        }))
                    },
                    (error) => console.log("Error al obtener tamaño de imagen:", error),
                )
            })
        }
    }, [tarea.imagenAdjuntaInstrucciones, screenWidth])

    if (loading) {
        return (
            <View style={profile.modoOscuro ? styles.loaderOscuro : styles.loaderClaro}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ color: profile.modoOscuro ? "#FFFF" : "black" }}>Cargando datos...</Text>
            </View>
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: profile.modoOscuro ? "#2C2C2C" : "white" }}>
            <View style={{ marginTop: 30, justifyContent: "space-between", flexDirection: "row" }}>
                <TouchableOpacity style={{ padding: 10 }} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color={profile.modoOscuro ? "#FFFF" : "black"} />
                </TouchableOpacity>
                {(profile.rol === "Administrador" || profile.rol === "Gestor") && (
                    <TouchableOpacity onPress={() => navigation.navigate("EditTarea", { id: id })} style={{ padding: 10 }}>
                        <Feather name="edit" size={24} color={profile.modoOscuro ? "#FFFF" : "black"} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={{ paddingHorizontal: 15, paddingTop: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ paddingRight: profile.rol === "Administrador" || profile.rol === "Gestor" ? 10 : 0 }}>
                        <Text style={profile.modoOscuro ? styles.nombreOscuro : styles.nombreClaro}>{tarea.nombre}</Text>
                    </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginVertical: 5 }}>
                    <View>
                        <Text
                            style={[
                                {
                                    color: getEstadoStyle(tarea.estado).color,
                                    fontWeight: "500",
                                    backgroundColor: getEstadoStyle(tarea.estado).backgroundColor,
                                    paddingVertical: 2,
                                    paddingHorizontal: 12,
                                    borderRadius: 6,
                                },
                            ]}
                        >
                            {tarea.estado}
                        </Text>
                    </View>
                    <View>
                        <Text
                            style={[
                                {
                                    color: getPrioridadStyle(tarea.prioridad).color,
                                    fontWeight: "500",
                                    backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor,
                                    paddingVertical: 2,
                                    paddingHorizontal: 12,
                                    borderRadius: 6,
                                },
                            ]}
                        >
                            {tarea.prioridad}
                        </Text>
                    </View>
                </View>

                <View>
                    <Text style={profile.modoOscuro ? styles.descripcionOscuro : styles.descripcionClaro}>
                        {tarea.descripcion}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 7, marginTop: 10 }}>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Feather name="calendar" size={20} color={profile.modoOscuro ? "#d2d2d2ff" : "#7B7B7B"} />
                    </View>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>
                            {formatFecha(tarea.fechaCreacion)} - {formatFecha(tarea.fechaEntrega)}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: "row", gap: 7, marginBottom: 10 }}>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <FontAwesome5 name="user-tie" size={20} color={profile.modoOscuro ? "#d2d2d2ff" : "#7B7B7B"} />
                    </View>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>
                            Por el {creador?.rol ?? ""}{" "}
                            {[
                                creador?.primerNombre ?? "",
                                creador?.segundoNombre ?? "",
                                creador?.primerApellido ?? "",
                                creador?.segundoApellido ?? "",
                            ]
                                .filter((name) => name.trim() !== "")
                                .join(" ")}
                        </Text>
                    </View>
                </View>

                {tarea.imagenAdjuntaInstrucciones && tarea.imagenAdjuntaInstrucciones.length > 0 && (
                    <View>
                        {tarea.imagenAdjuntaInstrucciones.map((url, index) => (
                            <TouchableOpacity key={index} onPress={() => openModal(tarea.imagenAdjuntaInstrucciones, index)}>
                                <Image
                                    source={{ uri: url }}
                                    style={{
                                        width: "100%",
                                        height: heights[index] || 200,
                                        borderRadius: 10,
                                        marginBottom: 5,
                                    }}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ paddingBottom: 20 }}>
                    <Text style={[styles.titulo, { paddingTop: 20 }, { color: profile.modoOscuro ? "white" : "black" }]}>
                        Asignación de la Tarea
                    </Text>

                    {Array.isArray(tecnicos) &&
                        tecnicos.map((tecnico) => (
                            <View key={tecnico.id}>
                                {subtareas.length > 0 ? (
                                    <View
                                        style={{
                                            backgroundColor: tecnico.idUsuario === profile.id ? "#64ab61ff" : "#8BA7E6",
                                            borderRadius: 11,
                                            paddingLeft: 12,
                                            paddingVertical: 6,
                                            marginTop: 10,
                                            flex: 1,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            zIndex: 5,
                                        }}
                                    >
                                        <Image
                                            style={{ width: 40, height: 40, borderRadius: 100 }}
                                            source={{
                                                uri:
                                                    tecnico.usuario?.fotoPerfil?.trim() !== ""
                                                        ? tecnico.usuario.fotoPerfil
                                                        : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                            }}
                                        />
                                        <View style={{ justifyContent: "center", paddingLeft: 10, flex: 1 }}>
                                            <Text
                                                style={{
                                                    color: profile.modoOscuro ? "black" : "#FFFF",
                                                    fontWeight: "500",
                                                    fontSize: 16,
                                                }}
                                            >
                                                {[
                                                    tecnico.usuario?.primerNombre ?? "",
                                                    tecnico.usuario?.segundoNombre ?? "",
                                                    tecnico.usuario?.primerApellido ?? "",
                                                    tecnico.usuario?.segundoApellido ?? "",
                                                ]
                                                    .filter((name) => name.trim() !== "")
                                                    .join(" ")}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View>
                                        <TouchableOpacity
                                            onPress={() => toggleExpandir(tecnico.id)}
                                            style={{
                                                backgroundColor: tecnico.idUsuario === profile.id ? "#64ab61ff" : "#8BA7E6",
                                                borderRadius: 11,
                                                paddingLeft: 12,
                                                paddingVertical: 6,
                                                marginTop: 10,
                                                flex: 1,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                zIndex: 5,
                                            }}
                                        >
                                            <Image
                                                style={{ width: 40, height: 40, borderRadius: 100 }}
                                                source={{
                                                    uri:
                                                        tecnico.usuario?.fotoPerfil?.trim() !== ""
                                                            ? tecnico.usuario.fotoPerfil
                                                            : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                                }}
                                            />
                                            <View style={{ justifyContent: "center", paddingLeft: 10, flex: 1 }}>
                                                <Text
                                                    style={{
                                                        color: profile.modoOscuro ? "black" : "#FFFF",
                                                        fontWeight: "500",
                                                        fontSize: 16,
                                                    }}
                                                >
                                                    {[
                                                        tecnico.usuario?.primerNombre ?? "",
                                                        tecnico.usuario?.segundoNombre ?? "",
                                                        tecnico.usuario?.primerApellido ?? "",
                                                        tecnico.usuario?.segundoApellido ?? "",
                                                    ]
                                                        .filter((name) => name.trim() !== "")
                                                        .join(" ")}
                                                </Text>
                                            </View>
                                            <View style={{ padding: 10 }}>
                                                <MaterialIcons
                                                    name={expandido[tecnico.id] ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                                    size={24}
                                                    color={profile.modoOscuro ? "black" : "white"}
                                                />
                                            </View>
                                        </TouchableOpacity>

                                        {expandido[tecnico.id] && (
                                            <View
                                                style={{
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 14,
                                                    backgroundColor: tecnico.idUsuario === profile.id ? "#75cd72ff" : "#abbbdfff",
                                                    marginTop: -8,
                                                    zIndex: 3,
                                                    justifyContent: "center",
                                                    alignContent: "center",
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 4 }}>
                                                    {Array.isArray(tecnico.evidencias) &&
                                                        tecnico.evidencias.map((evidencia, evIndex) => (
                                                            <React.Fragment key={evIndex}>
                                                                {Array.isArray(evidencia.fotografias) &&
                                                                    evidencia.fotografias.map((img, index) => (
                                                                        <View key={index} style={{ position: "relative", margin: 4 }}>
                                                                            <TouchableOpacity onPress={() => openModal(evidencia.fotografias, index)}>
                                                                                <Image
                                                                                    source={{ uri: img }}
                                                                                    style={{
                                                                                        width: 100,
                                                                                        height: 100,
                                                                                        borderRadius: 10,
                                                                                    }}
                                                                                />
                                                                            </TouchableOpacity>

                                                                            {profile.rol === "Tecnico" && tarea.estado === "En Proceso" && (
                                                                                <TouchableOpacity
                                                                                    onPress={() => eliminarEvidencia(id, evidencia.idEvidenciaDoc, img)}
                                                                                    style={{
                                                                                        position: "absolute",
                                                                                        top: 5,
                                                                                        right: 5,
                                                                                        backgroundColor: "rgba(255,255,255,0.8)",
                                                                                        borderRadius: 20,
                                                                                        padding: 2,
                                                                                    }}
                                                                                >
                                                                                    <AntDesign name="delete" size={18} color="red" />
                                                                                </TouchableOpacity>
                                                                            )}
                                                                        </View>
                                                                    ))}
                                                            </React.Fragment>
                                                        ))}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))}
                </View>

                {subtareas.length > 0 && (
                    <View style={{ paddingBottom: 20, marginTop: 10 }}>
                        <Text
                            style={{
                                fontSize: 22,
                                fontWeight: "700",
                                color: profile.modoOscuro ? "white" : "#1A1A1A",
                                marginBottom: 10,
                            }}
                        >
                            Subtareas
                        </Text>

                        {subtareas
                            .sort((a, b) => a.orden - b.orden)
                            .map((item, index) => {
                                const anteriorCompletada = index === 0 || subtareas[index - 1]?.estado === "Completada"
                                const siguienteCompletada = subtareas[index + 1]?.estado === "Completada"
                                const mostrarBoton = anteriorCompletada && !(item.estado === "Completada" && siguienteCompletada)

                                return (
                                    <View
                                        key={item.id || index}
                                        style={{
                                            backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#F5F5F5",
                                            padding: 15,
                                            borderRadius: 12,
                                            marginVertical: 8,
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 3 },
                                            shadowOpacity: 0.2,
                                            shadowRadius: 4,
                                            elevation: 3,
                                            opacity: !anteriorCompletada && item.estado !== "Completada" ? 0.5 : 1,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: profile.modoOscuro ? "#FFFFFF" : "#1A1A1A",
                                                    fontWeight: "700",
                                                    fontSize: 16,
                                                }}
                                            >
                                                {`No. ${item.orden}: ${item.nombre}`}
                                            </Text>

                                            <Text
                                                style={{
                                                    color: getEstadoStyle(item.estado).color,
                                                    backgroundColor: getEstadoStyle(item.estado).backgroundColor,
                                                    fontWeight: "600",
                                                    fontSize: 12,
                                                    paddingVertical: 4,
                                                    paddingHorizontal: 10,
                                                    borderRadius: 8,
                                                    textTransform: "capitalize",
                                                }}
                                            >
                                                {item.estado}
                                            </Text>
                                        </View>

                                        <Text
                                            style={{
                                                color: profile.modoOscuro ? "#D1D1D1" : "#333333",
                                                fontSize: 14,
                                                lineHeight: 20,
                                                marginBottom: item.imagenAdjuntaInstrucciones?.length > 0 ? 10 : 0,
                                            }}
                                        >
                                            {item.descripcion}
                                        </Text>

                                        {item.imagenAdjuntaInstrucciones?.length > 0 && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 5 }}>
                                                {item.imagenAdjuntaInstrucciones.map((uri, i) => (
                                                    <TouchableOpacity
                                                        key={`${item.id || index}-img-${i}`}
                                                        onPress={() => openModal(item.imagenAdjuntaInstrucciones, i)}
                                                    >
                                                        <Image
                                                            source={{ uri }}
                                                            style={{
                                                                width: 100,
                                                                height: 100,
                                                                borderRadius: 10,
                                                                marginRight: 8,
                                                                borderWidth: 1,
                                                                borderColor: profile.modoOscuro ? "#444" : "#DDD",
                                                            }}
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )}

                                        {anteriorCompletada &&
                                            item.estado !== "Completada" &&
                                            item.estado !== "Revisada" &&
                                            profile.rol === "Tecnico" && (
                                                <View>
                                                    {item.estado !== "Completada" && item.estado !== "Revisada" && (
                                                        <TouchableOpacity
                                                            style={[
                                                                {
                                                                    alignItems: "center",
                                                                    paddingVertical: 10,
                                                                    paddingHorizontal: 15,
                                                                    borderRadius: 8,
                                                                    borderWidth: 1,
                                                                    borderColor: profile.modoOscuro ? "#666" : "#CCC",
                                                                    backgroundColor: profile.modoOscuro ? "#3A3A3A" : "#E8E8E8",
                                                                    flex: 1,
                                                                    marginVertical: 3,
                                                                },
                                                                styles.botonAdjuntar,
                                                            ]}
                                                            onPress={openSheet}
                                                        >
                                                            <AntDesign
                                                                name="plus"
                                                                size={20}
                                                                color={profile.modoOscuro ? "#FFF" : "#777676"}
                                                                style={{ marginRight: 6 }}
                                                            />
                                                            <Text
                                                                style={{
                                                                    color: profile.modoOscuro ? "#FFF" : "#555",
                                                                    fontWeight: "600",
                                                                    fontSize: 15,
                                                                }}
                                                            >
                                                                Evidencias
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}

                                                    {mostrarBoton && (
                                                        <TouchableOpacity
                                                            style={[
                                                                item.estado === "Pendiente"
                                                                    ? styles.botonEnProceso
                                                                    : item.estado === "En Proceso"
                                                                        ? styles.botonEnCompletada
                                                                        : styles.botonCancelarEntrega,
                                                            ]}
                                                            onPress={() => updateEstadoSubtarea(true, item.id, item.estado)}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: profile.modoOscuro ? "black" : "white",
                                                                    fontWeight: "600",
                                                                    fontSize: 16,
                                                                }}
                                                            >
                                                                {item.estado === "Pendiente"
                                                                    ? "Marcar como En Proceso"
                                                                    : item.estado === "En Proceso"
                                                                        ? "Marcar como Completada"
                                                                        : "Cancelar entrega"}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                    </View>
                                )
                            })}
                    </View>
                )}
            </ScrollView>

            <View style={{ paddingBottom: 10 }}>
                {profile.rol === "Tecnico" && subtareas.length === 0 && (
                    <View>
                        {tarea.estado === "Pendiente" && (
                            <View
                                style={{
                                    paddingTop: 10,
                                    marginBottom: 10,
                                    paddingHorizontal: 10,
                                    gap: 5,
                                    borderTopWidth: 1,
                                    borderColor: "#D9D9D9",
                                }}
                            >
                                <TouchableOpacity style={[styles.botonEnProceso]} onPress={() => updateEstado(true)}>
                                    <Text
                                        style={
                                            profile.modoOscuro
                                                ? { color: "black", fontWeight: "600", fontSize: 16 }
                                                : { color: "white", fontWeight: "600", fontSize: 16 }
                                        }
                                    >
                                        Marcar como en proceso
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {tarea.estado === "En Proceso" && (
                            <View
                                style={{
                                    paddingTop: 10,
                                    marginBottom: 10,
                                    paddingHorizontal: 10,
                                    gap: 5,
                                    borderTopWidth: 1,
                                    borderColor: "#D9D9D9",
                                }}
                            >
                                <TouchableOpacity style={[styles.botonAdjuntar]} onPress={openSheet}>
                                    <AntDesign name="plus" size={20} color={profile.modoOscuro ? "#FFFF" : "#777676ff"} />
                                    <Text
                                        style={
                                            profile.modoOscuro
                                                ? { color: "white", fontWeight: "600", fontSize: 16 }
                                                : { color: "#777676ff", fontWeight: "600", fontSize: 16 }
                                        }
                                    >
                                        Evidencias
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.botonEnCompletada]} onPress={() => updateEstado(true)}>
                                    <Text
                                        style={
                                            profile.modoOscuro
                                                ? { color: "black", fontWeight: "600", fontSize: 16 }
                                                : { color: "white", fontWeight: "600", fontSize: 16 }
                                        }
                                    >
                                        Marcar como completada
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {tarea.estado === "Completada" && (
                            <View
                                style={{
                                    paddingTop: 10,
                                    marginBottom: 10,
                                    paddingHorizontal: 10,
                                    gap: 5,
                                    borderTopWidth: 1,
                                    borderColor: "#D9D9D9",
                                }}
                            >
                                <TouchableOpacity style={[styles.botonCancelarEntrega]} onPress={() => updateEstado(true)}>
                                    <Text
                                        style={
                                            profile.modoOscuro
                                                ? { color: "black", fontWeight: "600", fontSize: 16 }
                                                : { color: "white", fontWeight: "600", fontSize: 16 }
                                        }
                                    >
                                        Cancelar entrega
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {(profile.rol === "Administrador" || profile.rol === "Gestor") && (
                    <View>
                        {tarea.estado === "Completada" && (
                            <View
                                style={{
                                    paddingTop: 10,
                                    marginBottom: 10,
                                    paddingHorizontal: 10,
                                    gap: 5,
                                    borderTopWidth: 1,
                                    borderColor: "#D9D9D9",
                                }}
                            >
                                <TouchableOpacity style={[styles.botonMarcarRevisada]} onPress={() => updateEstado(true)}>
                                    <Text
                                        style={
                                            profile.modoOscuro
                                                ? { color: "black", fontWeight: "600", fontSize: 16 }
                                                : { color: "white", fontWeight: "600", fontSize: 16 }
                                        }
                                    >
                                        Marcar como revisada
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {tarea.estado === "Revisada" && (
                            <View
                                style={{
                                    paddingTop: 10,
                                    marginBottom: 10,
                                    paddingHorizontal: 10,
                                    gap: 5,
                                    borderTopWidth: 1,
                                    borderColor: "#D9D9D9",
                                }}
                            >
                                <TouchableOpacity style={[styles.botonCancelarEntrega]} onPress={() => updateEstado(true)}>
                                    <Text
                                        style={
                                            profile.modoOscuro
                                                ? { color: "black", fontWeight: "600", fontSize: 16 }
                                                : { color: "white", fontWeight: "600", fontSize: 16 }
                                        }
                                    >
                                        Cancelar Revisión
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {visible && (
                <Animated.View
                    {...panResponder.panHandlers}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 200,
                        flex: 1,
                        transform: [{ translateY }],
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "white",
                        paddingHorizontal: 20,
                        paddingTop: 5,
                        shadowColor: "#000",
                        shadowOpacity: 0.2,
                        shadowOffset: { width: 0, height: -2 },
                        borderTopWidth: 1,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                        borderColor: "#D9D9D9",
                    }}
                >
                    <View style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: 52, height: 6, borderRadius: 3, backgroundColor: "#e5e7eb" }} />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: profile.modoOscuro ? "white" : "#777676ff" }}>
                            Selecciona una opción
                        </Text>
                        <TouchableOpacity onPress={closeSheet} style={{ padding: 10 }}>
                            <AntDesign name="close" size={24} color={profile.modoOscuro ? "white" : "#777676ff"} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ gap: 5, marginTop: 5 }}>
                        <TouchableOpacity
                            style={styles.botonAdjuntar}
                            onPress={() => {
                                console.log("📄 Reporte - Funcionalidad pendiente")
                                Toast.show({
                                    type: "info",
                                    text1: "Próximamente",
                                    text2: "Función de reportes en desarrollo",
                                })
                            }}
                        >
                            <Feather name="file-text" size={24} color={profile.modoOscuro ? "white" : "#777676ff"} />
                            <Text
                                style={
                                    profile.modoOscuro
                                        ? { color: "white", fontWeight: "600", fontSize: 16 }
                                        : { color: "#777676ff", fontWeight: "600", fontSize: 16 }
                                }
                            >
                                Reporte
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.botonAdjuntar} onPress={fotografias}>
                            <FontAwesome name="picture-o" size={24} color={profile.modoOscuro ? "white" : "#777676ff"} />
                            <Text
                                style={
                                    profile.modoOscuro
                                        ? { color: "white", fontWeight: "600", fontSize: 16 }
                                        : { color: "#777676ff", fontWeight: "600", fontSize: 16 }
                                }
                            >
                                Fotografía
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            <Modal
                animationType="fade"
                transparent={true}
                visible={visibleModal}
                onRequestClose={() => setVisibleModal(false)}
            >
                <View style={styles.centeredView}>
                    <View style={profile.modoOscuro ? styles.modalViewOscuro : styles.modalViewClaro}>
                        <Text style={{ fontWeight: "500", fontSize: 16, color: profile.modoOscuro ? "white" : "black" }}>
                            {textoPrincipal}
                        </Text>
                        <Text style={{ color: profile.modoOscuro ? "white" : "black", fontSize: 14 }}>{textoSecundario}</Text>
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 7 }}>
                            <TouchableOpacity
                                onPress={() => setVisibleModal(false)}
                                style={{
                                    flex: 1,
                                    backgroundColor: "red",
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ color: "white", fontWeight: "600" }}>No</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => updateEstado(false)}
                                style={{
                                    flex: 1,
                                    backgroundColor: "green",
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ color: "white", fontWeight: "600" }}>Sí</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.7)",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            padding: 2,
                            borderRadius: 8,
                        }}
                    >
                        <FlatList
                            ref={flatListRef}
                            data={carouselItems}
                            horizontal
                            pagingEnabled
                            keyExtractor={(item, i) => i.toString()}
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={activeIndex}
                            getItemLayout={(data, index) => ({
                                length: windowWidth,
                                offset: windowWidth * index,
                                index,
                            })}
                            renderItem={({ item }) => {
                                const imageHeight = heights[item] || 300
                                return (
                                    <Image
                                        source={{ uri: item }}
                                        style={{
                                            width: windowWidth,
                                            height: imageHeight,
                                            borderRadius: 10,
                                        }}
                                        resizeMode="contain"
                                    />
                                )
                            }}
                        />
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={{ marginTop: 10, alignSelf: "center", padding: 10, backgroundColor: "#333", borderRadius: 5 }}
                        >
                            <Text style={{ color: "white" }}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={modalVisibleSubtarea}
                animationType="fade"
                onRequestClose={() => setModalVisibleSubtarea(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <View
                        style={{
                            backgroundColor: profile.modoOscuro ? "#2C2C2C" : "white",
                            width: "85%",
                            padding: 20,
                            borderRadius: 12,
                        }}
                    >
                        <Text
                            style={{
                                color: profile.modoOscuro ? "#FFF" : "#000",
                                fontSize: 18,
                                fontWeight: "700",
                                marginBottom: 10,
                            }}
                        >
                            {textoPrincipal}
                        </Text>
                        <Text
                            style={{
                                color: profile.modoOscuro ? "#DDD" : "#555",
                                fontSize: 14,
                                marginBottom: 20,
                            }}
                        >
                            {textoSecundario}
                        </Text>

                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <TouchableOpacity
                                style={{
                                    padding: 10,
                                    borderRadius: 8,
                                    backgroundColor: "#999",
                                    flex: 1,
                                    marginRight: 10,
                                }}
                                onPress={() => setModalVisibleSubtarea(false)}
                            >
                                <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    padding: 10,
                                    borderRadius: 8,
                                    backgroundColor: "#4CAF50",
                                    flex: 1,
                                }}
                                onPress={() => updateEstadoSubtarea(false, subtareaPendienteCambio)}
                            >
                                <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    loaderClaro: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
    },
    loaderOscuro: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#2C2C2C",
    },
    container: {
        flex: 1,
        padding: 20,
    },
    nombreClaro: {
        fontSize: 24,
        fontWeight: "800",
    },
    nombreOscuro: {
        fontSize: 24,
        fontWeight: "800",
        color: "white",
    },
    descripcionClaro: {
        fontSize: 16,
        fontWeight: "400",
    },
    descripcionOscuro: {
        fontSize: 16,
        fontWeight: "400",
        color: "white",
    },
    numerosClaro: {
        color: "#7B7B7B",
    },
    numerosOscuro: {
        color: "#d2d2d2ff",
    },
    titulo: {
        fontSize: 22,
        fontWeight: "700",
    },
    botonEnProceso: {
        backgroundColor: "#57A7FE",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
    },
    botonEnCompletada: {
        backgroundColor: "#47A997",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
    },
    botonCancelarEntrega: {
        backgroundColor: "gray",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
    },
    botonMarcarRevisada: {
        backgroundColor: "#B383E2",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
    },
    botonAdjuntar: {
        flexDirection: "row",
        gap: 5,
        borderWidth: 1,
        borderColor: "#D9D9D9",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalViewClaro: {
        padding: 20,
        backgroundColor: "white",
        borderRadius: 20,
        paddingHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: 300,
    },
    modalViewOscuro: {
        padding: 20,
        backgroundColor: "#2C2C2C",
        borderRadius: 20,
        paddingHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: 300,
    },
})

export default TareaDetails
