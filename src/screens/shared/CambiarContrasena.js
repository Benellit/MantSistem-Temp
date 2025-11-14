import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import { getAuth, updatePassword } from "firebase/auth";
import { doc, updateDoc, getFirestore } from "firebase/firestore";
import Toast from "react-native-toast-message";
import { useAuth } from "../login/AuthContext";

export default function CambiarContrasena({ route, navigation }) {
  const { userId } = route.params || {};
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const db = getFirestore();
  const { profile, refreshProfile } = useAuth();

  const onSubmit = async () => {
    if (loading) return;

    if (pass1.length < 6) {
      Toast.show({
        type: "appError",
        text1: "Error",
        text2: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }
    if (pass1 !== pass2) {
      Toast.show({
        type: "appError",
        text1: "Error",
        text2: "Las contraseñas no coinciden.",
      });
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      if (!auth.currentUser) {
        Toast.show({
          type: "appError",
          text1: "Error",
          text2: "No se encontró la sesión activa.",
        });
        return;
      }

      await updatePassword(auth.currentUser, pass1);
      await updateDoc(doc(db, "USUARIO", userId || auth.currentUser.uid), {
        mustChangePassword: false,
      });
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }

      Toast.show({ type: "appSuccess", text1: "Contraseña actualizada" });
      navigation.replace("Tabs");
    } catch (error) {
      console.error("Error actualizando contraseña:", error);
      Toast.show({
        type: "appError",
        text1: "Error",
        text2: "No se pudo actualizar la contraseña. Inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
      setPass1("");
      setPass2("");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: profile?.modoOscuro ? "#1F2937" : "#F9FAFB" },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: profile?.modoOscuro ? "#111827" : "#FFFFFF" },
        ]}
      >
        <Text style={[styles.title, { color: profile?.modoOscuro ? "#F9FAFB" : "#111827" }]}>Cambia tu contraseña</Text>
        <Text style={[styles.subtitle, { color: profile?.modoOscuro ? "#D1D5DB" : "#6B7280" }]}>
          Por seguridad, crea una contraseña nueva antes de continuar.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: profile?.modoOscuro ? "#E5E7EB" : "#374151" }]}>Nueva contraseña</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: profile?.modoOscuro ? "#374151" : "#fff",
                color: profile?.modoOscuro ? "#F9FAFB" : "#111827",
                borderColor: profile?.modoOscuro ? "#4B5563" : "#E5E7EB",
              },
            ]}
            placeholder="Ingresa tu nueva contraseña"
            placeholderTextColor={profile?.modoOscuro ? "#9CA3AF" : "#9CA3AF"}
            secureTextEntry
            value={pass1}
            onChangeText={setPass1}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: profile?.modoOscuro ? "#E5E7EB" : "#374151" }]}>Confirmar contraseña</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: profile?.modoOscuro ? "#374151" : "#fff",
                color: profile?.modoOscuro ? "#F9FAFB" : "#111827",
                borderColor: profile?.modoOscuro ? "#4B5563" : "#E5E7EB",
              },
            ]}
            placeholder="Confirma tu nueva contraseña"
            placeholderTextColor={profile?.modoOscuro ? "#9CA3AF" : "#9CA3AF"}
            secureTextEntry
            value={pass2}
            onChangeText={setPass2}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: profile?.modoOscuro ? "#2563EB" : "#2563EB" },
            loading && { opacity: 0.7 },
          ]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Actualizando..." : "Actualizar"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  field: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 28,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});