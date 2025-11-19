// src/ui/ConfirmSheet.js
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function ConfirmSheet({
  visible,
  title = "Confirmar",
  message = "¿Deseas continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
  theme, // pasa tu objeto theme (light/dark)
}) {
  if (!theme) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[
          styles.sheet,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowOpacity: theme.shadow,
          }
        ]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.text }]}>{message}</Text>

          <View style={styles.row}>
            <TouchableOpacity
              onPress={onCancel}
              style={[
                styles.btn,
                {
                  backgroundColor: theme.chipBg,
                  borderColor: theme.chipBorder,
                }]}
            >
              <Text style={[styles.btnText, { color: theme.text }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[
                styles.btn,
                {
                  backgroundColor: destructive ? theme.danger : theme.primary,
                  borderColor: "transparent",
                }]}
            >
              <Text style={[styles.btnText, { color: "#fff", fontWeight: "800" }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    shadowColor: "#000",
  },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  message: { fontSize: 15, opacity: 0.9, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnText: { fontSize: 15 },
});
