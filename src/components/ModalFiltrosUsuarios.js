import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import DropDownPicker from "react-native-dropdown-picker";
import appFirebase from '../credenciales/Credenciales';
import { useAuth } from "../screens/login/AuthContext"; 
import Ionicons from '@expo/vector-icons/Ionicons';



const ROLE_OPTIONS = [
  { key: "Administrador", label: "Admin", icon: "shield-outline" },
  { key: "Gestor", label: "Gestor", icon: "briefcase-outline" },
  { key: "Tecnico", label: "Técnico", icon: "construct-outline" },
];

const ESTADOS = ["Activo", "Inactivo"];

const DEFAULT_APPLIED = { sucursal: null, estado: null, roles: [] };

const ModalFiltrosUsuarios = ({
  isOpen = false,
  onClose = () => {},
  applied = DEFAULT_APPLIED,
  onApply = () => {}
}) => {

  const db = getFirestore(appFirebase);
  const { profile } = useAuth();

  // local draft (para no aplicar hasta confirmar)
  const [draft, setDraft] = useState(applied);

  // Sucursales
  const [openSucursal, setOpenSucursal] = useState(false);
  const [valueSucursal, setValueSucursal] = useState(null);
  const [sucursalItems, setSucursalItems] = useState([]);

  const cargarSucursales = async () => {
    try {
      const snap = await getDocs(collection(db, "SUCURSAL"));
      const data = snap.docs.map(d => ({
        label: (d.data().nombre ?? d.id),
        value: d.id,
      }));
      setSucursalItems(data);
    } catch (e) {
      console.log("Error obteniendo sucursales:", e);
    }
  };

  // Inicializa y sincroniza
  useEffect(() => {
    setDraft(applied);
    if (profile?.rol === "Administrador") cargarSucursales();
  }, [applied, profile]);

  // Estado: pill toggle
  const toggleEstado = (estado) => {
    setDraft(prev => ({ ...prev, estado: prev.estado === estado ? null : estado }));
  };

  // Rol: chips multi
  const toggleRol = (rol) => {
  setDraft(prev => ({
    ...prev,
    roles: (prev.roles?.[0] === rol) ? [] : [rol]
  }));
};



  // Sucursal: solo admin
  useEffect(() => {
    if (profile?.rol === "Administrador") {
      setValueSucursal(draft.sucursal ?? null);
    } else {
      setValueSucursal(null);
    }
  }, [draft, profile]);

  // Sincroniza el contenido editable (draft) con lo aplicado cada vez que se abre
    useEffect(() => {
  if (isOpen) setDraft(applied);
}, [isOpen, applied]);


    const handleCloseDiscard = () => {
    setDraft(applied); // descarta cambios
    onClose();         // cierra modal
    };


  // zIndex helpers
  const handleOpenSucursal = () => { setOpenSucursal(true); };

  return (
    <Modal
  visible={isOpen}
  transparent
  animationType="fade"
  onRequestClose={handleCloseDiscard}
>
      <View style={styles.centeredView}>
        <View style={profile.modoOscuro ? styles.modalViewOscuro : styles.modalViewClaro}>
          <View style={{ alignItems: "flex-end" }}>
            <TouchableOpacity
        style={{ justifyContent: "center", padding: 4, borderWidth: 1, borderRadius: 8, borderColor: "#D9D9D9" }}
        onPress={handleCloseDiscard}   // ← antes tenías onClose
        >
        <AntDesign name="close" size={24} color={profile.modoOscuro ? "white" : "black"} />
        </TouchableOpacity>
          </View>

          {/* Sucursal (solo admin) */}
          {profile?.rol === "Administrador" && (
            <View style={styles.containerInputs}>
              <Text style={[profile.modoOscuro ? styles.labelOscuro : styles.labelClaro, { zIndex: 400 }]}>
                Sucursal
              </Text>
              <DropDownPicker
                open={openSucursal}
                value={valueSucursal}
                items={sucursalItems}
                setOpen={setOpenSucursal}
                setValue={(fn) => {
                  const v = typeof fn === "function" ? fn(valueSucursal) : fn;
                  setValueSucursal(v);
                  setDraft(prev => ({ ...prev, sucursal: v || null }));
                }}
                setItems={setSucursalItems}
                placeholder="Selecciona sucursal"
                style={profile.modoOscuro ? styles.inputOscuro : styles.inputClaro}
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
                  <MaterialIcons name="keyboard-arrow-down" size={24} color={profile.modoOscuro ? "#FFFFFF" : "#000000"} />
                )}
                ArrowUpIconComponent={() => (
                  <MaterialIcons name="keyboard-arrow-up" size={24} color={profile.modoOscuro ? "#FFFFFF" : "#000000"} />
                )}
                onOpen={handleOpenSucursal}
              />
            </View>
          )}

          {/* Estado  */}
            <View style={styles.containerInputs}>
            <Text style={profile.modoOscuro ? styles.sectionLabelOscuro : styles.sectionLabelClaro}>
                Estado
            </Text>

            <View style={styles.segmentRow}>
                {ESTADOS.map(e => {
                const on = draft.estado === e;
                return (
                    <TouchableOpacity
                    key={e}
                    onPress={() => toggleEstado(e)}
                    style={[
                        styles.segmentBtn,
                        on
                        ? (profile.modoOscuro ? styles.segmentBtnOnDark : styles.segmentBtnOnLight)
                        : (profile.modoOscuro ? styles.segmentBtnOffDark : styles.segmentBtnOffLight)
                    ]}
                    >
                    <Text
                        style={[
                        styles.segmentText,
                        on
                            ? (profile.modoOscuro ? styles.segmentTextOnDark : styles.segmentTextOnLight)
                            : (profile.modoOscuro ? styles.segmentTextOffDark : styles.segmentTextOffLight)
                        ]}
                    >
                        {e}
                    </Text>
                    </TouchableOpacity>
                );
                })}
            </View>
            </View>



          {/* Roles (tarjetas con ícono) */}
            <View style={styles.containerInputs}>
            <Text style={profile.modoOscuro ? styles.sectionLabelOscuro : styles.sectionLabelClaro}>
                Rol
            </Text>

            <View style={styles.roleGrid}>
                {ROLE_OPTIONS.map(({ key, label, icon }) => {
                const on = (draft.roles || []).includes(key);
                return (
                    <TouchableOpacity
                    key={key}
                    onPress={() => toggleRol(key)}
                    style={[
                        styles.roleCard,
                        on
                        ? (profile.modoOscuro ? styles.roleCardOnDark : styles.roleCardOnLight)
                        : (profile.modoOscuro ? styles.roleCardOffDark : styles.roleCardOffLight)
                    ]}
                    >
                    <Ionicons
                        name={icon}
                        size={24}
                        color={
                        on
                            ? "#3D67CD"
                            : profile.modoOscuro
                            ? "#BFBFBF"
                            : "#A0A0A0"
                        }
                        style={{ marginBottom: 6 }}
                    />
                    <Text
                        style={[
                        styles.roleText,
                        on
                            ? (profile.modoOscuro ? styles.roleTextOnDark : styles.roleTextOnLight)
                            : (profile.modoOscuro ? styles.roleTextOffDark : styles.roleTextOffLight)
                        ]}
                    >
                         {label ?? key}
                    </Text>
                    </TouchableOpacity>
                );
                })}
            </View>
            </View>




          {/* Botones pie */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              style={[styles.botonQuitarfiltros, { flex: 1 }]}
              onPress={() => { setDraft({ sucursal: null, estado: null, roles: [] }); }}
            >
              <Text style={profile.modoOscuro ? styles.btnOsc : styles.btnClr}>Quitar Filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity
            style={[styles.botonFiltros, { flex: 1 }]}
            onPress={() => { onApply(draft); onClose(); }}
            >
            <Text style={profile.modoOscuro ? styles.btnOsc : styles.btnClr}>Aplicar Filtros</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalViewClaro: {
    padding: 20, backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    elevation: 5, width: 320,
  },
  modalViewOscuro: {
    padding: 20, backgroundColor: "#2C2C2C", borderRadius: 20, paddingHorizontal: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    elevation: 5, width: 320,
  },
  labelClaro: {
    position: "absolute", left: 10, backgroundColor: "white",
    paddingVertical: 4, paddingHorizontal: 6, zIndex: 200, fontWeight: "700",
    color: "#898C91", fontSize: 16, borderRadius: 8
  },
  labelOscuro: {
    position: "absolute", left: 10, paddingVertical: 4, paddingHorizontal: 6,
    backgroundColor: "#2C2C2C", zIndex: 200, fontWeight: "700",
    color: "#CCCCCC", fontSize: 16, borderRadius: 8
  },
  inputClaro: {
    color: "#000000", marginTop: 15, borderWidth: 1, borderColor: "#D9D9D9",
    borderRadius: 8, paddingLeft: 12, height: 60, justifyContent: "center", fontSize: 16, backgroundColor: "#FFFFFF",
  },
  inputOscuro: {
    color: "#FFFFFF", marginTop: 15, borderWidth: 1, borderColor: "#555555",
    borderRadius: 8, paddingLeft: 12, height: 60, justifyContent: "center", fontSize: 16, backgroundColor: "#1a1a1a",
  },
  containerInputs: { marginTop: 10 },
  botonFiltros: {
    backgroundColor: "#3D67CD", height: 50, justifyContent: "center", alignItems: "center", borderRadius: 13,
  },
  botonQuitarfiltros: {
    backgroundColor: "#6a6a6cff", height: 50, justifyContent: "center", alignItems: "center", borderRadius: 13,
  },
  btnOsc: { color: "#b4b3b3ff", fontWeight: '800', fontSize: 15 },
  btnClr: { color: "white", fontWeight: '800', fontSize: 15 },
  // ===== Encabezados de sección (en lugar de label flotante) =====
sectionLabelClaro: {
  color: "#6B7280",
  fontSize: 14,
  fontWeight: '700',
  marginBottom: 8,
},
sectionLabelOscuro: {
  color: "#D1D5DB",
  fontSize: 14,
  fontWeight: '700',
  marginBottom: 8,
},

// ===== Estado (segmentos) =====
segmentRow: {
  flexDirection: 'row',
  gap: 10,
},
segmentBtn: {
  flex: 1,
  height: 48,
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
},
segmentBtnOnLight: { borderColor: "#3D67CD" },
segmentBtnOnDark:  { borderColor: "#3D67CD" },
segmentBtnOffLight: { borderColor: "#D9D9D9", backgroundColor: "transparent" },
segmentBtnOffDark:  { borderColor: "#555555", backgroundColor: "transparent" },

segmentText: { fontWeight: '700', fontSize: 15 },
segmentTextOnLight: { color: "#3D67CD" },
segmentTextOnDark:  { color: "#3D67CD" },
segmentTextOffLight: { color: "#A0A0A0" },
segmentTextOffDark:  { color: "#BFBFBF" },


// ===== Roles (chips con grid) =====
chipsWrap: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  // si tu versión RN no soporta gap, deja rowGap/columnGap en 0 y usa margenes en chip
  gap: 10,
  marginTop: 2,
},
chip: {
  minHeight: 40,
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 14,
  borderWidth: 1,
  justifyContent: 'center',
  alignItems: 'center',
  // ancho flexible: se acomoda por contenido; si quieres dos columnas fijas, usa flexBasis: '48%'
},
chipOnLight: { backgroundColor: '#E9F2FF', borderColor: '#87aef0' },
chipOnDark:  { backgroundColor: '#343434', borderColor: '#87aef0' },

