import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import { addDoc, collection, getFirestore, Timestamp } from "firebase/firestore";
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from "react-native-toast-message";
import appFirebase from '../../credenciales/Credenciales';
import { useAuth } from "../login/AuthContext";

const db = getFirestore(appFirebase);

const RegistrarSucursalesAdmin = ({ navigation }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Estados para los campos del formulario
    const [nombre, setNombre] = useState("");
    const [dirCalle, setDirCalle] = useState("");
    const [dirColonia, setDirColonia] = useState("");
    const [dirCP, setDirCP] = useState("");

    const isDarkMode = profile.modoOscuro === true;
    const colors = {
        headerText: isDarkMode ? '#FFFFFF' : '#FFFFFF',
        headerIcon: isDarkMode ? '#FFFFFF' : '#FFFFFF',
        containerBg: isDarkMode ? "#2C2C2C" : '#FFFFFF',
        formBg: isDarkMode ? "#2C2C2C" : '#FFFFFF',
        titleText: isDarkMode ? '#FFFFFF' : '#000000',
        labelText: isDarkMode ? '#E0E0E0' : '#333333',
        inputBg: isDarkMode ? '#2A2A2A' : '#f8f9fa',
        inputBorder: isDarkMode ? '#404040' : '#e0e0e0',
        inputText: isDarkMode ? '#FFFFFF' : '#333333',
        inputIcon: isDarkMode ? '#B0B0B0' : '#666666',
        placeholder: isDarkMode ? '#888888' : '#999999',
    };

    // Validar formulario
    const validarFormulario = () => {
        if (!nombre.trim()) {
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "El nombre de la sucursal es obligatorio",
            });
            return false;
        }
        if (!dirCalle.trim()) {
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "La calle es obligatoria",
            });
            return false;
        }
        if (!dirColonia.trim()) {
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "La colonia es obligatoria",
            });
            return false;
        }
        if (!dirCP.trim()) {
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "El código postal es obligatorio",
            });
            return false;
        }
        if (dirCP.length !== 5 || isNaN(dirCP)) {
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "El código postal debe tener 5 dígitos",
            });
            return false;
        }
        return true;
    };

    // Registrar sucursal
    const registrarSucursal = async () => {
        if (!validarFormulario()) return;

        try {
            setLoading(true);

            const nuevaSucursal = {
                nombre: nombre.trim(),
                dirCalle: dirCalle.trim(),
                dirColonia: dirColonia.trim(),
                dirCP: dirCP.trim(),
                fechaCreacion: Timestamp.now(),
                IDCreador: profile.id || 0
            };

            await addDoc(collection(db, "SUCURSAL"), nuevaSucursal);

            Toast.show({
                type: "appSuccess",
                text1: "¡Éxito!",
                text2: "Sucursal registrada correctamente",
            });
            navigation.goBack();

            // Limpiar formulario
            setNombre("");
            setDirCalle("");
            setDirColonia("");
            setDirCP("");

        } catch (error) {
            console.error("Error al registrar sucursal:", error);
            Toast.show({
                type: "appError",
                text1: "Error",
                text2: "No se pudo registrar la sucursal. Intenta de nuevo.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={isDarkMode ? ['#1A1A2E', '#16213E'] : ['#667EEA', '#764BA2']}
                start={{ x: 0.5, y: 0.4 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                    height: 165,
                }}
            >
                <View style={{ paddingTop: 40, paddingLeft: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                            <Ionicons name="chevron-back" size={24} color={colors.headerIcon} />
                        </TouchableOpacity>
                    </View>

                    <Text
                        style={{
                            color: colors.headerText,
                            fontSize: 26,
                            fontWeight: "900",
                            marginTop: 5,
                            paddingLeft: 10,
                        }}
                    >
                        Agregar Sucursal
                    </Text>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: colors.containerBg }]}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    style={styles.scrollView}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.formContainer, { backgroundColor: colors.formBg }]}>
                        <Text style={[styles.titulo, { paddingTop: 10, color: colors.titleText }]}>
                            Datos de registro
                        </Text>

                        {/* Icono principal */}
                        <View style={styles.iconHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#2A4A6A' : '#f0f5ff' }]}>
                                <Ionicons name="business" size={50} color="#87aef0" />
                            </View>
                        </View>

                        {/* Campo: Nombre */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.labelText }]}>Nombre de la Sucursal *</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                <Ionicons name="storefront-outline" size={20} color={colors.inputIcon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.inputText }]}
                                    placeholder="Ej: Sucursal Centro"
                                    placeholderTextColor={colors.placeholder}
                                    value={nombre}
                                    onChangeText={setNombre}
                                    maxLength={100}
                                />
                            </View>
                        </View>

                        {/* Campo: Calle */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.labelText }]}>Calle *</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                <Ionicons name="location-outline" size={20} color={colors.inputIcon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.inputText }]}
                                    placeholder="Ej: Av. Revolución 1234"
                                    placeholderTextColor={colors.placeholder}
                                    value={dirCalle}
                                    onChangeText={setDirCalle}
                                    maxLength={150}
                                />
                            </View>
                        </View>

                        {/* Campo: Colonia */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.labelText }]}>Colonia *</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                <Ionicons name="home-outline" size={20} color={colors.inputIcon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.inputText }]}
                                    placeholder="Ej: Zona Centro"
                                    placeholderTextColor={colors.placeholder}
                                    value={dirColonia}
                                    onChangeText={setDirColonia}
                                    maxLength={100}
                                />
                            </View>
                        </View>

                        {/* Campo: Código Postal */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.labelText }]}>Código Postal *</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.inputIcon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.inputText }]}
                                    placeholder="Ej: 22000"
                                    placeholderTextColor={colors.placeholder}
                                    value={dirCP}
                                    onChangeText={setDirCP}
                                    keyboardType="numeric"
                                    maxLength={5}
                                />
                            </View>
                        </View>

                        {/* Botón Registrar */}
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={registrarSucursal}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-circle" size={24} color="white" />
                            <Text style={styles.buttonText}>
                                {loading ? "Registrando..." : "Registrar Sucursal"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35,
        marginTop: -35,
        paddingBottom: 0,
        marginBottom: 0,
    },
    scrollView: {
        flex: 1,
    },
    titulo: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
    },
    formContainer: {
        borderRadius: 20,
        paddingHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        paddingTop: 10,
        paddingBottom: 20,
    },
    iconHeader: {
        alignItems: "center",
        marginBottom: 20,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 5,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
    },
    inputIcon: {
        marginLeft: 15,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    button: {
        flexDirection: "row",
        backgroundColor: "#3D67CD",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        gap: 10,
    },
    buttonDisabled: {
        backgroundColor: "#b0b0b0",
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
    },
});

export default RegistrarSucursalesAdmin;
