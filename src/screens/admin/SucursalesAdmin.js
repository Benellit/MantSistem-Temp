import AntDesign from '@expo/vector-icons/AntDesign';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  getDoc,
  getDocs,
  getFirestore,
  doc
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import BotonRegistrar from '../../components/BotonRegistrar';
import appFirebase from '../../credenciales/Credenciales';
import { useAuth } from "../login/AuthContext";

const db = getFirestore(appFirebase);

export default function SucursalesAdmin({ navigation }) {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [sucursales, setSucursales] = useState([]);

  const C = useMemo(() => ({
    // Colores condicionales (igual patrón que en Tareas)
    headerBg: profile.modoOscuro ? "#2C2C2C" : "#FFFFFF",
    headerBorder: profile.modoOscuro ? "rgba(255,255,255,0.12)" : "#D9D9D9",
    textTitle: profile.modoOscuro ? "#FFFFFF" : "#111827",
    textSubtle: profile.modoOscuro ? "#A1A6AD" : "#6B7280",
    searchBorder: "#D9D9D9",
    searchPlaceholder: profile.modoOscuro ? "#BDBDBD" : "#6B7280",
    inputText: profile.modoOscuro ? "#FFFFFF" : "#111827",

    cardBg: profile.modoOscuro ? "#2C2C2C" : "#FFFFFF",
    cardBorder: profile.modoOscuro ? "rgba(255,255,255,0.12)" : "#E5E7EB",
    cardDivider: profile.modoOscuro ? "rgba(255,255,255,0.10)" : "#EEF2F7",
    title: profile.modoOscuro ? "#FFFFFF" : "#111827",
    info: profile.modoOscuro ? "#EDEDED" : "#353335",
    infoSoft: profile.modoOscuro ? "#A1A6AD" : "#7B7B7B",

    iconMain: profile.modoOscuro ? "#EDEDED" : "#353335",
    iconAccent: "#87aef0",

    chipBg: profile.modoOscuro ? "rgba(255,255,255,0.06)" : "#F8FAFD",
    chipBorder: profile.modoOscuro ? "rgba(255,255,255,0.14)" : "#D5DAE1",
    chipText: profile.modoOscuro ? "#D8DEE6" : "#334155",
  }), [profile.modoOscuro]);

  // --- Utilidades ---
  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";
    const d = typeof fecha.toDate === "function" ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getCreadorLabel = async (val) => {
    try {
      // string simple
      if (typeof val === "string") return val;
      // DocRef
      if (val && typeof val === "object" && "id" in val && "path" in val) {
        const snap = await getDoc(val);
        if (snap.exists()) {
          const data = snap.data() || {};
          const nombre = [data.primerNombre, data.primerApellido].filter(Boolean).join(" ");
          return nombre || val.id;
        }
        return val.id;
      }
      // otro tipo
      return String(val);
    } catch {
      return "—";
    }
  };

  // --- Cargar sucursales ---
  const cargarSucursales = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "SUCURSAL"));
      const rows = [];
      for (const d of snap.docs) {
        const s = { id: d.id, ...d.data() };
        // normaliza creador
        s._creadorLabel = await getCreadorLabel(s.IDCreador);
        rows.push(s);
      }
      // Ordena reciente primero
      rows.sort((a, b) => {
        const A = a.fechaCreacion?.toDate?.() ?? new Date(0);
        const B = b.fechaCreacion?.toDate?.() ?? new Date(0);
        return B - A;
      });
      setSucursales(rows);
    } catch (e) {
      console.error("Error al cargar sucursales:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarSucursales(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarSucursales();
    setRefreshing(false);
  };

  const sucursalesFiltradas = sucursales.filter(s =>
    (s.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.dirColonia || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.dirCalle || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <LinearGradient
      colors={["#87aef0", "#9c8fc4"]}
      start={{ x: 0.5, y: 0.4 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header (mismo patrón que Tareas) */}
        <View style={[
          profile.modoOscuro ? styles.headerOscuro : styles.headerClaro,
          { backgroundColor: C.headerBg, borderColor: C.headerBorder }
        ]}>
          <View>
            <Text style={[
              profile.modoOscuro ? styles.tituloOscuro : styles.tituloClaro,
              { color: C.textTitle }
            ]}>
              Sucursales
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 5 }}>
            <View style={{ marginBottom: 0, marginVertical: 5, flex: 1 }}>
              <TextInput
                placeholder="Buscar"
                placeholderTextColor={C.searchPlaceholder}
                style={[
                  styles.inputBusqueda,
                  { color: C.inputText, borderColor: C.searchBorder }
                ]}
                value={busqueda}
                onChangeText={setBusqueda}
              />

              {busqueda !== '' && (
                <TouchableOpacity
                  disabled={refreshing}
                  onPress={() => setBusqueda('')}
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 38,
                    padding: 4,
                    opacity: refreshing ? 0.5 : 1,
                  }}
                >
                  <EvilIcons name="close" size={24} color={C.inputText} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                disabled={refreshing}
                onPress={onRefresh}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  backgroundColor: '#87aef0',
                  padding: 10,
                  borderTopRightRadius: 20,
                  borderBottomRightRadius: 20,
                  opacity: refreshing ? 0.6 : 1,
                }}
              >
                <FontAwesome6 name="magnifying-glass" size={16} color={profile.modoOscuro ?  'black' : '#FFFF'} />
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Contenido */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={[styles.loadingText, { color: '#fff' }]}>Cargando sucursales...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 15, paddingVertical: 5 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {sucursalesFiltradas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={60} color="#fff" />
                <Text style={[styles.emptyText, { color: '#fff' }]}>
                  {busqueda ? "No se encontraron sucursales" : "No hay sucursales registradas"}
                </Text>
              </View>
            ) : (
              sucursalesFiltradas.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Navegación a detalle si lo deseas:
                    // navigation.navigate("RegistrarSucursales", { sucursalId: s.id })
                  }}
                  style={[
                    profile.modoOscuro ? styles.cardOscuro : styles.cardClaro,
                    {
                      backgroundColor: C.cardBg,
                      // opcional border si quieres idéntico a tareas + fino
                      // borderWidth: 1, borderColor: C.cardBorder
                    }
                  ]}
                >


                  {/* Título + chip creador + chevron */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Ionicons name="business" size={48} color={C.iconAccent} />
                    <Text style={[
                      profile.modoOscuro ? styles.tituloCardOscuro : styles.tituloCardClaro,
                      { color: C.title }
                    ]}>

                      {s.nombre || `Sucursal ${s.id.slice(0, 6)}`}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

                      {/* <Ionicons name="chevron-forward" size={20} color={profile.modoOscuro ? "#A1A6AD" : "#6B7280"} /> */}
                    </View>
                  </View>

                  {/* Estado/fecha arriba, igual a “estado y prioridad” de Tareas (dos pills opcionales) */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {/* Puedes mapear “activa/cerrada” si existiera */}
                      <Text style={{
                        color: profile.modoOscuro ? "white" : "black",
                        fontWeight: 500,
                        fontSize: 13,
                        backgroundColor: "#57A7FE",
                        paddingVertical: 1,
                        paddingHorizontal: 12,
                        borderRadius: 6
                      }}>
                        {`Creada: ${formatearFecha(s.fechaCreacion)}`}
                      </Text>
                    </View>
                  </View>

                  {/* Divisor */}
                  <View style={[styles.cardDivider, { backgroundColor: C.cardDivider }]} />

                  {/* Info (ubicación y CP) */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                        <Ionicons name="location-outline" size={18} color={C.iconMain} />
                        <Text style={{ fontSize: 14, color: C.info, flex: 1 }}>
                          {(s.dirCalle || "Calle")} {(s.dirColonia?`, ${s.dirColonia}` : "")}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                        <Ionicons name="mail-outline" size={18} color={C.iconMain} />
                        <Text style={{ fontSize: 14, color: C.info }}>
                          CP: {s.dirCP || "—"}
                        </Text>
                      </View>
                    </View>

                    {/* Ícono principal de sucursal, a tono con Tareas (cámara/libro) */}
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Ionicons name="business" size={18} color={C.iconAccent} />
                        <Text style={{ fontSize: 14, fontWeight: '500', color: C.info }}>

                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        <BotonRegistrar />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerClaro: {
    paddingTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 5,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 16,
    borderBottomWidth: 1,
    borderColor: "#D9D9D9"
  },
  headerOscuro: {
    paddingTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 5,
    backgroundColor: "#2C2C2C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 16,
    borderBottomWidth: 1,
    borderColor: "#D9D9D9"
  },
  tituloClaro: {
    color: "black",
    fontSize: 26,
    fontWeight: 900,
    marginTop: 10,
  },
  tituloOscuro: {
    color: "white",
    fontSize: 26,
    fontWeight: 900,
    marginTop: 10,
  },
  inputBusqueda: {
    paddingLeft: 15,
    borderRadius: 20,
    borderColor: "#D9D9D9",
    borderWidth: 1,
    fontSize: 16,
    paddingBottom: 7,
    paddingTop: 7.
  },
  opciones: {
    padding: 7,
    borderRadius: 9,
    backgroundColor: "#87aef0"
  },

  /* Estados de carga / vacío */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    textAlign: "center",
  },

  /* Card: replica Tareas (radius 8 / padding 15×10 / elevation 30) */
  cardClaro: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    elevation: 30,
  },
  cardOscuro: {
    backgroundColor: "#2C2C2C",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    elevation: 30,
  },

  tituloCardClaro: {
    fontSize: 16,
    fontWeight: 700,
  },
  tituloCardOscuro: {
    color: "white",
    fontSize: 16,
    fontWeight: 700,
  },

  cardDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 1,
  },

  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
