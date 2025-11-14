import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  signInWithEmailAndPassword
} from "firebase/auth";
import { firebaseConfig } from "../../credenciales/Credenciales";

import { doc, setDoc, collection, getDocs, getFirestore, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import appFirebase, { cloudinaryConfig } from "../../credenciales/Credenciales";
import { useAuth } from "../login/AuthContext";

const db = getFirestore(appFirebase);

const TEMP_PASSWORD = "123456";
const extractSucursalId = (val) => {
  if (!val) return null;
  if (typeof val === "object" && val?.id) return val.id;
  if (typeof val === "string") {
    const m = val.match(/\/?SUCURSAL\/([^/]+)$/i);
    return m ? m[1] : val;
  }
  return null;
};

// Reusa SIEMPRE la misma instancia "Secondary"
const getSecondaryAuth = () => {
  const existing = getApps().find(a => a.name === "Secondary");
  const secondaryApp = existing || initializeApp(firebaseConfig, "Secondary");
  return getAuth(secondaryApp);
};

// Crea usuario SIN tocar la sesión actual (usa Auth secundario)
const createUserWithoutSignOut = async (email, password) => {
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  return cred; // el signOut del secundario se hace tras setDoc
};


const RegistrarUsuariosGestor = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sucursales, setSucursales] = useState([]);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [showRolModal, setShowRolModal] = useState(false);
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const { profile } = useAuth();

  const isGestor = profile?.rol === "Gestor";
  const isAdmin = profile?.rol === "Administrador";

  const roles = isAdmin
  ? ["Administrador", "Gestor", "Tecnico"]
  : ["Tecnico"];

  const estados = ["Activo", "Inactivo"];

  const [formData, setFormData] = useState({
    primerNombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    email: "",
    numTel: "",
    fotoPerfil: "",
    rol: "Tecnico",
    IDSucursal: null,
    sucursalNombre: "",
    estado: "Activo",
    modoOscuro: false,
  });

  // Cargar sucursales disponibles
  useEffect(() => {
    const loadSucursales = async () => {
      try {
        const sucursalesSnapshot = await getDocs(collection(db, "SUCURSAL"));
        const sucursalesData = sucursalesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSucursales(sucursalesData);
      } catch (error) {
        console.error("Error cargando sucursales:", error);
        Toast.show({
          type: "appError",
          text1: "Error",
          text2: "No se pudieron cargar las sucursales",
        });
      } finally {
        setLoadingSucursales(false);
      }
    };

    loadSucursales();
  }, []);

  useEffect(() => {
  if (!profile) return;

  // Si es Gestor, prellenamos sucursal (id + nombre) y la "congelamos" en el estado del form
  if (isGestor) {
    const gestorSucId = extractSucursalId(profile?.IDSucursal);
    if (!gestorSucId) return;

    // Intentamos resolver el nombre usando la lista de sucursales cargada
    const found = sucursales.find(s => s.id === gestorSucId);
    const nombre = found?.nombre || gestorSucId;

    setFormData(prev => ({
      ...prev,
      IDSucursal: gestorSucId,
      sucursalNombre: nombre,
    }));
  }
}, [profile, isGestor, sucursales]);

  // Función para subir imagen a Cloudinary
  const uploadImageToCloudinary = async (uri) => {
    try {
      const formDataImg = new FormData();

      const file = {
        uri,
        type: "image/jpeg",
        name: `user_${Date.now()}.jpg`,
      };

      formDataImg.append("file", file);
      formDataImg.append("upload_preset", cloudinaryConfig.uploadPreset);
      formDataImg.append("cloud_name", cloudinaryConfig.cloudName);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        {
          method: "POST",
          body: formDataImg,
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error("No se recibió URL de la imagen");
      }
    } catch (error) {
      console.error("Error subiendo a Cloudinary:", error);
      throw error;
    }
  };

  // Función para seleccionar imagen
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Toast.show({
          type: "appError",
          text1: "Permiso denegado",
          text2: "Se necesita permiso para acceder a la galería",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUrl = await uploadImageToCloudinary(result.assets[0].uri);
        setFormData((prev) => ({ ...prev, fotoPerfil: imageUrl }));
        Toast.show({
          type: "appSuccess",
          text1: "Éxito",
          text2: "Imagen cargada correctamente",
        });
      }
    } catch (error) {
      console.error("Error seleccionando imagen:", error);
      Toast.show({
        type: "appError",
        text1: "Error",
        text2: "No se pudo cargar la imagen",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Función para tomar foto
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Toast.show({
          type: "appError",
          text1: "Permiso denegado",
          text2: "Se necesita permiso para acceder a la cámara",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUrl = await uploadImageToCloudinary(result.assets[0].uri);
        setFormData((prev) => ({ ...prev, fotoPerfil: imageUrl }));
       Toast.show({
          type: "appSuccess",
          text1: "Éxito",
          text2: "Foto tomada correctamente",
        });
      }
    } catch (error) {
      console.error("Error tomando foto:", error);
      Toast.show({
        type: "appError",
        text1: "Error",
        text2: "No se pudo tomar la foto",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Mostrar opciones para foto
  const handleAddPhoto = () => {
    Alert.alert(
      "Agregar foto de perfil",
      "Selecciona una opción",
      [
        {
          text: "Tomar foto",
          onPress: takePhoto,
        },
        {
          text: "Elegir de galería",
          onPress: pickImage,
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

// Validar formulario
const validateForm = () => {
  if (!formData.primerNombre.trim()) {
    Toast.show({
      type: "appError",
      text1: "Falta información",
      text2: "El primer nombre es obligatorio.",
    });
    return false;
  }
  if (!formData.primerApellido.trim()) {
    Toast.show({
      type: "appError",
      text1: "Falta información",
      text2: "El primer apellido es obligatorio.",
    });
    return false;
  }
  if (!formData.email.trim()) {
    Toast.show({
      type: "appError",
      text1: "Falta información",
      text2: "El correo electrónico es obligatorio.",
    });
    return false;
  } 
  if (!/\S+@\S+\.\S+/.test(formData.email)) {
    Toast.show({
      type: "appError",
      text1: "Correo inválido",
      text2: "Ingresa un correo electrónico válido.",
    });
    return false;
  }
  if (isAdmin && !formData.IDSucursal) {
    Toast.show({
      type: "appError",
      text1: "Falta información",
      text2: "Debe seleccionar una sucursal.",
    });
    return false;
  }
  return true;
};


  // Registrar usuario
  const handleRegister = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    const {
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      email,
      numTel,
      fotoPerfil,
      estado,
    } = formData;

    const sucursalId = isGestor
      ? extractSucursalId(profile?.IDSucursal)
      : extractSucursalId(formData?.IDSucursal);

    if (!sucursalId) {
      Toast.show({
        type: "appError",
        text1: "Error",
        text2: "No se pudo determinar la sucursal.",
      });
      setLoading(false);
      return;
    }

    const emailLimpio = email.trim().toLowerCase();

    // 1) Crear usuario en Auth secundaria
    const cred = await createUserWithoutSignOut(emailLimpio, TEMP_PASSWORD);

    // 2) Escribir/actualizar Firestore
    await setDoc(doc(db, "USUARIO", cred.user.uid), {
      primerNombre: primerNombre.trim(),
      segundoNombre: segundoNombre.trim(),
      primerApellido: primerApellido.trim(),
      segundoApellido: segundoApellido.trim(),
      email: emailLimpio,
      numTel: (numTel || "").trim(),
      fotoPerfil: fotoPerfil || "",
      rol: (isAdmin ? (formData.rol || "Tecnico") : "Tecnico"),
      IDSucursal: doc(db, "SUCURSAL", sucursalId),
      estado,
      modoOscuro: false,
      fechaRegistro: serverTimestamp(),
      mustChangePassword: true,
    });

    // 3) Cleanup: cerrar sesión SOLO del Auth secundario
    try { await signOut(getSecondaryAuth()); } catch (_) {}

    // 4) Reset + navegación + Toast
    setFormData(prev => ({
      primerNombre: "",
      segundoNombre: "",
      primerApellido: "",
      segundoApellido: "",
      email: "",
      numTel: "",
      fotoPerfil: "",
      rol: "Tecnico",
      IDSucursal: isGestor ? prev.IDSucursal : null,
      sucursalNombre: isGestor ? prev.sucursalNombre : "",
      estado: "Activo",
      modoOscuro: false,
    }));

    if (navigation?.goBack) navigation.goBack();

    Toast.show({
      type: "appSuccess",
      text1: "Usuario registrado",
      text2: "Contraseña temporal: 123456",
    });

  } catch (error) {
    // Backfill: si el email ya existía en Auth pero faltó Firestore
    if (error.code === "auth/email-already-in-use") {
      try {
        const emailLimpio = formData.email.trim().toLowerCase();
        const secondaryAuth = getSecondaryAuth();
        const signed = await signInWithEmailAndPassword(secondaryAuth, emailLimpio, TEMP_PASSWORD);
        const uid = signed.user.uid;

        await setDoc(doc(db, "USUARIO", uid), {
          primerNombre: formData.primerNombre.trim(),
          segundoNombre: formData.segundoNombre.trim(),
          primerApellido: formData.primerApellido.trim(),
          segundoApellido: formData.segundoApellido.trim(),
          email: emailLimpio,
          numTel: (formData.numTel || "").trim(),
          fotoPerfil: formData.fotoPerfil || "",
          rol: (isAdmin ? (formData.rol || "Tecnico") : "Tecnico"),
          IDSucursal: doc(db, "SUCURSAL", extractSucursalId(isGestor ? profile?.IDSucursal : formData?.IDSucursal)),
          estado: formData.estado,
          modoOscuro: false,
          fechaRegistro: serverTimestamp(),
          mustChangePassword: true,
        }, { merge: true });

        try { await signOut(secondaryAuth); } catch (_) {}

        Toast.show({
          type: "appSuccess",
          text1: "Usuario ya existía",
          text2: "Perfil completado en la base de datos.",
        });

        if (navigation?.goBack) navigation.goBack();
        return;
      } catch (repairErr) {
        console.error("Repair flow failed:", repairErr);
      }
    }

    console.error("Error registrando usuario:", error);
    const errorMessage =
      error.code === "auth/invalid-email" ? "El email no es válido" :
      error.code === "auth/email-already-in-use" ? "El email ya está en uso" :
      "No se pudo registrar el usuario";

    Toast.show({
      type: "appError",
      text1: "Error al registrar",
      text2: errorMessage,
    });
  } finally {
    setLoading(false);
  }
};


  if (loadingSucursales) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#87aef0", "#9c8fc4"]}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          height: 155,
        }}
      >
        <View style={{ paddingTop: 40, paddingLeft: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={24} color={profile.modoOscuro === true ? "black" : "#FFFF"} />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              color: profile.modoOscuro ? "#ffffffff" : "white",
              fontSize: 26,
              fontWeight: "900",
              marginTop: 5,
              paddingLeft: 10,
            }}
          >
            Registrar Usuario
          </Text>
        </View>
      </LinearGradient>
      <View style={profile.modoOscuro === true ? styles.containerOscuro : styles.containerClaro}>
        <ScrollView style={{ paddingHorizontal: 15, borderTopRightRadius: 35, borderTopLeftRadius: 35, paddingBottom: 0 }} nestedScrollEnabled={true}>
          {/* Foto de perfil */}
          <View style={{marginTop: 20}}>
            <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Datos personales</Text>
            <View style={styles.photoContainer}>
              <View style={styles.photoWrapper}>
                {formData.fotoPerfil ? (
                  <Image source={{ uri: formData.fotoPerfil }} style={styles.profilePhoto} />
                ) : (
                  <View style={[styles.profilePhoto, styles.photoPlaceholder]}>
                    <AntDesign name="user" size={60} color="#999" />
                  </View>
                )}

                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
                disabled={uploadingImage}
              >
                <Ionicons name="camera" size={20} color="#007AFF" />
                <Text style={styles.addPhotoText}>
                  {formData.fotoPerfil ? "Cambiar foto" : "Agregar foto"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Formulario */}
          <View>
              <View style={styles.fieldContainer}>
                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Primer Nombre *</Text>
                <TextInput
                  style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                  value={formData.primerNombre}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, primerNombre: text }))}
                  placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                  placeholder="Ingrese primer nombre"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Segundo Nombre</Text>
                <TextInput
                  style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                  value={formData.segundoNombre}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, segundoNombre: text }))}
                  placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                  placeholder="Ingrese segundo nombre"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Primer Apellido *</Text>
                <TextInput
                  style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                  value={formData.primerApellido}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, primerApellido: text }))}
                  placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                  placeholder="Ingrese primer apellido"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Segundo Apellido</Text>
                <TextInput
                  style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                  value={formData.segundoApellido}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, segundoApellido: text }))}
                  placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                  placeholder="Ingrese segundo apellido"
                />
              </View>

              

            <View style={{ marginTop: 20 }}>
              <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Datos de contacto</Text>
              <View style={styles.fieldContainer}>
                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Email *</Text>
                <TextInput
                  style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                  value={formData.email}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                  placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                  placeholder="ejemplo@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Teléfono</Text>
                <TextInput
                  style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                  value={formData.numTel}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, numTel: text }))}
                  placeholderTextColor={profile.modoOscuro ? "#D1D1D1" : "black"}
                  placeholder="663-123-4567"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <Text style={[styles.titulo, { color: profile.modoOscuro === true ? "white" : 'black' }]}>Información del sistema</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={styles.fieldContainer}>
                <Text style={profile.modoOscuro ? styles.labelOscuro : styles.labelClaro}>Rol *</Text>

                {isAdmin ? (
                  // 🧭 ADMIN puede abrir modal y elegir rol
                  <TouchableOpacity
                    style={profile.modoOscuro ? styles.inputOscuro : styles.inputClaro}
                    onPress={() => setShowRolModal(true)}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={profile.modoOscuro ? styles.selectButtonTextOscuro : styles.selectButtonTextClaro}>
                        {formData.rol || "Seleccione un rol"}
                      </Text>
                      <Feather name="chevron-down" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  // 🧩 GESTOR solo lo ve (sin modal)
                  <View style={profile.modoOscuro ? styles.inputOscuro : styles.inputClaro}>
                    <Text style={profile.modoOscuro ? styles.selectButtonTextOscuro : styles.selectButtonTextClaro}>
                      {formData.rol}
                    </Text>
                  </View>
                )}
              </View>



                <View style={styles.fieldContainer}>
                  <Text style={profile.modoOscuro === true ? styles.labelOscuro : styles.labelClaro}>Estado *</Text>
                  <TouchableOpacity
                    style={profile.modoOscuro === true ? styles.inputOscuro : styles.inputClaro}
                    onPress={() => setShowEstadoModal(true)}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View>
                        <Text style={profile.modoOscuro === true ? styles.selectButtonTextOscuro : styles.selectButtonTextClaro}>{formData.estado}</Text>
                      </View>
                      <View style={{ marginRight: 10 }}>
                        <Feather name="chevron-down" size={20} color="#666" />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {isAdmin ? (
        <View style={styles.fieldContainer}>
          <Text style={profile.modoOscuro ? styles.labelOscuro : styles.labelClaro}>Sucursal *</Text>
          <TouchableOpacity
            style={profile.modoOscuro ? styles.inputOscuro : styles.inputClaro}
            onPress={() => setShowSucursalModal(true)}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={profile.modoOscuro ? styles.selectButtonTextOscuro : styles.selectButtonTextClaro}>
                  {formData.sucursalNombre || "Seleccione una sucursal"}
                </Text>
              </View>
              <View style={{ marginRight: 10 }}>
                <Feather name="chevron-down" size={20} color="#666" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        // Gestor: sólo lectura (sin modal)
        <View style={styles.fieldContainer}>
          <Text style={profile.modoOscuro ? styles.labelOscuro : styles.labelClaro}>Sucursal *</Text>
          <View style={profile.modoOscuro ? styles.inputOscuro : styles.inputClaro}>
            <Text style={profile.modoOscuro ? styles.selectButtonTextOscuro : styles.selectButtonTextClaro}>
              {formData.sucursalNombre || "Cargando sucursal..."}
            </Text>
          </View>
        </View>
      )}

          </View>

          {/* Botón de registro */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={profile.modoOscuro ? "#FFF" : "black"} />
            ) : (
              <>
                <Feather name="user-plus" size={20} color="#fff" />
                <Text style={profile.modoOscuro === true ? { color: "white", fontWeight: 800, fontSize: 20, marginLeft: 8 } : { color: 'white', fontWeight: 800, fontSize: 20, marginLeft: 8 }}>Registrar Usuario</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />

          {/* Modal para seleccionar Rol (solo Admin) */}
      {isAdmin && (
        <Modal
          visible={showRolModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRolModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar Rol</Text>

              {roles.map((rol) => (
                <TouchableOpacity
                  key={rol}
                  style={styles.modalOption}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, rol }));
                    setShowRolModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{rol}</Text>
                  {formData.rol === rol && (
                    <Feather name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRolModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

          

          {/* Modal para seleccionar Sucursal */}
          <Modal
            visible={showSucursalModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowSucursalModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Seleccionar Sucursal</Text>
                <ScrollView style={styles.modalScroll}>
                  {sucursales.map((sucursal) => (
                    <TouchableOpacity
                      key={sucursal.id}
                      style={styles.modalOption}
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          IDSucursal: sucursal.id,
                          sucursalNombre: sucursal.nombre || sucursal.id,
                        }));
                        setShowSucursalModal(false);
                      }}
                    >
                      <Text style={styles.modalOptionText}>
                        {sucursal.nombre || sucursal.id}
                      </Text>
                      {formData.IDSucursal === sucursal.id && (
                        <Feather name="check" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowSucursalModal(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal para seleccionar Estado */}
          <Modal
            visible={showEstadoModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEstadoModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Seleccionar Estado</Text>
                {estados.map((estado) => (
                  <TouchableOpacity
                    key={estado}
                    style={styles.modalOption}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, estado }));
                      setShowEstadoModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{estado}</Text>
                    {formData.estado === estado && (
                      <Feather name="check" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowEstadoModal(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  containerClaro: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 35,
    borderTopLeftRadius: 35,
    marginTop: -30,
    paddingBottom: 0,
    marginBottom: 0,
  },
  containerOscuro: {
    flex: 1,
    backgroundColor: "#2C2C2C",
    borderTopRightRadius: 35,
    borderTopLeftRadius: 35,
    marginTop: -30,
    paddingBottom: 0,
    marginBottom: 0,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  photoContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  photoWrapper: {
    position: "relative",
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e0e0e0",
  },
  photoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  addPhotoText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
  },
  titulo: {
    fontSize: 18,
    fontWeight: 700,
  },
  fieldContainer: {
    marginTop: 10,
    flex: 1,
  },
  labelClaro: {
    position: "absolute",
    left: 10,
    backgroundColor: "white",
    padding: 4,
    backgroundColor: "white",
    zIndex: 200,
    fontWeight: 700,
    color: "#898C91",
    fontSize: 16
  },
  labelOscuro: {
    position: "absolute",
    left: 10,
    backgroundColor: "white",
    padding: 4,
    backgroundColor: "#2C2C2C",
    zIndex: 200,
    fontWeight: 700,
    color: "#b4b8c0ff",
    fontSize: 16
  },
  inputClaro: {
    color: "black",
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 8,
    paddingLeft: 12,
    height: 60,
    justifyContent: "center",
    fontSize: 16
  },
  inputOscuro: {
    color: "white",
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 8,
    paddingLeft: 12,
    height: 60,
    justifyContent: "center",
    fontSize: 16,
    backgroundColor: "#2C2C2C",
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  selectButtonTextOscuro: {
    fontSize: 16,
    color: "#D1D1D1" ,
  },
  selectButtonTextClaro: {
    fontSize: 16,
    color: "black",
  },
  registerButton: {
    flexDirection: "row",
    backgroundColor: "#3D67CD",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
});

export default RegistrarUsuariosGestor;