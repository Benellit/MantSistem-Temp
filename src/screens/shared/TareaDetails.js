"use client"

import AntDesign from "@expo/vector-icons/AntDesign"
import Feather from "@expo/vector-icons/Feather"
import FontAwesome from "@expo/vector-icons/FontAwesome"
import FontAwesome5 from "@expo/vector-icons/FontAwesome5"
import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import { useFocusEffect } from '@react-navigation/native'
import axios from "axios"
import * as ImagePicker from "expo-image-picker"
import { addDoc, arrayRemove, collection, doc, getDoc, getDocs, getFirestore, Timestamp, updateDoc, } from "firebase/firestore"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native"
import Toast from "react-native-toast-message"
import appFirebase, { cloudinaryConfig } from "../../credenciales/Credenciales"
import { useAuth } from "../login/AuthContext"

const { height } = Dimensions.get("window")
const windowWidth = Dimensions.get("window").width
const windowHeight = Dimensions.get("window").height

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
    const [tipoAccion, setTipoAccion] = useState("") // "tarea" o "subtarea"
    const [idActual, setIdActual] = useState("") // ID de la tarea o subtarea actual

    // Estados para evidencias
    const [evidenciasTarea, setEvidenciasTarea] = useState([])
    const [evidenciasSubtareas, setEvidenciasSubtareas] = useState({})

    // Estados para reportes
    const [reportesTarea, setReportesTarea] = useState([])
    const [reportesSubtareas, setReportesSubtareas] = useState({})
    const [modalReporte, setModalReporte] = useState(false)
    const [asuntoReporte, setAsuntoReporte] = useState("")
    const [descripcionReporte, setDescripcionReporte] = useState("")

    // Estados para mostrar evidencias y reportes
    const [modalVerEvidencias, setModalVerEvidencias] = useState(false)
    const [modalVerReportes, setModalVerReportes] = useState(false)
    const [evidenciasActuales, setEvidenciasActuales] = useState([])
    const [reportesActuales, setReportesActuales] = useState([])
    const [expandidoEvidencias, setExpandidoEvidencias] = useState({})
    const [expandidoReportes, setExpandidoReportes] = useState({})

    const [modalPreviamenteAbierto, setModalPreviamenteAbierto] = useState(null)

    const openModal = (imagenes, index) => {
        if (!Array.isArray(imagenes) || imagenes.length === 0) {
            console.warn("No hay imágenes para mostrar")
            return
        }

        // Si hay un modal abierto, guardarlo para reabrirlo después
        if (modalVerEvidencias) {
            setModalPreviamenteAbierto("evidencias")
            setModalVerEvidencias(false)
        } else if (modalVerReportes) {
            setModalPreviamenteAbierto("reportes")
            setModalVerReportes(false)
        }

        // Pequeño delay para que iOS procese el cierre antes de abrir el nuevo modal
        setTimeout(() => {
            setCarouselItems(imagenes)
            setActiveIndex(index)
            setModalVisible(true)
        }, 300)
    }

    const closeImageModal = () => {
        setModalVisible(false)

        // Reabrir el modal que estaba abierto antes
        if (modalPreviamenteAbierto) {
            setTimeout(() => {
                if (modalPreviamenteAbierto === "evidencias") {
                    setModalVerEvidencias(true)
                } else if (modalPreviamenteAbierto === "reportes") {
                    setModalVerReportes(true)
                }
                setModalPreviamenteAbierto(null)
            }, 300)
        }
    }

    const saveEvidencias = async (urls, tipo, idReferencia) => {
        if (!urls || urls.length === 0) {
            console.warn("No hay URLs para guardar")
            return
        }

        try {
            let evidenciasRef

            if (tipo === "tarea") {
                evidenciasRef = collection(db, "TAREA", id, "Evidencias")
            } else if (tipo === "subtarea") {
                evidenciasRef = collection(db, "TAREA", id, "Subtareas", idReferencia, "Evidencias")
            }

            await addDoc(evidenciasRef, {
                IDUsuario: profile.id,
                fechaDeEntrega: Timestamp.now(),
                fotografias: urls,
            })

            console.log("✅ Evidencias guardadas en Firestore")
            Toast.show({
                type: "appSuccess",
                text1: "Evidencias guardadas",
                text2: "Las fotografías se guardaron correctamente",
            })

            await cargarDatos()
        } catch (error) {
            console.error("❌ Error al guardar evidencias:", error)
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "No se pudieron guardar las evidencias",
            })
        }
    }

    const saveReporte = async () => {
        if (!asuntoReporte.trim() || !descripcionReporte.trim()) {
            Toast.show({
                type: "appError",
                text1: "Campos incompletos",
                text2: "Por favor completa todos los campos",
            })
            return
        }

        try {
            let reportesRef

            if (tipoAccion === "tarea") {
                reportesRef = collection(db, "TAREA", id, "Reportes")
            } else if (tipoAccion === "subtarea") {
                reportesRef = collection(db, "TAREA", id, "Subtareas", idActual, "Reportes")
            }

            const usuarioRef = doc(db, "USUARIO", profile.id)

            await addDoc(reportesRef, {
                asunto: asuntoReporte,
                descripcion: descripcionReporte,
                fecha: Timestamp.now(),
                IDUsuario: usuarioRef,
            })

            Toast.show({
                type: "appSuccess",
                text1: "Reporte guardado",
                text2: "El reporte se registró correctamente",
            })

            setModalReporte(false)
            setAsuntoReporte("")
            setDescripcionReporte("")
            closeSheet()
            await cargarDatos()
        } catch (error) {
            console.error("❌ Error al guardar reporte:", error)
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "No se pudo guardar el reporte",
            })
        }
    }

    const fotografias = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted") {
                Toast.show({
                    type: "appError",
                    text1: "Permiso requerido",
                    text2: "Necesitas otorgar permiso para acceder a la galería.",
                })
                return
            }

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

            Toast.show({
                type: "appInfo",
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
                        timeout: 30000,
                    },
                )

                urls.push(res.data.secure_url)
                console.log("✅ Imagen subida:", res.data.secure_url)
            }

            Toast.show({
                type: "appSuccess",
                text1: "Éxito",
                text2: `${urls.length} imagen(es) subida(s) correctamente`,
            })

            setFoto(urls)
            await saveEvidencias(urls, tipoAccion, idActual)
            closeSheet()
        } catch (err) {
            console.error("❌ Error al subir imágenes:", err.response?.data || err.message)
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "No se pudieron subir las imágenes",
            })
        }
    }

    const eliminarEvidencia = (tipo, idReferencia, idEvidenciaDoc, urlFoto) => {
        Alert.alert("Eliminar imagen", "¿Deseas eliminar esta imagen?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: async () => {
                    try {
                        let evidenciaRef

                        if (tipo === "tarea") {
                            evidenciaRef = doc(db, "TAREA", id, "Evidencias", idEvidenciaDoc)
                        } else if (tipo === "subtarea") {
                            evidenciaRef = doc(db, "TAREA", id, "Subtareas", idReferencia, "Evidencias", idEvidenciaDoc)
                        }

                        await updateDoc(evidenciaRef, {
                            fotografias: arrayRemove(urlFoto),
                        })

                        console.log("✅ Imagen eliminada correctamente")

                        Toast.show({
                            type: "appSuccess",
                            text1: "Imagen eliminada",
                            text2: "La imagen se eliminó correctamente",
                        })

                        await cargarDatos()
                    } catch (error) {
                        console.error("❌ Error al eliminar evidencia:", error)
                        Toast.show({
                            type: "appError",
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

            const refTecnicos = collection(db, "TAREA", id, "Tecnicos")
            const snap = await getDocs(refTecnicos)

            const tecnicosData = await Promise.all(
                snap.docs.map(async (d) => {
                    const data = d.data()
                    let usuario = null
                    let idUsuario = null

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

                    return {
                        id: d.id,
                        idUsuario,
                        ...data,
                        usuario,
                    }
                }),
            )

            setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : [])

            try {
                const evidenciasRefTarea = collection(db, "TAREA", id, "Evidencias")
                const evidenciasSnapTarea = await getDocs(evidenciasRefTarea)

                const evidenciasDataTarea = await Promise.all(
                    evidenciasSnapTarea.docs.map(async (docE) => {
                        const ev = docE.data()
                        let usuarioInfo = null

                        if (ev.IDUsuario) {
                            try {
                                const usuarioRef = doc(db, "USUARIO", ev.IDUsuario)
                                const usuarioSnap = await getDoc(usuarioRef)
                                if (usuarioSnap.exists()) {
                                    usuarioInfo = usuarioSnap.data()
                                }
                            } catch (error) {
                                console.error("Error cargando usuario de evidencia:", error)
                            }
                        }

                        return {
                            idEvidenciaDoc: docE.id,
                            fotografias: Array.isArray(ev.fotografias) ? ev.fotografias : [],
                            fechaDeEntrega: ev.fechaDeEntrega?.toDate?.() || new Date(),
                            usuario: usuarioInfo,
                            IDUsuario: ev.IDUsuario,
                        }
                    }),
                )

                setEvidenciasTarea(evidenciasDataTarea)
            } catch (error) {
                console.error("Error cargando evidencias de tarea:", error)
                setEvidenciasTarea([])
            }

            try {
                const reportesRefTarea = collection(db, "TAREA", id, "Reportes")
                const reportesSnapTarea = await getDocs(reportesRefTarea)

                const reportesDataTarea = await Promise.all(
                    reportesSnapTarea.docs.map(async (docR) => {
                        const rep = docR.data()
                        let usuarioInfo = null

                        if (rep.IDUsuario) {
                            try {
                                const usuarioSnap = await getDoc(rep.IDUsuario)
                                if (usuarioSnap.exists()) {
                                    usuarioInfo = usuarioSnap.data()
                                }
                            } catch (error) {
                                console.error("Error cargando usuario de reporte:", error)
                            }
                        }

                        return {
                            id: docR.id,
                            asunto: rep.asunto,
                            descripcion: rep.descripcion,
                            fecha: rep.fecha?.toDate?.() || new Date(),
                            usuario: usuarioInfo,
                        }
                    }),
                )

                setReportesTarea(reportesDataTarea)
            } catch (error) {
                console.error("Error cargando reportes de tarea:", error)
                setReportesTarea([])
            }

            try {
                const refSubtareas = collection(db, "TAREA", id, "Subtareas")
                const snapshotSubtareas = await getDocs(refSubtareas)

                const subtareasData = await Promise.all(
                    snapshotSubtareas.docs.map(async (docSub) => {
                        const subtareaData = docSub.data()

                        // Cargar evidencias de la subtarea
                        const evidenciasRefSubtarea = collection(db, "TAREA", id, "Subtareas", docSub.id, "Evidencias")
                        const evidenciasSnapSubtarea = await getDocs(evidenciasRefSubtarea)

                        const evidenciasDataSubtarea = await Promise.all(
                            evidenciasSnapSubtarea.docs.map(async (docEv) => {
                                const evSub = docEv.data()
                                let usuarioInfo = null

                                if (evSub.IDUsuario) {
                                    try {
                                        const usuarioRef = doc(db, "USUARIO", evSub.IDUsuario)
                                        const usuarioSnap = await getDoc(usuarioRef)
                                        if (usuarioSnap.exists()) {
                                            usuarioInfo = usuarioSnap.data()
                                        }
                                    } catch (error) {
                                        console.error("Error cargando usuario de evidencia subtarea:", error)
                                    }
                                }

                                return {
                                    idEvidenciaDoc: docEv.id,
                                    fotografias: Array.isArray(evSub.fotografias) ? evSub.fotografias : [],
                                    fechaDeEntrega: evSub.fechaDeEntrega?.toDate?.() || new Date(),
                                    usuario: usuarioInfo,
                                    IDUsuario: evSub.IDUsuario,
                                }
                            }),
                        )

                        // Cargar reportes de la subtarea
                        const reportesRefSubtarea = collection(db, "TAREA", id, "Subtareas", docSub.id, "Reportes")
                        const reportesSnapSubtarea = await getDocs(reportesRefSubtarea)

                        const reportesDataSubtarea = await Promise.all(
                            reportesSnapSubtarea.docs.map(async (docRep) => {
                                const repSub = docRep.data()
                                let usuarioInfo = null

                                if (repSub.IDUsuario) {
                                    try {
                                        const usuarioSnap = await getDoc(repSub.IDUsuario)
                                        if (usuarioSnap.exists()) {
                                            usuarioInfo = usuarioSnap.data()
                                        }
                                    } catch (error) {
                                        console.error("Error cargando usuario de reporte subtarea:", error)
                                    }
                                }

                                return {
                                    id: docRep.id,
                                    asunto: repSub.asunto,
                                    descripcion: repSub.descripcion,
                                    fecha: repSub.fecha?.toDate?.() || new Date(),
                                    usuario: usuarioInfo,
                                }
                            }),
                        )

                        setEvidenciasSubtareas((prev) => ({
                            ...prev,
                            [docSub.id]: evidenciasDataSubtarea,
                        }))

                        setReportesSubtareas((prev) => ({
                            ...prev,
                            [docSub.id]: reportesDataSubtarea,
                        }))

                        return {
                            id: docSub.id,
                            ...subtareaData,
                        }
                    }),
                )

                console.log("📋 Subtareas cargadas:", subtareasData.length)
                setSubtareas(subtareasData)
            } catch (error) {
                console.error("❌ Error al cargar subtareas:", error)
                setSubtareas([])
            }
        } catch (error) {
            console.error("❌ Error cargando datos:", error)
            Toast.show({
                type: "appError",
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
            second: "2-digit",
            hour12: false,
        })
    }

    const formatFechaEntrega = (fecha) => {
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
                                type: "appSuccess",
                                text1: "Tarea En Proceso",
                                text2: "¡Buen trabajo, sigue así!",
                            })
                        }
                        break

                    case "En Proceso":
                        if (modalOupdate) {
                            if (!evidenciasTarea || evidenciasTarea.length === 0) {
                                Toast.show({
                                    type: "appError",
                                    text1: "Evidencia requerida",
                                    text2: "Debes adjuntar al menos una evidencia fotográfica antes de completar la tarea",
                                })
                                return
                            }

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
                        const evidenciasSubtarea = evidenciasSubtareas[IDSubtarea] || []
                        if (!evidenciasSubtarea || evidenciasSubtarea.length === 0) {
                            Toast.show({
                                type: "error",
                                text1: "Evidencia requerida",
                                text2: "Debes adjuntar al menos una evidencia fotográfica antes de completar la subtarea",
                            })
                            return
                        }

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

            await updateDoc(docSubtarea, { estado: nuevoEstadoSubtarea })
            setModalVisibleSubtarea(false)

            Toast.show({
                type: "success",
                text1: nuevoEstadoSubtarea === "Completada" ? "Subtarea completada ✅" : "Estado actualizado",
                text2: nuevoEstadoSubtarea === "Completada" ? "¡Buen trabajo, sigue así!" : "Estado cambiado correctamente",
            })

            setSubtareas((prev) => prev.map((s) => (s.id === IDSubtarea ? { ...s, estado: nuevoEstadoSubtarea } : s)))

            const refSubtareas = collection(refTarea, "Subtareas")
            const snapshot = await getDocs(refSubtareas)
            const estados = snapshot.docs.map((d) => d.data().estado)

            if (estados.includes("En Proceso") && tarea.estado === "Pendiente") {
                await updateDoc(refTarea, { estado: "En Proceso" })
                Toast.show({
                    type: "info",
                    text1: "Tarea en proceso",
                    text2: "Una subtarea ha comenzado su ejecución.",
                })
            }

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

    const openSheet = (tipo, referencia) => {
        setTipoAccion(tipo)
        setIdActual(referencia)
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

    const mostrarEvidencias = (tipo, referencia) => {
        let evidencias = []

        if (tipo === "tarea") {
            evidencias = evidenciasTarea
        } else if (tipo === "subtarea") {
            evidencias = evidenciasSubtareas[referencia] || []
        }

        setEvidenciasActuales(evidencias)
        setModalVerEvidencias(true)
    }

    const mostrarReportes = (tipo, referencia) => {
        let reportes = []

        if (tipo === "tarea") {
            reportes = reportesTarea
        } else if (tipo === "subtarea") {
            reportes = reportesSubtareas[referencia] || []
        }

        setReportesActuales(reportes)
        setModalVerReportes(true)
    }

    const idPlantilla =
        tarea?.IDPlantilla?.id ||
        tarea?.IDPlantilla?.path?.split('/')?.pop() ||
        tarea?.IDPlantilla?.referencePath?.split('/')?.pop() ||
        null;

    const [desplegarOpciones, setDesplegarOpciones] = useState(false);


    const navegarEditPlantillaRepetitivas = (IDTareaRepetitiva) => {
        setDesplegarOpciones(false);
        navigation.navigate("EditarTareas", {
            id: IDTareaRepetitiva,
            tareaRepetitiva: true,
            tipoTarea: tarea.tipoTarea,
        })
    }

    const navegarEditTareaNormales = (IDTarea) => {
        setDesplegarOpciones(false);
        navigation.navigate("EditarTareas", {
            id: IDTarea,
            tareaRepetitiva: false,
            tipoTarea: tarea.tipoTarea,
        })
    }

    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [])
    );

    if (loading) {
        return (
            <View style={profile.modoOscuro ? styles.loaderOscuro : styles.loaderClaro}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ color: profile.modoOscuro ? "#FFFF" : "black", marginTop: 10 }}>Cargando...</Text>
            </View>
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F8F9FA" }}>
            <View
                style={{
                    marginTop: 30,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: profile.modoOscuro ? "#2C2C2C" : "#E5E5E5",
                }}
            >
                <TouchableOpacity
                    style={{ padding: 8, borderRadius: 8, backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF" }}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={24} color={profile.modoOscuro ? "#FFFF" : "#1A1A1A"} />
                </TouchableOpacity>
                {(profile.rol === "Administrador" || profile.rol === "Gestor") && (
                    <View>
                        {
                            tarea.IDPlantilla ? (
                                <View style={{ position: 'relative', minWidth: 180 }}>
                                    <TouchableOpacity
                                        onPress={() => setDesplegarOpciones(prev => !prev)}
                                        style={{
                                            padding: 8,
                                            borderRadius: 8,
                                            backgroundColor: profile.modoOscuro ? '#2C2C2C' : '#FFF',
                                            alignSelf: 'flex-end',
                                        }}
                                    >
                                        <Feather
                                            name="edit"
                                            size={22}
                                            color={profile.modoOscuro ? '#FFF' : '#1A1A1A'}
                                        />
                                    </TouchableOpacity>

                                    {desplegarOpciones && (
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: 45,
                                                right: 0,
                                                backgroundColor: profile.modoOscuro ? '#2C2C2C' : '#FFF',
                                                borderRadius: 8,
                                                padding: 8,
                                                zIndex: 5000,
                                                elevation: 5,
                                                shadowColor: '#000',
                                                shadowOpacity: 0.2,
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowRadius: 4,
                                                alignSelf: 'flex-start',
                                            }}
                                        >
                                            <TouchableOpacity
                                                onPress={() =>
                                                    navegarEditTareaNormales(id)
                                                }
                                                style={{ paddingVertical: 6 }}
                                            >
                                                <Text style={{ color: profile.modoOscuro ? '#FFF' : '#000' }}>
                                                    Editar tarea seleccionada
                                                </Text>
                                            </TouchableOpacity>

                                            <View style={profile.modoOscuro ? styles.dividerOscuro : styles.dividerClaro} />

                                            <TouchableOpacity
                                                onPress={() =>
                                                    navegarEditPlantillaRepetitivas(idPlantilla)
                                                }
                                                style={{ paddingVertical: 6 }}
                                            >
                                                <Text style={{ color: profile.modoOscuro ? '#FFF' : '#000' }}>
                                                    Editar plantilla de la tarea repetitiva
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => navegarEditTareaNormales(id)}
                                    style={{ padding: 8, borderRadius: 8, backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF" }}
                                >
                                    <Feather name="edit" size={22} color={profile.modoOscuro ? "#FFFF" : "#1A1A1A"} />
                                </TouchableOpacity>
                            )
                        }
                    </View>
                )}
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
                    {/* Título y badges */}
                    <Text
                        style={{
                            fontSize: 28,
                            fontWeight: "700",
                            color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                            marginBottom: 12,
                            letterSpacing: -0.5,
                        }}
                    >
                        {tarea.nombre}
                    </Text>

                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                        <View
                            style={{
                                backgroundColor: getEstadoStyle(tarea.estado).backgroundColor,
                                paddingVertical: 6,
                                paddingHorizontal: 14,
                                borderRadius: 20,
                            }}
                        >
                            <Text
                                style={{
                                    color: getEstadoStyle(tarea.estado).color,
                                    fontWeight: "600",
                                    fontSize: 13,
                                }}
                            >
                                {tarea.estado}
                            </Text>
                        </View>
                        <View
                            style={{
                                backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor,
                                paddingVertical: 6,
                                paddingHorizontal: 14,
                                borderRadius: 20,
                            }}
                        >
                            <Text
                                style={{
                                    color: getPrioridadStyle(tarea.prioridad).color,
                                    fontWeight: "600",
                                    fontSize: 13,
                                }}
                            >
                                {tarea.prioridad}
                            </Text>
                        </View>
                    </View>

                    <View
                        style={{
                            backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 16,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 15,
                                lineHeight: 24,
                                color: profile.modoOscuro ? "#D1D1D1" : "#4A4A4A",
                                marginBottom: 20,
                            }}
                        >
                            {tarea.descripcion}
                        </Text>

                        <View style={{ gap: 14 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F0F0F0",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <Feather name="calendar" size={18} color={profile.modoOscuro ? "#888" : "#666"} />
                                </View>
                                <Text
                                    style={{
                                        flex: 1,
                                        fontSize: 14,
                                        color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                    }}
                                >
                                    {formatFechaEntrega(tarea.fechaCreacion)} - {formatFechaEntrega(tarea.fechaEntrega)}
                                </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F0F0F0",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <FontAwesome5 name="user-tie" size={16} color={profile.modoOscuro ? "#888" : "#666"} />
                                </View>
                                <Text
                                    style={{
                                        flex: 1,
                                        fontSize: 14,
                                        color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                    }}
                                >
                                    {creador?.rol ?? ""}{" "}
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
                    </View>

                    {tarea.imagenAdjuntaInstrucciones && tarea.imagenAdjuntaInstrucciones.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
                                <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 12 }}>
                                    {tarea.imagenAdjuntaInstrucciones.map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => openModal(tarea.imagenAdjuntaInstrucciones, index)}
                                            style={{
                                                borderRadius: 12,
                                                overflow: "hidden",
                                                backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                                            }}
                                        >
                                            <Image
                                                source={{ uri: url }}
                                                style={{
                                                    width: 200,
                                                    height: 150,
                                                }}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {subtareas.length === 0 && (
                        <View
                            style={{
                                backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 16,
                                flexDirection: "row",
                                gap: 10,
                            }}
                        >
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderRadius: 12,
                                    backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F0F0F0",
                                }}
                                onPress={() => mostrarEvidencias("tarea", id)}
                            >
                                <FontAwesome name="picture-o" size={18} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                    }}
                                >
                                    Ver Evidencias ({evidenciasTarea.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderRadius: 12,
                                    backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F0F0F0",
                                }}
                                onPress={() => mostrarReportes("tarea", id)}
                            >
                                <Feather name="file-text" size={18} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                    }}
                                >
                                    Ver Reportes ({reportesTarea.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ marginBottom: 20 }}>
                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: "700",
                                color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                marginBottom: 12,
                            }}
                        >
                            Técnicos Asignados
                        </Text>

                        {Array.isArray(tecnicos) &&
                            tecnicos.map((tecnico) => (
                                <View
                                    key={tecnico.id}
                                    style={{
                                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <Image
                                            style={{ width: 48, height: 48, borderRadius: 24 }}
                                            source={{
                                                uri:
                                                    tecnico.usuario?.fotoPerfil?.trim() !== ""
                                                        ? tecnico.usuario.fotoPerfil
                                                        : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                            }}
                                        />
                                        <View style={{ flex: 1, paddingLeft: 12 }}>
                                            <Text
                                                style={{
                                                    color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                                    fontWeight: "600",
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
                                            {tecnico.idUsuario === profile.id && (
                                                <Text
                                                    style={{
                                                        color: profile.modoOscuro ? "#888" : "#999",
                                                        fontSize: 13,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Tú
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                    </View>

                    {subtareas.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <Text
                                style={{
                                    fontSize: 20,
                                    fontWeight: "700",
                                    color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                    marginBottom: 12,
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
                                    const evidenciasCount = evidenciasSubtareas[item.id]?.length || 0
                                    const reportesCount = reportesSubtareas[item.id]?.length || 0

                                    return (
                                        <View
                                            key={item.id || index}
                                            style={{
                                                backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                                                padding: 18,
                                                borderRadius: 16,
                                                marginBottom: 12,
                                                opacity: !anteriorCompletada && item.estado !== "Completada" ? 0.5 : 1,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                    marginBottom: 10,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        flex: 1,
                                                        color: profile.modoOscuro ? "#FFFFFF" : "#1A1A1A",
                                                        fontWeight: "700",
                                                        fontSize: 17,
                                                        marginRight: 10,
                                                    }}
                                                >
                                                    {`${item.orden}. ${item.nombre}`}
                                                </Text>

                                                <View
                                                    style={{
                                                        backgroundColor: getEstadoStyle(item.estado).backgroundColor,
                                                        paddingVertical: 4,
                                                        paddingHorizontal: 10,
                                                        borderRadius: 12,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: getEstadoStyle(item.estado).color,
                                                            fontWeight: "600",
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        {item.estado}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text
                                                style={{
                                                    color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                                    fontSize: 14,
                                                    lineHeight: 20,
                                                    marginBottom: 10,
                                                }}
                                            >
                                                {item.descripcion}
                                            </Text>

                                            {item.imagenAdjuntaInstrucciones?.length > 0 && (
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                                        {item.imagenAdjuntaInstrucciones.map((uri, i) => (
                                                            <TouchableOpacity
                                                                key={`${item.id || index}-img-${i}`}
                                                                onPress={() => openModal(item.imagenAdjuntaInstrucciones, i)}
                                                                style={{
                                                                    borderRadius: 10,
                                                                    overflow: "hidden",
                                                                }}
                                                            >
                                                                <Image
                                                                    source={{ uri }}
                                                                    style={{
                                                                        width: 100,
                                                                        height: 100,
                                                                    }}
                                                                    resizeMode="cover"
                                                                />
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </ScrollView>
                                            )}

                                            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                                                <TouchableOpacity
                                                    style={{
                                                        flex: 1,
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 6,
                                                        paddingVertical: 10,
                                                        paddingHorizontal: 12,
                                                        borderRadius: 10,
                                                        backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F0F0F0",
                                                    }}
                                                    onPress={() => mostrarEvidencias("subtarea", item.id)}
                                                >
                                                    <FontAwesome name="picture-o" size={16} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                                    <Text
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: "600",
                                                            color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                                        }}
                                                    >
                                                        Evidencias ({evidenciasCount})
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={{
                                                        flex: 1,
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 6,
                                                        paddingVertical: 10,
                                                        paddingHorizontal: 12,
                                                        borderRadius: 10,
                                                        backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F0F0F0",
                                                    }}
                                                    onPress={() => mostrarReportes("subtarea", item.id)}
                                                >
                                                    <Feather name="file-text" size={16} color={profile.modoOscuro ? "#B0B0B0" : "#666"} />
                                                    <Text
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: "600",
                                                            color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                                        }}
                                                    >
                                                        Reportes ({reportesCount})
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>

                                            {anteriorCompletada &&
                                                item.estado !== "Completada" &&
                                                item.estado !== "Revisada" &&
                                                profile.rol === "Tecnico" && (
                                                    <View style={{ gap: 8 }}>
                                                        {item.estado !== "Completada" && item.estado !== "Revisada" && (
                                                            <TouchableOpacity
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    gap: 8,
                                                                    paddingVertical: 12,
                                                                    paddingHorizontal: 16,
                                                                    borderRadius: 12,
                                                                    borderWidth: 2,
                                                                    borderStyle: "dashed",
                                                                    borderColor: profile.modoOscuro ? "#444" : "#D0D0D0",
                                                                }}
                                                                onPress={() => openSheet("subtarea", item.id)}
                                                            >
                                                                <AntDesign name="plus" size={20} color={profile.modoOscuro ? "#888" : "#666"} />
                                                                <Text
                                                                    style={{
                                                                        color: profile.modoOscuro ? "#888" : "#666",
                                                                        fontWeight: "600",
                                                                        fontSize: 15,
                                                                    }}
                                                                >
                                                                    Adjuntar Evidencia o Reporte
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}

                                                        {mostrarBoton && (
                                                            <TouchableOpacity
                                                                style={[
                                                                    {
                                                                        paddingVertical: 14,
                                                                        borderRadius: 12,
                                                                        alignItems: "center",
                                                                    },
                                                                    item.estado === "Pendiente"
                                                                        ? { backgroundColor: "#57A7FE" }
                                                                        : item.estado === "En Proceso"
                                                                            ? { backgroundColor: "#47A997" }
                                                                            : { backgroundColor: "#999" },
                                                                ]}
                                                                onPress={() => updateEstadoSubtarea(true, item.id, item.estado)}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: "white",
                                                                        fontWeight: "700",
                                                                        fontSize: 15,
                                                                    }}
                                                                >
                                                                    {item.estado === "Pendiente"
                                                                        ? "Marcar En Proceso"
                                                                        : item.estado === "En Proceso"
                                                                            ? "Marcar Completada"
                                                                            : "Cancelar Entrega"}
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
                </View>
            </ScrollView>

            {profile.rol === "Tecnico" && subtareas.length === 0 && (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                        borderTopWidth: 1,
                        borderTopColor: profile.modoOscuro ? "#1A1A1A" : "#E5E5E5",
                    }}
                >
                    {tarea.estado === "Pendiente" && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: "#57A7FE",
                                paddingVertical: 16,
                                borderRadius: 12,
                                alignItems: "center",
                            }}
                            onPress={() => updateEstado(true)}
                        >
                            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Marcar En Proceso</Text>
                        </TouchableOpacity>
                    )}
                    {tarea.estado === "En Proceso" && (
                        <View style={{ gap: 10 }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderStyle: "dashed",
                                    borderColor: profile.modoOscuro ? "#444" : "#D0D0D0",
                                }}
                                onPress={() => openSheet("tarea", id)}
                            >
                                <AntDesign name="plus" size={20} color={profile.modoOscuro ? "#888" : "#666"} />
                                <Text
                                    style={{
                                        color: profile.modoOscuro ? "#888" : "#666",
                                        fontWeight: "600",
                                        fontSize: 15,
                                    }}
                                >
                                    Adjuntar Evidencia o Reporte
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: "#47A997",
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    alignItems: "center",
                                }}
                                onPress={() => updateEstado(true)}
                            >
                                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Marcar Completada</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {tarea.estado === "Completada" && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: "#999",
                                paddingVertical: 16,
                                borderRadius: 12,
                                alignItems: "center",
                            }}
                            onPress={() => updateEstado(true)}
                        >
                            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Cancelar Entrega</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {(profile.rol === "Administrador" || profile.rol === "Gestor") && (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                        borderTopWidth: 1,
                        borderTopColor: profile.modoOscuro ? "#1A1A1A" : "#E5E5E5",
                    }}
                >
                    {tarea.estado === "Completada" && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: "#B383E2",
                                paddingVertical: 16,
                                borderRadius: 12,
                                alignItems: "center",
                            }}
                            onPress={() => updateEstado(true)}
                        >
                            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Marcar Revisada</Text>
                        </TouchableOpacity>
                    )}
                    {tarea.estado === "Revisada" && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: "#999",
                                paddingVertical: 16,
                                borderRadius: 12,
                                alignItems: "center",
                            }}
                            onPress={() => updateEstado(true)}
                        >
                            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Cancelar Revisión</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {visible && (
                <Animated.View
                    {...panResponder.panHandlers}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        maxHeight: "40%",
                        transform: [{ translateY }],
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                        paddingHorizontal: 20,
                        paddingTop: 12,
                        paddingBottom: 20,
                        shadowColor: "#000",
                        shadowOpacity: 0.3,
                        shadowOffset: { width: 0, height: -4 },
                        shadowRadius: 8,
                        elevation: 8,
                    }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingBottom: 20,
                        }}
                    >
                        <View style={{ alignItems: "center", marginBottom: 16 }}>
                            <View
                                style={{
                                    width: 40,
                                    height: 5,
                                    borderRadius: 3,
                                    backgroundColor: profile.modoOscuro ? "#444" : "#DDD",
                                }}
                            />
                        </View>

                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 16,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: "700",
                                    color: profile.modoOscuro ? "white" : "#1A1A1A",
                                }}
                            >
                                Selecciona una opción
                            </Text>
                            <TouchableOpacity onPress={closeSheet} style={{ padding: 8 }}>
                                <AntDesign
                                    name="close"
                                    size={22}
                                    color={profile.modoOscuro ? "#888" : "#666"}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: 10 }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 14,
                                    paddingVertical: 16,
                                    paddingHorizontal: 18,
                                    borderRadius: 14,
                                    backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F8F9FA",
                                }}
                                onPress={() => setModalReporte(true)}
                            >
                                <View
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#E8E8E8",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <Feather
                                        name="file-text"
                                        size={20}
                                        color={profile.modoOscuro ? "#888" : "#666"}
                                    />
                                </View>
                                <Text
                                    style={{
                                        color: profile.modoOscuro ? "white" : "#1A1A1A",
                                        fontWeight: "600",
                                        fontSize: 16,
                                    }}
                                >
                                    Crear Reporte
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 14,
                                    paddingVertical: 16,
                                    paddingHorizontal: 18,
                                    borderRadius: 14,
                                    backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F8F9FA",
                                }}
                                onPress={fotografias}
                            >
                                <View
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#E8E8E8",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <FontAwesome
                                        name="picture-o"
                                        size={20}
                                        color={profile.modoOscuro ? "#888" : "#666"}
                                    />
                                </View>
                                <Text
                                    style={{
                                        color: profile.modoOscuro ? "white" : "#1A1A1A",
                                        fontWeight: "600",
                                        fontSize: 16,
                                    }}
                                >
                                    Subir Fotografías
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            )}


            <Modal transparent visible={modalReporte} animationType="fade" onRequestClose={() => setModalReporte(false)}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                            width: "100%",
                            borderRadius: 20,
                            padding: 24,
                            maxHeight: "80%",
                        }}
                    >
                        <View
                            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}
                        >
                            <Text
                                style={{
                                    fontSize: 20,
                                    fontWeight: "700",
                                    color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                }}
                            >
                                Crear Reporte
                            </Text>
                            <TouchableOpacity onPress={() => setModalReporte(false)} style={{ padding: 4 }}>
                                <AntDesign name="close" size={24} color={profile.modoOscuro ? "#888" : "#666"} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ marginBottom: 16 }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                        marginBottom: 8,
                                    }}
                                >
                                    Asunto
                                </Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: profile.modoOscuro ? "#444" : "#DDD",
                                        borderRadius: 12,
                                        paddingHorizontal: 16,
                                        paddingVertical: 14,
                                        fontSize: 15,
                                        color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                        backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F8F9FA",
                                    }}
                                    placeholder="Escribe el asunto del reporte"
                                    placeholderTextColor={profile.modoOscuro ? "#666" : "#999"}
                                    value={asuntoReporte}
                                    onChangeText={setAsuntoReporte}
                                />
                            </View>

                            <View style={{ marginBottom: 20 }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "600",
                                        color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                        marginBottom: 8,
                                    }}
                                >
                                    Descripción
                                </Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: profile.modoOscuro ? "#444" : "#DDD",
                                        borderRadius: 12,
                                        paddingHorizontal: 16,
                                        paddingVertical: 14,
                                        fontSize: 15,
                                        color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                        backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F8F9FA",
                                        minHeight: 120,
                                        textAlignVertical: "top",
                                    }}
                                    placeholder="Describe los detalles del reporte"
                                    placeholderTextColor={profile.modoOscuro ? "#666" : "#999"}
                                    value={descripcionReporte}
                                    onChangeText={setDescripcionReporte}
                                    multiline
                                    numberOfLines={5}
                                />
                            </View>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: "#57A7FE",
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    alignItems: "center",
                                }}
                                onPress={saveReporte}
                            >
                                <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Guardar Reporte</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={modalVerEvidencias}
                animationType="fade"
                onRequestClose={() => setModalVerEvidencias(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                            width: "100%",
                            borderRadius: 20,
                            padding: 24,
                            maxHeight: "80%",
                        }}
                    >
                        <View
                            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}
                        >
                            <Text
                                style={{
                                    fontSize: 20,
                                    fontWeight: "700",
                                    color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                }}
                            >
                                Evidencias Fotográficas
                            </Text>
                            <TouchableOpacity onPress={() => setModalVerEvidencias(false)} style={{ padding: 4 }}>
                                <AntDesign name="close" size={24} color={profile.modoOscuro ? "#888" : "#666"} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {evidenciasActuales.length === 0 ? (
                                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                    <FontAwesome name="picture-o" size={48} color={profile.modoOscuro ? "#444" : "#DDD"} />
                                    <Text
                                        style={{
                                            color: profile.modoOscuro ? "#666" : "#999",
                                            fontSize: 16,
                                            marginTop: 12,
                                        }}
                                    >
                                        No hay evidencias registradas
                                    </Text>
                                </View>
                            ) : (
                                evidenciasActuales.map((evidencia, index) => {
                                    const fechaEntregaTarea = tarea.fechaEntrega?.toDate
                                        ? tarea.fechaEntrega.toDate()
                                        : new Date(tarea.fechaEntrega);

                                    const fechaEntregaEvidencia = new Date(evidencia.fechaDeEntrega);
                                    const fueraDelTiempo = fechaEntregaEvidencia > fechaEntregaTarea;
                                    return (
                                        <View
                                            key={index}
                                            style={{
                                                backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F8F9FA",
                                                borderRadius: 16,
                                                padding: 16,
                                                marginBottom: 16,
                                            }}
                                        >
                                            <TouchableOpacity
                                                onPress={() => setExpandidoEvidencias((prev) => ({ ...prev, [index]: !prev[index] }))}
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    marginBottom: expandidoEvidencias[index] ? 12 : 0,
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                                                    <Image
                                                        style={{ width: 40, height: 40, borderRadius: 20 }}
                                                        source={{
                                                            uri:
                                                                evidencia.usuario?.fotoPerfil?.trim() !== ""
                                                                    ? evidencia.usuario.fotoPerfil
                                                                    : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                                        }}
                                                    />
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={{
                                                                color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                                                fontWeight: "600",
                                                                fontSize: 15,
                                                            }}
                                                        >
                                                            {evidencia.usuario
                                                                ? [evidencia.usuario.primerNombre ?? "", evidencia.usuario.primerApellido ?? ""]
                                                                    .filter((n) => n.trim() !== "")
                                                                    .join(" ")
                                                                : "Usuario desconocido"}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                color: fueraDelTiempo
                                                                    ? "#F5615C"
                                                                    : profile.modoOscuro
                                                                        ? "#888"
                                                                        : "#999",
                                                                fontSize: 12,
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {formatFecha(evidencia.fechaDeEntrega)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <MaterialIcons
                                                    name={expandidoEvidencias[index] ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                                    size={24}
                                                    color={profile.modoOscuro ? "#888" : "#666"}
                                                />
                                            </TouchableOpacity>

                                            {expandidoEvidencias[index] && (
                                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                                    {evidencia.fotografias.map((foto, fotoIndex) => (
                                                        <View key={fotoIndex} style={{ position: "relative" }}>
                                                            <TouchableOpacity onPress={() => openModal(evidencia.fotografias, fotoIndex)}>
                                                                <Image
                                                                    source={{ uri: foto }}
                                                                    style={{
                                                                        width: 90,
                                                                        height: 90,
                                                                        borderRadius: 10,
                                                                    }}
                                                                    resizeMode="cover"
                                                                />
                                                            </TouchableOpacity>

                                                            {profile.rol === "Tecnico" &&
                                                                evidencia.IDUsuario === profile.id &&
                                                                (tarea.estado === "En Proceso" || tarea.estado === "Pendiente") && (
                                                                    <TouchableOpacity
                                                                        onPress={() =>
                                                                            eliminarEvidencia(
                                                                                tipoAccion || "tarea",
                                                                                idActual || id,
                                                                                evidencia.idEvidenciaDoc,
                                                                                foto,
                                                                            )
                                                                        }
                                                                        style={{
                                                                            position: "absolute",
                                                                            top: 4,
                                                                            right: 4,
                                                                            backgroundColor: "rgba(255,255,255,0.9)",
                                                                            borderRadius: 15,
                                                                            padding: 4,
                                                                        }}
                                                                    >
                                                                        <AntDesign name="delete" size={16} color="#F5615C" />
                                                                    </TouchableOpacity>
                                                                )}
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    )
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={modalVerReportes}
                animationType="fade"
                onRequestClose={() => setModalVerReportes(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF",
                            width: "100%",
                            borderRadius: 20,
                            padding: 24,
                            maxHeight: "80%",
                        }}
                    >
                        <View
                            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}
                        >
                            <Text
                                style={{
                                    fontSize: 20,
                                    fontWeight: "700",
                                    color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                }}
                            >
                                Reportes
                            </Text>
                            <TouchableOpacity onPress={() => setModalVerReportes(false)} style={{ padding: 4 }}>
                                <AntDesign name="close" size={24} color={profile.modoOscuro ? "#888" : "#666"} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {reportesActuales.length === 0 ? (
                                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                    <Feather name="file-text" size={48} color={profile.modoOscuro ? "#444" : "#DDD"} />
                                    <Text
                                        style={{
                                            color: profile.modoOscuro ? "#666" : "#999",
                                            fontSize: 16,
                                            marginTop: 12,
                                        }}
                                    >
                                        No hay reportes registrados
                                    </Text>
                                </View>
                            ) : (
                                reportesActuales.map((reporte, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#F8F9FA",
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 16,
                                        }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => setExpandidoReportes((prev) => ({ ...prev, [index]: !prev[index] }))}
                                            style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: expandidoReportes[index] ? 12 : 0,
                                            }}
                                        >
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                                                <Image
                                                    style={{ width: 40, height: 40, borderRadius: 20 }}
                                                    source={{
                                                        uri:
                                                            reporte.usuario?.fotoPerfil?.trim() !== ""
                                                                ? reporte.usuario.fotoPerfil
                                                                : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                                    }}
                                                />
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={{
                                                            color: profile.modoOscuro ? "#FFF" : "#1A1A1A",
                                                            fontWeight: "600",
                                                            fontSize: 15,
                                                        }}
                                                    >
                                                        {reporte.asunto}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            color: profile.modoOscuro ? "#888" : "#999",
                                                            fontSize: 12,
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {formatFecha(reporte.fecha)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <MaterialIcons
                                                name={expandidoReportes[index] ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                                size={24}
                                                color={profile.modoOscuro ? "#888" : "#666"}
                                            />
                                        </TouchableOpacity>

                                        {expandidoReportes[index] && (
                                            <View>
                                                <View
                                                    style={{
                                                        height: 1,
                                                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#E5E5E5",
                                                        marginBottom: 12,
                                                    }}
                                                />
                                                <Text
                                                    style={{
                                                        color: profile.modoOscuro ? "#888" : "#666",
                                                        fontSize: 13,
                                                        fontWeight: "600",
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    Descripción:
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: profile.modoOscuro ? "#B0B0B0" : "#666",
                                                        fontSize: 14,
                                                        lineHeight: 20,
                                                    }}
                                                >
                                                    {reporte.descripcion}
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: profile.modoOscuro ? "#666" : "#999",
                                                        fontSize: 12,
                                                        marginTop: 10,
                                                    }}
                                                >
                                                    Reportado por:{" "}
                                                    {reporte.usuario
                                                        ? [reporte.usuario.primerNombre ?? "", reporte.usuario.primerApellido ?? ""]
                                                            .filter((n) => n.trim() !== "")
                                                            .join(" ")
                                                        : "Usuario desconocido"}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal para ampliar imagen */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeImageModal}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.95)",
                        justifyContent: "center",
                        alignItems: "center",
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
                        style={{ flex: 1 }}
                        contentContainerStyle={{ justifyContent: "center", alignItems: "center" }}
                        renderItem={({ item }) => (
                            <View
                                style={{
                                    width: windowWidth,
                                    height: windowHeight,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Image
                                    source={{ uri: item }}
                                    style={{
                                        width: windowWidth - 40,
                                        height: windowHeight - 200,
                                    }}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                    />
                    <TouchableOpacity
                        onPress={closeImageModal}
                        style={{
                            position: "absolute",
                            top: 60,
                            right: 20,
                            padding: 12,
                            backgroundColor: "rgba(255,255,255,0.2)",
                            borderRadius: 25,
                            width: 50,
                            height: 50,
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <AntDesign name="close" size={24} color="white" />
                    </TouchableOpacity>
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
        </View>
    )
}

const styles = StyleSheet.create({
    loaderClaro: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
    },
    loaderOscuro: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1A1A1A",
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
