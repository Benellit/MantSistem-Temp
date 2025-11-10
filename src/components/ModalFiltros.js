import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DropDownPicker from "react-native-dropdown-picker";
import appFirebase from '../credenciales/Credenciales';
import { useAuth } from "../screens/login/AuthContext";

const ModalFiltros = ({ open, setOpenFiltros, setFiltros, filtros }) => {
    const db = getFirestore(appFirebase);
    const { profile } = useAuth();

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
        obtenerSucursales();

        // Inicializar valores según filtros actuales
        if (filtros) {
            if (profile.rol === "Administrador") {
                setValueSucursal(filtros.sucursal || null);
            } else if (profile.rol === "Gestor" || profile.rol === "Tecnico") {
                // Sucursal del usuario
                if (profile.IDSucursal) {
                    const sucursalId = typeof profile.IDSucursal === "string"
                        ? profile.IDSucursal.split("/").pop()
                        : profile.IDSucursal.id;
                    setValueSucursal(sucursalId);
                }
            }

            setValuePrioridad(filtros.prioridad || null);
            setValueEstado(filtros.estado || null);
        }
    }, [filtros]);

    useEffect(() => {
        if (sucursal.length && (profile.rol === "Gestor" || profile.rol === "Tecnico")) {
            const sucursalId = typeof profile.IDSucursal === "string"
                ? profile.IDSucursal.split("/").pop()
                : profile.IDSucursal.id;
            setValueSucursal(sucursalId);
        }
    }, [sucursal]);

    const [openPrioridad, setOpenPrioridad] = useState(false);
    const [valuePrioridad, setValuePrioridad] = useState(null);
    const [prioridad, setPrioridad] = useState([
        { label: "🔵 Baja", value: "Baja" },
        { label: "🟡 Media", value: "Media" },
        { label: "🔴 Alta", value: "Alta" },
    ]);

    console.log(valuePrioridad)

    const [openEstado, setOpenEstado] = useState(false);
    const [valueEstado, setValueEstado] = useState(null);
    const [estado, setEstado] = useState([
        { label: "🟡 Pendiente", value: "Pendiente" },
        { label: "🔵 En Proceso", value: "En Proceso" },
        { label: "🟢 Completada", value: "Completada" },
        { label: "🟣 Revisada", value: "Revisada" },
        { label: "🔴 No Entregada", value: "No Entregada" },
    ]);

    const handleOpenPrioridad = () => {
        setOpenPrioridad(true);
        setOpenSucursal(false);
        setOpenEstado(false);
    };

    const handleOpenSucursal = () => {
        setOpenSucursal(true);
        setOpenPrioridad(false);
        setOpenEstado(false);
    };

    const handleOpenEstado = () => {
        setOpenEstado(true);
        setOpenSucursal(false);
        setOpenPrioridad(false);
    };

    return (
        <View>
            <Modal
                animationType='fade'
                transparent={true}
                onRequestClose={() => {
                    setOpenFiltros(!false);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={profile.modoOscuro === true ? styles.modalViewOscuro : styles.modalViewClaro}>
                        <View style={{ alignItems: "flex-end" }}>
                            <TouchableOpacity style={{ justifyContent: "center", padding: 4, borderWidth: 1, borderRadius: 8, borderColor: "#D9D9D9" }} onPress={() => setOpenFiltros(false)}>
                                <AntDesign name="close" size={24} color={profile.modoOscuro ? "white" : "black"} />
                            </TouchableOpacity>
                        </View>
                        {profile.rol == "Administrador" &&
                            <View style={styles.containerInputs}>
                                <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, { zIndex: 400 }]}>Sucursal</Text>
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
                                    placeholderStyle={{
                                        color: profile.modoOscuro ? "#888888" : "#999999",
                                        fontSize: 16,
                                    }}
                                    textStyle={{
                                        color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                        fontSize: 16,
                                    }}
                                    zIndex={399}
                                    zIndexInverse={400}
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
                            </View>}

                        <View style={styles.containerInputs}>
                            <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, { zIndex: 350 }]}>Estado</Text>
                            <DropDownPicker
                                open={openEstado}
                                value={valueEstado}
                                items={estado}
                                setOpen={setOpenEstado}
                                setValue={setValueEstado}
                                setItems={setEstado}
                                placeholder="Selecciona estado"
                                style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                listMode="SCROLLVIEW"
                                dropDownContainerStyle={{
                                    borderColor: profile.modoOscuro ? "#555555" : "#F2F3F5",
                                    borderWidth: 2,
                                    backgroundColor: profile.modoOscuro ? "#1a1a1a" : "white",
                                    borderRadius: 8,
                                }}
                                placeholderStyle={{
                                    color: profile.modoOscuro ? "#888888" : "#999999",
                                    fontSize: 16,
                                }}
                                textStyle={{
                                    color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                    fontSize: 16,
                                }}
                                zIndex={340}
                                zIndexInverse={350}
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
                                onOpen={handleOpenEstado}
                            />
                        </View>
                        <View style={styles.containerInputs}>
                            <Text style={[profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro, { zIndex: 320 }]}>Prioridad</Text>
                            <DropDownPicker
                                open={openPrioridad}
                                value={valuePrioridad}
                                items={prioridad}
                                setOpen={setOpenPrioridad}
                                setValue={setValuePrioridad}
                                setItems={setPrioridad}
                                placeholder="Selecciona prioridad"
                                style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                                listMode="SCROLLVIEW"
                                dropDownContainerStyle={{
                                    borderColor: profile.modoOscuro ? "#555555" : "#F2F3F5",
                                    borderWidth: 2,
                                    backgroundColor: profile.modoOscuro ? "#1a1a1a" : "white",
                                    borderRadius: 8,
                                }}
                                placeholderStyle={{
                                    color: profile.modoOscuro ? "#888888" : "#999999",
                                    fontSize: 16,
                                }}
                                textStyle={{
                                    color: profile.modoOscuro ? "#FFFFFF" : "#000000",
                                    fontSize: 16,
                                }}
                                zIndex={100}
                                zIndexInverse={200}
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
                        <View style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            marginTop: 10,
                        }}>
                            <TouchableOpacity
                                style={[styles.botonFiltros, { flex: 1 }]}
                                onPress={() => {
                                    console.log("📦 Filtros aplicados:", {
                                        sucursal: valueSucursal,
                                        prioridad: valuePrioridad,
                                        estado: valueEstado,
                                    });
                                    setFiltros({
                                        sucursal: valueSucursal,
                                        prioridad: valuePrioridad,
                                        estado: valueEstado,
                                    });
                                    setOpenFiltros(false);
                                }}

                            >
                                <Text style={profile.modoOscuro ? { color: "#b4b3b3ff", fontWeight: 800, fontSize: 15 } : { color: 'white', fontWeight: 800, fontSize: 15 }}>
                                    Aplicar Filtros
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.botonQuitarfiltros, { flex: 1 }]}
                                onPress={() => {
                                    setFiltros({ sucursal: null, prioridad: null, estado: null });
                                    setOpenFiltros(false);
                                }}
                            >
                                <Text style={profile.modoOscuro ? { color: "#b4b3b3ff", fontWeight: 800, fontSize: 15 } : { color: 'white', fontWeight: 800, fontSize: 15 }}>
                                    Quitar Filtros
                                </Text>
                            </TouchableOpacity>

                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1
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
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
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
        borderRadius: 8
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
        borderRadius: 8
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
    containerInputs: {
        marginTop: 10,
    },
    botonFiltros: {
        backgroundColor: "#3D67CD",
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
        marginTop: 10,
    },
    botonQuitarfiltros: {
        backgroundColor: "#6a6a6cff",
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 13,
        marginTop: 10,
    },
})

export default ModalFiltros