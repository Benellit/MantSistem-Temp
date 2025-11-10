import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import appFirebase from '../../credenciales/Credenciales';
import { useAuth } from "../login/AuthContext";

const EditarTarea = ({ route, navigation }) => {
    const db = getFirestore(appFirebase);
    const { profile } = useAuth();
    const { id } = route.params;
    console.log(id, "Este fue el ID");

    const [tarea, setTarea] = useState([]);
    const getTarea = async (id) => {
        try {
            const docRef = doc(db, "TAREA", id);
            const responseTarea = await getDoc(docRef);

            if (responseTarea.exists()) {
                console.log("DATA:", responseTarea.data());
                setTarea(responseTarea.data());
            } else {
                console.log("No existe la tarea con ese ID");
            }
        } catch (error) {
            console.error("Error al obtener tarea:", error);
        }
    };

    useEffect(() => {
        getTarea(id);
    }, [id]);

    const [tecnicos, setTecnicos] = useState([]);
    const getTecnicos = async () => {
        try {

        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        getTecnicos();
    }, [])

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
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
                            color: profile.modoOscuro ? "#2C2C2C" :  "white",
                            fontSize: 26,
                            fontWeight: "900",
                            marginTop: 5,
                            paddingLeft: 10,
                        }}
                    >
                        Editar Tareas
                    </Text>
                </View>
            </LinearGradient>
            <View style={profile.modoOscuro === true ? styles.containerOscuro : styles.containerClaro}>


                <ScrollView style={{ paddingHorizontal: 15, borderTopRightRadius: 35, borderTopLeftRadius: 35, paddingBottom: 0 }} nestedScrollEnabled={true}>

                    <View style={{ paddingTop: 15, marginBottom: 20 }}>
                        <TouchableOpacity
                            style={[styles.botonSumit]}
                        >
                            <Text style={profile.modoOscuro === true ? { color: "black", fontWeight: 800, fontSize: 20 } : { color: 'white', fontWeight: 800, fontSize: 20 }}>Aplicar Cambios</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View >
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
    nombre: {
        fontSize: 24,
        fontWeight: 800,
    },
    descripcion: {
        fontSize: 16,
        fontWeight: 400,
    },
    numerosClaro: {
        color: "#7B7B7B"
    },
    numerosOscuro: {
        color: "#EDEDED"
    },
    botonSumit: {
        backgroundColor: "#3D67CD",
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13
    },
})

export default EditarTarea