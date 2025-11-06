import AntDesign from '@expo/vector-icons/AntDesign';
import Fontisto from '@expo/vector-icons/Fontisto';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, Image, LayoutAnimation, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from 'react-native-toast-message';
import appFirebase, { cloudinaryConfig } from '../../credenciales/Credenciales';
import { useAuth } from "../login/AuthContext";

const RegistrarTareasGestor = ({ navigation }) => {
    const db = getFirestore(appFirebase);
    const { profile } = useAuth();
    const [imagenes, setImagenes] = useState([]);
    const [imagenesSubtarea, setImagenesSubtarea] = useState([]);
    const [tipoTarea, setTipoTarea] = useState("simple");
    const [tipoRecurrencia, setTipoRecurrencia] = useState("diario");
    const [subtareas, setSubtareas] = useState([]);
    const [nombreSubtarea, setNombreSubtarea] = useState("");
    const [descripcionSubtarea, setDescripcionSubtarea] = useState("");

    const mostrarOpcionesSubtarea = () => {
        Alert.alert("Adjuntar imágenes", "Selecciona una opción", [
            { text: "Tomar foto", onPress: tomarFotoSubtarea },
            { text: "Elegir desde galería", onPress: elegirDesdeGaleriaSubtarea },
            { text: "Cancelar", style: "cancel" },
        ]);
    };

    const tomarFotoSubtarea = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Se necesita acceso a la cámara.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });

            if (!result.canceled && result.assets?.length > 0) {
                setImagenesSubtarea((prev) => [...prev, result.assets[0].uri]);
            }
        } catch (error) {
            console.error("Error al tomar foto:", error);
        }
    };

    const elegirDesdeGaleriaSubtarea = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permiso denegado",
                    "Necesitas otorgar permiso para acceder a la galería."
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled) {
                const nuevas = result.assets.map((asset) => asset.uri);
                setImagenesSubtarea((prev) => [...prev, ...nuevas]);
            }
        } catch (error) {
            console.error("Error al seleccionar imágenes:", error);
        }
    };

    const eliminarImagenSubtarea = (uri) => {
        Alert.alert("Eliminar imagen", "¿Deseas eliminar esta imagen?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => {
                    setImagenesSubtarea((prev) => prev.filter((img) => img !== uri));
                },
            },
        ]);
    };
    const [accionPendiente, setAccionPendiente] = useState(null);

    const mostrarOpciones = () => {
        Alert.alert(
            "Adjuntar imágenes",
            "Selecciona una opción",
            [
                { text: "Tomar foto", onPress: () => setAccionPendiente("foto") },
                { text: "Elegir desde galería", onPress: () => setAccionPendiente("galeria") },
                { text: "Cancelar", style: "cancel" },
            ]
        );
    };

    useEffect(() => {
        if (accionPendiente === "foto") {
            tomarFoto();
            setAccionPendiente(null);
        } else if (accionPendiente === "galeria") {
            elegirDesdeGaleria();
            setAccionPendiente(null);
        }
    }, [accionPendiente]);

    const tomarFoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Se necesita acceso a la cámara.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ corrección aquí
                quality: 1,
            });

            if (!result.canceled && result.assets?.length > 0) {
                setImagenes((prev) => [...prev, result.assets[0].uri]);
            }
        } catch (err) {
            console.error("Error al tomar foto:", err);
        }
    };


    const elegirDesdeGaleria = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Se necesita acceso a la galería.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ CORRECTO
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const nuevas = result.assets.map((asset) => asset.uri);
                setImagenes((prev) => [...prev, ...nuevas]);
            }
        } catch (err) {
            console.error("Error al elegir desde galería:", err);
        }
    };


    const eliminarImagen = (uri) => {
        Alert.alert("Eliminar imagen", "¿Deseas eliminar esta imagen?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => {
                    setImagenes((prev) => prev.filter((img) => img !== uri));
                },
            },
        ]);
    };

    useEffect(() => {
        if (profile?.rol === "Tecnico") {
            navigation.navigate("Tabs");
        }
    }, [profile, navigation]);

    // CANTIDAD DE TAREAS
    const [contadorTarea, setContadorTarea] = useState([])
    const getContadorTarea = async () => {
        try {
            const docRef = doc(db, "contador", "tarea");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data().cantidad;
            } else {
                console.log("Documento 'tarea' no existe");
                return 0;
            }
        } catch (error) {
            console.error("Error obteniendo contador de tareas:", error);
            return 0;
        }
    };

    useEffect(() => {
        getContadorTarea();
    }, []);

    // USUARIOS con rol Tecnico por SUCURSAL
    const getUsersBySucursal = async (sucursalID) => {
        try {
            const sucursalRef = doc(db, "SUCURSAL", String(sucursalID));
            const usersRef = collection(db, "USUARIO");
            const q = query(usersRef, where("IDSucursal", "==", sucursalRef));
            const responseDB = await getDocs(q);

            const tecnicosArray = [];

            for (const docSnap of responseDB.docs) {
                const data = docSnap.data();

                // Filtrar por rol directamente
                if (data.rol === "Tecnico") {
                    tecnicosArray.push({
                        value: docSnap.id,
                        primerNombre: data.primerNombre || "",
                        segundoNombre: data.segundoNombre || "",
                        primerApellido: data.primerApellido || "",
                        segundoApellido: data.segundoApellido || "",
                        fotoPerfil:
                            data.fotoPerfil ||
                            "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                        label: (
                            (data.primerNombre || "") +
                            " " +
                            (data.segundoNombre || "") +
                            " " +
                            (data.primerApellido || "") +
                            " " +
                            (data.segundoApellido || "")
                        ).trim() || "Sin nombre",
                    });
                }
            }

            setTecnicos(tecnicosArray);
        } catch (error) {
            console.error(error);
            setTecnicos([]);
        }
    };

    // CREAR TAREAS ------------------------------
    const [loading, setLoading] = useState(false);
    const saveTareas = async () => {
        if (loading) return;
        setLoading(true);

        console.log("Validando datos...");
        if (tipoTarea === "simple") {
            if (
                !nombre ||
                !descripcion ||
                !valuePrioridad ||
                !valueSucursal ||
                !arrayValueTecnicos ||
                arrayValueTecnicos.length === 0 ||
                !selectedDate
            ) {
                Alert.alert("Faltan campos", "Revisa los datos antes de continuar");
                setLoading(false);
                return;
            }
        } else if (tipoTarea === "repetitiva") {
            if (
                !nombre ||
                !descripcion ||
                !valuePrioridad ||
                !valueSucursal ||
                !arrayValueTecnicos ||
                arrayValueTecnicos.length === 0 ||
                !selectedHora ||
                !tipoRecurrencia ||
                !dias ||
                !selectedHoraInicio
            ) {
                Alert.alert("Faltan campos", "Revisa los datos antes de continuar");
                setLoading(false);
                return;
            }
        } else if (tipoTarea === "jerarquia") {
            if (
                !nombre ||
                !descripcion ||
                !valuePrioridad ||
                !valueSucursal ||
                !arrayValueTecnicos ||
                arrayValueTecnicos.length === 0 ||
                !selectedDate ||
                !subtareas ||
                subtareas.length === 0
            ) {
                Alert.alert("Faltan campos", "Revisa los datos antes de continuar");
                setLoading(false);
                return;
            }
        }


        // subir imagenes de tareas
        console.log("Datos válidos, intentando crear tarea...");
        try {
            const contadorActual = await getContadorTarea();
            const nuevoNumero = contadorActual + 1;

            const urls = [];

            if (imagenes && imagenes.length > 0) {
                console.log(`Subiendo ${imagenes.length} imágenes a Cloudinary...`);

                for (const uri of imagenes) {
                    const data = new FormData();
                    data.append("file", {
                        uri,
                        type: "image/jpeg",
                        name: `tarea_${Date.now()}.jpg`,
                    });
                    data.append("upload_preset", cloudinaryConfig.uploadPreset);

                    try {
                        const res = await axios.post(
                            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                            data,
                            { headers: { "Content-Type": "multipart/form-data" } }
                        );

                        urls.push(res.data.secure_url);
                        console.log("✅ Imagen subida:", res.data.secure_url);
                    } catch (err) {
                        console.error("❌ Error al subir imagen:", err.response?.data || err.message);
                    }
                }
            } else {
                console.log("No hay imágenes para subir.");
            }

            switch (tipoTarea) {
                case "simple":
                    const docRef = doc(db, "TAREA", nuevoNumero.toString());
                    await setDoc(docRef, {
                        nombre,
                        descripcion,
                        fechaCreacion: new Date(),
                        prioridad: valuePrioridad,
                        estado: "Pendiente",
                        fechaEntrega: selectedDate.toISOString(),
                        IDCreador: doc(db, "USUARIO", profile?.id.toString()),
                        IDSucursal: doc(db, "SUCURSAL", valueSucursal.toString()),
                        imagenAdjuntaInstrucciones: urls,
                        tipoTarea: tipoTarea,
                    });

                    console.log("Tarea guardada");

                    for (const tecnico of arrayValueTecnicos) {
                        const tecnicoRef = doc(collection(docRef, "Tecnicos"));
                        await setDoc(tecnicoRef, {
                            IDUsuario: doc(db, "USUARIO", tecnico.value),
                        });
                    }

                    const contadorRef = doc(db, "contador", "tarea");
                    await updateDoc(contadorRef, { cantidad: nuevoNumero });

                    setImagenes([]);
                    setNombre("");
                    setDescripcion("");
                    setValuePrioridad(null);
                    setSelectedDate(null);
                    setValueSucursal(null);
                    setArrayValueTecnicos([]);
                    setValueTecnicos(null);

                    Toast.show({
                        type: 'success',
                        text1: 'Éxito',
                        text2: 'Tarea simple Creada correctamente',
                    });
                    break;
                case "repetitiva":
                    const tareasRef = collection(db, "TAREA_REPETITIVAS");

                    const nuevaTareaRef = await addDoc(tareasRef, {
                        nombre,
                        descripcion,
                        fechaCreacionPlantilla: new Date(),
                        prioridad: valuePrioridad,
                        estado: "Pendiente",
                        frecuencia: tipoRecurrencia,
                        duracionDias: dias,
                        horaInicio: selectedHoraInicio,
                        horaEntrega: selectedHora,
                        IDCreador: doc(db, "USUARIO", profile?.id.toString()),
                        IDSucursal: doc(db, "SUCURSAL", valueSucursal.toString()),
                        imagenAdjuntaInstrucciones: urls,
                        activa: true,
                        tipoTarea: tipoTarea,
                    });

                    console.log("Tarea repetitiva guardada con ID:", nuevaTareaRef.id);

                    for (const tecnico of arrayValueTecnicos) {
                        const tecnicoRef = doc(collection(nuevaTareaRef, "Tecnicos"));
                        await setDoc(tecnicoRef, {
                            IDUsuario: doc(db, "USUARIO", tecnico.value),
                            fechaDeAsignacion: new Date(),
                        });
                    }

                    setImagenes([]);
                    setNombre("");
                    setDescripcion("");
                    setValuePrioridad(null);
                    setSelectedDate(null);
                    setValueSucursal(null);
                    setArrayValueTecnicos([]);
                    setValueTecnicos(null);
                    setTipoRecurrencia("diario");
                    setSelectedHora(null);

                    Toast.show({
                        type: 'success',
                        text1: 'Éxito',
                        text2: 'Tarea repetitiva creada correctamente',
                    });
                    break;

                case "jerarquia":
                    try {
                        const docRefJerarquia = doc(db, "TAREA", nuevoNumero.toString());

                        await setDoc(docRefJerarquia, {
                            nombre,
                            descripcion,
                            fechaCreacion: new Date(),
                            prioridad: valuePrioridad,
                            estado: "Pendiente",
                            fechaEntrega: selectedDate?.toISOString() || null,
                            IDCreador: doc(db, "USUARIO", profile?.id.toString()),
                            IDSucursal: doc(db, "SUCURSAL", valueSucursal.toString()),
                            imagenAdjuntaInstrucciones: urls,
                            tipoTarea: tipoTarea,
                        });

                        console.log("Tarea jerárquica guardada correctamente");

                        // 🔹 Guardar técnicos asignados
                        for (const tecnico of arrayValueTecnicos) {
                            const tecnicoRef = doc(collection(docRefJerarquia, "Tecnicos"));
                            await setDoc(tecnicoRef, {
                                IDUsuario: doc(db, "USUARIO", tecnico.value),
                                fechaAsignacion: new Date(),
                            });
                        }

                        // Guardar subtareas y subir imágenes si existen
                        for (let index = 0; index < subtareas.length; index++) {
                            const subtarea = subtareas[index];

                            let urls = [];

                            if (subtarea.imagenesAdjuntas && subtarea.imagenesAdjuntas.length > 0) {
                                console.log(`Subiendo ${subtarea.imagenesAdjuntas.length} imágenes de la subtarea ${index + 1}...`);

                                for (const uri of subtarea.imagenesAdjuntas) {
                                    const data = new FormData();
                                    data.append("file", {
                                        uri,
                                        type: "image/jpeg",
                                        name: `subtarea_${index + 1}_${Date.now()}.jpg`,
                                    });
                                    data.append("upload_preset", cloudinaryConfig.uploadPreset);

                                    try {
                                        const res = await axios.post(
                                            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                                            data,
                                            { headers: { "Content-Type": "multipart/form-data" } }
                                        );
                                        urls.push(res.data.secure_url);
                                        console.log("✅ Imagen subida:", res.data.secure_url);
                                    } catch (err) {
                                        console.error("❌ Error al subir imagen:", err.response?.data || err.message);
                                    }
                                }
                            } else {
                                console.log(`Subtarea ${index + 1} sin imágenes adjuntas.`);
                            }

                            const subtareaRef = doc(collection(docRefJerarquia, "Subtareas"));
                            await setDoc(subtareaRef, {
                                nombre: subtarea.nombreSubtarea,
                                descripcion: subtarea.descripcionSubtarea,
                                imagenAdjuntaInstrucciones: urls,
                                orden: index + 1,
                                estado: "Pendiente",
                            });

                            console.log(`✅ Subtarea ${index + 1} guardada en Firestore.`);
                        }

                        const contadorRefTarea = doc(db, "contador", "tarea");
                        await updateDoc(contadorRefTarea, { cantidad: nuevoNumero });

                        // 🔹 Limpiar campos
                        setImagenes([]);
                        setNombre("");
                        setDescripcion("");
                        setValuePrioridad(null);
                        setSelectedDate(null);
                        setValueSucursal(null);
                        setArrayValueTecnicos([]);
                        setValueTecnicos(null);
                        setSubtareas([]);
                        setNombreSubtarea("");
                        setDescripcionSubtarea("");
                        setImagenesSubtarea([]);

                        Toast.show({
                            type: "success",
                            text1: "Éxito",
                            text2: "Tarea con jerarquía creada correctamente",
                        });

                    } catch (error) {
                        console.error("Error creando tarea jerárquica:", error);
                        Toast.show({
                            type: "error",
                            text1: "Error",
                            text2: "Hubo un problema al crear la tarea con jerarquía.",
                        });
                    }
                    break;

                case "repje":
                    try {
                        // 🔹 Crear referencia del nuevo documento de tarea
                        const tareasRef = collection(db, "TAREA_REPETITIVAS");

                        // 🔹 Guardar los datos base de la tarea
                        const nuevaTareaRef = await addDoc(tareasRef, {
                            nombre,
                            descripcion,
                            fechaCreacionPlantilla: new Date(),
                            prioridad: valuePrioridad,
                            estado: "Pendiente",
                            frecuencia: tipoRecurrencia,
                            duracionDias: dias,
                            horaInicio: selectedHoraInicio,
                            horaEntrega: selectedHora,
                            IDCreador: doc(db, "USUARIO", profile?.id.toString()),
                            IDSucursal: doc(db, "SUCURSAL", valueSucursal.toString()),
                            imagenAdjuntaInstrucciones: urls,
                            activa: true,
                            tipoTarea: tipoTarea,
                        });

                        console.log("Tarea repetitiva + jerarquia guardada con ID:", nuevaTareaRef.id);

                        // 🔹 Guardar técnicos asignados
                        for (const tecnico of arrayValueTecnicos) {
                            const tecnicoRef = doc(collection(nuevaTareaRef, "Tecnicos"));
                            await setDoc(tecnicoRef, {
                                IDUsuario: doc(db, "USUARIO", tecnico.value),
                                fechaAsignacion: new Date(),
                            });
                        }

                        // 🔹 Guardar subtareas y subir imágenes si existen
                        for (let index = 0; index < subtareas.length; index++) {
                            const subtarea = subtareas[index];

                            let urls = [];

                            if (subtarea.imagenesAdjuntas && subtarea.imagenesAdjuntas.length > 0) {
                                console.log(`Subiendo ${subtarea.imagenesAdjuntas.length} imágenes de la subtarea ${index + 1}...`);

                                for (const uri of subtarea.imagenesAdjuntas) {
                                    const data = new FormData();
                                    data.append("file", {
                                        uri,
                                        type: "image/jpeg",
                                        name: `subtarea_${index + 1}_${Date.now()}.jpg`,
                                    });
                                    data.append("upload_preset", cloudinaryConfig.uploadPreset);

                                    try {
                                        const res = await axios.post(
                                            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                                            data,
                                            { headers: { "Content-Type": "multipart/form-data" } }
                                        );
                                        urls.push(res.data.secure_url);
                                        console.log("✅ Imagen subida:", res.data.secure_url);
                                    } catch (err) {
                                        console.error("❌ Error al subir imagen:", err.response?.data || err.message);
                                    }
                                }
                            } else {
                                console.log(`Subtarea ${index + 1} sin imágenes adjuntas.`);
                            }

                            const subtareaRef = doc(collection(nuevaTareaRef, "Subtareas"));
                            await setDoc(subtareaRef, {
                                nombre: subtarea.nombreSubtarea,
                                descripcion: subtarea.descripcionSubtarea,
                                imagenAdjuntaInstrucciones: urls,
                                orden: index + 1,
                                estado: "Pendiente",
                            });
                        }


                        // 🔹 Actualizar contador de tareas
                        const contadorRefTarea = doc(db, "contador", "tarea");
                        await updateDoc(contadorRefTarea, { cantidad: nuevoNumero });

                        // 🔹 Limpiar campos
                        setImagenes([]);
                        setNombre("");
                        setDescripcion("");
                        setValuePrioridad(null);
                        setSelectedDate(null);
                        setValueSucursal(null);
                        setArrayValueTecnicos([]);
                        setValueTecnicos(null);
                        setSubtareas([]);
                        setNombreSubtarea("");
                        setDescripcionSubtarea("");
                        setImagenesSubtarea([]);

                        Toast.show({
                            type: "success",
                            text1: "Éxito",
                            text2: "Tarea repetitiva con jerarquía creada correctamente",
                        });

                    } catch (error) {
                        console.error("Error creando tarea jerarquíca:", error);
                        Toast.show({
                            type: "error",
                            text1: "Error",
                            text2: "Hubo un problema al crear la tarea repetitiva con jerarquía.",
                        });
                    }
                    break;

                default:
                    break;
            }



        } catch (error) {
            console.error("Error creando tarea:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudo crear la tarea',
            });
        } finally {
            setLoading(false);
        }
    };

    // Desplegar el combo box de SUCURSAL
    const [openSucursal, setOpenSucursal] = useState(false);
    const [valueSucursal, setValueSucursal] = useState(null);
    const [sucursal, setSucursal] = useState([]);
    const obtenerSucursales = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "SUCURSAL"));
            const data = querySnapshot.docs.map(doc => ({
                label: doc.data().nombre,
                value: doc.id,
            }));
            setSucursal(data);

        } catch (error) {
            console.error("Error obteniendo sucursales:", error);
        }
    };

    useEffect(() => {
        obtenerSucursales();
    }, []);

    useEffect(() => {
        if (valueSucursal) {
            getUsersBySucursal(valueSucursal);
        } else {
            setTecnicos([]);
        }
    }, [valueSucursal]);

    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [inputHeight, setInputHeight] = useState(90);
    const [inputHeightSubtarea, setInputHeightSubtarea] = useState(90);

    const [openPrioridad, setOpenPrioridad] = useState(false);
    const [valuePrioridad, setValuePrioridad] = useState(null);
    const [prioridad, setPrioridad] = useState([
        { label: "🔵 Baja", value: "Baja" },
        { label: "🟡 Media", value: "Media" },
        { label: "🔴 Alta", value: "Alta" },
    ]);

    const [openTecnicos, setOpenTecnicos] = useState(false);
    const [valueTecnicos, setValueTecnicos] = useState(null);
    const [arrayValueTecnicos, setArrayValueTecnicos] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);


    const [isVisible, setIsVisible] = useState(false);
    const [mode, setMode] = useState("datetime");

    const handleConfirm = (date) => {
        const now = new Date();
        if (date < now) {
            Alert.alert("Error", "No puedes seleccionar una fecha/hora pasada.");
            return;
        }
        setSelectedDate(date);
        setIsVisible(false);
    };

    // MANEJO De Duracion de la tarea en dias, hora de creacion y hora de entrega
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedHora, setSelectedHora] = useState(null);
    const [isVisibleHora, setIsVisibleHora] = useState(false);

    const handleConfirmHora = (date) => {
        setSelectedHora({
            hour: date.getHours(),
            minute: date.getMinutes(),
        });
        console.log(selectedHora);
        setIsVisibleHora(false);
    };

    const [selectedHoraInicio, setSelectedHoraInicio] = useState(null);
    const [isVisibleHoraInicio, setIsVisibleHoraInicio] = useState(false);
    const handleConfirmHoraInicio = (date) => {
        setSelectedHoraInicio({
            hour: date.getHours(),
            minute: date.getMinutes(),
        });
        console.log(selectedHoraInicio);
        setIsVisibleHoraInicio(false);
    };

    // Duracion de la tarea en dias
    const [dias, setDias] = useState(1);
    const aumentar = () => setDias(prev => Math.min(prev + 1, 30)); // máx 30 días
    const disminuir = () => setDias(prev => Math.max(prev - 1, 1)); // mín 1 día


    // ACOMODAR ARRAY TECNICOS
    const acomodarArrayConTecnicos = () => {
        if (!valueTecnicos || valueTecnicos === "") {
            alert("Tienes que seleccionar un técnico primero");
            return;
        }

        const tecnicoSeleccionado = tecnicos.find(t => t.value === valueTecnicos);
        if (!tecnicoSeleccionado) {
            alert("El técnico seleccionado no existe");
            return;
        }

        setArrayValueTecnicos((prev) => {
            const yaExiste = prev.some(t => t.value === tecnicoSeleccionado.value);
            if (yaExiste) {
                alert("Ese técnico ya fue agregado");
                setValueTecnicos(null);
                return prev;
            }

            const nuevoArray = [...prev, tecnicoSeleccionado];
            console.log("Nuevo array:", nuevoArray);
            setValueTecnicos(null);
            return nuevoArray;
        });

        console.log("4 Array", arrayValueTecnicos);
    };

    const tecnicosDisponibles = tecnicos.filter(
        (t) => !arrayValueTecnicos.some((sel) => sel.value === t.value)
    );

    // DESPLEGAR LOS DIFERENTES COMBO BOX
    const handleOpenSucursal = () => {
        setOpenSucursal(true);
        setOpenPrioridad(false);
        setOpenTecnicos(false);
    };

    const handleOpenPrioridad = () => {
        setOpenPrioridad(true);
        setOpenSucursal(false);
        setOpenTecnicos(false);
    };

    const handleOpenTecnicos = () => {
        setOpenTecnicos(true);
        setOpenSucursal(false);
        setOpenPrioridad(false);
    };

    const [heights, setHeights] = useState([]);

    const agregarSubtarea = () => {
        if (nombreSubtarea.trim() && descripcionSubtarea.trim()) {
            const nuevaSubtarea = {
                nombreSubtarea,
                descripcionSubtarea,
                imagenesAdjuntas: imagenesSubtarea,
            };

            setSubtareas((prev) => [...prev, nuevaSubtarea]);
            setNombreSubtarea("");
            setDescripcionSubtarea("");
            setImagenesSubtarea([]);
        } else {
            Alert.alert("Campos incompletos", "Debes escribir un nombre y una descripción.");
        }
    };

    const eliminarSubtarea = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSubtareas(prev => prev.filter((_, i) => i !== index));
    };

    const moverArriba = (index) => {
        if (index === 0) return;
        setSubtareas((prev) => {
            const nuevaLista = [...prev];
            const temp = nuevaLista[index - 1];
            nuevaLista[index - 1] = nuevaLista[index];
            nuevaLista[index] = temp;
            return nuevaLista;
        });
    };

    const moverAbajo = (index) => {
        if (index === subtareas.length - 1) return;
        setSubtareas((prev) => {
            const nuevaLista = [...prev];
            const temp = nuevaLista[index + 1];
            nuevaLista[index + 1] = nuevaLista[index];
            nuevaLista[index] = temp;
            return nuevaLista;
        });
    };

    const confirmarEliminar = (index) => {
        Alert.alert(
            "Eliminar subtarea",
            "¿Seguro que deseas eliminar esta subtarea?",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => eliminarSubtarea(index), // llama a tu función existente
                },
            ]
        );
    };


    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={["#87aef0", "#9c8fc4"]}
                start={{ x: 0.5, y: 0.4 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                    height: 155,
                }}
            >
                <View style={{ paddingTop: 40, paddingLeft: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                            <Ionicons name="chevron-back" size={24} color={profile.modoOscuro === true ? "black" : "#FFFF"} />
                        </TouchableOpacity>
                    </View>

                    <Text
                        style={{
                            color: profile.modoOscuro ? "#2C2C2C" : "white",
                            fontSize: 26,
                            fontWeight: "900",
                            marginTop: 5,
                            paddingLeft: 10,
                        }}
                    >
                        Agregar Tarea
                    </Text>
                </View>
            </LinearGradient>
            <View style={profile.modoOscuro === true ? styles.containerOscuro : styles.containerClaro}>
                <ScrollView style={{ paddingHorizontal: 15, borderTopRightRadius: 35, borderTopLeftRadius: 35, paddingBottom: 0 }} nestedScrollEnabled={true}>
                    <View>
                        <Text style={[styles.titulo, { paddingTop: 20 }, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Tipo de Tarea</Text>
                        <ScrollView horizontal={true} style={styles.containerTiposTarea} >
                            <View style={{ flexDirection: "row", gap: 7 }}>
                                <TouchableOpacity onPress={() => setTipoTarea("simple")} style={tipoTarea === "simple" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Tarea Simple</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setTipoTarea("repetitiva")} style={tipoTarea === "repetitiva" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Tarea Repetitiva</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setTipoTarea("jerarquia")} style={tipoTarea === "jerarquia" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Tarea con Jerarquía</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setTipoTarea("repje")} style={tipoTarea === "repje" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Tarea Repetitiva + Jerarquía</Text></TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                    <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: "#D1D1D1" }}>
                        <Text style={[styles.titulo, { paddingTop: 10 }, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Datos de la Tarea</Text>
                        <View style={styles.containerInputs}>
                            <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Nombre</Text>
                            <TextInput style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                placeholder='Escribe el nombre'
                                placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                                value={nombre}
                                onChangeText={setNombre}
                            />
                        </View>
                        <View style={styles.containerInputs}>
                            <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Descripción</Text>
                            <TextInput style={[
                                profile.modoOscuro ? styles.inputOscuro : styles.inputClaro,
                                styles.descripcion,
                                { height: Math.max(90, inputHeight) }
                            ]}
                                placeholder='Escribe la descripción'
                                placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                                multiline
                                textAlignVertical="top"
                                value={descripcion}
                                onChangeText={setDescripcion}
                                onContentSizeChange={(e) =>
                                    setInputHeight(e.nativeEvent.contentSize.height)
                                }
                            />
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <TouchableOpacity
                                onPress={mostrarOpciones}
                                style={{
                                    backgroundColor: "#E6E6E6",
                                    padding: 10,
                                    flexDirection: "row",
                                    gap: 5,
                                    borderRadius: 8,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <AntDesign
                                    name="picture"
                                    size={20}
                                    color={profile.modoOscuro ? "black" : "#898C91"}
                                />
                                <Text
                                    style={{
                                        fontWeight: "700",
                                        fontSize: 16,
                                        color: profile.modoOscuro ? "black" : "#898C91",
                                    }}
                                >
                                    Adjuntar Imágenes Guia a la Tarea
                                </Text>
                            </TouchableOpacity>

                            {/* Mostrar imágenes seleccionadas */}
                            {imagenes &&
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ marginTop: 10 }}
                                >
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
                                            <Image
                                                source={{ uri }}
                                                style={{
                                                    width: 120,
                                                    height: 120,
                                                    borderRadius: 10,
                                                    marginRight: 8,
                                                }} />
                                        </View>
                                    ))}
                                </ScrollView>
                            }
                        </View>
                        <View style={styles.containerInputs}>
                            <Text style={{ ...(profile.modoOscuro ? styles.labelOscuro : styles.labelClaro), zIndex: 700, }}>Prioridad</Text>
                            <DropDownPicker
                                open={openPrioridad}
                                value={valuePrioridad}
                                items={prioridad}
                                setOpen={setOpenPrioridad}
                                setValue={setValuePrioridad}
                                setItems={setPrioridad}
                                placeholder="Selecciona prioridad"
                                style={[
                                    profile.modoOscuro ? styles.inputOscuro : styles.inputClaro,
                                    styles.box
                                ]}
                                listMode="SCROLLVIEW"
                                dropDownContainerStyle={{
                                    borderColor: "#F2F3F5",
                                    borderWidth: 2,
                                    backgroundColor: profile.modoOscuro ? "#2C2C2C" : "white",
                                    borderRadius: 8,
                                }}
                                placeholderStyle={{
                                    color: profile.modoOscuro ? "#D1D1D1" : "black",
                                    fontSize: 16,
                                }}
                                textStyle={{
                                    color: profile.modoOscuro ? "#D1D1D1" : "black",
                                    fontSize: 16,
                                }}
                                zIndex={500}
                                zIndexInverse={1501}
                                ArrowDownIconComponent={() => (
                                    <MaterialIcons name="keyboard-arrow-down" size={24} color={profile.modoOscuro ? "white" : "black"} />

                                )}
                                ArrowUpIconComponent={() => (
                                    <MaterialIcons name="keyboard-arrow-down" size={24} color={profile.modoOscuro ? "white" : "black"} />

                                )}
                                onOpen={handleOpenPrioridad}
                            />
                        </View>
                        {(tipoTarea === "simple" || tipoTarea === "jerarquia") && (
                            <View style={styles.containerInputs}>
                                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Fecha de entrega</Text>
                                <TouchableOpacity onPress={() => setIsVisible(true)} style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}>
                                    <View style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}>
                                        <View>
                                            {
                                                selectedDate ?
                                                    <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#D1D1D1" : "black", }}>
                                                        {selectedDate ? selectedDate.toLocaleString() : "Selecciona fecha y hora"}
                                                    </Text>
                                                    :
                                                    <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#D1D1D1" : "black", }}>
                                                        {selectedDate ? selectedDate.toLocaleString() : "Selecciona fecha y hora"}
                                                    </Text>
                                            }
                                        </View>
                                        <View style={{ marginRight: 10 }}>
                                            <Fontisto name="date" size={20} color={profile.modoOscuro === true ? "#FFFF" : "black"} />
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <DateTimePickerModal
                                    isVisible={isVisible}
                                    mode={mode}
                                    onConfirm={handleConfirm}
                                    onCancel={() => setIsVisible(false)}
                                    minimumDate={new Date()}
                                    style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                    zIndex={500}
                                    zIndexInverse={1500}
                                />
                            </View>
                        )}
                        <View>
                            {(tipoTarea === "repetitiva" || tipoTarea === "repje") && (
                                <View>
                                    <View style={styles.containerInputs}>
                                        <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Duración de la Tarea en Días</Text>
                                        <View style={[profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                                            <TouchableOpacity style={styles.button} onPress={disminuir}>
                                                <Text style={styles.text}>-</Text>
                                            </TouchableOpacity>

                                            <Text style={[styles.value, { color: profile.modoOscuro === true ? "#FFFF" : "black" }]}>{dias}</Text>

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
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <View>
                                                    <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#D1D1D1" : "black" }}>
                                                        {selectedHoraInicio
                                                            ? `${selectedHoraInicio.hour.toString().padStart(2, "0")}:${selectedHoraInicio.minute
                                                                .toString()
                                                                .padStart(2, "0")}`
                                                            : "Selecciona la hora de inicio"}
                                                    </Text>
                                                </View>
                                                <View style={{ marginRight: 10 }}>
                                                    <Fontisto name="clock" size={20} color={profile.modoOscuro === true ? "#FFFF" : "black"} />
                                                </View>
                                            </View>
                                        </TouchableOpacity>

                                        <DateTimePickerModal
                                            isVisible={isVisibleHoraInicio}
                                            mode="time"
                                            onConfirm={handleConfirmHoraInicio}
                                            onCancel={() => setIsVisibleHoraInicio(false)}
                                            style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                            zIndex={500}
                                            zIndexInverse={1500}
                                        />
                                    </View>
                                    <View style={styles.containerInputs}>
                                        <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Hora de limite de entrega</Text>
                                        <TouchableOpacity onPress={() => setIsVisibleHora(true)} style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}>
                                            <View style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}>
                                                <View>
                                                    {
                                                        selectedHora ?
                                                            <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#D1D1D1" : "black" }}>
                                                                {selectedHora
                                                                    ? `${selectedHora.hour.toString().padStart(2, "0")}:${selectedHora.minute
                                                                        .toString()
                                                                        .padStart(2, "0")}`
                                                                    : "Selecciona la hora de entrega"}
                                                            </Text>
                                                            :
                                                            <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#D1D1D1" : "black" }}>
                                                                {selectedHora
                                                                    ? `${selectedHora.hour.toString().padStart(2, "0")}:${selectedHora.minute
                                                                        .toString()
                                                                        .padStart(2, "0")}`
                                                                    : "Selecciona la hora de entrega"}
                                                            </Text>
                                                    }
                                                </View>
                                                <View style={{ marginRight: 10 }}>
                                                    <Fontisto name="clock" size={20} color={profile.modoOscuro === true ? "#FFFF" : "black"} />
                                                </View>
                                            </View>
                                        </TouchableOpacity>

                                        <DateTimePickerModal
                                            isVisible={isVisibleHora}
                                            mode="time"
                                            onConfirm={handleConfirmHora}
                                            onCancel={() => setIsVisibleHora(false)}
                                            style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                            zIndex={500}
                                            zIndexInverse={1500}
                                        />
                                    </View>
                                    <View style={[styles.containerInputs, { marginTop: 25 }]}>
                                        <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, { marginTop: -18, paddingVertical: 0 }]}>Recurrencia</Text>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("diario") }} style={[tipoRecurrencia === "diario" ? styles.btnRecurrenciaActiva : styles.btnRecurrenciaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "#898C91", fontWeight: 600 }}>Diario</Text></TouchableOpacity>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("semanal") }} style={[tipoRecurrencia === "semanal" ? styles.btnRecurrenciaActiva : styles.btnRecurrenciaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "#898C91", fontWeight: 600 }}>Semanal</Text></TouchableOpacity>
                                        </View>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("quincenal") }} style={[tipoRecurrencia === "quincenal" ? styles.btnRecurrenciaActiva : styles.btnRecurrenciaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "#898C91", fontWeight: 600 }}>Quincenal</Text></TouchableOpacity>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("mensual") }} style={[tipoRecurrencia === "mensual" ? styles.btnRecurrenciaActiva : styles.btnRecurrenciaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "#898C91", fontWeight: 600 }}>Mensual</Text></TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                    {(tipoTarea === "jerarquia" || tipoTarea === "repje") && (
                        <View style={{ marginTop: 20, borderTopWidth: 1, paddingTop: 10, borderColor: "#D1D1D1" }}>
                            <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "white" : 'black', zIndex: 200, backgroundColor: profile.modoOscuro === true ? "#2C2C2C" : "white" }]}>Creación de jerarquia</Text>
                            <View style={{ marginTop: 2 }}>
                                <View style={styles.containerInputs}>
                                    <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro,]}>Nombre</Text>
                                    <TextInput style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                        placeholder='Escribe el nombre'
                                        placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                                        value={nombreSubtarea}
                                        onChangeText={setNombreSubtarea}
                                    />
                                </View>
                                <View style={styles.containerInputs}>
                                    <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro]}>Descripción</Text>
                                    <TextInput
                                        style={[
                                            profile.modoOscuro ? styles.inputOscuro : styles.inputClaro,
                                            styles.descripcion,
                                            { height: Math.max(90, inputHeightSubtarea) }
                                        ]}
                                        placeholder='Escribe la descripción'
                                        placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                                        multiline
                                        textAlignVertical="top"
                                        value={descripcionSubtarea}
                                        onChangeText={setDescripcionSubtarea}
                                        onContentSizeChange={(e) =>
                                            setInputHeightSubtarea(e.nativeEvent.contentSize.height)
                                        }
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={mostrarOpcionesSubtarea}
                                    style={{
                                        backgroundColor: "#E6E6E6",
                                        padding: 10,
                                        flexDirection: "row",
                                        gap: 5,
                                        borderRadius: 8,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginTop: 10
                                    }}
                                >
                                    <AntDesign
                                        name="picture"
                                        size={20}
                                        color={profile.modoOscuro ? "black" : "#898C91"}
                                    />
                                    <Text
                                        style={{
                                            fontWeight: "700",
                                            fontSize: 16,
                                            color: profile.modoOscuro ? "black" : "#898C91",
                                        }}
                                    >
                                        Adjuntar Imágenes Guia a la Subtarea
                                    </Text>
                                </TouchableOpacity>

                                {imagenesSubtarea &&
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={{ marginTop: imagenesSubtarea.length === 0 ? 0 : 10 }}
                                    >
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
                                                <Image
                                                    source={{ uri }}
                                                    style={{
                                                        width: 120,
                                                        height: 120,
                                                        borderRadius: 10,
                                                        marginRight: 8,
                                                    }} />
                                            </View>
                                        ))}
                                    </ScrollView>
                                }

                                <TouchableOpacity onPress={agregarSubtarea} style={{ backgroundColor: "#8BA7E6", padding: 10, marginTop: 10, justifyContent: "center", alignItems: "center", borderRadius: 8 }}>
                                    <Text style={{ fontWeight: 600, color: profile.modoOscuro ? "black" : "white" }}>Agregar Subtarea</Text>
                                </TouchableOpacity>
                                <View style={{ marginTop: 10 }}>
                                    <FlatList
                                        data={subtareas}
                                        scrollEnabled={false}
                                        keyExtractor={(_, index) => index.toString()}
                                        renderItem={({ item, index }) => (
                                            <View>
                                                <Text style={{ fontWeight: "600" }}>Subtarea No.{index + 1}</Text>
                                                <View style={styles.subtareaItem}>
                                                    <View style={{
                                                        flexDirection: "row",
                                                        alignItems: "flex-start",
                                                        justifyContent: "space-between",
                                                    }}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.subtareaNombre}>{item.nombreSubtarea}</Text>
                                                            <Text style={styles.subtareaDescripcion}>{item.descripcionSubtarea}</Text>
                                                        </View>
                                                        <View style={{ alignItems: "center", justifyContent: "center" }}>
                                                            {index !== 0 && (
                                                                <TouchableOpacity onPress={() => moverArriba(index)} style={styles.btnMover}>
                                                                    <AntDesign name="up" size={20} color="black" />
                                                                </TouchableOpacity>
                                                            )}
                                                            <TouchableOpacity onPress={() => confirmarEliminar(index)} style={styles.btnEliminar}>
                                                                <AntDesign name="close" size={20} color="black" />
                                                            </TouchableOpacity>
                                                            {index !== subtareas.length - 1 && (
                                                                <TouchableOpacity onPress={() => moverAbajo(index)} style={styles.btnMover}>
                                                                    <AntDesign name="down" size={20} color="black" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    </View>

                                                    {item.imagenesAdjuntas?.length > 0 && (
                                                        <ScrollView
                                                            horizontal
                                                            showsHorizontalScrollIndicator={false}
                                                            style={{ marginTop: 10 }}
                                                        >
                                                            {item.imagenesAdjuntas.map((uri, index) => (
                                                                <View key={index} style={styles.imageContainer}>
                                                                    <Image
                                                                        source={{ uri }}
                                                                        style={{
                                                                            width: 120,
                                                                            height: 120,
                                                                            borderRadius: 10,
                                                                            marginRight: 8,
                                                                        }}
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
                    <View style={{ marginTop: 20, borderTopWidth: 1, paddingTop: 10, borderColor: "#D1D1D1" }}>
                        <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Asignación de la Tarea</Text>
                        <View style={styles.containerInputs}>
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
                                    borderColor: "#F2F3F5",
                                    borderWidth: 2,
                                    backgroundColor: profile.modoOscuro ? "#2C2C2C" : "white",
                                    borderRadius: 8,
                                }}
                                placeholderStyle={{
                                    color: profile.modoOscuro ? "#D1D1D1" : "black",
                                    fontSize: 16,
                                }}
                                textStyle={{
                                    color: profile.modoOscuro ? "#D1D1D1" : "black",
                                    fontSize: 16,
                                }}
                                zIndex={100}
                                zIndexInverse={100}
                                ArrowDownIconComponent={() => (
                                    <MaterialIcons name="keyboard-arrow-down" size={24} color={profile.modoOscuro ? "white" : "black"} />
                                )}
                                ArrowUpIconComponent={() => (
                                    <MaterialIcons name="keyboard-arrow-down" size={24} color={profile.modoOscuro ? "white" : "black"} />
                                )}
                                onOpen={handleOpenSucursal}
                            />
                        </View>
                        <View style={{ flexDirection: "row" }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, { zIndex: 20 }]}>Asignación</Text>
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
                                    searchContainerStyle={{
                                        borderBottomColor: "#ccc",
                                        borderBottomWidth: 1,
                                    }}
                                    searchTextInputStyle={{
                                        height: 40,
                                        fontSize: 16,
                                    }}
                                    zIndex={1}
                                    dropDownContainerStyle={{
                                        borderColor: "#F2F3F5",
                                        borderWidth: 2,
                                        backgroundColor: profile.modoOscuro ? "#2C2C2C" : "white",
                                        borderRadius: 8,
                                    }}
                                    placeholderStyle={{
                                        color: profile.modoOscuro ? "#D1D1D1" : "black",
                                        fontSize: 16,
                                    }}
                                    textStyle={{
                                        color: profile.modoOscuro ? "#D1D1D1" : "black",
                                        fontSize: 16,
                                    }}
                                    ArrowDownIconComponent={() => (
                                        <MaterialIcons name="keyboard-arrow-down" size={24} color={profile.modoOscuro ? "white" : "black"} />
                                    )}
                                    ArrowUpIconComponent={() => (
                                        <MaterialIcons name="keyboard-arrow-down" size={24} color={profile.modoOscuro ? "white" : "black"} />
                                    )}
                                    onOpen={handleOpenTecnicos}
                                />
                            </View>
                            <View style={{ marginTop: 15 }}>
                                <TouchableOpacity style={styles.masTecnicos} onPress={acomodarArrayConTecnicos}><AntDesign name="plus" size={20} color={profile.modoOscuro === true ? "black" : "#FFFF"} /></TouchableOpacity>
                            </View>
                        </View>
                        <View>
                            {arrayValueTecnicos.map((tecnico, index) => (
                                <View key={tecnico.value || index} style={{ flexDirection: "row" }}>
                                    <View
                                        style={{
                                            backgroundColor: "#8BA7E6",
                                            borderTopLeftRadius: 11,
                                            borderBottomLeftRadius: 11,
                                            paddingLeft: 12,
                                            paddingVertical: 6,
                                            marginTop: 10,
                                            flex: 1,
                                            flexDirection: "row",
                                        }}
                                    >
                                        <Image
                                            style={{ width: 40, height: 40, borderRadius: 100 }}
                                            source={{ uri: tecnico.fotoPerfil }}
                                        />
                                        <View style={{ justifyContent: "center", paddingLeft: 10 }}>
                                            <Text style={{ color: profile.modoOscuro ? "black" : "white", fontWeight: "500", fontSize: 16 }}>
                                                {`${tecnico.primerNombre} ${tecnico.segundoNombre} ${tecnico.primerApellido} ${tecnico.segundoApellido}`}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Botón eliminar */}
                                    <TouchableOpacity
                                        onPress={() =>
                                            setArrayValueTecnicos((prev) =>
                                                prev.filter((t) => t.value !== tecnico.value)
                                            )
                                        }
                                        style={{
                                            marginTop: 10,
                                            justifyContent: "center",
                                            alignItems: "center",
                                            backgroundColor: "#9c8fc4",
                                            padding: 8,
                                            borderTopRightRadius: 8,
                                            borderBottomRightRadius: 8,
                                        }}
                                    >
                                        <AntDesign name="close" size={20} color={profile.modoOscuro === true ? "black" : "#FFFF"} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <View style={{ paddingTop: 15, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={[styles.botonSumit, loading && { opacity: 0.1 }]}
                                onPress={saveTareas}
                            >
                                <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 800, fontSize: 20 } : { color: 'white', fontWeight: 800, fontSize: 20 }}>Crear Tarea</Text>
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
        fontWeight: 700,
    },
    containerInputs: {
        marginTop: 2
    },
    labelClaro: {
        position: "absolute",
        left: 10,
        backgroundColor: "white",
        padding: 4,
        zIndex: 200,
        fontWeight: 700,
        color: "#898C91",
        fontSize: 16
    },
    labelOscuro: {
        position: "absolute",
        left: 10,
        padding: 4,
        backgroundColor: "#2C2C2C",
        zIndex: 200,
        fontWeight: 700,
        color: "#b4b8c0ff",
        fontSize: 16
    },
    inputClaro: {
        color: "black",
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#D9D9D9",
        borderRadius: 8,
        paddingLeft: 12,
        height: 60,
        justifyContent: "center",
        fontSize: 16
    },
    inputOscuro: {
        color: "white",
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#D9D9D9",
        borderRadius: 8,
        paddingLeft: 12,
        height: 60,
        justifyContent: "center",
        fontSize: 16,
        backgroundColor: "#2C2C2C",
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
        borderRadius: 13
    },
    box: {
        zIndex: 10
    },
    inputTecnicos: {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    masTecnicos: {
        padding: 8,
        backgroundColor: "#8BA7E6",
        color: "white",
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        height: 60,
        justifyContent: "center"
    },
    containerTiposTarea: {
        paddingVertical: 10,
        gap: 10,
    },
    btnTiposTareaActivo: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#8BA7E6",
    },
    btnTiposTareaInactivo: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#acbadcff",
    },
    btnRecurrenciaActiva: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#E6E6E6",
    },
    btnRecurrenciaInactivo: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#e6e6e670",
    },

    //
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#CCC",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        backgroundColor: "white",
    },
    btnAgregar: {
        backgroundColor: "#4A90E2",
        padding: 10,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 15,
    },
    subtareaItem: {
        backgroundColor: "#F7F8FA",        // fondo suave tipo card
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: "#8BA7E6",       // línea lateral decorativa
    },
    subtareaNombre: {
        fontWeight: "600",
        fontSize: 16,
        color: "#222",
        marginBottom: 4,
    },
    subtareaDescripcion: {
        color: "#555",
        fontSize: 14,
        lineHeight: 18,
    },
    btnMover: {
        padding: 8,
        marginVertical: 3,
        backgroundColor: "#E3E8FF",        // color suave de fondo
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
        backgroundColor: "#FF6B6B",        // rojo más agradable
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
        marginTop: 4
    },
    text: {
        color: "#898C91",
        fontSize: 20,
        fontWeight: "bold"
    },
    value: {
        fontSize: 20,
        marginHorizontal: 20
    },
});

export default RegistrarTareasGestor