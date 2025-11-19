import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDoc, getDocs, getFirestore, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import BotonRegistrar from '../../components/BotonRegistrar';
import appFirebase from '../../credenciales/Credenciales';
import { useAuth } from "../login/AuthContext";


export default function TareasAdmin({ navigation }) {
    const db = getFirestore(appFirebase);

    const { profile } = useAuth();
    const screenHeight = Dimensions.get("window").height;

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
            getTareas();
        }, 2000);
    };

    // Conseguir TAREAS
    const [tareas, setTareas] = useState([]);

    const getTareas = async () => {
        try {
            if (profile.rol === "Administrador") {
                const tareasCollection = collection(db, "TAREA");
                const q = query(tareasCollection, orderBy("fechaCreacion", "desc"));

                const responseTareas = await getDocs(q);
                const tareaList = responseTareas.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setTareas(tareaList)
            } else if (profile.rol === "Gestor") {
                const tareasCollection = collection(db, "TAREA");
                const q = query(tareasCollection, orderBy("fechaCreacion", "desc"), where("IDSucursal", "==", `${profile.IDSucursal}`));

                const responseTareas = await getDocs(q);
                const tareaList = responseTareas.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setTareas(tareaList)
            } else if (profile.rol === "Tecnico") {

            } else {
                navigation.navigate("Tabs");
            }
        } catch (error) {
            console.error("Error consiguiendo las Tareas:", error)
        }
    }

    useEffect(() => {
        getTareas();
    }, []);

    // Mostrar Tecnicos por tareas
    function TecnicosList({ tareaID }) {
        const [tecnicos, setTecnicos] = useState([]);
        useEffect(() => {
            const fetchTecnicos = async () => {
                try {
                    const refTecnicos = collection(db, "TAREA", tareaID, "Tecnicos");
                    const snap = await getDocs(refTecnicos);

                    const tecnicosData = await Promise.all(
                        snap.docs.map(async (d) => {
                            const data = d.data();

                            let usuario = null;
                            if (data.IDUsuario) {
                                try {
                                    const userSnap = await getDoc(data.IDUsuario);
                                    if (userSnap.exists()) {
                                        usuario = userSnap.data();
                                    }
                                } catch (err) {
                                    console.error("Error cargando usuario:", err);
                                }
                            }

                            return { id: d.id, ...data, usuario };
                        })
                    );
                    setTecnicos(tecnicosData);
                } catch (error) {
                    console.error("Error cargando técnicos:", error);
                }
            };

            fetchTecnicos();
        }, [tareaID]);

        return (
            <View style={{ flexDirection: 'row' }}>
                {tecnicos.map((tecnico) => (
                    <View key={tecnico.id} style={{ flexDirection: "row", alignItems: "center" }}>
                        <Image
                            style={{ width: 27, height: 27, borderRadius: 100 }}
                            source={{
                                uri: tecnico.usuario?.fotoPerfil && tecnico.usuario.fotoPerfil.trim() !== ""
                                    ? tecnico.usuario.fotoPerfil
                                    : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                            }}
                        />
                    </View>
                ))}
            </View>
        );
    }

    // Mostar cantidad de reportes y evidencias por tarea
    function ReportesYEvidenciasList({ tareaID }) {
        const [reportes, setReportes] = useState("");
        const [evidencias, setEvidencias] = useState("");
        useEffect(() => {
            const fetchRepYEvi = async () => {
                try {
                    const refReporte = collection(db, "TAREA", tareaID, "Reportes");
                    const responseReportes = await getDocs(refReporte);

                    setReportes(responseReportes.size);

                    const refEvidencias = collection(db, "TAREA", tareaID, "Evidencias");
                    const responseEvidencias = await getDocs(refEvidencias);

                    setEvidencias(responseEvidencias.size);
                } catch (error) {
                    console.error("Error cargando RepYEvi:", error);
                }
            };

            fetchRepYEvi();
        }, [tareaID]);

        return (
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                    <Feather name="camera" size={18} color={profile.modoOscuro ? "#EDEDED" : "#353335"} />
                    <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>{evidencias}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                    <AntDesign name="book" size={18} color={profile.modoOscuro ? "#EDEDED" : "#353335"} />
                    <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>{reportes}</Text>
                </View>
            </View>
        );
    }

    const [busqueda, setBusqueda] = useState("")

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

        return dateObj.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };


    //Funcion para cambiar de color la estado de la TAREA
    const getEstadoStyle = (estado) => {
        if (!estado) return { backgroundColor: '#9E9E9E', color: profile.modoOscuro === true ? "#EDEDED" : "black", };
        const status = estado;

        if (status === 'Completada') {
            return {
                backgroundColor: '#47A997',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        } else if (status === 'Revisada') {
            return {
                backgroundColor: '#B383E2',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        } else if (status === "Pendiente") {
            return {
                backgroundColor: '#F4C54C',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        } else if (status === "En Proceso") {
            return {
                backgroundColor: '#57A7FE',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        } else if (status === "No Entregada") {
            return {
                backgroundColor: '#F5615C',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        }

        return {
            backgroundColor: '#9E9E9E',
            color: profile.modoOscuro === true ? "white" : "black",
        };
    };

    //Funcion para cambiar de color la prioridad de la TAREA
    const getPrioridadStyle = (prioridad) => {
        if (!prioridad) return { backgroundColor: '#9E9E9E', color: profile.modoOscuro === true ? "#EDEDED" : "black", };
        const status = prioridad;

        if (status === 'Alta') {
            return {
                backgroundColor: '#F5615C',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        } else if (status === 'Media') {
            return {
                backgroundColor: '#F5C44C',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        } else if (status === "Baja") {
            return {
                backgroundColor: '#57A6FF',
                color: profile.modoOscuro === true ? "white" : "black",
            };
        }

        return {
            backgroundColor: '#9E9E9E',
            color: profile.modoOscuro === true ? "white" : "black",
        };
    };

    // Navegacion a mas info de la tarea en base al rol
    const handlePress = () => {
        Alert.alert("Button Pressed!");
    };

    return (
        <LinearGradient
            colors={["#87aef0", "#9c8fc4"]}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
        >
            <View style={{ flex: 1 }}>
                {/* Header */}
                <View style={profile.modoOscuro ? styles.headerOscuro : styles.headerClaro}>
                    <View>
                        <Text style={profile.modoOscuro ? styles.tituloOscuro : styles.tituloClaro}>Tareas</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ marginBottom: 0, marginTop: 5, flex: 1 }}>
                            <TextInput
                                placeholder="Buscar"
                                placeholderTextColor={profile.modoOscuro ? "#BDBDBD" : "#6B7280"}
                                style={[styles.inputBusqueda, { color: profile.modoOscuro ? "#FFFFFF" : "#111827" }]}
                                value={busqueda}
                                onChangeText={setBusqueda}
                            />
                            <View style={{ position: "absolute", right: 15, top: 14 }}>
                                <FontAwesome6 name="magnifying-glass" size={18} color={profile.modoOscuro ? "#FFFFFF" : "#111827"} />
                            </View>
                        </View>
                        <View style={{ marginTop: 5, justifyContent: "center", alignContent: "center" }}>
                            <TouchableOpacity style={styles.opciones}>
                                <Ionicons name="options-outline" size={22} color={profile.modoOscuro ? "#FFFFFF" : "#111827"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <ScrollView
                    style={{
                        flex: 1,
                        paddingHorizontal: 15,
                        paddingVertical: 5,

                    }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {tareas.map((tarea) => (
                        <TouchableOpacity onPress={handlePress} key={tarea.id} style={profile.modoOscuro ? styles.cardsTareasOscuro : styles.cardsTareasClaro}>
                            <View>
                                <Text style={profile.modoOscuro ? styles.tituloCardOscuro : styles.tituloCardClaro}>{tarea.nombre}</Text>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignContent: "center" }}>
                                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 15, marginTop: 5 }}>
                                        <View>
                                            <Text style={[{ color: getEstadoStyle(tarea.estado).color, fontWeight: 500, backgroundColor: getEstadoStyle(tarea.estado).backgroundColor, paddingVertical: 2, paddingHorizontal: 12, borderRadius: 6 }]}>{tarea.estado}</Text>
                                        </View>
                                        <View>
                                            <Text style={[{ color: getPrioridadStyle(tarea.prioridad).color, fontWeight: 500, backgroundColor: getPrioridadStyle(tarea.prioridad).backgroundColor, paddingVertical: 2, paddingHorizontal: 12, borderRadius: 6 }]}>{tarea.prioridad}</Text>
                                        </View>
                                    </View>
                                    <View style={{ justifyContent: "center" }}>
                                        <ReportesYEvidenciasList tareaID={tarea.id} />
                                    </View>
                                </View>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignContent: "center" }}>
                                    <View style={{ flexDirection: "row", gap: 7 }}>
                                        <View style={{ alignItems: "center", justifyContent: "center" }}>
                                            <Feather name="calendar" size={20} color={profile.modoOscuro ? "#EDEDED" : "#7B7B7B"} />
                                        </View>
                                        <View style={{ alignItems: "center", justifyContent: "center" }}>
                                            <Text style={profile.modoOscuro ? styles.numerosOscuro : styles.numerosClaro}>
                                            {formatFecha(tarea.fechaCreacion)} - {formatFecha(tarea.fechaEntrega)}
                                            </Text>
                                        </View>
                                    </View>
                                    <TecnicosList tareaID={tarea.id} />

                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <BotonRegistrar />

            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerClaro: {
        paddingTop: 15,
        paddingHorizontal: 15,
        paddingBottom: 10,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
        borderBottomWidth: 2,
        borderColor: "#D9D9D9"
    },
    headerOscuro: {
        paddingTop: 15,
        paddingHorizontal: 15,
        paddingBottom: 10,
        backgroundColor: "#2C2C2C",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
        borderBottomWidth: 2,
        borderColor: "#3A3A3A"
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
        borderWidth: 2,
        fontSize: 16,
    },
    opciones: {
        padding: 10,
        borderRadius: 9,
        borderColor: "#D9D9D9",
        borderWidth: 2,
    },
    estadoYPrioridad: {
        marginBottom: 10,
        flexDirection: "row",
        gap: 7,
    },
    cardsTareasClaro: {
        backgroundColor: "white",
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 10,
        elevation: 30
    },
    cardsTareasOscuro: {
        backgroundColor: "#2C2C2C",
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 10,
        elevation: 30
    },
    tituloCardClaro: {
        fontSize: 18,
        fontWeight: 700,
    },
    tituloCardOscuro: {
        color: "white",
        fontSize: 18,
        fontWeight: 700,
    },
    numerosClaro: {
        color: "#7B7B7B"
    },
    numerosOscuro: {
        color: "#EDEDED"
    }
});
