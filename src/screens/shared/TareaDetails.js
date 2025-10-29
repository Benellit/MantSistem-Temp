import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where, arrayRemove } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ActivityIndicator, Animated, Dimensions, FlatList, Image, Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import appFirebase, { cloudinaryConfig } from '../../credenciales/Credenciales';
import { useAuth } from "../login/AuthContext";

const { height } = Dimensions.get('window');
const windowWidth = Dimensions.get("window").width;

const TareaDetails = ({ route, navigation }) => {
    const db = getFirestore(appFirebase);
    const { profile } = useAuth();
    const { id, onGoBack } = route.params;

    const [loading, setLoading] = useState(true);
    const [tarea, setTarea] = useState([]);
    const [creador, setCreador] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [expandido, setExpandido] = useState({});
    const [visibleModal, setVisibleModal] = useState(false);
    const [foto, setFoto] = useState([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [carouselItems, setCarouselItems] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [fechaEntrega, setFechaEntrega] = useState("");

    const openModal = (imagenes, fecha, index) => {
        setCarouselItems(imagenes || []);
        setFechaEntrega(fecha);
        setActiveIndex(index);
        setModalVisible(true);
    };


    const saveEvidencias = async (urls) => {
        try {
            const evidenciasRef = collection(db, "TAREA", id, "Evidencias");

            await addDoc(evidenciasRef, {
                IDUsuario: profile.id,
                fechaDeEntrega: new Date(),
                fotografias: urls,
            });

            console.log("✅ Evidencias guardadas en Firestore");
            await cargarDatos();
        } catch (error) {
            console.error("❌ Error al guardar evidencias:", error);
        }
    };

    const fotografias = async (setFoto, saveEvidencias) => {
        // 1. Pedir permiso para acceder a la galería
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            alert("Necesitas otorgar permiso para acceder a la galería.");
            return;
        }

        // 2. Abrir galería con selección múltiple
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
        });

        console.log("📸 Resultado:", result);

        if (result.canceled) return;

        try {
            const urls = [];

            for (const asset of result.assets) {
                const data = new FormData();
                data.append("file", {
                    uri: asset.uri,
                    type: "image/jpeg",
                    name: asset.fileName || "foto.jpg",
                });
                data.append("upload_preset", cloudinaryConfig.uploadPreset);

                const res = await axios.post(
                    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                    data,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );

                urls.push(res.data.secure_url);
                console.log("✅ Imagen subida:", res.data.secure_url);
            }

            Toast.show({
                type: 'success',
                text1: 'Éxito',
                text2: 'Evidencia fotografica subida',
            });

            setFoto(urls);
            await saveEvidencias(urls);
        } catch (err) {
            console.error("❌ Error al subir imágenes:", err.response?.data || err.message);
        }
    };

    const eliminarEvidencia = (idTarea, idEvidenciaDoc, urlFoto) => {
        Alert.alert(
            "Eliminar imagen",
            "¿Deseas eliminar esta imagen?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            console.log("Intentando eliminar...", { idTarea, idEvidenciaDoc, urlFoto });
                            const evidenciaRef = doc(db, "TAREA", idTarea, "Evidencias", idEvidenciaDoc);
                            await updateDoc(evidenciaRef, { fotografias: arrayRemove(urlFoto) });
                            console.log("✅ Imagen eliminada correctamente");

                            Toast.show({
                                type: 'success',
                                text1: 'Éxito',
                                text2: 'Imagen eliminada correctamente',
                            });

                            // Refrescar datos
                            await cargarDatos();
                        } catch (error) {
                            console.error("❌ Error al eliminar evidencia:", error);
                        }
                    },
                },
            ]
        );
    };

    const saveReportes = async () => {
        try {
            const docRef = collection(doc(db, "TAREA", id), "Reportes");
            await setDoc(docRef, {

            })
        } catch (error) {
            console.error(error)
        }
    }

    const cargarDatos = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Documento principal
            const docRef = doc(db, "TAREA", id);
            const responseTarea = await getDoc(docRef);
            let tareaData = null;
            if (responseTarea.exists()) {
                tareaData = responseTarea.data();
                setTarea(tareaData);
            }

            // Creador
            let creadorData = null;
            if (tareaData?.IDCreador) {
                const creadorRef = doc(db, "USUARIO", tareaData.IDCreador.id);
                const creadorSnap = await getDoc(creadorRef);
                if (creadorSnap.exists()) {
                    creadorData = creadorSnap.data();
                    setCreador(creadorData);
                }
            }

            // Técnicos
            const refTecnicos = collection(db, "TAREA", id, "Tecnicos");
            const snap = await getDocs(refTecnicos);
            const tecnicosData = await Promise.all(
                snap.docs.map(async (d) => {
                    const data = d.data();
                    let usuario = null;
                    let idUsuario = null;
                    if (data.IDUsuario) {
                        const userSnap = await getDoc(data.IDUsuario);
                        if (userSnap.exists()) {
                            usuario = userSnap.data();
                            idUsuario = userSnap.id;
                        }
                    }

                    // 🔹 Obtener evidencias del técnico, incluyendo idEvidenciaDoc y fotografias
                    const evidenciasRef = collection(db, "TAREA", id, "Evidencias");
                    const q = query(evidenciasRef, where("IDUsuario", "==", idUsuario));
                    const evidenciasSnap = await getDocs(q);

                    const evidencias = evidenciasSnap.docs.map(docE => ({
                        idEvidenciaDoc: docE.id,                       // ID del documento
                        fotografias: docE.data().fotografias || [],   // array de fotos
                        fechaDeEntrega: docE.data().fechaDeEntrega?.toDate?.() || new Date(),
                    }));

                    return { id: d.id, idUsuario, ...data, usuario, evidencias };
                })
            );

            setTecnicos(tecnicosData);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    }, [id]);


    // 🔹 useEffect para cargar datos al montar o cuando cambia id
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const getEvidenciasPorUsuario = async (tareaId, usuarioId) => {
        try {
            const evidenciasRef = collection(db, "TAREA", tareaId, "Evidencias");

            // Filtrar por IDUsuario
            const q = query(evidenciasRef, where("IDUsuario", "==", usuarioId));
            const snap = await getDocs(q);

            const evidencias = [];
            snap.forEach(doc => {
                const data = doc.data();
                // data.fotografias es un array de URLs
                evidencias.push(...data.fotografias);
            });

            return evidencias;
        } catch (error) {
            console.error("Error al obtener evidencias:", error);
            return [];
        }
    };

    const formatFecha = (fecha) => {
        if (!fecha) return "";

        let dateObj;

        // Caso Firestore Timestamp
        if (typeof fecha.toDate === "function") {
            dateObj = fecha.toDate();
        }
        // Caso string ISO
        else if (typeof fecha === "string") {
            dateObj = new Date(fecha);
        }
        // Caso Date nativo
        else if (fecha instanceof Date) {
            dateObj = fecha;
        } else {
            return "";
        }

        return dateObj.toLocaleString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };


    //Funcion para cambiar de color la estado de la TAREA
    const getEstadoStyle = (estado) => {
        if (!estado) return { backgroundColor: profile.modoOscuro === true ? "black" : "white", color: profile.modoOscuro === true ? "black" : "white", };
        const status = estado;

        if (status === 'Completada') {
            return {
                backgroundColor: '#47A997',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        } else if (status === 'Revisada') {
            return {
                backgroundColor: '#B383E2',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        } else if (status === "Pendiente") {
            return {
                backgroundColor: '#F4C54C',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        } else if (status === "En Proceso") {
            return {
                backgroundColor: '#57A7FE',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        } else if (status === "No Entregada") {
            return {
                backgroundColor: '#F5615C',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        }

        return {
            backgroundColor: profile.modoOscuro === true ? "white" : "black",
            color: profile.modoOscuro === true ? "black" : "white",
        };
    };

    //Funcion para cambiar de color la prioridad de la TAREA
    const getPrioridadStyle = (prioridad) => {
        if (!prioridad) return { backgroundColor: profile.modoOscuro === true ? "black" : "white", color: profile.modoOscuro === true ? "black" : "#EDEDED", };
        const status = prioridad;

        if (status === 'Alta') {
            return {
                backgroundColor: '#F5615C',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        } else if (status === 'Media') {
            return {
                backgroundColor: '#F5C44C',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        } else if (status === "Baja") {
            return {
                backgroundColor: '#57A6FF',
                color: profile.modoOscuro === true ? "black" : "white",
            };
        }

        return {
            backgroundColor: profile.modoOscuro === true ? "black" : "white",
            color: profile.modoOscuro === true ? "black" : "white",
        };
    };

    const [textoPrincipal, setTextoPrincipal] = useState("");
    const [textoSecundario, setTextoSecundario] = useState("");
    const updateEstado = async (modalOupdate) => {
        try {
            let cambio = false;
            const refTarea = doc(db, "TAREA", id);

            if (profile.rol === "Tecnico") {
                switch (tarea.estado) {
                    case 'Pendiente':
                        if (modalOupdate) {
                            setTextoPrincipal("¿Deceas cambiar el estado de esta tarea a En Proceso?");
                            setTextoSecundario("Si lo cambias, ya no podrás regresar el estado a pendiente.");
                            setVisibleModal(true);
                        } else {
                            await updateDoc(refTarea, { estado: "En Proceso" });
                            cambio = true;
                            setVisibleModal(false);
                            Toast.show({
                                type: 'success',
                                text1: 'Tarea En Proceso',
                                text2: '¡Buen trabajo, sigue así!',
                            });
                        }

                        break;

                    case 'En Proceso':
                        if (modalOupdate) {
                            setTextoPrincipal("¿Deceas cambiar el estado de esta tarea a completada?");
                            setTextoSecundario("Si lo cambias, ya no podrás adjuntar más evidencias a esta tarea.");
                            setVisibleModal(true);
                        } else {
                            await updateDoc(refTarea, { estado: "Completada" });
                            cambio = true;
                            setVisibleModal(false);
                            Toast.show({
                                type: 'success',
                                text1: 'Tarea completada',
                                text2: '¡Buen trabajo, sigue así!',
                            });
                        }
                        break;

                    case 'Completada':
                        if (modalOupdate) {
                            setTextoPrincipal("¿Deceas anular la entrega?");
                            setTextoSecundario("Recuerda entregar la tarea antes de la fecha limite.");
                            setVisibleModal(true);
                        } else {
                            await updateDoc(refTarea, { estado: "En Proceso" });
                            cambio = true;
                            setVisibleModal(false);
                            Toast.show({
                                type: 'success',
                                text1: 'Entrega Cancelada',
                                text2: '¡Asegurate de entregarla a tiempo!',
                            });
                        }
                        break;

                    default:
                        console.log("No se encontró el estado");
                        break;
                }
            }

            if (profile.rol === "Administrador" || profile.rol === "Gestor") {
                if (tarea.estado === "Completada") {
                    if (modalOupdate) {
                        setTextoPrincipal("¿Deceas cambiar el estado de esta tarea a revisada?");
                        setTextoSecundario("Si lo cambias, ya no podrá cambiarlo.");
                        setVisibleModal(true);
                    } else {
                        await updateDoc(refTarea, { estado: "Revisada" });
                        cambio = true;
                        setVisibleModal(false);
                        Toast.show({
                            type: 'success',
                            text1: 'Tarea Revisada',
                            text2: '¡Buen trabajo!',
                        });
                    }
                }

                if (tarea.estado === "Revisada") {
                    if (modalOupdate) {
                        setTextoPrincipal("¿Deceas cambiar el estado de esta tarea a completada?");
                        setTextoSecundario("Si lo cambias, ya no podrá cambiarlo.");
                        setVisibleModal(true);
                    } else {
                        await updateDoc(refTarea, { estado: "Completada" });
                        cambio = true;
                        setVisibleModal(false);
                        Toast.show({
                            type: 'success',
                            text1: 'Revisión Cancelada',
                            text2: '¡Asegurate de entregarla a tiempo!',
                        });
                    }
                }
            }

            if (cambio) {
                if (onGoBack) onGoBack();
                await cargarDatos();
            }

            if (cambio) {
                console.log("Campo actualizado correctamente");
                await cargarDatos();
            }
        } catch (error) {
            console.log("Error actualizando estado:", error);
        }
    };


    const toggleExpandir = (id) => {
        setExpandido((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const [visible, setVisible] = useState(false);
    const translateY = useRef(new Animated.Value(height)).current;

    const openSheet = () => {
        setVisible(true);
        Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const closeSheet = () => {
        Animated.timing(translateY, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    };

    // 🔹 Permite arrastrar hacia abajo para cerrar
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                gestureState.dy > 10, // solo si mueve hacia abajo
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) translateY.setValue(gesture.dy);
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > 100) {
                    closeSheet();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const screenWidth = Dimensions.get("window").width;

    // Creamos un estado para guardar las alturas de cada imagen
    const [heights, setHeights] = useState([]);
    useEffect(() => {
        if (tarea.imagenAdjuntaInstrucciones && tarea.imagenAdjuntaInstrucciones.length > 0) {
            tarea.imagenAdjuntaInstrucciones.forEach((url, index) => {
                Image.getSize(url, (width, height) => {
                    const scaleFactor = screenWidth / width;
                    const imageHeight = height * scaleFactor;

                    setHeights(prev => {
                        const newHeights = [...prev];
                        newHeights[index] = imageHeight;
                        return newHeights;
                    });
                });
            });
        }
    }, [tarea.imagenAdjuntaInstrucciones]);

    if (loading) {
        return (
            <View style={profile.modoOscuro === true ? styles.loaderOscuro : styles.loaderClaro}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ color: profile.modoOscuro === true ? "#FFFF" : "black" }}>Cargando datos...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: profile.modoOscuro ? "#2C2C2C" : "white", }}>
            <View style={{ marginTop: 30, justifyContent: "space-between", flexDirection: "row" }}>
                <TouchableOpacity style={{ padding: 10 }} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color={profile.modoOscuro === true ? "#FFFF" : "black"} />
                </TouchableOpacity>
                {(profile.rol === "Administrador" || profile.rol === "Gestor") ? (
                    <TouchableOpacity onPress={() => navigation.navigate("EditTarea", { id: id })} style={{ padding: 10 }}>
                        <Feather name="edit" size={24} color={profile.modoOscuro === true ? "#FFFF" : "black"} />
                    </TouchableOpacity>
                ) : (
                    <View />
                )}
            </View>
            <ScrollView style={{ paddingHorizontal: 15, paddingTop: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ paddingRight: profile.rol === "Administrador" || profile.rol === "Gestor" ? 10 : 0 }}>
                        <Text style={profile.modoOscuro === true ? styles.nombreOscuro : styles.nombreClaro}>{tarea.nombre}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginVertical: 5 }}>
                    <View>
                        <Text style={[{ color: getEstadoStyle(tarea.estado).color, fontWeight: 500, backgroundColor: getEstadoStyle(tarea.estado).backgroundColor, paddingVertical: 2, paddingHorizontal: 12, borderRadius: 6 }]}>{tarea.estado}</Text>
                    </View>
                    <View>
                        <Text style={[{ color: getPrioridadStyle(tarea.prioridad).color, fontWeight: 500, backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor, paddingVertical: 2, paddingHorizontal: 12, borderRadius: 6 }]}>{tarea.prioridad}</Text>
                    </View>
                </View>
                <View>
                    <Text style={profile.modoOscuro === true ? styles.descripcionOscuro : styles.descripcionClaro}>{tarea.descripcion}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 7, marginTop: 10 }}>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Feather name="calendar" size={20} color={profile.modoOscuro === true ? "#d2d2d2ff" : "#7B7B7B"} />
                    </View>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Text style={profile.modoOscuro === true ? styles.numerosOscuro : styles.numerosClaro}>
                            {formatFecha(tarea.fechaCreacion)} - {formatFecha(tarea.fechaEntrega)}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: "row", gap: 7, marginBottom: 10 }}>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <FontAwesome5 name="user-tie" size={20} color={profile.modoOscuro === true ? "#d2d2d2ff" : "#7B7B7B"} />
                    </View>
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <Text style={profile.modoOscuro === true ? styles.numerosOscuro : styles.numerosClaro}>
                            Por el {creador?.rol ?? ""}{" "}
                            {[
                                creador?.primerNombre ?? "",
                                creador?.segundoNombre ?? "",
                                creador?.primerApellido ?? "",
                                creador?.segundoApellido ?? ""
                            ]
                                .filter(name => name.trim() !== "")
                                .join(" ")}
                        </Text>

                    </View>
                </View>
                {tarea.imagenAdjuntaInstrucciones && tarea.imagenAdjuntaInstrucciones.length > 0 && (
                    <View>
                        {tarea.imagenAdjuntaInstrucciones.map((url, index) => (
                            <Image
                                key={index}
                                source={{ uri: url }}
                                style={{
                                    width: "100%",
                                    height: heights[index] || 200,
                                    borderRadius: 10,
                                    marginBottom: 5,
                                }}
                                resizeMode="contain"
                            />
                        ))}
                    </View>
                )}
                <View style={{ paddingBottom: 20 }}>
                    <Text style={[styles.titulo, { paddingTop: 20 }, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Asignación de la Tarea</Text>
                    {tecnicos.map((tecnico) => (
                        <View key={tecnico.id}>
                            <View>
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
                                            uri: tecnico.usuario?.fotoPerfil && tecnico.usuario.fotoPerfil.trim() !== ""
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

                                    <TouchableOpacity
                                        onPress={() => toggleExpandir(tecnico.id)}
                                        style={{ padding: 10 }}
                                    >
                                        <MaterialIcons
                                            name={expandido[tecnico.id] ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                            size={24}
                                            color={profile.modoOscuro ? "black" : "white"}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {expandido[tecnico.id] && (
                                    <View
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 14,
                                            backgroundColor:
                                                tecnico.idUsuario === profile.id ? "#75cd72ff" : "#abbbdfff",
                                            marginTop: -8,
                                            zIndex: 3,
                                            justifyContent: "center",
                                            alignContent: "center",
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 4 }}>
                                            {tecnico.evidencias?.map((evidencia) =>
                                                evidencia.fotografias.map((img, index) => (
                                                    <View key={index} style={{ position: "relative", margin: 4 }}>
                                                        <TouchableOpacity
                                                            onPress={() => openModal(evidencia.fotografias, evidencia.fechaDeEntrega, index)}
                                                        >
                                                            <Image source={{ uri: img }} style={{ width: 100, height: 100, borderRadius: 10 }} />
                                                        </TouchableOpacity>

                                                        {profile.rol == "Tecnico" &&
                                                            <View>
                                                                {tarea.estado == "En Proceso" &&
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
                                                                }
                                                            </View>
                                                        }
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                        <View>
                                            {/* <TouchableOpacity
                                                style={
                                                    profile.modoOscuro
                                                        ? styles.botonVerReporteClaro
                                                        : styles.botonVerReporteOscuro
                                                }
                                            >
                                                <Text
                                                    style={
                                                        profile.modoOscuro
                                                            ? { color: "#777676ff", fontWeight: 600, fontSize: 14 }
                                                            : { color: "white", fontWeight: 600, fontSize: 14 }
                                                    }
                                                >
                                                    Ver Reporte
                                                </Text>
                                            </TouchableOpacity> */}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView >
            <View style={{ paddingBottom: 10 }}>
                {profile.rol === "Tecnico" && (
                    <View >
                        {tarea.estado === "Pendiente" && (
                            <View style={{ paddingTop: 10, marginBottom: 10, paddingHorizontal: 10, gap: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                                <TouchableOpacity
                                    style={[styles.botonEnProceso]}
                                    onPress={() => updateEstado(true)}
                                >
                                    <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }} >Marcar como en proceso</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {tarea.estado === "En Proceso" && (
                            <View style={{ paddingTop: 10, marginBottom: 10, paddingHorizontal: 10, gap: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                                <TouchableOpacity
                                    style={[styles.botonAdjuntar]}
                                    onPress={openSheet}
                                >
                                    <AntDesign name="plus" size={20} color={profile.modoOscuro === true ? "#FFFF" : "#777676ff"} />
                                    <Text style={profile.modoOscuro === true ? { color: 'white', fontWeight: 600, fontSize: 16 } : { color: "#777676ff", fontWeight: 600, fontSize: 16 }}>Evidencias</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.botonEnCompletada]}
                                    onPress={() => updateEstado(true)}
                                >
                                    <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Marcar como completada</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {tarea.estado === "Completada" && (
                            <View style={{ paddingTop: 10, marginBottom: 10, paddingHorizontal: 10, gap: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                                <TouchableOpacity
                                    style={[styles.botonCancelarEntrega]}
                                    onPress={() => updateEstado(true)}
                                >
                                    <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Cancelar entrega</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )
                }
                {profile.rol === "Administrador" && (
                    <View>
                        <View>
                            {tarea.estado === "Completada" && (
                                <View style={{ paddingTop: 10, marginBottom: 10, paddingHorizontal: 10, gap: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                                    <TouchableOpacity
                                        style={[styles.botonMarcarRevisada]}
                                        onPress={() => updateEstado(true)}
                                    >
                                        <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Marcar como revisada</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                            }
                        </View>
                        <View>
                            {tarea.estado === "Revisada" && (
                                <View style={{ paddingTop: 10, marginBottom: 10, paddingHorizontal: 10, gap: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                                    <TouchableOpacity
                                        style={[styles.botonCancelarEntrega]}
                                        onPress={() => updateEstado(true)}
                                    >
                                        <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Cancelar Revisión</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                            }
                        </View>
                    </View>
                )
                }

                {profile.rol === "Gestor" && (
                    <View>
                        <View>
                            {tarea.estado === "Completada" && (
                                <View style={{ paddingTop: 10, marginBottom: 10, paddingHorizontal: 10, gap: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                                    <TouchableOpacity
                                        style={[styles.botonMarcarRevisada]}
                                        onPress={() => updateEstado(true)}

                                    >
                                        <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Marcar como revisada</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                            }
                        </View>
                        <View>
                            {tarea.estado === "Revisada" && (
                                <View style={{ paddingTop: 10, marginBottom: 10, paddingHorizontal: 10, gap: 5, borderTopWidth: 1, borderColor: "#D9D9D9" }}>
                                    <TouchableOpacity
                                        style={[styles.botonCancelarEntrega]}
                                        onPress={() => updateEstado(true)}

                                    >
                                        <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Cancelar Revisión</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                            }
                        </View>
                    </View>
                )
                }
            </View>
            {
                visible && (
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 200,
                            flex: 1,
                            transform: [{ translateY }],
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            backgroundColor: profile.modoOscuro === true ? "white" : "#2C2C2C",
                            paddingHorizontal: 20,
                            paddingTop: "5",
                            shadowColor: '#000',
                            shadowOpacity: 0.2,
                            shadowOffset: { width: 0, height: -2 },
                            borderTopWidth: 1,
                            borderLeftWidth: 1,
                            borderRightWidth: 1,
                            borderColor: "#D9D9D9",
                        }}
                    >
                        <View style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <View
                                style={{ width: 52, height: 6, borderRadius: 3, backgroundColor: "#e5e7eb" }}
                            />
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: profile.modoOscuro === true ? "#777676ff" : "white" }}>
                                Selecciona una opción
                            </Text>
                            <TouchableOpacity onPress={closeSheet} style={{ padding: 10 }}>
                                <AntDesign name="close" size={24} color={profile.modoOscuro ? "#777676ff" : "white"} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ gap: 5, marginTop: 5 }}>
                            <TouchableOpacity style={styles.botonAdjuntar} onPress={() => console.log('📄 Reporte')}>
                                <Feather name="file-text" size={24} color={profile.modoOscuro === true ? "#777676ff" : "white"} />
                                <Text style={profile.modoOscuro === true ? { color: "#777676ff", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Reporte</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.botonAdjuntar} onPress={() => fotografias(setFoto, saveEvidencias)}>
                                <FontAwesome name="picture-o" size={24} color={profile.modoOscuro === true ? "#777676ff" : "white"} />
                                <Text style={profile.modoOscuro === true ? { color: "#777676ff", fontWeight: 600, fontSize: 16 } : { color: 'white', fontWeight: 600, fontSize: 16 }}>Fotografía</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )
            }
            {
                visibleModal && (<Modal
                    animationType='fade'
                    transparent={true}
                    onRequestClose={() => {
                        setVisibleModal(!false);
                    }}
                >
                    <View style={styles.centeredView}>
                        <View style={profile.modoOscuro === true ? styles.modalViewClaro : styles.modalViewOscuro}>
                            <Text style={{ fontWeight: 500, fontSize: 16, color: profile.modoOscuro === true ? "black" : "white" }}>
                                {textoPrincipal}
                            </Text>
                            <Text style={{ color: profile.modoOscuro === true ? "black" : "white", fontSize: 14 }}>{textoSecundario}</Text>
                            <View style={{ flexDirection: "row", gap: 10, marginTop: 7 }}>
                                <TouchableOpacity onPress={() => setVisibleModal(false)} style={{ flex: 1, backgroundColor: "red", paddingVertical: 10, borderRadius: 8, justifyContent: "center", alignItems: 'center' }}>
                                    <Text style={{ color: "white", fontWeight: "600" }}>No</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => updateEstado(false)} style={{ flex: 1, backgroundColor: "green", paddingVertical: 10, borderRadius: 8, justifyContent: "center", alignItems: 'center' }}>
                                    <Text style={{ color: "white", fontWeight: "600" }}>Si</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
                )
            }
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.7)",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <View style={{
                        width: "100%",
                        padding: 2,
                        borderRadius: 8,
                    }}>
                        <FlatList
                            data={carouselItems}
                            horizontal
                            pagingEnabled
                            keyExtractor={(item, i) => i.toString()}
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(ev) => {
                                const newIndex = Math.round(ev.nativeEvent.contentOffset.x / (windowWidth * 1));
                                setActiveIndex(newIndex);
                            }}
                            renderItem={({ item }) => {
                                if (!item) return null;
                                return (
                                    <Image
                                        source={{ uri: item }}
                                        style={{
                                            width: windowWidth * 1,
                                            height: heights[item] || 300,
                                            borderRadius: 10,
                                            marginHorizontal: 5,
                                        }}
                                        resizeMode="cover"
                                    />
                                );
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
        </View >
    )
}

const styles = StyleSheet.create({
    loaderClaro: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white"
    },
    loaderOscuro: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#2C2C2C"
    },
    container: {
        flex: 1,
        padding: 20,
    },
    nombreClaro: {
        fontSize: 24,
        fontWeight: 800,
    },
    nombreOscuro: {
        fontSize: 24,
        fontWeight: 800,
        color: "white"
    },
    descripcionClaro: {
        fontSize: 16,
        fontWeight: 400,
    },
    descripcionOscuro: {
        fontSize: 16,
        fontWeight: 400,
        color: "white"
    },
    numerosClaro: {
        color: "#7B7B7B"
    },
    numerosOscuro: {
        color: "#d2d2d2ff"
    },
    titulo: {
        fontSize: 18,
        fontWeight: 700,
    },
    botonEnProceso: {
        backgroundColor: "#57A7FE",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
    botonEnCompletada: {
        backgroundColor: "#47A997",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
    botonCancelarEntrega: {
        backgroundColor: "gray",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
    botonMarcarRevisada: {
        backgroundColor: '#B383E2',
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
    botonAdjuntar: {
        flexDirection: "row",
        gap: 5,
        borderWidth: 1,
        borderColor: "#D9D9D9",
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
    botonVerReporteClaro: {
        backgroundColor: "white",
        flexDirection: "row",
        gap: 5,
        borderWidth: 1,
        borderColor: "#D9D9D9",
        height: 35,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
    botonVerReporteOscuro: {
        backgroundColor: "#2C2C2C",
        flexDirection: "row",
        gap: 5,
        borderWidth: 1,
        borderColor: "#D9D9D9",
        height: 35,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalViewClaro: {
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 15,
        shadowColor: '#000',
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
        shadowColor: '#000',
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