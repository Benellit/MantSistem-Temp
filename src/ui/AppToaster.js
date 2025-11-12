
import React from "react";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { useAuth } from "../screens/login/AuthContext";

// Paleta centralizada 
const PALETTE = {
  light: {
    bg: "#FFFFFF",
    text1: "#1F242B",
    text2: "#7E8792",
    border: "#E6E8EB",
    primary: "#3A7AFE",
    info: "#5B86FF",
    error: "#EF4444",
    success: "#3A7AFE", 
    shadow: 0.08,
  },
  dark: {
    bg: "#171A20",
    text1: "#E6EAF0",
    text2: "#9AA4B0",
    border: "rgba(255,255,255,0.10)",
    primary: "#5B86FF",
    info: "#5B86FF",
    error: "#EF4444",
    success: "#5B86FF",
    shadow: 0.22,
  },
};

const makeToastConfig = (isDark) => {
  const T = isDark ? PALETTE.dark : PALETTE.light;

  // Estilo base 
  const baseCardStyle = {
    backgroundColor: T.bg,
    borderLeftColor: T.primary,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    minHeight: 68,
    shadowColor: "#000",
    shadowOpacity: T.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  };

  const contentStyle = { paddingHorizontal: 16, paddingVertical: 6 };

  const text1Style = { fontSize: 16, fontWeight: "800", color: T.text1 };
  const text2Style = { fontSize: 14, color: T.text2 };

  return {
    appSuccess: (props) => (
      <BaseToast
        {...props}
        style={{ ...baseCardStyle, borderLeftColor: T.success }}
        contentContainerStyle={contentStyle}
        text1Style={text1Style}
        text2Style={text2Style}
      />
    ),
    appError: (props) => (
      <ErrorToast
        {...props}
        style={{ ...baseCardStyle, borderLeftColor: T.error }}
        contentContainerStyle={contentStyle}
        text1Style={text1Style}
        text2Style={text2Style}
      />
    ),
    appInfo: (props) => (
      <BaseToast
        {...props}
        style={{ ...baseCardStyle, borderLeftColor: T.info }}
        contentContainerStyle={contentStyle}
        text1Style={text1Style}
        text2Style={text2Style}
      />
    ),
  };
};

export default function AppToaster() {
  const { profile } = useAuth();
  const isDark = !!profile?.modoOscuro;
  return <Toast config={makeToastConfig(isDark)} />;
}
