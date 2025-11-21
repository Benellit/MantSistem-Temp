import Ionicons from "@expo/vector-icons/Ionicons"
import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useAuth } from "../login/AuthContext"

const Inactivo = () => {
    const { logout, profile } = useAuth()

    return (
        <LinearGradient
            colors={profile.modoOscuro ? ["#1A1A2E", "#16213E"] : ["#667EEA", "#764BA2"]}
            style={{ flex: 1 }}
        >
            <TouchableOpacity
                style={{ padding: 8, borderRadius: 8, position: "absolute", left: 10, top: 40, backgroundColor: profile.modoOscuro ? "#2C2C2C" : "#FFF" }}
                onPress={() => logout()}
            >
                <Ionicons name="chevron-back" size={24} color={profile.modoOscuro ? "#FFFF" : "#1A1A1A"} />
            </TouchableOpacity>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Icon or Image */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Text style={styles.iconText}>⚠️</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Cuenta Suspendida</Text>

                    {/* User Info */}
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.userName}>
                            {profile.primerNombre} {profile.primerApellido}
                        </Text>
                        <Text style={styles.userRole}>{profile.rol}</Text>
                    </View>

                    {/* Message */}
                    <View style={styles.messageContainer}>
                        <Text style={styles.message}>Tu cuenta ha sido suspendida temporalmente.</Text>
                        <Text style={styles.subMessage}>
                            En caso de que pienses que fue un error, favor de informar a tu superior o contactar al departamento de
                            soporte.
                        </Text>
                    </View>

                    {/* Additional Info */}
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            No tienes acceso a las funcionalidades del sistema hasta que tu cuenta sea reactivada.
                        </Text>
                    </View>
                </View>
            </View>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
    },
    iconContainer: {
        marginBottom: 24,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "rgba(255, 255, 255, 0.4)",
    },
    iconText: {
        fontSize: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 24,
        textAlign: "center",
    },
    userInfoContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 32,
        width: "100%",
        alignItems: "center",
    },
    userName: {
        fontSize: 20,
        fontWeight: "600",
        color: "#FFFFFF",
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.8)",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    messageContainer: {
        marginBottom: 24,
        width: "100%",
    },
    message: {
        fontSize: 18,
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 12,
        fontWeight: "500",
    },
    subMessage: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.85)",
        textAlign: "center",
        lineHeight: 20,
    },
    infoBox: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#FFC107",
        width: "100%",
    },
    infoText: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 18,
    },
})

export default Inactivo
