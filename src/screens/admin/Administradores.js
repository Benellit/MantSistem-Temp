import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BotonRegistrar from '../../components/BotonRegistrar';
import appFirebase from '../../credenciales/Credenciales';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { useAuth } from "../login/AuthContext";
import ModalFiltrosUsuarios from '../../components/ModalFiltrosUsuarios';

const db = getFirestore(appFirebase);

// Normaliza cualquier forma de sucursal a su ID de documento
function extractSucursalId(val) {
  if (!val) return null;

  // Firestore DocumentReference ({ id, path, ... })
  if (typeof val === "object") {
    if (val && typeof val.id === "string") return val.id;
    if (val && typeof val.path === "string") {
      const parts = val.path.split("/");
      return parts[parts.length - 1] || null;
    }
    return null;
  }

  // String: puede venir como "SUCURSAL/123" o solo "123" o incluso ".../SUCURSAL/123"
  if (typeof val === "string") {
    const m = val.match(/\/?SUCURSAL\/([^/]+)$/i);
    if (m) return m[1];
    return val; // ya es el id
  }

  return null;
}


const UsuariosGestor = ({ navigation }) => {
    const [busqueda, setBusqueda] = useState("");
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    // Función para obtener usuarios de Firebase
    const obtenerUsuarios = async () => {
        try {
            const usuariosRef = collection(db, 'USUARIO');
            const snapshot = await getDocs(usuariosRef);
            const usuariosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsuarios(usuariosData);
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        obtenerUsuarios();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await obtenerUsuarios();
        setRefreshing(false);
    };
    
       // Modal de filtros (estado aplicado)
        const [openFiltros, setOpenFiltros] = useState(false);
        const [appliedFilters, setAppliedFilters] = useState({
        sucursal: null,
        estado: null,
        roles: [],
        });

const normalizeRole = (r = "") => r.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const sucursalFiltroEfectivo =
  (profile?.rol === 'Gestor' || profile?.rol === 'Tecnico')
    ? extractSucursalId(profile?.IDSucursal)
    : appliedFilters.sucursal;

        const usuariosFiltrados = usuarios.filter(usuario => {
    // 1) búsqueda texto (igual que ya tenías)
    const nombreCompleto = `${usuario.primerNombre || ''} ${usuario.segundoNombre || ''} ${usuario.primerApellido || ''} ${usuario.segundoApellido || ''}`.toLowerCase();
    const termino = busqueda.toLowerCase();
    const pasaTexto =
        nombreCompleto.includes(termino) ||
        usuario.email?.toLowerCase().includes(termino) ||
        usuario.rol?.toLowerCase().includes(termino);

    if (!pasaTexto) return false;

    // 2) filtros aplicados
    const { estado, sucursal, roles } = appliedFilters;

    // Estado (==)
    if (estado && (usuario.estado || "").toLowerCase() !== estado.toLowerCase()) return false;

    // Sucursal (single)
  
    if (sucursalFiltroEfectivo) {
    const idS = extractSucursalId(
        usuario.sucursalNombre ?? usuario.sucursal ?? usuario.Sucursal ?? usuario.IDSucursal
    );
    if ((idS || "") !== String(sucursalFiltroEfectivo)) return false;
    }


    // Rol (multi)
    if (roles?.length) {
  const userRole = normalizeRole(usuario.rol || "");
  const selected = roles.map(normalizeRole);
  if (!selected.includes(userRole)) return false;
}

    return true;
    });


    // === Helpers visuales ===
    const getEstadoColor = (estado) => {
        if (!estado) return '#9E9E9E';
        const s = estado.toLowerCase();
        if (s.includes('activo')) return '#26D07C';     // verde presencia
        if (s.includes('inac') || s.includes('suspend')) return '#F5615C'; // rojo
        return '#9E9E9E'; // gris neutro
    };

    const ROLE_META = {
        Administrador: { bg: '#6C63FF', text: '#FFFFFF', icon: 'shield-outline' },
        Gestor: { bg: '#4C7BFF', text: '#FFFFFF', icon: 'briefcase-outline' },
        Tecnico: { bg: '#2BB0B5', text: '#FFFFFF', icon: 'construct-outline' },
    };

    const getSucursalLabel = (u) => {
        const val = u.sucursalNombre ?? u.sucursal ?? u.Sucursal ?? u.IDSucursal;
        if (!val) return "—";

        // Si es DocumentReference (tiene .id y .path)
        if (typeof val === "object" && val !== null && "id" in val && "path" in val) {
            return sucursalesById[val.id] || val.id; // muestra nombre si lo tenemos, o el id
        }

        // Si es string (id de documento o nombre en texto)
        if (typeof val === "string") {
            return sucursalesById[val] || val;
        }

        // Cualquier otro tipo: forzamos a string para evitar el error
        return String(val);
    };

    const [sucursalesById, setSucursalesById] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const snap = await getDocs(collection(db, "SUCURSAL"));
                const map = {};
                snap.forEach(d => {
                    const data = d.data() || {};
                    map[d.id] =
                        data.nombre ||
                        data.Nombre ||
                        data.name ||
                        data.titulo ||
                        `Sucursal ${d.id.slice(0, 6)}`;
                });
                setSucursalesById(map);
            } catch (e) {
                console.log("No se pudieron cargar sucursales:", e);
            }
        })();
    }, []);

        
       



    // Navegar al perfil del usuario seleccionado
    const verPerfilUsuario = (usuario) => {
        navigation.navigate('PerfilUsuarioShared', { userId: usuario.id });
    };

    return (
        <LinearGradient
            colors={["#87aef0", "#9c8fc4"]}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
        >
            <View style={{ flex: 1 }}>
                {/* Header */}
                <View style={profile.modoOscuro ? styles.headerOscuro : styles.headerClaro}>
                    <View>
                        <Text style={profile.modoOscuro ? styles.tituloOscuro : styles.tituloClaro}>
                            Usuarios
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 5 }}>
                        <View style={{ marginBottom: 0, marginVertical: 5, flex: 1 }}>
                            <TextInput
                                placeholder="Buscar"
                                placeholderTextColor={profile.modoOscuro ? '#BDBDBD' : '#6B7280'}
                                style={[
                                    styles.inputBusqueda,
                                    { color: profile.modoOscuro ? '#FFFFFF' : '#111827' },
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
                                    <EvilIcons name="close" size={24} color={profile.modoOscuro ? '#FFFFFF' : '#111827'} />
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
                                <FontAwesome6 name="magnifying-glass" size={16} color={profile.modoOscuro ? '#FFFF' : '#FFFF'} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginTop: 5, justifyContent: 'center', alignContent: 'center' }}>
                            <TouchableOpacity
                            style={styles.opciones}
                           onPress={() => setOpenFiltros(true)}
                            >
                            <Ionicons name="options-outline" size={24} color="#FFFF" />
                            </TouchableOpacity>

                        </View>
                    </View>
                </View>


                <View style={styles.container}>
                    <ScrollView
                        contentContainerStyle={{ padding: 15 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={styles.loadingText}>Cargando usuarios...</Text>
                            </View>
                        ) : usuariosFiltrados.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {busqueda ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                                </Text>
                            </View>
                        ) : (
                            usuariosFiltrados.map((usuario) => (
                                <TouchableOpacity
                                    key={usuario.id}
                                    style={profile.modoOscuro ? styles.tarjetaOscuro : styles.tarjetaClaro}
                                    onPress={() => verPerfilUsuario(usuario)}
                                >
                                    {/* FILA SUPERIOR: avatar + info + chevron */}
                                    <View style={styles.topRow}>
                                        <View style={styles.avatarWrap}>
                                            <Image
                                                source={{
                                                    uri:
                                                        usuario.fotoPerfil?.trim()
                                                            ? usuario.fotoPerfil
                                                            : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                                                }}
                                                style={styles.fotoPerfil}
                                            />
                                            <View
                                                style={[
                                                    styles.statusDot,
                                                    {
                                                        backgroundColor: getEstadoColor(usuario.estado),
                                                        // borde del punto igual al fondo de la card para que “recorte”
                                                        borderColor: profile.modoOscuro ? "#2C2C2C" : "#FFFFFF",
                                                    },
                                                ]}
                                            />
                                        </View>

                                        <View style={styles.infoUsuario}>
                                            <Text style={profile.modoOscuro ? styles.nombreOscuro : styles.nombreClaro}>
                                                {usuario.primerNombre} {usuario.segundoNombre} {usuario.primerApellido} {usuario.segundoApellido}
                                            </Text>

                                            <Text style={profile.modoOscuro ? styles.emailOscuro : styles.emailClaro}>
                                                {usuario.email}
                                            </Text>

                                            {/* Pill de rol (arriba) */}

                                        </View>

                                        <View style={styles.iconoFlecha}>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={22}
                                                color={profile.modoOscuro ? "#A1A6AD" : "#6B7280"}
                                            />
                                        </View>
                                    </View>

                                    {/* DIVISOR CENTRAL */}
                                    <View
                                        style={[
                                            styles.cardDivider,
                                            { backgroundColor: profile.modoOscuro ? "rgba(255,255,255,0.10)" : "#EEF2F7" },
                                        ]}
                                    />

                                    {/* FILA INFERIOR: sucursal (izq) + chip con rango (der) */}
                                    <View style={styles.bottomRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={profile.modoOscuro ? styles.footTextOscuro : styles.footTextClaro}>
                                                Sucursal: {getSucursalLabel(usuario)}
                                            </Text>
                                        </View>

                                        <View style={styles.rightCol}>
                                            <View
                                                style={[
                                                    styles.roleChip,
                                                    {
                                                        borderColor: profile.modoOscuro ? "rgba(255,255,255,0.14)" : "#D5DAE1",
                                                        backgroundColor: profile.modoOscuro ? "rgba(255,255,255,0.06)" : "#F8FAFD",
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={ROLE_META[usuario.rol]?.icon || "person-outline"}
                                                    size={12}
                                                    color={profile.modoOscuro ? "#D8DEE6" : "#334155"}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={profile.modoOscuro ? styles.roleChipTextOsc : styles.roleChipTextClr}>
                                                    {usuario.rol || "—"}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                </TouchableOpacity>

                            ))
                        )}
                    </ScrollView>
                </View>
                
                <ModalFiltrosUsuarios
            isOpen={openFiltros}
            onClose={() => setOpenFiltros(false)}
            applied={appliedFilters}
            onApply={setAppliedFilters}
            />



                <BotonRegistrar />
            </View>
        </LinearGradient>
    );
};

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
        paddingTop: 7,
    },
    opciones: {
        padding: 7,
        borderRadius: 9,
        backgroundColor: "#87aef0"
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    tarjetaClaro: {
        backgroundColor: 'white',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,     // un poco más para el bloque inferior
        marginBottom: 10,
        elevation: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    tarjetaOscuro: {
        backgroundColor: '#2C2C2C',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 10,
        elevation: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },



    fotoPerfil: {
        width: 62,
        height: 62,
        borderRadius: 30,
        marginRight: 15,
    },
    infoUsuario: {
        flex: 1,
    },
    nombreClaro: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 4,
    },
    nombreOscuro: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    detallesContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    iconoFlecha: {
        marginLeft: 10,
        width: 28,
        alignItems: 'flex-end',
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',  // ✅ separa izquierda/derecha
    },


    cardDivider: {
        height: 1,
        marginTop: 10,
        marginBottom: 8,
        borderRadius: 1,
    },

    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",  // permite que el texto quede arriba
        marginTop: 4,
    },
    rightCol: {
        flexDirection: "column",
        alignItems: "flex-end",
    },


    footTextClaro: { fontSize: 12, color: '#6B7280' },
    footTextOscuro: { fontSize: 12, color: '#A1A6AD' },

    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    roleChipTextClr: { fontSize: 12, fontWeight: '600', color: '#334155' },
    roleChipTextOsc: { fontSize: 12, fontWeight: '600', color: '#D8DEE6' },

    avatarWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        position: 'relative',
        overflow: 'visible',
    },
    fotoPerfil: {
        width: 49,
        height: 49,
        borderRadius: 24,
    },
    statusDot: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 13,
        height: 13,
        borderRadius: 7,
        borderWidth: 2,
        zIndex: 10,
        elevation: 2,
        pointerEvents: 'none',
    },

    infoUsuario: { flex: 1 },
    nombreClaro: { fontSize: 16, fontWeight: '700', color: 'black', marginBottom: 2 },
    nombreOscuro: { fontSize: 16, fontWeight: '700', color: 'white', marginBottom: 2 },
    emailClaro: { fontSize: 13, color: '#6B7280', marginBottom: 8, marginTop: 2 },
    emailOscuro: { fontSize: 13, color: '#A1A6AD', marginBottom: 8, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rolePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    rolePillText: { fontSize: 12, fontWeight: '600' },

});

export default UsuariosGestor;