import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Alert, View } from "react-native";
import { useEffect, useRef } from "react";
import { getAuth, signOut } from "firebase/auth";
import AppToaster from "./src/ui/AppToaster";



// Contexto de auth
import { AuthProvider, useAuth } from "./src/screens/login/AuthContext";

// Screens
import Login from "./src/screens/login/Login";
// Admin
import Administradores from "./src/screens/admin/Administradores";
import HomeAdmin from "./src/screens/admin/HomeAdmin";
import RegistrarSucursalesAdmin from "./src/screens/admin/RegistrarSucursalesAdmin";
import SucursalesAdmin from "./src/screens/admin/SucursalesAdmin";
// Gestor
import HomeGestor from "./src/screens/gestor/HomeGestor";
import RegistrarTareasGestor from "./src/screens/gestor/RegistrarTareasGestor";
import RegistrarUsuarios from "./src/screens/shared/RegistrarUsuarios";
import UsuariosGestor from "./src/screens/gestor/UsuariosGestor";
// Técnico
import HomeTecnico from "./src/screens/tecnico/HomeTecnico";
// Shared
import PerfilShared from "./src/screens/shared/PerfilShared";
import PerfilUsuarioShared from './src/screens/shared/PerfilUsuarioShared';
import TareaDetails from './src/screens/shared/TareaDetails';
import TareasShared from "./src/screens/shared/TareasShared";
import EditarTareas from './src/screens/shared/EditarTareas';
import CambiarContrasena from "./src/screens/shared/CambiarContrasena";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ===================== App Root ===================== */

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Gate />
      </NavigationContainer>
    </AuthProvider>
  );
}

/* ===================== Gate: Auth vs App ===================== */

function Gate() {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <>
      {user ? <AppStack /> : <AuthStack />}
            <AppToaster />

    </>
  );
}

/* ===================== Stacks ===================== */

// Solo login (no navega a tabs aquí; eso lo decide Gate)
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ cardStyleInterpolator: () => ({ cardStyle: { opacity: 1 } }) }}>
      <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// Stack principal: tabs por rol + pantallas de registro
function AppStack() {
  const { profile } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ cardStyleInterpolator: () => ({ cardStyle: { opacity: 1 } }) }}>
      {/* Los tabs dependen del rol */}
      <Stack.Screen name="Tabs" component={RoleTabs} options={{ headerShown: false }} />

      {/* Rutas de registro que usas desde los tabs */}
      <Stack.Screen
        name="RegistrarTareas"
        component={RegistrarTareasGestor}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="RegistrarSucursales"
        component={RegistrarSucursalesAdmin}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="RegistrarUsuarios"
        component={RegistrarUsuarios}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="CambiarContrasena"
        component={CambiarContrasena}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TareaDetails"
        component={TareaDetails}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="EditarTareas"
        component={EditarTareas}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen name="Tareas" component={TareasShared}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="PerfilUsuarioShared"
        component={PerfilUsuarioShared}
        options={{ headerShown: false }} // o true si quieres header
      />
    </Stack.Navigator>
  );
}

/* ===================== Tabs por rol ===================== */

function RoleTabs({ navigation }) {
  const { profile } = useAuth(); // viene de Firestore USUARIO/{uid}
  const accessHandledRef = useRef(false);

  useEffect(() => {
    if (!profile || accessHandledRef.current) return;

    const auth = getAuth();

    if (profile.estado !== "Activo") {
      accessHandledRef.current = true;
      Alert.alert(
        "Acceso restringido",
        "Tu cuenta está inactiva. Contacta a un administrador."
      );
      signOut(auth);
      return;
    }

    if (profile.mustChangePassword) {
      accessHandledRef.current = true;
      navigation.replace("CambiarContrasena", { userId: auth.currentUser?.uid });
      return;
    }
  }, [profile, navigation]);

  if (profile?.rol === "Administrador") return <AdminScreens />;
  if (profile?.rol === "Gestor") return <GestorScreens />;
  if (profile?.rol === "Tecnico") return <TecnicoScreens />;
}

function AdminScreens() {
  const { profile } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: profile.modoOscuro === true ? "#1A1A1A" : "white",
        },
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Sucursales':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'Tareas':
              iconName = focused ? 'reader' : 'reader-outline';
              break;
            case 'Usuarios':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4C7BFF',
        tabBarInactiveTintColor: profile.modoOscuro ? "white" : "#6B7280",
      })}
    >
      <Tab.Screen name="Home" component={HomeAdmin} />
      <Tab.Screen name="Sucursales" component={SucursalesAdmin} />
      <Tab.Screen name="Tareas" component={TareasShared} />
      <Tab.Screen name="Usuarios" component={Administradores} />
      <Tab.Screen name="Profile" component={PerfilShared} />
    </Tab.Navigator>
  );
}

function GestorScreens() {
  const { profile } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#FFFFFF",
        },
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tareas') {
            iconName = focused ? 'reader' : 'reader-outline';
          } else if (route.name === 'Usuarios') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4C7BFF',
        tabBarInactiveTintColor: profile.modoOscuro ? "#A1A6AD" : "#6B7280",
      })}
    >
      <Tab.Screen name="Home" component={HomeGestor} />
      <Tab.Screen name="Tareas" component={TareasShared} />
      <Tab.Screen name="Usuarios" component={UsuariosGestor} />
      <Tab.Screen name="Profile" component={PerfilShared} />
    </Tab.Navigator>
  );
}

function TecnicoScreens() {
  const { profile } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: profile.modoOscuro ? "#1A1A1A" : "#FFFFFF",
        },
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Tareas':
              iconName = focused ? 'reader' : 'reader-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4C7BFF',
        tabBarInactiveTintColor: profile.modoOscuro ? "#A1A6AD" : "#6B7280",
      })}
    >
      <Tab.Screen name="Home" component={HomeTecnico} />
      <Tab.Screen name="Tareas" component={TareasShared} />
      <Tab.Screen name="Profile" component={PerfilShared} />
    </Tab.Navigator>
  );
}
