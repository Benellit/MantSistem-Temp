import AntDesign from '@expo/vector-icons/AntDesign';
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useAuth } from "../screens/login/AuthContext";

function BottomTabNavigator() {
    const navigation = useNavigation();
    const { profile } = useAuth();
    const route = useRoute();
    const [activeTab, setActiveTab] = useState(route.name);

    useFocusEffect(() => {
        setActiveTab(route.name);
    });

    // Solo muestra el botón si es necesario (ej: en "Tareas")
    const shouldShowButton = activeTab === "Sucursales" || activeTab === "Tareas" || activeTab === "Usuarios";

    return (
        <View style={styles.bottomContainer}>
            {shouldShowButton && (
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={() => {
                        if (activeTab === "Sucursales") navigation.navigate("RegistrarSucursales");
                        if (activeTab === "Tareas") navigation.navigate("RegistrarTareas");
                        if (activeTab === "Usuarios") navigation.navigate("RegistrarUsuarios");
                    }}
                >
                    <AntDesign name="plus" size={28} color={profile.modoOscuro === true ? "#1A1A1A" : "#EDEDED"} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    floatingButton: {
        position: "absolute",
        bottom: 40,  // Distancia desde el fondo del contenedor
        right: 25,
        backgroundColor: "#3c67bd",
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
        zIndex: 10,
    },
});

export default BottomTabNavigator;
