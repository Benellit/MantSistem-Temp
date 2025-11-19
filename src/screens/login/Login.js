import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, ImageBackground,
  Pressable, Linking, Platform, StatusBar, Animated, Dimensions,
  TextInput, ActivityIndicator, KeyboardAvoidingView, ScrollView,
  Keyboard
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "./AuthContext";

const APP_NAME = "Maintely";
const APP_TAGLINE = "Tu registro de mantenimiento con fotos";
const RED = "#1c6eb1ff";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Login() {
  const [showSheet, setShowSheet] = useState(false);

  const handlePolicy = () => Linking.openURL("https://example.com/privacy");
  const handleTerms  = () => Linking.openURL("https://example.com/terms");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        <ImageBackground
          source={require("../../../assets/images/loginBackground.png")}
          style={styles.bg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.85)", "rgba(255,255,255,1)"]}
            locations={[0.4, 0.75, 1]}
            style={styles.fade}
          />

          <View style={styles.bottomContent}>
            <Text style={styles.title}>{APP_NAME}</Text>
            <Text style={styles.subtitle}>{APP_TAGLINE}</Text>

            <Pressable
              onPress={() => setShowSheet(true)}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.primaryBtnText}>Comenzar</Text>
            </Pressable>

            <Text style={styles.terms}>
              Al usar {APP_NAME} aceptas la{" "}
              <Text style={styles.link} onPress={handlePolicy}>Política de Privacidad</Text> y los{" "}
              <Text style={styles.link} onPress={handleTerms}>Términos de Uso</Text>.
            </Text>
          </View>
        </ImageBackground>

        <BottomSheetLogin
          visible={showSheet}
          onClose={() => setShowSheet(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/* ===================== Bottom Sheet ===================== */

function BottomSheetLogin({ visible, onClose }) {
  const { login } = useAuth();
  const SHEET_MAX = useMemo(() => Math.min(SCREEN_HEIGHT * 0.42, 640), []);
  const translateY = useRef(new Animated.Value(SHEET_MAX)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;
  const keyboardShift = useRef(new Animated.Value(0)).current;
  const combinedTranslateY = Animated.add(translateY, keyboardShift);

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_MAX, duration: 260, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 0,        duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleShow = (e) => {
      const height = e?.endCoordinates?.height ?? 0;
      const duration = e?.duration ?? 250;
      Animated.timing(keyboardShift, {
        toValue: -height,
        duration,
        useNativeDriver: true,
      }).start();
    };

    const handleHide = (e) => {
      const duration = e?.duration ?? 200;
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardShift]);

  const mapAuthError = (e) => {
    const c = e?.code || "";
    if (c.includes("invalid-credential")) return "Correo o contraseña incorrectos.";
    if (c.includes("user-not-found"))     return "Usuario no encontrado.";
    if (c.includes("wrong-password"))     return "Contraseña incorrecta.";
    if (c.includes("too-many-requests"))  return "Demasiados intentos. Intenta más tarde.";
    if (c.includes("network-request-failed")) return "Sin conexión. Revisa tu internet.";
    return "Error al iniciar sesión.";
  };

  const onLogin = async () => {
    setError("");
    if (!email.trim() || !pwd) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), pwd);
      onClose();
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible && backdrop.__getValue?.() === 0) return null;

  return (
    <>
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)", opacity: backdrop }]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { height: SHEET_MAX, transform: [{ translateY: combinedTranslateY }] }]}>
        <View style={styles.sheetTopBar}>
          <View style={styles.handle} />
          
        </View>

        <ScrollView
          contentContainerStyle={styles.sheetBody}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetTitle}>Inicia sesión</Text>
          <Text style={styles.sheetSubtitle}>Accede a tu cuenta para continuar.</Text>

          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              placeholderTextColor="#a9b0b7"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              editable={!submitting}
            />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="lock" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              value={pwd}
              onChangeText={setPwd}
              placeholder="Contraseña"
              placeholderTextColor="#a9b0b7"
              secureTextEntry={!showPwd}
              style={styles.input}
              editable={!submitting}
            />
            <TouchableOpacity onPress={() => setShowPwd((s) => !s)} style={styles.trailingIcon}>
              <Feather name={showPwd ? "eye-off" : "eye"} size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {!!error && <Text style={{ color: RED, marginTop: 10 }}>{error}</Text>}

          <Pressable onPress={onLogin} disabled={submitting}
            style={({ pressed }) => [styles.loginBtn, (pressed || submitting) && { opacity: 0.9 }]}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> :
              <Feather name="log-in" size={18} color="#fff" style={{ marginRight: 8 }} />}
            <Text style={styles.loginBtnText}>{submitting ? "Ingresando..." : "Iniciar sesión"}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </>
  );
}

/* ===================== Estilos ===================== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  bg: { flex: 1, justifyContent: "flex-end" },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  bottomContent: { paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 28 : 50 },
  title: { fontSize: 44, lineHeight: 50, fontWeight: "700", color: "#1f2937", textAlign: "center" },
  subtitle: { marginTop: 6, fontSize: 17, lineHeight: 22, color: "#9ca3af", textAlign: "center" },
  primaryBtn: {
    marginTop: 30, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
    backgroundColor: RED, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  primaryBtnText: { fontSize: 17, fontWeight: "600", color: "#fff" },
  terms: { marginTop: 18, marginHorizontal: 8, textAlign: "center", fontSize: 12, lineHeight: 18, color: "#6b7280" },
  link: { fontWeight: "700", color: "#111827", textDecorationLine: "underline" },

  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff",
    borderTopLeftRadius: 26, borderTopRightRadius: 26, shadowColor: "#000",
    shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: -6 }, elevation: 16,
  },
  sheetTopBar: { paddingTop: 8, paddingBottom: 6, alignItems: "center", justifyContent: "center" },
  handle: { width: 52, height: 6, borderRadius: 3, backgroundColor: "#e5e7eb" },
  closeBtn: {
    position: "absolute", right: 14, top: 8, width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  sheetBody: { paddingHorizontal: 18, paddingBottom: 16, paddingTop: 6 },
  sheetTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },
  sheetSubtitle: { marginTop: 4, fontSize: 14, color: "#6b7280" },

  inputWrap: {
    marginTop: 20, flexDirection: "row", alignItems: "center", borderRadius: 14,
    backgroundColor: "#f6f7f8", borderWidth: 1, borderColor: "#eceef0", paddingHorizontal: 12, height: 52,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: "#111827", paddingVertical: 0 },
  trailingIcon: { marginLeft: 8 },

  loginBtn: {
    marginTop: 18, height: 54, borderRadius: 14, backgroundColor: RED,
    alignItems: "center", justifyContent: "center", flexDirection: "row",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 6 },
});
