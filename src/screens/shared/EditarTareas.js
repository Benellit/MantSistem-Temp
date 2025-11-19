"use client"

import AntDesign from "@expo/vector-icons/AntDesign"
import Fontisto from "@expo/vector-icons/Fontisto"
import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import axios from "axios"
import * as ImagePicker from "expo-image-picker"
import { LinearGradient } from "expo-linear-gradient"
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    LayoutAnimation,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import DropDownPicker from "react-native-dropdown-picker"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import Toast from "react-native-toast-message"
import appFirebase, { cloudinaryConfig } from "../../credenciales/Credenciales"
import { useAuth } from "../login/AuthContext"

const EditarTarea = ({ route, navigation }) => {
    const db = getFirestore(appFirebase)
    const { profile } = useAuth()
    const { id, tareaRepetitiva, tipoTarea: tipoTareaParam } = route.params
    console.log("[v0] ID:", id, "Es plantilla repetitiva:", tareaRepetitiva, "Tipo tarea (parámetro):", tipoTareaParam)

    const [cargando, setCargando] = useState(true)
    const [tarea, setTarea] = useState(null)

    const [activa, setActiva] = useState(true)
    const [fechaCreacionPlantilla, setFechaCreacionPlantilla] = useState(null)
    const [fechaUltimaCreacion, setFechaUltimaCreacion] = useState(null)
    const [historialTareas, setHistorialTareas] = useState([])

    const [imagenes, setImagenes] = useState([])
    const [imagenesSubtarea, setImagenesSubtarea] = useState([])
    const [tipoTarea, setTipoTarea] = useState("simple")
    const [tipoRecurrencia, setTipoRecurrencia] = useState("diario")
    const [subtareas, setSubtareas] = useState([])
    const [nombreSubtarea, setNombreSubtarea] = useState("")
    const [descripcionSubtarea, setDescripcionSubtarea] = useState("")
    const [subtareaEnEdicion, setSubtareaEnEdicion] = useState(null)

    const [nombre, setNombre] = useState("")
    const [descripcion, setDescripcion] = useState("")
    const [inputHeight, setInputHeight] = useState(90)
    const [inputHeightSubtarea, setInputHeightSubtarea] = useState(90)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedHora, setSelectedHora] = useState(null)
    const [selectedHoraInicio, setSelectedHoraInicio] = useState(null)
    const [dias, setDias] = useState(1)
    const [loading, setLoading] = useState(false)

    const [openPrioridad, setOpenPrioridad] = useState(false)
    const [valuePrioridad, setValuePrioridad] = useState(null)
    const [prioridad, setPrioridad] = useState([
        { label: "🔵 Baja", value: "Baja" },
        { label: "🟡 Media", value: "Media" },
        { label: "🔴 Alta", value: "Alta" },
    ])

    const [openSucursal, setOpenSucursal] = useState(false)
    const [valueSucursal, setValueSucursal] = useState(null)
    const [sucursal, setSucursal] = useState([])

    const [openTecnicos, setOpenTecnicos] = useState(false)
    const [valueTecnicos, setValueTecnicos] = useState(null)
    const [arrayValueTecnicos, setArrayValueTecnicos] = useState([])
    const [tecnicos, setTecnicos] = useState([])

    const [isVisible, setIsVisible] = useState(false)
    const [isVisibleHora, setIsVisibleHora] = useState(false)
    const [isVisibleHoraInicio, setIsVisibleHoraInicio] = useState(false)
    const [mode, setMode] = useState("datetime")

    const mapearTipoTarea = (tipoParam, esPlantilla) => {
        if (esPlantilla) {
            // Si es plantilla (TAREA_REPETITIVAS)
            if (tipoParam === "simple") return "repetitiva"
            if (tipoParam === "jerarquia") return "repje"
        }
        // Si es tarea normal (TAREA), mantener el tipo original
        return tipoParam
    }

    const getTarea = async (id, esPlantilla) => {
        try {
            setCargando(true)
            const coleccion = esPlantilla ? "TAREA_REPETITIVAS" : "TAREA"
            const tipoTareaReal = mapearTipoTarea(tipoTareaParam, esPlantilla)

            console.log(`[v0] Cargando desde colección: ${coleccion}, Tipo tarea real: ${tipoTareaReal}`)

            const docRef = doc(db, coleccion, id)
            const responseTarea = await getDoc(docRef)

            if (responseTarea.exists()) {
                const tareaData = responseTarea.data()
                console.log("[v0] Tarea cargada:", tareaData)
                setTarea(tareaData)

                setTipoTarea(tipoTareaReal)
                setNombre(tareaData.nombre || "")
                setDescripcion(tareaData.descripcion || "")
                setValuePrioridad(tareaData.prioridad || null)
                setImagenes(tareaData.imagenAdjuntaInstrucciones || [])

                if (esPlantilla && (tipoTareaReal === "repetitiva" || tipoTareaReal === "repje")) {
                    setActiva(tareaData.activa !== undefined ? tareaData.activa : true)
                    setFechaCreacionPlantilla(tareaData.fechaCreacionPlantilla || null)
                    setFechaUltimaCreacion(tareaData.fechaUltimaCreacion || null)

                    // Cargar historial de tareas creadas
                    const historialRef = collection(docRef, "HistorialTareas")
                    const historialSnap = await getDocs(historialRef)
                    const historialArray = []

                    historialSnap.forEach((histDoc) => {
                        const histData = histDoc.data()
                        historialArray.push({
                            id: histDoc.id,
                            fechaCreacion: histData.fechaCreacion,
                            fechaEntrega: histData.fechaEntrega,
                        })
                    })

                    // Ordenar descendente por fechaCreacion
                    historialArray.sort((a, b) => {
                        const dateA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion)
                        const dateB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion)
                        return dateB - dateA
                    })

                    setHistorialTareas(historialArray)
                    console.log(`[v0] ${historialArray.length} tareas en el historial`)
                }

                if ((tipoTareaReal === "simple" || tipoTareaReal === "jerarquia") && !esPlantilla) {
                    if (tareaData.fechaEntrega) {
                        setSelectedDate(new Date(tareaData.fechaEntrega))
                    }
                }

                if (esPlantilla && (tipoTareaReal === "repetitiva" || tipoTareaReal === "repje")) {
                    setTipoRecurrencia(tareaData.frecuencia || "diario")
                    setDias(tareaData.duracionDias || 1)

                    if (tareaData.horaEntrega) {
                        setSelectedHora(tareaData.horaEntrega)
                    }
                    if (tareaData.horaInicio) {
                        setSelectedHoraInicio(tareaData.horaInicio)
                    }
                }

                if (tareaData.IDSucursal) {
                    const sucursalId = typeof tareaData.IDSucursal === "object" ? tareaData.IDSucursal.id : tareaData.IDSucursal
                    setValueSucursal(sucursalId)
                }

                // Cargar técnicos asignados
                const tecnicosRef = collection(docRef, "Tecnicos")
                const tecnicosSnap = await getDocs(tecnicosRef)
                const tecnicosAsignados = []

                for (const tecDoc of tecnicosSnap.docs) {
                    const tecnicoData = tecDoc.data()
                    const usuarioId = typeof tecnicoData.IDUsuario === "object" ? tecnicoData.IDUsuario.id : tecnicoData.IDUsuario

                    const usuarioRef = doc(db, "USUARIO", usuarioId)
                    const usuarioSnap = await getDoc(usuarioRef)

                    if (usuarioSnap.exists()) {
                        const userData = usuarioSnap.data()
                        tecnicosAsignados.push({
                            value: usuarioId,
                            primerNombre: userData.primerNombre || "",
                            segundoNombre: userData.segundoNombre || "",
                            primerApellido: userData.primerApellido || "",
                            segundoApellido: userData.segundoApellido || "",
                            fotoPerfil:
                                userData.fotoPerfil ||
                                "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                            label:
                                `${userData.primerNombre || ""} ${userData.segundoNombre || ""} ${userData.primerApellido || ""} ${userData.segundoApellido || ""}`.trim(),
                        })
                    }
                }
                setArrayValueTecnicos(tecnicosAsignados)

                if (tipoTareaReal === "jerarquia" || tipoTareaReal === "repje") {
                    const subtareasRef = collection(docRef, "Subtareas")
                    const subtareasSnap = await getDocs(subtareasRef)
                    const subtareasArray = []

                    subtareasSnap.forEach((subDoc) => {
                        const subData = subDoc.data()
                        subtareasArray.push({
                            id: subDoc.id,
                            nombreSubtarea: subData.nombre || "",
                            descripcionSubtarea: subData.descripcion || "",
                            imagenesAdjuntas: subData.imagenAdjuntaInstrucciones || [],
                            orden: subData.orden || 0,
                            estado: subData.estado || "Pendiente",
                        })
                    })

                    subtareasArray.sort((a, b) => a.orden - b.orden)
                    setSubtareas(subtareasArray)
                    console.log(`[v0] ${subtareasArray.length} subtareas cargadas`)
                }
            } else {
                console.log("[v0] No existe la tarea con ese ID")
                Alert.alert("Error", "No se encontró la tarea")
                navigation.goBack()
            }
        } catch (error) {
            console.error("[v0] Error al obtener tarea:", error)
            Alert.alert("Error", "Hubo un problema al cargar la tarea")
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        getTarea(id, tareaRepetitiva)
    }, [id, tareaRepetitiva])

    const getUsersBySucursal = async (sucursalID) => {
        try {
            const sucursalRef = doc(db, "SUCURSAL", String(sucursalID))
            const usersRef = collection(db, "USUARIO")
            const q = query(usersRef, where("IDSucursal", "==", sucursalRef))
            const responseDB = await getDocs(q)

            const tecnicosArray = []

            for (const docSnap of responseDB.docs) {
                const data = docSnap.data()

                if (data.rol === "Tecnico") {
                    tecnicosArray.push({
                        value: docSnap.id,
                        primerNombre: data.primerNombre || "",
                        segundoNombre: data.segundoNombre || "",
                        primerApellido: data.primerApellido || "",
                        segundoApellido: data.segundoApellido || "",
                        fotoPerfil:
                            data.fotoPerfil || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                        label:
                            `${data.primerNombre || ""} ${data.segundoNombre || ""} ${data.primerApellido || ""} ${data.segundoApellido || ""}`.trim() ||
                            "Sin nombre",
                    })
                }
            }

            setTecnicos(tecnicosArray)
        } catch (error) {
            console.error(error)
            setTecnicos([])
        }
    }

    const obtenerSucursales = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "SUCURSAL"))
            const data = querySnapshot.docs.map((doc) => ({
                label: doc.data().nombre,
                value: doc.id,
            }))
            setSucursal(data)
        } catch (error) {
            console.error("Error obteniendo sucursales:", error)
        }
    }

    useEffect(() => {
        obtenerSucursales()
    }, [])

    useEffect(() => {
        if (valueSucursal) {
            getUsersBySucursal(valueSucursal)
        } else {
            setTecnicos([])
        }
    }, [valueSucursal])

    const mostrarOpciones = () => {
        Alert.alert("Adjuntar imágenes", "Selecciona una opción", [
            { text: "Tomar foto", onPress: tomarFoto },
            { text: "Elegir desde galería", onPress: elegirDesdeGaleria },
            { text: "Cancelar", style: "cancel" },
        ])
    }

    const tomarFoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Se necesita acceso a la cámara.")
                return
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            })

            if (!result.canceled && result.assets?.length > 0) {
                setImagenes((prev) => [...prev, result.assets[0].uri])
            }
        } catch (err) {
            console.error("Error al tomar foto:", err)
        }
    }

    const elegirDesdeGaleria = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Se necesita acceso a la galería.")
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 1,
            })

            if (!result.canceled && result.assets?.length > 0) {
                const nuevas = result.assets.map((asset) => asset.uri)
                setImagenes((prev) => [...prev, ...nuevas])
            }
        } catch (err) {
            console.error("Error al elegir desde galería:", err)
        }
    }

    const eliminarImagen = (uri) => {
        Alert.alert("Eliminar imagen", "¿Deseas eliminar esta imagen?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => {
                    setImagenes((prev) => prev.filter((img) => img !== uri))
                },
            },
        ])
    }

    const mostrarOpcionesSubtarea = () => {
        Alert.alert("Adjuntar imágenes", "Selecciona una opción", [
            { text: "Tomar foto", onPress: tomarFotoSubtarea },
            { text: "Elegir desde galería", onPress: elegirDesdeGaleriaSubtarea },
            { text: "Cancelar", style: "cancel" },
        ])
    }

    const tomarFotoSubtarea = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Se necesita acceso a la cámara.")
                return
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            })

            if (!result.canceled && result.assets?.length > 0) {
                setImagenesSubtarea((prev) => [...prev, result.assets[0].uri])
            }
        } catch (error) {
            console.error("Error al tomar foto:", error)
        }
    }

    const elegirDesdeGaleriaSubtarea = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Necesitas otorgar permiso para acceder a la galería.")
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 1,
            })

            if (!result.canceled) {
                const nuevas = result.assets.map((asset) => asset.uri)
                setImagenesSubtarea((prev) => [...prev, ...nuevas])
            }
        } catch (error) {
            console.error("Error al seleccionar imágenes:", error)
        }
    }

    const eliminarImagenSubtarea = (uri) => {
        Alert.alert("Eliminar imagen", "¿Deseas eliminar esta imagen?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => {
                    setImagenesSubtarea((prev) => prev.filter((img) => img !== uri))
                },
            },
        ])
    }

    const agregarSubtarea = () => {
        if (!nombreSubtarea.trim() || !descripcionSubtarea.trim()) {
            Alert.alert("Campos incompletos", "Debes escribir un nombre y una descripción.")
            return
        }

        const nuevaSubtarea = {
            nombreSubtarea: nombreSubtarea.trim(),
            descripcionSubtarea: descripcionSubtarea.trim(),
            imagenesAdjuntas: imagenesSubtarea,
            estado: "Pendiente",
        }

        // Si hay una subtarea en edición, está reemplazando esa
        if (subtareaEnEdicion !== null) {
            setSubtareas((prev) => {
                const nuevaLista = [...prev]
                nuevaLista[subtareaEnEdicion] = nuevaSubtarea
                return nuevaLista
            })
            setSubtareaEnEdicion(null)
            Alert.alert("Subtarea editada", "Los cambios han sido aplicados.")
        } else {
            // Agregar nueva subtarea
            setSubtareas((prev) => [...prev, nuevaSubtarea])
        }

        // Limpiar campos
        setNombreSubtarea("")
        setDescripcionSubtarea("")
        setImagenesSubtarea([])
    }

    const editarSubtarea = (index) => {
        if (subtareaEnEdicion !== null) {
            Alert.alert(
                "Advertencia",
                "Ya hay una subtarea en edición. Debes completar o cancelar la edición actual primero.",
            )
            return
        }

        const subtarea = subtareas[index]
        setNombreSubtarea(subtarea.nombreSubtarea)
        setDescripcionSubtarea(subtarea.descripcionSubtarea)
        setImagenesSubtarea(subtarea.imagenesAdjuntas || [])
        setSubtareaEnEdicion(index)

        Alert.alert(
            "Modo edición",
            "Modifica los campos y presiona 'Actualizar Subtarea' para guardar los cambios, o 'Cancelar Edición' para cancelar.",
            [{ text: "Entendido" }],
        )
    }

    const cancelarEdicionSubtarea = () => {
        setNombreSubtarea("")
        setDescripcionSubtarea("")
        setImagenesSubtarea([])
        setSubtareaEnEdicion(null)
        Alert.alert("Edición cancelada", "Se han descartado los cambios.")
    }

    const eliminarSubtarea = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setSubtareas((prev) => prev.filter((_, i) => i !== index))
    }

    const moverArriba = (index) => {
        if (index === 0) return
        setSubtareas((prev) => {
            const nuevaLista = [...prev]
            const temp = nuevaLista[index - 1]
            nuevaLista[index - 1] = nuevaLista[index]
            nuevaLista[index] = temp
            return nuevaLista
        })
    }

    const moverAbajo = (index) => {
        if (index === subtareas.length - 1) return
        setSubtareas((prev) => {
            const nuevaLista = [...prev]
            const temp = nuevaLista[index + 1]
            nuevaLista[index + 1] = nuevaLista[index]
            nuevaLista[index] = temp
            return nuevaLista
        })
    }

    const confirmarEliminar = (index) => {
        Alert.alert("Eliminar subtarea", "¿Seguro que deseas eliminar esta subtarea?", [
            {
                text: "Cancelar",
                style: "cancel",
            },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => eliminarSubtarea(index),
            },
        ])
    }

    const handleConfirm = (date) => {
        const now = new Date()
        if (date < now) {
            Alert.alert("Error", "No puedes seleccionar una fecha/hora pasada.")
            return
        }
        setSelectedDate(date)
        setIsVisible(false)
    }

    const handleConfirmHora = (date) => {
        setSelectedHora({
            hour: date.getHours(),
            minute: date.getMinutes(),
        })
        setIsVisibleHora(false)
    }

    const handleConfirmHoraInicio = (date) => {
        setSelectedHoraInicio({
            hour: date.getHours(),
            minute: date.getMinutes(),
        })
        setIsVisibleHoraInicio(false)
    }

    const aumentar = () => setDias((prev) => Math.min(prev + 1, 30))
    const disminuir = () => setDias((prev) => Math.max(prev - 1, 1))

    const acomodarArrayConTecnicos = () => {
        if (!valueTecnicos || valueTecnicos === "") {
            Alert.alert("Atención", "Tienes que seleccionar un técnico primero")
            return
        }

        if (!valueSucursal) {
            Alert.alert("Atención", "Debes seleccionar una sucursal primero")
            return
        }

        const tecnicoSeleccionado = tecnicos.find((t) => t.value === valueTecnicos)
        if (!tecnicoSeleccionado) {
            Alert.alert("Error", "El técnico seleccionado no existe o no pertenece a la sucursal")
            return
        }

        setArrayValueTecnicos((prev) => {
            const yaExiste = prev.some((t) => t.value === tecnicoSeleccionado.value)
            if (yaExiste) {
                Alert.alert("Atención", "Ese técnico ya fue agregado")
                setValueTecnicos(null)
                return prev
            }

            const nuevoArray = [...prev, tecnicoSeleccionado]
            setValueTecnicos(null)
            return nuevoArray
        })
    }

    const tecnicosDisponibles = tecnicos.filter((t) => !arrayValueTecnicos.some((sel) => sel.value === t.value))

    const handleOpenSucursal = () => {
        setOpenSucursal(true)
        setOpenPrioridad(false)
        setOpenTecnicos(false)
    }

    const handleOpenPrioridad = () => {
        setOpenPrioridad(true)
        setOpenSucursal(false)
        setOpenTecnicos(false)
    }

    const handleOpenTecnicos = () => {
        setOpenTecnicos(true)
        setOpenSucursal(false)
        setOpenPrioridad(false)
    }

    const actualizarTarea = async () => {
        if (loading) return

        if (subtareaEnEdicion !== null) {
            Alert.alert(
                "Edición pendiente",
                "Tienes una subtarea en edición. Debes completar o cancelar la edición antes de guardar la tarea.",
            )
            return
        }

        setLoading(true)

        console.log("[v0] Validando datos...")

        if (tipoTarea === "simple") {
            if (!nombre?.trim()) {
                Alert.alert("Campo requerido", "El nombre de la tarea es obligatorio")
                setLoading(false)
                return
            }
            if (!descripcion?.trim()) {
                Alert.alert("Campo requerido", "La descripción de la tarea es obligatoria")
                setLoading(false)
                return
            }
            if (!valuePrioridad) {
                Alert.alert("Campo requerido", "Debes seleccionar una prioridad")
                setLoading(false)
                return
            }
            if (!valueSucursal) {
                Alert.alert("Campo requerido", "Debes seleccionar una sucursal")
                setLoading(false)
                return
            }
            if (!arrayValueTecnicos || arrayValueTecnicos.length === 0) {
                Alert.alert("Campo requerido", "Debes asignar al menos un técnico")
                setLoading(false)
                return
            }
            // Solo validar fecha de entrega si NO es plantilla
            if (!tareaRepetitiva && !selectedDate) {
                Alert.alert("Campo requerido", "Debes seleccionar una fecha de entrega")
                setLoading(false)
                return
            }
        } else if (tipoTarea === "repetitiva") {
            if (
                !nombre?.trim() ||
                !descripcion?.trim() ||
                !valuePrioridad ||
                !valueSucursal ||
                !arrayValueTecnicos ||
                arrayValueTecnicos.length === 0
            ) {
                Alert.Alert("Faltan campos", "Revisa los datos básicos de la tarea")
                setLoading(false)
                return
            }
            if (!selectedHora || !tipoRecurrencia || !dias || !selectedHoraInicio) {
                Alert.alert("Faltan campos", "Revisa los datos de recurrencia: duración, hora inicio y hora límite")
                setLoading(false)
                return
            }
        } else if (tipoTarea === "jerarquia") {
            if (
                !nombre?.trim() ||
                !descripcion?.trim() ||
                !valuePrioridad ||
                !valueSucursal ||
                !arrayValueTecnicos ||
                arrayValueTecnicos.length === 0
            ) {
                Alert.alert("Faltan campos", "Revisa los datos básicos de la tarea")
                setLoading(false)
                return
            }
            // Solo validar fecha de entrega si NO es plantilla
            if (!tareaRepetitiva && !selectedDate) {
                Alert.alert("Campo requerido", "Debes seleccionar una fecha de entrega")
                setLoading(false)
                return
            }
            if (!subtareas || subtareas.length === 0) {
                Alert.alert("Faltan subtareas", "Debes agregar al menos una subtarea para la jerarquía")
                setLoading(false)
                return
            }
        } else if (tipoTarea === "repje") {
            if (
                !nombre?.trim() ||
                !descripcion?.trim() ||
                !valuePrioridad ||
                !valueSucursal ||
                !arrayValueTecnicos ||
                arrayValueTecnicos.length === 0
            ) {
                Alert.alert("Faltan campos", "Revisa los datos básicos de la tarea")
                setLoading(false)
                return
            }
            if (!selectedHora || !tipoRecurrencia || !dias || !selectedHoraInicio) {
                Alert.alert("Faltan campos", "Revisa los datos de recurrencia: duración, hora inicio y hora límite")
                setLoading(false)
                return
            }
            if (!subtareas || subtareas.length === 0) {
                Alert.alert("Faltan subtareas", "Debes agregar al menos una subtarea")
                setLoading(false)
                return
            }
        }

        try {
            console.log("[v0] Subiendo imágenes nuevas...")
            const urls = []

            // Subir solo imágenes nuevas (URIs locales)
            for (const uri of imagenes) {
                if (uri.startsWith("http")) {
                    urls.push(uri)
                } else {
                    const data = new FormData()
                    data.append("file", {
                        uri,
                        type: "image/jpeg",
                        name: `tarea_${Date.now()}.jpg`,
                    })
                    data.append("upload_preset", cloudinaryConfig.uploadPreset)

                    try {
                        const res = await axios.post(
                            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                            data,
                            { headers: { "Content-Type": "multipart/form-data" } },
                        )
                        urls.push(res.data.secure_url)
                        console.log("[v0] Imagen subida:", res.data.secure_url)
                    } catch (err) {
                        console.error("[v0] Error al subir imagen:", err)
                    }
                }
            }

            const coleccion = tareaRepetitiva ? "TAREA_REPETITIVAS" : "TAREA"
            console.log(`[v0] Actualizando en colección: ${coleccion}, tipo tarea: ${tipoTarea}`)

            const docRef = doc(db, coleccion, id)

            const updateData = {
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                prioridad: valuePrioridad,
                IDSucursal: doc(db, "SUCURSAL", valueSucursal.toString()),
                imagenAdjuntaInstrucciones: urls,
                tipoTarea: tipoTarea, // Mantener el tipo real en la BD
            }

            if ((tipoTarea === "simple" || tipoTarea === "jerarquia") && !tareaRepetitiva) {
                updateData.fechaEntrega = selectedDate.toISOString()
            }

            if (tareaRepetitiva && (tipoTarea === "repetitiva" || tipoTarea === "repje")) {
                updateData.frecuencia = tipoRecurrencia
                updateData.duracionDias = dias
                updateData.horaEntrega = selectedHora
                updateData.horaInicio = selectedHoraInicio
                updateData.activa = activa
            }

            await updateDoc(docRef, updateData)
            console.log("[v0] Tarea actualizada en Firestore")

            // Actualizar técnicos
            const tecnicosRef = collection(docRef, "Tecnicos")
            const tecnicosSnap = await getDocs(tecnicosRef)

            for (const tecDoc of tecnicosSnap.docs) {
                await deleteDoc(tecDoc.ref)
            }
            console.log("[v0] Técnicos anteriores eliminados")

            for (const tecnico of arrayValueTecnicos) {
                const tecnicoRef = doc(tecnicosRef)
                await setDoc(tecnicoRef, {
                    IDUsuario: doc(db, "USUARIO", tecnico.value),
                    fechaAsignacion: new Date(),
                })
            }
            console.log(`[v0] ${arrayValueTecnicos.length} técnicos asignados`)

            if (tipoTarea === "jerarquia" || tipoTarea === "repje") {
                const subtareasRef = collection(docRef, "Subtareas")
                const subtareasSnap = await getDocs(subtareasRef)

                for (const subDoc of subtareasSnap.docs) {
                    await deleteDoc(subDoc.ref)
                }
                console.log("[v0] Subtareas anteriores eliminadas")

                for (let index = 0; index < subtareas.length; index++) {
                    const subtarea = subtareas[index]
                    const urlsSubtarea = []

                    if (subtarea.imagenesAdjuntas && subtarea.imagenesAdjuntas.length > 0) {
                        for (const uri of subtarea.imagenesAdjuntas) {
                            if (uri.startsWith("http")) {
                                urlsSubtarea.push(uri)
                            } else {
                                const data = new FormData()
                                data.append("file", {
                                    uri,
                                    type: "image/jpeg",
                                    name: `subtarea_${index + 1}_${Date.now()}.jpg`,
                                })
                                data.append("upload_preset", cloudinaryConfig.uploadPreset)

                                try {
                                    const res = await axios.post(
                                        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                                        data,
                                        { headers: { "Content-Type": "multipart/form-data" } },
                                    )
                                    urlsSubtarea.push(res.data.secure_url)
                                } catch (err) {
                                    console.error("[v0] Error al subir imagen de subtarea:", err)
                                }
                            }
                        }
                    }

                    const subtareaRef = doc(subtareasRef)
                    await setDoc(subtareaRef, {
                        nombre: subtarea.nombreSubtarea,
                        descripcion: subtarea.descripcionSubtarea,
                        imagenAdjuntaInstrucciones: urlsSubtarea,
                        orden: index + 1,
                        estado: subtarea.estado || "Pendiente",
                    })
                }
                console.log(`[v0] ${subtareas.length} subtareas guardadas`)
            }

            Toast.show({
                type: "success",
                text1: "Éxito",
                text2: "Tarea actualizada correctamente",
            })

            navigation.goBack()
        } catch (error) {
            console.error("[v0] Error actualizando tarea:", error)
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudo actualizar la tarea",
            })
        } finally {
            setLoading(false)
        }
    }

    if (cargando) {
        return (
            <View style={{ flex: 1 }}>
                <View
                    style={[
                        profile.modoOscuro === true ? styles.containerOscuro : styles.containerClaro,
                        { justifyContent: "center", alignItems: "center" },
                    ]}
                >
                    <ActivityIndicator size="large" color="#3D67CD" />
                    <Text style={{ marginTop: 10, color: profile.modoOscuro ? "#FFFFFF" : "#000000" }}>Cargando tarea...</Text>
                </View>
            </View>
        )
    }

    const formatearFecha = (fecha) => {
        if (!fecha) return "No disponible"
        const date = fecha.toDate ? fecha.toDate() : new Date(fecha)
        return date.toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        })
    }

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={["#87aef0", "#9c8fc4"]}
                start={{ x: 0.5, y: 0.4 }}
                end={{ x: 0.5, y: 1 }}
                style={{ height: 155 }}
            >
                <View style={{ paddingTop: 40, paddingLeft: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "900", marginTop: 5, paddingLeft: 10 }}>
                        {tipoTarea === "simple" && !tareaRepetitiva && "Editar Tarea"}
                        {tipoTarea === "repetitiva" && "Editar Plantilla de Tarea"}
                        {tipoTarea === "jerarquia" && !tareaRepetitiva && "Editar Tarea"}
                        {tipoTarea === "repje" && "Editar Plantilla de Tarea"}
                    </Text>
                </View>
            </LinearGradient>
            <View style={profile.modoOscuro === true ? styles.containerOscuro : styles.containerClaro}>
                <ScrollView
                    style={{ paddingHorizontal: 15, borderTopRightRadius: 35, borderTopLeftRadius: 35, paddingBottom: 0 }}
                    nestedScrollEnabled={true}
                >
                    <View>
                        <Text
                            style={[
                                styles.titulo,
                                { paddingTop: 20 },
                                { color: profile.modoOscuro === true ? "#FFFFFF" : "#000000" },
                            ]}
                        >
                            Tipo de Tarea
                        </Text>
                        <View style={[profile.modoOscuro ? styles.inputOscuro : styles.inputClaro, { marginTop: 10 }]}>
                            <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#FFFFFF" : "#000000" }}>
                                {tipoTarea === "simple" && !tareaRepetitiva && "Tarea Simple"}
                                {tipoTarea === "simple" && tareaRepetitiva && "ERROR: Inconsistencia de datos"}
                                {tipoTarea === "repetitiva" && "Plantilla de Tarea Repetitiva"}
                                {tipoTarea === "jerarquia" && !tareaRepetitiva && "Tarea con Jerarquía"}
                                {tipoTarea === "jerarquia" && tareaRepetitiva && "ERROR: Inconsistencia de datos"}
                                {tipoTarea === "repje" && "Plantilla de Tarea Repetitiva + Jerarquía"}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: profile.modoOscuro ? "#888888" : "#666666", marginTop: 5 }}>
                            {tareaRepetitiva
                                ? "Editando plantilla (El tipo no se puede modificar)"
                                : "Editando tarea (El tipo no se puede modificar)"}
                        </Text>
                    </View>

                    {tareaRepetitiva && (tipoTarea === "repetitiva" || tipoTarea === "repje") && (
                        <View
                            style={{
                                marginTop: 15,
                                padding: 15,
                                backgroundColor: profile.modoOscuro ? "#1a1a1a" : "#F7F8FA",
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: profile.modoOscuro ? "#555555" : "#D9D9D9",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: "700",
                                    color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                    marginBottom: 10,
                                }}
                            >
                                Información de Plantilla
                            </Text>

                            {/* Control de activación */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    paddingVertical: 10,
                                    borderBottomWidth: 1,
                                    borderBottomColor: profile.modoOscuro ? "#333333" : "#E0E0E0",
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "600",
                                        color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                    }}
                                >
                                    Plantilla Activa
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setActiva(!activa)}
                                    style={{
                                        width: 60,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: activa ? "#4CAF50" : "#999999",
                                        justifyContent: "center",
                                        padding: 2,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: "#FFFFFF",
                                            alignSelf: activa ? "flex-end" : "flex-start",
                                        }}
                                    />
                                </TouchableOpacity>
                            </View>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color: profile.modoOscuro ? "#AAAAAA" : "#666666",
                                    marginTop: 5,
                                    fontStyle: "italic",
                                }}
                            >
                                {activa
                                    ? "Las tareas se crearán automáticamente según la recurrencia"
                                    : "La creación automática de tareas está pausada"}
                            </Text>

                            {/* Fechas de solo lectura */}
                            <View style={{ marginTop: 15 }}>
                                <View style={{ marginBottom: 10 }}>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: "600",
                                            color: profile.modoOscuro ? "#CCCCCC" : "#555555",
                                        }}
                                    >
                                        Fecha de Creación de Plantilla
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                            marginTop: 2,
                                        }}
                                    >
                                        {formatearFecha(fechaCreacionPlantilla)}
                                    </Text>
                                </View>

                                <View style={{ marginBottom: 10 }}>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: "600",
                                            color: profile.modoOscuro ? "#CCCCCC" : "#555555",
                                        }}
                                    >
                                        Última Creación de Tarea
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                            marginTop: 2,
                                        }}
                                    >
                                        {formatearFecha(fechaUltimaCreacion)}
                                    </Text>
                                </View>
                            </View>

                            {/* Historial de tareas */}
                            {historialTareas.length > 0 && (
                                <View style={{ marginTop: 15 }}>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: "700",
                                            color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                            marginBottom: 10,
                                        }}
                                    >
                                        Historial de Tareas Creadas ({historialTareas.length})
                                    </Text>
                                    <ScrollView
                                        style={{
                                            maxHeight: 200,
                                            backgroundColor: profile.modoOscuro ? "#0a0a0a" : "#FFFFFF",
                                            borderRadius: 8,
                                            padding: 10,
                                        }}
                                        nestedScrollEnabled={true}
                                    >
                                        {historialTareas.map((hist, index) => (
                                            <View
                                                key={hist.id || index}
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingVertical: 8,
                                                    borderBottomWidth: index < historialTareas.length - 1 ? 1 : 0,
                                                    borderBottomColor: profile.modoOscuro ? "#333333" : "#E0E0E0",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                                        flex: 1,
                                                    }}
                                                >
                                                    {formatearFecha(hist.fechaCreacion)}
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        color: profile.modoOscuro ? "#888888" : "#666666",
                                                        marginHorizontal: 5,
                                                    }}
                                                >
                                                    →
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                                        flex: 1,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    {formatearFecha(hist.fechaEntrega)}
                                                </Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: profile.modoOscuro ? "#555555" : "#D1D1D1" }}>
                        <Text
                            style={[
                                styles.titulo,
                                { paddingTop: 10 },
                                { color: profile.modoOscuro === true ? "#FFFFFF" : "#000000" },
                            ]}
                        >
                            Datos de la Tarea
                        </Text>
                        <View style={styles.containerInputs}>
                            <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Nombre</Text>
                            <TextInput
                                style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                placeholder="Escribe el nombre"
                                placeholderTextColor={profile.modoOscuro ? "#888888" : "#999999"}
                                value={nombre}
                                onChangeText={setNombre}
                            />
                        </View>
                        <View style={styles.containerInputs}>
                            <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Descripción</Text>
                            <TextInput
                                style={[
                                    profile.modoOscuro ? styles.inputOscuro : styles.inputClaro,
                                    styles.descripcion,
                                    { height: Math.max(90, inputHeight) },
                                ]}
                                placeholder="Escribe la descripción"
                                placeholderTextColor={profile.modoOscuro ? "#888888" : "#999999"}
                                multiline
                                textAlignVertical="top"
                                value={descripcion}
                                onChangeText={setDescripcion}
                                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                            />
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <TouchableOpacity
                                onPress={mostrarOpciones}
                                style={profile.modoOscuro ? styles.btnAdjuntarOscuro : styles.btnAdjuntarClaro}
                            >
                                <AntDesign name="picture" size={20} color={profile.modoOscuro ? "#FFFFFF" : "#898C91"} />
                                <Text style={{ fontWeight: "700", fontSize: 16, color: profile.modoOscuro ? "#FFFFFF" : "#898C91" }}>
                                    Adjuntar Imágenes Guia a la Tarea
                                </Text>
                            </TouchableOpacity>

                            {imagenes && imagenes.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                    {imagenes.map((uri, index) => (
                                        <View key={index} style={styles.imageContainer}>
                                            <TouchableOpacity
                                                style={{
                                                    position: "absolute",
                                                    top: 5,
                                                    right: 5,
                                                    backgroundColor: "rgba(255,255,255,0.7)",
                                                    borderRadius: 50,
                                                    padding: 2,
                                                    zIndex: 60000,
                                                }}
                                                onPress={() => eliminarImagen(uri)}
                                            >
                                                <AntDesign name="close" size={18} color="red" />
                                            </TouchableOpacity>
                                            <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 10, marginRight: 8 }} />
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                        <View style={styles.containerInputs}>
                            <Text style={{ ...(profile.modoOscuro ? styles.labelOscuro : styles.labelClaro), zIndex: 700 }}>
                                Prioridad
                            </Text>
                            <DropDownPicker
                                open={openPrioridad}
                                value={valuePrioridad}
                                items={prioridad}
                                setOpen={setOpenPrioridad}
                                setValue={setValuePrioridad}
                                setItems={setPrioridad}
                                placeholder="Selecciona prioridad"
                                style={[profile.modoOscuro ? styles.inputOscuro : styles.inputClaro, styles.box]}
                                listMode="SCROLLVIEW"
                                dropDownContainerStyle={{
                                    borderColor: profile.modoOscuro ? "#555555" : "#F2F3F5",
                                    borderWidth: 2,
                                    backgroundColor: profile.modoOscuro ? "#1a1a1a" : "white",
                                    borderRadius: 8,
                                }}
                                placeholderStyle={{ color: profile.modoOscuro ? "#888888" : "#999999", fontSize: 16 }}
                                textStyle={{ color: profile.modoOscuro ? "#FFFFFF" : "#000000", fontSize: 16 }}
                                zIndex={500}
                                zIndexInverse={1501}
                                ArrowDownIconComponent={() => (
                                    <MaterialIcons
                                        name="keyboard-arrow-down"
                                        size={24}
                                        color={profile.modoOscuro ? "#FFFFFF" : "#000000"}
                                    />
                                )}
                                ArrowUpIconComponent={() => (
                                    <MaterialIcons
                                        name="keyboard-arrow-up"
                                        size={24}
                                        color={profile.modoOscuro ? "#FFFFFF" : "#000000"}
                                    />
                                )}
                                onOpen={handleOpenPrioridad}
                            />
                        </View>

                        {(tipoTarea === "simple" || tipoTarea === "jerarquia") && !tareaRepetitiva && (
                            <View style={styles.containerInputs}>
                                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>
                                    Fecha de entrega
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setIsVisible(true)}
                                    style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <View>
                                            <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#FFFFFF" : "#000000" }}>
                                                {selectedDate ? selectedDate.toLocaleString() : "Selecciona fecha y hora"}
                                            </Text>
                                        </View>
                                        <View style={{ marginRight: 10 }}>
                                            <Fontisto name="date" size={20} color={profile.modoOscuro === true ? "#FFFFFF" : "#000000"} />
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <DateTimePickerModal
                                    isVisible={isVisible}
                                    mode={mode}
                                    onConfirm={handleConfirm}
                                    onCancel={() => setIsVisible(false)}
                                    minimumDate={new Date()}
                                />
                            </View>
                        )}

                        {tareaRepetitiva && (tipoTarea === "repetitiva" || tipoTarea === "repje") && (
                            <View>
                                <View style={styles.containerInputs}>
                                    <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>
                                        Duración de la Tarea en Días
                                    </Text>
                                    <View
                                        style={[
                                            profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro,
                                            { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                                        ]}
                                    >
                                        <TouchableOpacity style={styles.button} onPress={disminuir}>
                                            <Text style={styles.text}>-</Text>
                                        </TouchableOpacity>

                                        <Text style={[styles.value, { color: profile.modoOscuro === true ? "#FFFFFF" : "#000000" }]}>
                                            {dias}
                                        </Text>

                                        <TouchableOpacity style={styles.button} onPress={aumentar}>
                                            <Text style={styles.text}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.containerInputs}>
                                    <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>
                                        Hora de Inicio
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setIsVisibleHoraInicio(true)}
                                        style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                            <View>
                                                <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#FFFFFF" : "#000000" }}>
                                                    {selectedHoraInicio
                                                        ? `${selectedHoraInicio.hour.toString().padStart(2, "0")}:${selectedHoraInicio.minute.toString().padStart(2, "0")}`
                                                        : "Selecciona la hora de inicio"}
                                                </Text>
                                            </View>
                                            <View style={{ marginRight: 10 }}>
                                                <Fontisto name="clock" size={20} color={profile.modoOscuro === true ? "#FFFFFF" : "#000000"} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    <DateTimePickerModal
                                        isVisible={isVisibleHoraInicio}
                                        mode="time"
                                        onConfirm={handleConfirmHoraInicio}
                                        onCancel={() => setIsVisibleHoraInicio(false)}
                                    />
                                </View>
                                <View style={styles.containerInputs}>
                                    <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>
                                        Hora de limite de entrega
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setIsVisibleHora(true)}
                                        style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                            <View>
                                                <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#FFFFFF" : "#000000" }}>
                                                    {selectedHora
                                                        ? `${selectedHora.hour.toString().padStart(2, "0")}:${selectedHora.minute.toString().padStart(2, "0")}`
                                                        : "Selecciona la hora de entrega"}
                                                </Text>
                                            </View>
                                            <View style={{ marginRight: 10 }}>
                                                <Fontisto name="clock" size={20} color={profile.modoOscuro === true ? "#FFFFFF" : "#000000"} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    <DateTimePickerModal
                                        isVisible={isVisibleHora}
                                        mode="time"
                                        onConfirm={handleConfirmHora}
                                        onCancel={() => setIsVisibleHora(false)}
                                    />
                                </View>
                                <View style={[styles.containerInputs, { marginTop: 25 }]}>
                                    <Text
                                        style={[
                                            profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro,
                                            { marginTop: -18, paddingVertical: 0 },
                                        ]}
                                    >
                                        Recurrencia
                                    </Text>
                                    <View
                                        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => setTipoRecurrencia("diario")}
                                            style={[
                                                tipoRecurrencia === "diario"
                                                    ? profile.modoOscuro
                                                        ? styles.btnRecurrenciaActivaOscuro
                                                        : styles.btnRecurrenciaActivaClaro
                                                    : profile.modoOscuro
                                                        ? styles.btnRecurrenciaInactivoOscuro
                                                        : styles.btnRecurrenciaInactivoClaro,
                                                { flex: 1, marginTop: 5 },
                                            ]}
                                        >
                                            <Text
                                                style={
                                                    tipoRecurrencia === "diario" ? styles.textRecurrenciaActiva : styles.textRecurrenciaInactiva
                                                }
                                            >
                                                Diario
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setTipoRecurrencia("semanal")}
                                            style={[
                                                tipoRecurrencia === "semanal"
                                                    ? profile.modoOscuro
                                                        ? styles.btnRecurrenciaActivaOscuro
                                                        : styles.btnRecurrenciaActivaClaro
                                                    : profile.modoOscuro
                                                        ? styles.btnRecurrenciaInactivoOscuro
                                                        : styles.btnRecurrenciaInactivoClaro,
                                                { flex: 1, marginTop: 5 },
                                            ]}
                                        >
                                            <Text
                                                style={
                                                    tipoRecurrencia === "semanal" ? styles.textRecurrenciaActiva : styles.textRecurrenciaInactiva
                                                }
                                            >
                                                Semanal
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => setTipoRecurrencia("quincenal")}
                                            style={[
                                                tipoRecurrencia === "quincenal"
                                                    ? profile.modoOscuro
                                                        ? styles.btnRecurrenciaActivaOscuro
                                                        : styles.btnRecurrenciaActivaClaro
                                                    : profile.modoOscuro
                                                        ? styles.btnRecurrenciaInactivoOscuro
                                                        : styles.btnRecurrenciaInactivoClaro,
                                                { flex: 1, marginTop: 5 },
                                            ]}
                                        >
                                            <Text
                                                style={
                                                    tipoRecurrencia === "quincenal"
                                                        ? styles.textRecurrenciaActiva
                                                        : styles.textRecurrenciaInactiva
                                                }
                                            >
                                                Quincenal
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setTipoRecurrencia("mensual")}
                                            style={[
                                                tipoRecurrencia === "mensual"
                                                    ? profile.modoOscuro
                                                        ? styles.btnRecurrenciaActivaOscuro
                                                        : styles.btnRecurrenciaActivaClaro
                                                    : profile.modoOscuro
                                                        ? styles.btnRecurrenciaInactivoOscuro
                                                        : styles.btnRecurrenciaInactivoClaro,
                                                { flex: 1, marginTop: 5 },
                                            ]}
                                        >
                                            <Text
                                                style={
                                                    tipoRecurrencia === "mensual" ? styles.textRecurrenciaActiva : styles.textRecurrenciaInactiva
                                                }
                                            >
                                                Mensual
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {(tipoTarea === "jerarquia" || tipoTarea === "repje") && (
                        <View
                            style={{
                                marginTop: 20,
                                borderTopWidth: 1,
                                paddingTop: 10,
                                borderColor: profile.modoOscuro ? "#555555" : "#D1D1D1",
                            }}
                        >
                            <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "#FFFFFF" : "#000000" }]}>
                                Edición de Jerarquía
                            </Text>
                            <View style={{ marginTop: 2 }}>
                                <View style={styles.containerInputs}>
                                    <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Nombre</Text>
                                    <TextInput
                                        style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                        placeholder="Escribe el nombre"
                                        placeholderTextColor={profile.modoOscuro ? "#888888" : "#999999"}
                                        value={nombreSubtarea}
                                        onChangeText={setNombreSubtarea}
                                    />
                                </View>
                                <View style={styles.containerInputs}>
                                    <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Descripción</Text>
                                    <TextInput
                                        style={[
                                            profile.modoOscuro ? styles.inputOscuro : styles.inputClaro,
                                            styles.descripcion,
                                            { height: Math.max(90, inputHeightSubtarea) },
                                        ]}
                                        placeholder="Escribe la descripción"
                                        placeholderTextColor={profile.modoOscuro ? "#888888" : "#999999"}
                                        multiline
                                        textAlignVertical="top"
                                        value={descripcionSubtarea}
                                        onChangeText={setDescripcionSubtarea}
                                        onContentSizeChange={(e) => setInputHeightSubtarea(e.nativeEvent.contentSize.height)}
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={mostrarOpcionesSubtarea}
                                    style={[profile.modoOscuro ? styles.btnAdjuntarOscuro : styles.btnAdjuntarClaro, { marginTop: 10 }]}
                                >
                                    <AntDesign name="picture" size={20} color={profile.modoOscuro ? "#FFFFFF" : "#898C91"} />
                                    <Text style={{ fontWeight: "700", fontSize: 16, color: profile.modoOscuro ? "#FFFFFF" : "#898C91" }}>
                                        Adjuntar Imágenes Guia a la Subtarea
                                    </Text>
                                </TouchableOpacity>

                                {imagenesSubtarea && imagenesSubtarea.length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                        {imagenesSubtarea.map((uri, index) => (
                                            <View key={index} style={styles.imageContainer}>
                                                <TouchableOpacity
                                                    style={{
                                                        position: "absolute",
                                                        top: 5,
                                                        right: 5,
                                                        backgroundColor: "rgba(255,255,255,0.7)",
                                                        borderRadius: 50,
                                                        padding: 2,
                                                        zIndex: 60000,
                                                    }}
                                                    onPress={() => eliminarImagenSubtarea(uri)}
                                                >
                                                    <AntDesign name="close" size={18} color="red" />
                                                </TouchableOpacity>
                                                <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 10, marginRight: 8 }} />
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}

                                <TouchableOpacity
                                    onPress={agregarSubtarea}
                                    style={profile.modoOscuro ? styles.btnAgregarSubtareaOscuro : styles.btnAgregarSubtareaClaro}
                                >
                                    <Text style={{ fontWeight: 600, color: "#FFFFFF" }}>
                                        {subtareaEnEdicion !== null ? "Actualizar Subtarea" : "Agregar Subtarea"}
                                    </Text>
                                </TouchableOpacity>

                                {subtareaEnEdicion !== null && (
                                    <TouchableOpacity
                                        onPress={cancelarEdicionSubtarea}
                                        style={[
                                            profile.modoOscuro ? styles.btnCancelarEdicionOscuro : styles.btnCancelarEdicionClaro,
                                            { marginTop: 10 },
                                        ]}
                                    >
                                        <Text style={{ fontWeight: 600, color: profile.modoOscuro ? "#FFFFFF" : "#666666" }}>
                                            Cancelar Edición
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <View style={{ marginTop: 10 }}>
                                    <FlatList
                                        data={subtareas}
                                        scrollEnabled={false}
                                        keyExtractor={(_, index) => index.toString()}
                                        renderItem={({ item, index }) => (
                                            <View>
                                                <Text style={{ fontWeight: "600", color: profile.modoOscuro ? "#FFFFFF" : "#000000" }}>
                                                    Subtarea No.{index + 1}
                                                </Text>
                                                <View style={profile.modoOscuro ? styles.subtareaItemOscuro : styles.subtareaItemClaro}>
                                                    <View
                                                        style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text
                                                                style={[styles.subtareaNombre, { color: profile.modoOscuro ? "#FFFFFF" : "#222222" }]}
                                                            >
                                                                {item.nombreSubtarea}
                                                            </Text>
                                                            <Text
                                                                style={[
                                                                    styles.subtareaDescripcion,
                                                                    { color: profile.modoOscuro ? "#CCCCCC" : "#555555" },
                                                                ]}
                                                            >
                                                                {item.descripcionSubtarea}
                                                            </Text>
                                                        </View>
                                                        <View style={{ alignItems: "center", justifyContent: "center" }}>
                                                            {index !== 0 && (
                                                                <TouchableOpacity onPress={() => moverArriba(index)} style={styles.btnMover}>
                                                                    <AntDesign name="up" size={20} color="#000000" />
                                                                </TouchableOpacity>
                                                            )}
                                                            <TouchableOpacity
                                                                onPress={() => editarSubtarea(index)}
                                                                style={[
                                                                    styles.btnEditar,
                                                                    subtareaEnEdicion !== null && subtareaEnEdicion !== index && { opacity: 0.3 },
                                                                ]}
                                                                disabled={subtareaEnEdicion !== null && subtareaEnEdicion !== index}
                                                            >
                                                                <AntDesign name="edit" size={20} color="#FFFFFF" />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => confirmarEliminar(index)} style={styles.btnEliminar}>
                                                                <AntDesign name="close" size={20} color="#FFFFFF" />
                                                            </TouchableOpacity>
                                                            {index !== subtareas.length - 1 && (
                                                                <TouchableOpacity onPress={() => moverAbajo(index)} style={styles.btnMover}>
                                                                    <AntDesign name="down" size={20} color="#000000" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    </View>

                                                    {item.imagenesAdjuntas?.length > 0 && (
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                                            {item.imagenesAdjuntas.map((uri, imgIndex) => (
                                                                <View key={imgIndex} style={styles.imageContainer}>
                                                                    <Image
                                                                        source={{ uri }}
                                                                        style={{ width: 120, height: 120, borderRadius: 10, marginRight: 8 }}
                                                                    />
                                                                </View>
                                                            ))}
                                                        </ScrollView>
                                                    )}
                                                </View>
                                            </View>
                                        )}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    <View
                        style={{
                            marginTop: 20,
                            borderTopWidth: 1,
                            paddingTop: 10,
                            borderColor: profile.modoOscuro ? "#555555" : "#D1D1D1",
                        }}
                    >
                        <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "#FFFFFF" : "#000000" }]}>
                            Asignación de la Tarea
                        </Text>
                        <View style={{ zIndex: 100 }}>
                            <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Sucursal</Text>
                            <DropDownPicker
                                open={openSucursal}
                                value={valueSucursal}
                                items={sucursal}
                                setOpen={setOpenSucursal}
                                setValue={setValueSucursal}
                                setItems={setSucursal}
                                placeholder="Selecciona sucursal"
                                style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                listMode="SCROLLVIEW"
                                dropDownContainerStyle={{
                                    borderColor: profile.modoOscuro ? "#555555" : "#F2F3F5",
                                    borderWidth: 2,
                                    backgroundColor: profile.modoOscuro ? "#1a1a1a" : "white",
                                    borderRadius: 8,
                                }}
                                placeholderStyle={{ color: profile.modoOscuro ? "#888888" : "#999999", fontSize: 16 }}
                                textStyle={{ color: profile.modoOscuro ? "#FFFFFF" : "#000000", fontSize: 16 }}
                                zIndex={100}
                                zIndexInverse={100}
                                ArrowDownIconComponent={() => (
                                    <MaterialIcons
                                        name="keyboard-arrow-down"
                                        size={24}
                                        color={profile.modoOscuro ? "#FFFFFF" : "#000000"}
                                    />
                                )}
                                ArrowUpIconComponent={() => (
                                    <MaterialIcons
                                        name="keyboard-arrow-up"
                                        size={24}
                                        color={profile.modoOscuro ? "#FFFFFF" : "#000000"}
                                    />
                                )}
                                onOpen={handleOpenSucursal}
                            />
                        </View>
                        <View style={{ flexDirection: "row" }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, { zIndex: 20 }]}>
                                    Asignación
                                </Text>
                                <DropDownPicker
                                    open={openTecnicos}
                                    value={valueTecnicos}
                                    items={tecnicosDisponibles}
                                    setOpen={setOpenTecnicos}
                                    setValue={setValueTecnicos}
                                    placeholder="Selecciona técnico"
                                    style={[profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro, styles.inputTecnicos]}
                                    listMode="SCROLLVIEW"
                                    searchable={true}
                                    searchPlaceholder="Buscar técnico"
                                    zIndex={1}
                                    dropDownContainerStyle={{
                                        borderColor: profile.modoOscuro ? "#555555" : "#F2F3F5",
                                        borderWidth: 2,
                                        backgroundColor: profile.modoOscuro ? "#1a1a1a" : "white",
                                        borderRadius: 8,
                                    }}
                                    placeholderStyle={{ color: profile.modoOscuro ? "#888888" : "#999999", fontSize: 16 }}
                                    textStyle={{ color: profile.modoOscuro ? "#FFFFFF" : "#000000", fontSize: 16 }}
                                    ArrowDownIconComponent={() => (
                                        <MaterialIcons
                                            name="keyboard-arrow-down"
                                            size={24}
                                            color={profile.modoOscuro ? "#FFFFFF" : "#000000"}
                                        />
                                    )}
                                    ArrowUpIconComponent={() => (
                                        <MaterialIcons
                                            name="keyboard-arrow-up"
                                            size={24}
                                            color={profile.modoOscuro ? "#FFFFFF" : "#000000"}
                                        />
                                    )}
                                    onOpen={handleOpenTecnicos}
                                />
                            </View>
                            <View style={{ marginTop: 15 }}>
                                <TouchableOpacity
                                    style={profile.modoOscuro ? styles.masTecnicosOscuro : styles.masTecnicosClaro}
                                    onPress={acomodarArrayConTecnicos}
                                >
                                    <AntDesign name="plus" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View>
                            {arrayValueTecnicos.map((tecnico, index) => (
                                <View key={tecnico.value || index} style={{ flexDirection: "row" }}>
                                    <View
                                        style={[
                                            profile.modoOscuro ? styles.tecnicoCardOscuro : styles.tecnicoCardClaro,
                                            {
                                                borderTopLeftRadius: 11,
                                                borderBottomLeftRadius: 11,
                                                paddingLeft: 12,
                                                paddingVertical: 6,
                                                marginTop: 10,
                                                flex: 1,
                                                flexDirection: "row",
                                            },
                                        ]}
                                    >
                                        <Image style={{ width: 40, height: 40, borderRadius: 100 }} source={{ uri: tecnico.fotoPerfil }} />
                                        <View style={{ justifyContent: "center", paddingLeft: 10 }}>
                                            <Text style={{ color: "#FFFFFF", fontWeight: "500", fontSize: 16 }}>
                                                {`${tecnico.primerNombre} ${tecnico.segundoNombre} ${tecnico.primerApellido} ${tecnico.segundoApellido}`}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => setArrayValueTecnicos((prev) => prev.filter((t) => t.value !== tecnico.value))}
                                        style={[
                                            styles.btnEliminarTecnico,
                                            {
                                                marginTop: 10,
                                                justifyContent: "center",
                                                alignItems: "center",
                                                padding: 8,
                                                borderTopRightRadius: 8,
                                                borderBottomRightRadius: 8,
                                            },
                                        ]}
                                    >
                                        <AntDesign name="close" size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View style={{ paddingTop: 15, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={[styles.botonSumit, loading && { opacity: 0.5 }]}
                                onPress={actualizarTarea}
                                disabled={loading}
                            >
                                <Text style={{ color: "white", fontWeight: 800, fontSize: 20 }}>
                                    {loading ? "Actualizando..." : "Aplicar Cambios"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    containerClaro: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35,
        marginTop: -30,
        paddingBottom: 0,
        marginBottom: 0,
    },
    containerOscuro: {
        flex: 1,
        backgroundColor: "#2C2C2C",
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35,
        marginTop: -30,
        paddingBottom: 0,
        marginBottom: 0,
    },
    titulo: {
        fontSize: 18,
        fontWeight: "700",
    },
    containerInputs: {
        marginTop: 2,
    },
    labelClaro: {
        position: "absolute",
        left: 10,
        backgroundColor: "white",
        paddingVertical: 4,
        paddingHorizontal: 6,
        zIndex: 200,
        fontWeight: "700",
        color: "#898C91",
        fontSize: 16,
        borderRadius: 8,
    },
    labelOscuro: {
        position: "absolute",
        left: 10,
        paddingVertical: 4,
        paddingHorizontal: 6,
        backgroundColor: "#2C2C2C",
        zIndex: 200,
        fontWeight: "700",
        color: "#CCCCCC",
        fontSize: 16,
        borderRadius: 8,
    },
    inputClaro: {
        color: "#000000",
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#D9D9D9",
        borderRadius: 8,
        paddingLeft: 12,
        height: 60,
        justifyContent: "center",
        fontSize: 16,
        backgroundColor: "#FFFFFF",
    },
    inputOscuro: {
        color: "#FFFFFF",
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#555555",
        borderRadius: 8,
        paddingLeft: 12,
        height: 60,
        justifyContent: "center",
        fontSize: 16,
        backgroundColor: "#1a1a1a",
    },
    descripcion: {
        minHeight: 90,
        textAlignVertical: "top",
        paddingTop: 15,
    },
    botonSumit: {
        backgroundColor: "#3D67CD",
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
    },
    box: {
        zIndex: 10,
    },
    inputTecnicos: {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    masTecnicosClaro: {
        padding: 8,
        backgroundColor: "#8BA7E6",
        color: "white",
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        height: 60,
        justifyContent: "center",
    },
    masTecnicosOscuro: {
        padding: 8,
        backgroundColor: "#5B7BC5",
        color: "white",
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        height: 60,
        justifyContent: "center",
    },
    btnAdjuntarClaro: {
        backgroundColor: "#E6E6E6",
        padding: 10,
        flexDirection: "row",
        gap: 5,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    btnAdjuntarOscuro: {
        backgroundColor: "#404040",
        padding: 10,
        flexDirection: "row",
        gap: 5,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    btnAgregarSubtareaClaro: {
        backgroundColor: "#8BA7E6",
        padding: 10,
        marginTop: 10,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    btnAgregarSubtareaOscuro: {
        backgroundColor: "#5B7BC5",
        padding: 10,
        marginTop: 10,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    subtareaItemClaro: {
        backgroundColor: "#F7F8FA",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: "#8BA7E6",
    },
    subtareaItemOscuro: {
        backgroundColor: "#1a1a1a",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: "#5B7BC5",
    },
    subtareaNombre: {
        fontWeight: "600",
        fontSize: 16,
        marginBottom: 4,
    },
    subtareaDescripcion: {
        fontSize: 14,
        lineHeight: 18,
    },
    btnMover: {
        padding: 8,
        marginVertical: 3,
        backgroundColor: "#E3E8FF",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    btnEliminar: {
        padding: 8,
        marginVertical: 5,
        backgroundColor: "#FF6B6B",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    btnEditar: {
        padding: 8,
        marginVertical: 3,
        backgroundColor: "#4CAF50",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    button: {
        backgroundColor: "#D9D9D9",
        borderRadius: 8,
        padding: 10,
        zIndex: 210,
        marginRight: 8,
        marginTop: 4,
    },
    text: {
        color: "#898C91",
        fontSize: 20,
        fontWeight: "bold",
    },
    value: {
        fontSize: 20,
        marginHorizontal: 20,
    },
    tecnicoCardClaro: {
        backgroundColor: "#8BA7E6",
    },
    tecnicoCardOscuro: {
        backgroundColor: "#5B7BC5",
    },
    btnEliminarTecnico: {
        backgroundColor: "#9c8fc4",
    },
    imageContainer: {
        position: "relative",
    },
    btnRecurrenciaActivaClaro: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#8BA7E6",
    },
    btnRecurrenciaActivaOscuro: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#5B7BC5",
    },
    btnRecurrenciaInactivoClaro: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#e6e6e670",
    },
    btnRecurrenciaInactivoOscuro: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#4a4a4a70",
    },
    textRecurrenciaActiva: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    textRecurrenciaInactiva: {
        color: "#898C91",
        fontWeight: "600",
    },
    btnCancelarEdicionClaro: {
        backgroundColor: "#E6E6E6",
        padding: 10,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    btnCancelarEdicionOscuro: {
        backgroundColor: "#404040",
        padding: 10,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
})

export default EditarTarea