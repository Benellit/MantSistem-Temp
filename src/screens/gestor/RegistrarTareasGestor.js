import AntDesign from '@expo/vector-icons/AntDesign';
import Fontisto from '@expo/vector-icons/Fontisto';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { collection, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from 'react-native-toast-message';
import appFirebase, { cloudinaryConfig } from '../../credenciales/Credenciales';
import { useAuth } from "../login/AuthContext";

const RegistrarTareasGestor = ({ navigation }) => {
    const db = getFirestore(appFirebase);
    const { profile } = useAuth();
    const [imagenes, setImagenes] = useState([]);
    const [tipoTarea, setTipoTarea] = useState("simple");
    const [tipoRecurrencia, setTipoRecurrencia] = useState("diario");

    const mostrarOpciones = () => {
        Alert.alert("Adjuntar imágenes", "Selecciona una opción", [
            { text: "Tomar foto", onPress: tomarFoto },
            { text: "Elegir desde galería", onPress: elegirDesdeGaleria },
            { text: "Cancelar", style: "cancel" },
        ]);
    };

    const tomarFoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Se necesita permiso para acceder a la cámara');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: [ImagePicker.MediaType.IMAGE], // ✅ nueva sintaxis
            quality: 1,
        });


        if (!result.canceled && result.assets?.length > 0) {
            setImagenes(prev => [...prev, result.assets[0].uri]);
        }
    };

    const elegirDesdeGaleria = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            alert("Necesitas otorgar permiso para acceder a la galería.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled) {
            const nuevas = result.assets.map((asset) => asset.uri);
            setImagenes((prev) => [...prev, ...nuevas]);
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


    const [loading, setLoading] = useState(false);
    const saveTareas = async () => {
        if (loading) return;
        setLoading(true);

        console.log("Validando datos...");
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
                text2: 'Tarea creada correctamente',
            });
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
    const [selectedDate, setSelectedDate] = useState(null);

    const handleConfirm = (date) => {
        const now = new Date();
        if (date < now) {
            Alert.alert("Error", "No puedes seleccionar una fecha/hora pasada.");
            return;
        }
        setSelectedDate(date);
        setIsVisible(false);
    };

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
                    <View>
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
                            <TextInput style={[profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro, styles.descripcion]}
                                placeholder='Escribe la descripción'
                                placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                                multiline={true}
                                textAlignVertical="top"
                                value={descripcion}
                                onChangeText={setDescripcion}
                            />
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <TouchableOpacity
                                onPress={mostrarOpciones}
                                style={{
                                    backgroundColor: "#8BA7E6",
                                    padding: 10,
                                    flexDirection: "row",
                                    gap: 4,
                                    borderRadius: 8,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <AntDesign
                                    name="plus"
                                    size={20}
                                    color={profile.modoOscuro ? "black" : "#FFF"}
                                />
                                <Text
                                    style={{
                                        fontWeight: "700",
                                        fontSize: 16,
                                        color: profile.modoOscuro ? "black" : "#FFF",
                                    }}
                                >
                                    Adjuntar imágenes
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
                                        <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Hora de entrega</Text>
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
                                                                {selectedDate ? selectedDate.toLocaleString() : "Selecciona la hora de entrega"}
                                                            </Text>
                                                            :
                                                            <Text style={{ fontSize: 16, color: profile.modoOscuro ? "#D1D1D1" : "black", }}>
                                                                {selectedDate ? selectedDate.toLocaleString() : "Selecciona la hora de entrega"}
                                                            </Text>
                                                    }
                                                </View>
                                                <View style={{ marginRight: 10 }}>
                                                    <Fontisto name="clock" size={20} color={profile.modoOscuro === true ? "#FFFF" : "black"} />
                                                </View>
                                            </View>
                                        </TouchableOpacity>

                                        <DateTimePickerModal
                                            isVisible={isVisible}
                                            mode="time"
                                            onConfirm={handleConfirm}
                                            onCancel={() => setIsVisible(false)}
                                            is24Hour={true}
                                            minimumDate={new Date()}
                                            style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                            zIndex={500}
                                            zIndexInverse={1500}
                                        />
                                    </View>
                                    <View style={[styles.containerInputs, { marginTop: 25 }]}>
                                        <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, { marginTop: -18, paddingVertical: 0 }]}>Recurrencia</Text>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("diario") }} style={[tipoRecurrencia === "diario" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Diaria</Text></TouchableOpacity>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("semanal") }} style={[tipoRecurrencia === "semanal" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Semanal</Text></TouchableOpacity>
                                        </View>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("quincenal") }} style={[tipoRecurrencia === "quincenal" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Quincenal</Text></TouchableOpacity>
                                            <TouchableOpacity onPress={() => { setTipoRecurrencia("mensual") }} style={[tipoRecurrencia === "mensual" ? styles.btnTiposTareaActivo : styles.btnTiposTareaInactivo, { flex: 1, marginTop: 5 }]}><Text style={{ color: profile.modoOscuro === true ? 'black' : "white", fontWeight: 600 }}>Mensual</Text></TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                    {tipoTarea === "repje" &&
                        <View style={{ marginTop: 20 }}>
                            <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Creación de jerarquia</Text>
                            <View style={{ marginTop: 2, backgroundColor: "#eaeaeaac", padding: 12, borderRadius: 10 }}>
                                <View style={styles.containerInputs}>
                                    <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, {backgroundColor: "transparent"}]}>Nombre</Text>
                                    <TextInput style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                        placeholder='Escribe el nombre'
                                        placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                                        value={nombre}
                                        onChangeText={setNombre}
                                    />
                                </View>
                                <View style={styles.containerInputs}>
                                    <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, {backgroundColor: "transparent"}]}>Descripción</Text>
                                    <TextInput style={[profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro, styles.descripcion]}
                                        placeholder='Escribe la descripción'
                                        placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                                        multiline={true}
                                        textAlignVertical="top"
                                        value={descripcion}
                                        onChangeText={setDescripcion}
                                    />
                                </View>
                                <TouchableOpacity style={{backgroundColor: "#8BA7E6", padding: 10, marginTop: 5, justifyContent: "center", alignItems: "center", borderRadius: 8}}><Text style={{fontWeight: 600, color: profile.modoOscuro ? "black" : "white"}}>Agregar Subtarea</Text></TouchableOpacity>
                            </View>
                        </View>
                    }
                    <View style={{ marginTop: 20 }}>
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
        height: 90,
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
});

export default RegistrarTareasGestor