chipOffLight: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
chipOffDark:  { backgroundColor: '#2E2E2E', borderColor: '#3C3C3C' },

chipText: { fontSize: 14, fontWeight: '700' },
chipTextOnLight: { color: '#111' },
chipTextOnDark:  { color: '#fff' },
chipTextOffLight: { color: '#111' },
chipTextOffDark:  { color: '#fff' },

// ===== Roles con ícono (tarjetas 3 columnas) =====
roleGrid: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 0,
  marginBottom: 20,
},
roleCard: {
  flex: 1,
  marginHorizontal: 4,
  borderRadius: 12,
  paddingVertical: 14,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  minHeight: 60,
},
roleCardOnLight: { borderColor: "#3D67CD", backgroundColor: "transparent" },
roleCardOnDark:  { borderColor: "#3D67CD", backgroundColor: "transparent" },
roleCardOffLight: { borderColor: "#D9D9D9", backgroundColor: "transparent" },
roleCardOffDark:  { borderColor: "#555555", backgroundColor: "transparent" },

roleText: { fontSize: 13, fontWeight: "700" },
roleTextOnLight: { color: "#3D67CD" },
roleTextOnDark:  { color: "#3D67CD" },
roleTextOffLight: { color: "#A0A0A0" },
roleTextOffDark:  { color: "#BFBFBF" },


});

export default ModalFiltrosUsuarios;
