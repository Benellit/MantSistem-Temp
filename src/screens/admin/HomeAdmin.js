import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import appFirebase from '../../credenciales/Credenciales';
import { useAuth } from '../login/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 45) / 2;

export default function HomeAdmin({ navigation }) {
    const db = getFirestore(appFirebase);
    const { profile } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState({ tipo: null, items: [], titulo: '', color: '' });
    const [fadeAnim] = useState(new Animated.Value(0));

    const [dashboardData, setDashboardData] = useState({
        totalUsuarios: 0,
        totalSucursales: 0,
        tareasEnCurso: 0,
        tareasCompletadas: 0,
        distribucionRoles: { tecnicos: 0, gestores: 0, administradores: 0 },
        actividadReciente: [],
        alertas: [],
        ultimosUsuarios: [],
        tareasVencidas: [],
        usuariosInactivos: [],
        tareasProximas: [],
        eficienciaGlobal: 0,
    });

    useEffect(() => {
        getDashboardData();
    }, []);

    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }
    }, [loading]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        getDashboardData();
    }, []);

    const getDashboardData = async () => {
        try {
            setLoading(true);

            const [usuariosSnapshot, sucursalesSnapshot, tareasSnapshot] = await Promise.all([
                getDocs(collection(db, 'USUARIO')),
                getDocs(collection(db, 'SUCURSAL')),
                getDocs(collection(db, 'TAREA')),
            ]);

            const usuariosList = usuariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const totalUsuarios = usuariosList.length;

            // Distribución de roles
            const tecnicos = usuariosList.filter(u => u.rol === 'Tecnico').length;
            const gestores = usuariosList.filter(u => u.rol === 'Gestor').length;
            const administradores = usuariosList.filter(u => u.rol === 'Administrador').length;

            const usuariosOrdenados = usuariosList
                .sort((a, b) => {
                    const fechaA = a.fechaCreacion?.toMillis?.() || 0;
                    const fechaB = b.fechaCreacion?.toMillis?.() || 0;
                    return fechaB - fechaA;
                })
                .slice(0, 5);

            // Procesamiento de sucursales
            const totalSucursales = sucursalesSnapshot.size;

            const tareasList = tareasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const tareasEnCurso = tareasList.filter(t =>
                t.estado === 'En Proceso' || t.estado === 'Pendiente'
            ).length;
            const tareasCompletadas = tareasList.filter(t =>
                t.estado === 'Completada' || t.estado === 'Revisada'
            ).length;

            const totalTareas = tareasList.length;
            const eficienciaGlobal = totalTareas > 0
                ? Math.round((tareasCompletadas / totalTareas) * 100)
                : 0;

            const alertas = [];
            const hoy = new Date();

            // Tareas vencidas
            const tareasVencidasList = tareasList
                .filter(t => {
                    if (!t.fechaEntrega) return false;
                    const fechaEntrega = t.fechaEntrega.toDate?.() || new Date(t.fechaEntrega);
                    return fechaEntrega < hoy && t.estado !== 'Completada' && t.estado !== 'Revisada';
                })
                .sort((a, b) => {
                    const fechaA = a.fechaCreacion.toDate?.() || new Date(a.fechaCreacion);
                    const fechaB = b.fechaCreacion.toDate?.() || new Date(b.fechaCreacion);
                    return fechaB - fechaA; // DESCENDENTE
                });


            if (tareasVencidasList.length > 0) {
                alertas.push({
                    id: 'tareas-vencidas',
                    tipo: 'error',
                    icono: 'alert-circle',
                    mensaje: `${tareasVencidasList.length} tarea${tareasVencidasList.length > 1 ? 's' : ''} vencida${tareasVencidasList.length > 1 ? 's' : ''}`,
                    color: '#FF4757',
                    prioridad: 1,
                });
            }

            // Usuarios inactivos
            const usuariosInactivosList = usuariosList
                .filter(u => u.estado === 'Inactivo')
                .sort((a, b) => {
                    const nombreA = `${a.primerNombre || ''} ${a.primerApellido || ''}`.trim().toLowerCase();
                    const nombreB = `${b.primerNombre || ''} ${b.primerApellido || ''}`.trim().toLowerCase();
                    return nombreA.localeCompare(nombreB);
                });

            if (usuariosInactivosList.length > 0) {
                alertas.push({
                    id: 'usuarios-inactivos',
                    tipo: 'warning',
                    icono: 'person-remove',
                    mensaje: `${usuariosInactivosList.length} usuario${usuariosInactivosList.length > 1 ? 's' : ''} inactivo${usuariosInactivosList.length > 1 ? 's' : ''}`,
                    color: '#FFA502',
                    prioridad: 2,
                });
            }

            // Tareas próximas a vencer
            const sieteDiasMs = 7 * 24 * 60 * 60 * 1000;
            const tareasProximasList = tareasList
                .filter(t => {
                    if (!t.fechaEntrega) return false;
                    const fechaEntrega = t.fechaEntrega.toDate?.() || new Date(t.fechaEntrega);
                    const diferencia = fechaEntrega - hoy;
                    return diferencia > 0 && diferencia <= sieteDiasMs &&
                        t.estado !== 'Completada' && t.estado !== 'Revisada';
                })
                .sort((a, b) => {
                    const fechaA = a.fechaEntrega.toDate?.() || new Date(a.fechaEntrega);
                    const fechaB = b.fechaEntrega.toDate?.() || new Date(b.fechaEntrega);
                    return fechaA - fechaB;
                });

            if (tareasProximasList.length > 0) {
                alertas.push({
                    id: 'tareas-proximas',
                    tipo: 'info',
                    icono: 'time-outline',
                    mensaje: `${tareasProximasList.length} tarea${tareasProximasList.length > 1 ? 's' : ''} vence${tareasProximasList.length > 1 ? 'n' : ''} pronto`,
                    color: '#5352ED',
                    prioridad: 3,
                });
            }

            alertas.sort((a, b) => a.prioridad - b.prioridad);

            // Actividad reciente mejorada
            const tareasOrdenadas = tareasList
                .sort((a, b) => {
                    const fechaA = a.fechaCreacion?.toMillis?.() || 0;
                    const fechaB = b.fechaCreacion?.toMillis?.() || 0;
                    return fechaB - fechaA;
                })
                .slice(0, 3);

            const actividadReciente = [
                ...usuariosOrdenados.slice(0, 3).map(u => ({
                    id: `user-${u.id}`,
                    tipo: 'usuario',
                    titulo: `${u.primerNombre || ''} ${u.primerApellido || ''}`.trim() || 'Usuario sin nombre',
                    subtitulo: `Nuevo ${u.rol || 'Usuario'}`,
                    fecha: u.fechaCreacion,
                    icono: 'person-add-outline',
                    color: '#2ED573',
                })),
                ...tareasOrdenadas.map(t => ({
                    id: `task-${t.id}`,
                    tipo: 'tarea',
                    titulo: t.nombre || 'Tarea sin nombre',
                    subtitulo: `Estado: ${t.estado || 'Sin estado'}`,
                    fecha: t.fechaCreacion,
                    icono: 'clipboard-outline',
                    color: '#5352ED',
                })),
            ]
                .sort((a, b) => {
                    const fechaA = a.fecha?.toMillis?.() || 0;
                    const fechaB = b.fecha?.toMillis?.() || 0;
                    return fechaB - fechaA;
                })
                .slice(0, 6);

            setDashboardData({
                totalUsuarios,
                totalSucursales,
                tareasEnCurso,
                tareasCompletadas,
                distribucionRoles: { tecnicos, gestores, administradores },
                actividadReciente,
                alertas,
                ultimosUsuarios: usuariosOrdenados,
                tareasVencidas: tareasVencidasList,
                usuariosInactivos: usuariosInactivosList,
                tareasProximas: tareasProximasList,
                eficienciaGlobal,
            });
        } catch (error) {
            console.error('Error obteniendo datos del dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatFecha = (fecha) => {
        if (!fecha) return '';
        let dateObj;
        if (typeof fecha.toDate === 'function') {
            dateObj = fecha.toDate();
        } else if (typeof fecha === 'string') {
            dateObj = new Date(fecha);
        } else if (fecha instanceof Date) {
            dateObj = fecha;
        } else {
            return '';
        }
        return dateObj.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatFechaRelativa = (fecha) => {
        if (!fecha) return '';
        let dateObj;
        if (typeof fecha.toDate === 'function') {
            dateObj = fecha.toDate();
        } else if (typeof fecha === 'string') {
            dateObj = new Date(fecha);
        } else if (fecha instanceof Date) {
            dateObj = fecha;
        } else {
            return '';
        }

        const ahora = new Date();
        const diferencia = ahora - dateObj;
        const minutos = Math.floor(diferencia / 60000);
        const horas = Math.floor(diferencia / 3600000);
        const dias = Math.floor(diferencia / 86400000);

        if (minutos < 1) return 'Ahora';
        if (minutos < 60) return `Hace ${minutos} min`;
        if (horas < 24) return `Hace ${horas}h`;
        if (dias < 7) return `Hace ${dias}d`;
        return formatFecha(fecha);
    };

    const calcularPorcentajeRol = (cantidad) => {
        if (dashboardData.totalUsuarios === 0) return 0;
        return Math.round((cantidad / dashboardData.totalUsuarios) * 100);
    };

    const navegarUsuario = (usuarioID) => {
        navigation.navigate('PerfilUsuarioShared', { userId: usuarioID });
    };

    const navegarTarea = (tareaID) => {
        navigation.navigate('TareaDetails', { id: tareaID });
    };

    const abrirModal = (tipo) => {
        let items = [];
        let titulo = '';
        let color = '';

        switch (tipo) {
            case 'tareas-vencidas':
                items = dashboardData.tareasVencidas;
                titulo = 'Tareas Vencidas';
                color = '#FF4757';
                break;
            case 'usuarios-inactivos':
                items = dashboardData.usuariosInactivos;
                titulo = 'Usuarios Inactivos';
                color = '#FFA502';
                break;
            case 'tareas-proximas':
                items = dashboardData.tareasProximas;
                titulo = 'Tareas Próximas';
                color = '#5352ED';
                break;
            default:
                break;
        }

        setModalData({ tipo, items, titulo, color });
        setModalVisible(true);
    };

    const calcularDiasVencido = (fecha) => {
        if (!fecha) return 0;
        const fechaEntrega = fecha.toDate?.() || new Date(fecha);
        const hoy = new Date();
        const diferencia = hoy - fechaEntrega;
        return Math.floor(diferencia / (24 * 60 * 60 * 1000));
    };

    const calcularDiasFaltantes = (fecha) => {
        if (!fecha) return 0;
        const fechaEntrega = fecha.toDate?.() || new Date(fecha);
        const hoy = new Date();
        const diferencia = fechaEntrega - hoy;
        return Math.ceil(diferencia / (24 * 60 * 60 * 1000));
    };

    const getEstadoStyle = (estado) => {
        const estilos = {
            Completada: { bg: '#2ED573', color: '#fff' },
            Revisada: { bg: '#A29BFE', color: '#fff' },
            Pendiente: { bg: '#FFA502', color: '#fff' },
            'En Proceso': { bg: '#5352ED', color: '#fff' },
            'No Entregada': { bg: '#FF4757', color: '#fff' },
        };
        return estilos[estado] || { bg: '#95A5A6', color: '#fff' };
    };

    const getPrioridadStyle = (prioridad) => {
        const estilos = {
            Alta: { bg: '#FF4757', color: '#fff' },
            Media: { bg: '#FFA502', color: '#fff' },
            Baja: { bg: '#5352ED', color: '#fff' },
        };
        return estilos[prioridad] || { bg: '#95A5A6', color: '#fff' };
    };

    if (loading) {
        return (
            <LinearGradient
                colors={profile.modoOscuro ? ['#1A1A2E', '#16213E'] : ['#667EEA', '#764BA2']}
                style={styles.container}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.loadingText}>Cargando dashboard...</Text>
                </View>
            </LinearGradient>
        );
    }

    const isDark = profile.modoOscuro;

    return (
        <LinearGradient
            colors={isDark ? ['#1A1A2E', '#16213E'] : ['#667EEA', '#764BA2']}
            style={styles.container}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Panel de Control</Text>
                    <Text style={styles.headerSubtitle}>Administración General</Text>
                </View>
                <TouchableOpacity
                    style={[styles.refreshButton, isDark && styles.refreshButtonDark]}
                    onPress={onRefresh}
                >
                    <Ionicons name="refresh" size={22} color={isDark ? '#FFF' : '#667EEA'} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                }
            >
                <Animated.View style={{ opacity: fadeAnim }}>
                    <View style={styles.section}>
                        <View style={styles.metricsGrid}>
                            <TouchableOpacity
                                style={[styles.metricCard, isDark && styles.metricCardDark]}
                                onPress={() => navigation.navigate('Usuarios')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.metricIcon, { backgroundColor: '#2ED57320' }]}>
                                    <Ionicons name="people" size={28} color="#2ED573" />
                                </View>
                                <Text style={[styles.metricValue, isDark && styles.textDark]}>
                                    {dashboardData.totalUsuarios}
                                </Text>
                                <Text style={[styles.metricLabel, isDark && styles.textMutedDark]}>Usuarios</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.metricCard, isDark && styles.metricCardDark]}
                                onPress={() => navigation.navigate('Sucursales')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.metricIcon, { backgroundColor: '#5352ED20' }]}>
                                    <Ionicons name="business" size={28} color="#5352ED" />
                                </View>
                                <Text style={[styles.metricValue, isDark && styles.textDark]}>
                                    {dashboardData.totalSucursales}
                                </Text>
                                <Text style={[styles.metricLabel, isDark && styles.textMutedDark]}>Sucursales</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.metricCard, isDark && styles.metricCardDark]}
                                onPress={() => navigation.navigate('Tareas')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.metricIcon, { backgroundColor: '#FFA50220' }]}>
                                    <Ionicons name="time" size={28} color="#FFA502" />
                                </View>
                                <Text style={[styles.metricValue, isDark && styles.textDark]}>
                                    {dashboardData.tareasEnCurso}
                                </Text>
                                <Text style={[styles.metricLabel, isDark && styles.textMutedDark]}>Pendientes o En Proceso</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.metricCard, isDark && styles.metricCardDark]}
                                onPress={() => navigation.navigate('Tareas')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.metricIcon, { backgroundColor: '#2ED57320' }]}>
                                    <Ionicons name="checkmark-done" size={28} color="#2ED573" />
                                </View>
                                <Text style={[styles.metricValue, isDark && styles.textDark]}>
                                    {dashboardData.tareasCompletadas}
                                </Text>
                                <Text style={[styles.metricLabel, isDark && styles.textMutedDark]}>Completadas</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {dashboardData.eficienciaGlobal > 0 && (
                        <View style={styles.section}>
                            <View style={[styles.efficiencyCard, isDark && styles.efficiencyCardDark]}>
                                <View style={styles.efficiencyHeader}>
                                    <Ionicons name="trending-up" size={24} color="#2ED573" />
                                    <Text style={[styles.efficiencyTitle, isDark && styles.textDark]}>
                                        Eficiencia Global
                                    </Text>
                                </View>
                                <Text style={styles.efficiencyValue}>{dashboardData.eficienciaGlobal}%</Text>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${dashboardData.eficienciaGlobal}%` }
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {dashboardData.alertas.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Alertas del Sistema</Text>
                            <View style={styles.alertsContainer}>
                                {dashboardData.alertas.map(alerta => (
                                    <TouchableOpacity
                                        key={alerta.id}
                                        style={[
                                            styles.alertCard,
                                            isDark && styles.alertCardDark,
                                            { borderLeftColor: alerta.color },
                                        ]}
                                        onPress={() => abrirModal(alerta.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.alertIcon, { backgroundColor: `${alerta.color}20` }]}>
                                            <Ionicons name={alerta.icono} size={20} color={alerta.color} />
                                        </View>
                                        <Text style={[styles.alertText, isDark && styles.textDark]}>
                                            {alerta.mensaje}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={18} color={isDark ? '#666' : '#999'} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Distribución por Rol</Text>
                        <View style={[styles.rolesCard, isDark && styles.rolesCardDark]}>
                            {/* Técnicos */}
                            <View style={styles.roleItem}>
                                <View style={styles.roleHeader}>
                                    <View style={[styles.roleIcon, { backgroundColor: '#2ED57320' }]}>
                                        <Ionicons name="construct" size={18} color="#2ED573" />
                                    </View>
                                    <View style={styles.roleInfo}>
                                        <Text style={[styles.roleName, isDark && styles.textDark]}>Técnicos</Text>
                                        <Text style={[styles.roleCount, isDark && styles.textMutedDark]}>
                                            {dashboardData.distribucionRoles.tecnicos} usuarios
                                        </Text>
                                    </View>
                                    <Text style={[styles.rolePercentage, { color: '#2ED573' }]}>
                                        {calcularPorcentajeRol(dashboardData.distribucionRoles.tecnicos)}%
                                    </Text>
                                </View>
                                <View style={styles.roleBar}>
                                    <View
                                        style={[
                                            styles.roleBarFill,
                                            {
                                                width: `${calcularPorcentajeRol(dashboardData.distribucionRoles.tecnicos)}%`,
                                                backgroundColor: '#2ED573',
                                            },
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Gestores */}
                            <View style={styles.roleItem}>
                                <View style={styles.roleHeader}>
                                    <View style={[styles.roleIcon, { backgroundColor: '#5352ED20' }]}>
                                        <Ionicons name="briefcase" size={18} color="#5352ED" />
                                    </View>
                                    <View style={styles.roleInfo}>
                                        <Text style={[styles.roleName, isDark && styles.textDark]}>Gestores</Text>
                                        <Text style={[styles.roleCount, isDark && styles.textMutedDark]}>
                                            {dashboardData.distribucionRoles.gestores} usuarios
                                        </Text>
                                    </View>
                                    <Text style={[styles.rolePercentage, { color: '#5352ED' }]}>
                                        {calcularPorcentajeRol(dashboardData.distribucionRoles.gestores)}%
                                    </Text>
                                </View>
                                <View style={styles.roleBar}>
                                    <View
                                        style={[
                                            styles.roleBarFill,
                                            {
                                                width: `${calcularPorcentajeRol(dashboardData.distribucionRoles.gestores)}%`,
                                                backgroundColor: '#5352ED',
                                            },
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Administradores */}
                            <View style={styles.roleItem}>
                                <View style={styles.roleHeader}>
                                    <View style={[styles.roleIcon, { backgroundColor: '#A29BFE20' }]}>
                                        <Ionicons name="shield-checkmark" size={18} color="#A29BFE" />
                                    </View>
                                    <View style={styles.roleInfo}>
                                        <Text style={[styles.roleName, isDark && styles.textDark]}>Administradores</Text>
                                        <Text style={[styles.roleCount, isDark && styles.textMutedDark]}>
                                            {dashboardData.distribucionRoles.administradores} usuarios
                                        </Text>
                                    </View>
                                    <Text style={[styles.rolePercentage, { color: '#A29BFE' }]}>
                                        {calcularPorcentajeRol(dashboardData.distribucionRoles.administradores)}%
                                    </Text>
                                </View>
                                <View style={styles.roleBar}>
                                    <View
                                        style={[
                                            styles.roleBarFill,
                                            {
                                                width: `${calcularPorcentajeRol(dashboardData.distribucionRoles.administradores)}%`,
                                                backgroundColor: '#A29BFE',
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {dashboardData.actividadReciente.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
                            <View style={styles.activityContainer}>
                                {dashboardData.actividadReciente.map(actividad => (
                                    <TouchableOpacity
                                        key={actividad.id}
                                        style={[styles.activityCard, isDark && styles.activityCardDark]}
                                        onPress={() => {
                                            if (actividad.tipo === 'usuario') {
                                                navegarUsuario(actividad.id.replace('user-', ''));
                                            } else if (actividad.tipo === 'tarea') {
                                                navegarTarea(actividad.id.replace('task-', ''));
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.activityIcon, { backgroundColor: `${actividad.color}20` }]}>
                                            <Ionicons name={actividad.icono} size={20} color={actividad.color} />
                                        </View>
                                        <View style={styles.activityContent}>
                                            <Text style={[styles.activityTitle, isDark && styles.textDark]}>
                                                {actividad.titulo}
                                            </Text>
                                            <Text style={[styles.activitySubtitle, isDark && styles.textMutedDark]}>
                                                {actividad.subtitulo}
                                            </Text>
                                        </View>
                                        <Text style={[styles.activityTime, isDark && styles.textMutedDark]}>
                                            {formatFechaRelativa(actividad.fecha)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {dashboardData.ultimosUsuarios.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Últimos Usuarios</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Usuarios')}>
                                    <Text style={styles.sectionLink}>Ver todos</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.usersContainer}>
                                {dashboardData.ultimosUsuarios.slice(0, 3).map(usuario => (
                                    <TouchableOpacity
                                        key={usuario.id}
                                        style={[styles.userCard, isDark && styles.userCardDark]}
                                        onPress={() => navegarUsuario(usuario.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Image
                                            style={styles.userAvatar}
                                            source={{
                                                uri: usuario.fotoPerfil?.trim() ||
                                                    'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                                            }}
                                        />
                                        <View style={styles.userInfo}>
                                            <Text style={[styles.userName, isDark && styles.textDark]}>
                                                {`${usuario.primerNombre || ''} ${usuario.primerApellido || ''}`.trim() || 'Usuario'}
                                            </Text>
                                            <Text style={[styles.userEmail, isDark && styles.textMutedDark]} numberOfLines={1}>
                                                {usuario.email}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.userBadge,
                                                    {
                                                        backgroundColor:
                                                            usuario.rol === 'Administrador'
                                                                ? '#A29BFE'
                                                                : usuario.rol === 'Gestor'
                                                                    ? '#5352ED'
                                                                    : '#2ED573',
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.userBadgeText}>{usuario.rol}</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#CCC'} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.bottomSpacer} />
                </Animated.View>
            </ScrollView>

            <Modal
                animationType="slide"
                transparent
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <View style={[styles.modalIconContainer, { backgroundColor: `${modalData.color}20` }]}>
                                    <Ionicons name="information-circle" size={24} color={modalData.color} />
                                </View>
                                <View>
                                    <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                                        {modalData.titulo}
                                    </Text>
                                    <Text style={[styles.modalSubtitle, isDark && styles.textMutedDark]}>
                                        {modalData.items.length} elemento{modalData.items.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={28} color={isDark ? '#FFF' : '#000'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {modalData.tipo === 'usuarios-inactivos'
                                ? modalData.items.map(usuario => (
                                    <TouchableOpacity
                                        key={usuario.id}
                                        style={[styles.modalItem, isDark && styles.modalItemDark]}
                                        onPress={() => {
                                            setModalVisible(false);
                                            navegarUsuario(usuario.id);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Image
                                            style={styles.modalAvatar}
                                            source={{
                                                uri: usuario.fotoPerfil?.trim() ||
                                                    'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                                            }}
                                        />
                                        <View style={styles.modalItemInfo}>
                                            <Text style={[styles.modalItemTitle, isDark && styles.textDark]}>
                                                {`${usuario.primerNombre || ''} ${usuario.primerApellido || ''}`.trim()}
                                            </Text>
                                            <Text style={[styles.modalItemSubtitle, isDark && styles.textMutedDark]}>
                                                {usuario.email}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.modalBadge,
                                                    {
                                                        backgroundColor:
                                                            usuario.rol === 'Administrador'
                                                                ? '#A29BFE'
                                                                : usuario.rol === 'Gestor'
                                                                    ? '#5352ED'
                                                                    : '#2ED573',
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.modalBadgeText}>{usuario.rol}</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#CCC'} />
                                    </TouchableOpacity>
                                ))
                                : modalData.items.map(tarea => (
                                    <TouchableOpacity
                                        key={tarea.id}
                                        style={[styles.modalItem, isDark && styles.modalItemDark]}
                                        onPress={() => {
                                            setModalVisible(false);
                                            navegarTarea(tarea.id);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.modalItemInfo}>
                                            <Text style={[styles.modalItemTitle, isDark && styles.textDark]}>
                                                {tarea.nombre}
                                            </Text>
                                            <View style={styles.modalItemRow}>
                                                <Feather name="calendar" size={14} color={modalData.color} />
                                                <Text style={[styles.modalItemDate, { color: modalData.color }]}>
                                                    {formatFecha(tarea.fechaEntrega)}
                                                </Text>
                                                {modalData.tipo === 'tareas-vencidas' && (
                                                    <Text style={[styles.modalItemDays, { color: modalData.color }]}>
                                                        • Vencida hace {calcularDiasVencido(tarea.fechaEntrega)}d
                                                    </Text>
                                                )}
                                                {modalData.tipo === 'tareas-proximas' && (
                                                    <Text style={[styles.modalItemDays, { color: modalData.color }]}>
                                                        • Vence en {calcularDiasFaltantes(tarea.fechaEntrega)}d
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={styles.modalBadgeContainer}>
                                                <View
                                                    style={[
                                                        styles.modalBadge,
                                                        { backgroundColor: getEstadoStyle(tarea.estado).bg },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.modalBadgeText,
                                                            { color: getEstadoStyle(tarea.estado).color },
                                                        ]}
                                                    >
                                                        {tarea.estado}
                                                    </Text>
                                                </View>
                                                {tarea.prioridad && (
                                                    <View
                                                        style={[
                                                            styles.modalBadge,
                                                            { backgroundColor: getPrioridadStyle(tarea.prioridad).bg },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.modalBadgeText,
                                                                { color: getPrioridadStyle(tarea.prioridad).color },
                                                            ]}
                                                        >
                                                            {tarea.prioridad}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#CCC'} />
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFFCC',
        marginTop: 4,
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    refreshButtonDark: {
        backgroundColor: '#2C2C3E',
    },
    scrollContainer: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 15,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },
    sectionLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
        opacity: 0.8,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: CARD_WIDTH,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    metricCardDark: {
        backgroundColor: "#2C2C2C",
    },
    metricIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A2E',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    textDark: {
        color: '#FFF',
    },
    textMutedDark: {
        color: '#999',
    },
    efficiencyCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    efficiencyCardDark: {
        backgroundColor: "#2C2C2C",
    },
    efficiencyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    efficiencyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A2E',
        marginLeft: 8,
    },
    efficiencyValue: {
        fontSize: 48,
        fontWeight: '900',
        color: '#2ED573',
        marginBottom: 12,
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2ED573',
        borderRadius: 4,
    },
    alertsContainer: {
        gap: 8,
    },
    alertCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    alertCardDark: {
        backgroundColor: "#2C2C2C",
    },
    alertIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    alertText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A2E',
    },
    rolesCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    rolesCardDark: {
        backgroundColor: "#2C2C2C",
    },
    roleItem: {
        marginBottom: 16,
    },
    roleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    roleInfo: {
        flex: 1,
    },
    roleName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A2E',
    },
    roleCount: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
        marginTop: 2,
    },
    rolePercentage: {
        fontSize: 18,
        fontWeight: '800',
    },
    roleBar: {
        width: '100%',
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    roleBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    activityContainer: {
        gap: 8,
    },
    activityCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    activityCardDark: {
        backgroundColor: "#2C2C2C",
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 2,
    },
    activitySubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
    },
    activityTime: {
        fontSize: 11,
        fontWeight: '600',
        color: '#999',
    },
    usersContainer: {
        gap: 8,
    },
    userCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    userCardDark: {
        backgroundColor: "#2C2C2C",
    },
    userAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#5352ED',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
        marginBottom: 6,
    },
    userBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    userBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    modalContainerDark: {
        backgroundColor: '#1A1A2E',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A2E',
    },
    modalSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
        marginTop: 2,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalContent: {
        paddingHorizontal: 15,
        paddingTop: 16,
    },
    modalItem: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalItemDark: {
        backgroundColor: "#2C2C2C",
    },
    modalAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#5352ED',
    },
    modalItemInfo: {
        flex: 1,
    },
    modalItemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 4,
    },
    modalItemSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
        marginBottom: 6,
    },
    modalItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    modalItemDate: {
        fontSize: 12,
        fontWeight: '600',
    },
    modalItemDays: {
        fontSize: 11,
        fontWeight: '600',
    },
    modalBadgeContainer: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    modalBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    modalBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    bottomSpacer: {
        height: 32,
    },
});
