import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRef, useState, useEffect } from "react";
import {
  Button,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { AntDesign } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import { FontAwesome6 } from "@expo/vector-icons";
import SignatureScreen from "react-native-signature-canvas";
import * as FileSystem from "expo-file-system";
import ViewShot from "react-native-view-shot"; // Pour capturer une vue
import fetch from 'cross-fetch';
import React from 'react';




// URL de votre backend (à adapter)
const API_BASE_URL = "http://10.13.1.39:3000";

export default function App() {
  // Gestion d'Expo Camera
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef(null);
  const [uri, setUri] = useState(null);
  const [mode, setMode] = useState("picture");
  const [facing, setFacing] = useState("back");
  const [recording, setRecording] = useState(false);

  // États métier et interface
  const [showModeDialog, setShowModeDialog] = useState(true);
  // photoType peut être "reception" ou "avant_fonte"
  const [photoType, setPhotoType] = useState(null);
  const [fondeurName, setFondeurName] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [lotInfo, setLotInfo] = useState(null);
  const [requireSignature, setRequireSignature] = useState(false);
  const [showLotInput, setShowLotInput] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [finalUri, setFinalUri] = useState(null);
  const [finalFileName, setFinalFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Pour capturer la vue composite finale (texte + photo, ou texte + signature + photo)
  const viewShotRef = useRef(null);
  const [compositeUri, setCompositeUri] = useState(null);

  useEffect(() => {
    if (!showModeDialog && !lotInfo) {
      setShowLotInput(true);
    }
  }, [showModeDialog, lotInfo]);

  // Dès qu'on a finalUri et qu'on doit composer l'image, on capture la vue composite
  useEffect(() => {
    if (finalUri && viewShotRef.current && !compositeUri) {
      setTimeout(() => {
        viewShotRef.current
          .capture()
          .then((uriCaptured) => {
            setCompositeUri(uriCaptured);
            // Upload de l'image composite à la GED, puis fin du chargement
            uploadPhotoToGed(uriCaptured, finalFileName).then(() =>
              setIsUploading(false)
            );
          })
          .catch((err) => {
            console.error("Erreur capture composite", err);
            setIsUploading(false);
          });
      }, 500);
    }
  }, [finalUri, compositeUri, finalFileName]);

  if (!permission) {
    return null;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          Besoin des permissions système
        </Text>
        <Button onPress={requestPermission} title="Demande de permission" />
      </View>
    );
  }

  // --- API CALLS ---
  const fetchLotInfo = async (code) => {
    console.log("📡 Envoi de la requête à :", `${API_BASE_URL}/api/lotinfo`);
    console.log("📩 Body envoyé :", JSON.stringify({ lotCode: code }));
  
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotinfo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotCode: code }),
      });
  
      console.log("📥 Statut de la réponse :", response.status);
  
      if (!response.ok) {
        const errorText = await response.text();
        console.log("⚠️ Erreur API :", errorText);
        throw new Error("Lot introuvable ou erreur");
      }
  
      const data = await response.json();
      console.log("✅ Réponse API reçue :", data);
      return data;
    } catch (err) {
      console.error("🚨 Erreur lors de la requête :", err);
      Alert.alert("Erreur", err.message);
      return null;
    }
  };


  const updateNbapel = async (lot_complet) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/update-nbapel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lot_complet }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de NBAPEL");
      }
      const data = await response.json();
      console.log("Update NBAPEL :", data);
    } catch (err) {
      Alert.alert("Erreur", err.message);
    }
  };

  const uploadPhotoToGed = async (fileUri: string, finalName: string) => {
    console.log("📡 Envoi de la requête à :", `${API_BASE_URL}/upload-to-ged`);
    console.log("📩 Fichier envoyé :", finalName, "📁", fileUri);
  
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: finalName,
      type: "image/png",
    });
  
    try {
      const response = await fetch(`${API_BASE_URL}/upload-to-ged`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
  
      console.log("📥 Statut de la réponse :", response.status);
  
      const result = await response.text();
      console.log("✅ Réponse API reçue :", result);
  
      if (!response.ok) {
        Alert.alert(
          "Erreur API GED",
          `Statut : ${response.status}\nRéponse : ${result}`
        );
        throw new Error(`Erreur API GED : ${result}`);
      }
  
    } catch (err) {
      console.error("🚨 Erreur lors de l'upload :", err);
      Alert.alert("Erreur", `Problème GED : ${err.message}`);
    }
  };
  
  
  

  // --- Capture et Traitement de la Photo ---
  const takePicture = async () => {
    const photo = await ref.current?.takePictureAsync();
    setUri(photo?.uri);
    if (photoType === "reception" && requireSignature) {
      setShowSignaturePad(true);
    } else {
      processFinalPhoto(photo.uri, null);
    }
  };

  // Pour le nom final, pour "avant_fonte" on ajoute _avantfonte.png,
  // sinon _signe.png si signature est présente ou _photo.png par défaut.
  const processFinalPhoto = async (photoUri, signature) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR").replace(/\//g, "_");
    const timeStr = now.toLocaleTimeString("fr-FR").replace(/:/g, "h").replace(" ", "");
    const baseFileName = `${lotInfo.nucli}_${lotInfo.lot_complet}_${dateStr}_${timeStr}`;
    let finalName = "";
    if (photoType === "avant_fonte") {
      finalName = `${baseFileName}_avantfonte.png`;
    } else {
      finalName = requireSignature ? `${baseFileName}_signe.png` : `${baseFileName}_photo.png`;
    }
    setFinalFileName(finalName);
    const finalPath = FileSystem.documentDirectory + finalName;
    try {
      await FileSystem.moveAsync({ from: photoUri, to: finalPath });
      setFinalUri(finalPath);
      Alert.alert("Succès", `Photo enregistrée : ${finalName}`);
      if (photoType === "reception" && requireSignature) {
        await updateNbapel(lotInfo.lot_complet);
      }
      setIsUploading(true);
      // Pour réception avec signature et pour avant fonte, on attend la capture composite
      if (!requireSignature && photoType !== "avant_fonte") {
        // Cas de réception sans signature
        await uploadPhotoToGed(finalPath, finalName);
        setIsUploading(false);
      }
    } catch (err) {
      Alert.alert("Erreur", "Problème lors de l'enregistrement de la photo finale");
      setIsUploading(false);
    }
  };

  const handleSignature = (signature) => {
    if (signature && !signature.startsWith("data:")) {
      signature = "data:image/png;base64," + signature;
    }
    setSignatureData(signature);
    setShowSignaturePad(false);
    processFinalPhoto(uri, signature);
  };

  // --- Interfaces Modales ---
  const renderUploadingPopup = () => (
    <Modal visible={isUploading} transparent animationType="fade">
      <View style={styles.uploadingContainer}>
        <View style={styles.uploadingContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.uploadingText}>
            Veuillez patienter, enregistrement de la photo...
          </Text>
        </View>
      </View>
    </Modal>
  );

  const renderModeDialog = () => (
    <Modal visible={showModeDialog} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choix du type de photo</Text>
          <View style={styles.buttonRow}>
            <Button
              title="Réception du lot"
              onPress={() => {
                setPhotoType("reception");
                setShowModeDialog(false);
                setShowLotInput(true);
              }}
            />
            <Button
              title="Avant fonte"
              onPress={() => {
                setPhotoType("avant_fonte");
                setShowModeDialog(false);
                setShowLotInput(true);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Fenêtre de saisie du code de lot
  // Pour "Avant fonte", on affiche en plus un champ pour le nom du fondeur
  const renderLotInput = () => (
    <Modal visible={showLotInput} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Saisissez le code de lot</Text>
          <TextInput
            style={styles.input}
            placeholder="Code de lot"
            value={lotCode}
            onChangeText={setLotCode}
            keyboardType="numeric"
          />
          {photoType === "avant_fonte" && (
            <TextInput
              style={styles.input}
              placeholder="Nom du fondeur"
              value={fondeurName}
              onChangeText={setFondeurName}
            />
          )}
          <Button
            title="Valider"
            onPress={async () => {
              if (!lotCode) {
                Alert.alert("Attention", "Veuillez saisir un code de lot.");
                return;
              }
              if (photoType === "avant_fonte" && !fondeurName.trim()) {
                Alert.alert("Attention", "Veuillez saisir le nom du fondeur.");
                return;
              }
              const info = await fetchLotInfo(lotCode);
              if (!info) return;
              setLotInfo(info);
              if (photoType === "reception") {
                setRequireSignature(info.nbapel === 0);
              } else if (photoType === "avant_fonte") {
                setRequireSignature(false);
              }
              setShowLotInput(false);
            }}
          />
        </View>
      </View>
    </Modal>
  );

  const renderSignaturePad = () => (
    <Modal visible={showSignaturePad} animationType="slide">
      <SignatureScreen
        onOK={handleSignature}
        onEmpty={() => Alert.alert("Signature vide", "Veuillez signer pour valider.")}
        descriptionText="Signez pour valider la photo"
        clearText="Effacer"
        confirmText="Valider"
        webStyle={`
          .m-signature-pad--footer { display: flex; justify-content: space-around; margin: 10px; }
          .m-signature-pad { box-shadow: none; border: none; }
          body, html { margin: 0; padding: 0; }
        `}
      />
    </Modal>
  );

  const resetCapture = () => {
    setUri(null);
    setFinalUri(null);
    setCompositeUri(null);
    setSignatureData(null);
    setLotInfo(null);
    setLotCode("");
    setPhotoType(null);
    setFondeurName("");
    setShowModeDialog(true);
  };

  // Rendu final
  const renderFinalPicture = () => {
    if (photoType === "avant_fonte") {
      return (
        <View style={styles.container}>
          <Text style={{ marginBottom: 10 }}>Photo Finale</Text>
          <ViewShot
            ref={viewShotRef}
            options={{ format: "png", quality: 1 }}
            style={styles.compositeContainer}
          >
            <View style={styles.leftPanel}>
              <Text style={styles.compositeText}>
                {`Fondeur : ${fondeurName}`}
              </Text>
            </View>
            <View style={styles.rightPanel}>
              <Image
                source={{ uri: finalUri }}
                style={styles.photoImage}
                resizeMode="contain"
              />
            </View>
          </ViewShot>
          {compositeUri ? (
            <Text style={{ marginVertical: 10 }}>
              Image envoyée ! Merci !
            </Text>
          ) : (
            <ActivityIndicator size="large" />
          )}
          <Button title="Faire une nouvelle réception" onPress={resetCapture} />
        </View>
      );
    } else if (photoType === "reception" && requireSignature) {
      return (
        <View style={styles.container}>
          <Text style={{ marginBottom: 10 }}>Photo Finale Composée</Text>
          <ViewShot
            ref={viewShotRef}
            options={{ format: "png", quality: 1 }}
            style={styles.compositeContainer}
          >
            <View style={styles.leftPanel}>
              <Text style={styles.compositeText}>
                {`client ${lotInfo?.nucli}\nlot ${lotInfo?.lot_complet}\n${lotInfo?.usrre}\nremis par ${lotInfo?.nomre}\ndate ${new Date().toLocaleString()}`}
              </Text>
              {signatureData && (
                <Image
                  source={{
                    uri: signatureData.startsWith("data:")
                      ? signatureData
                      : "data:image/png;base64," + signatureData,
                  }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={styles.rightPanel}>
              <Image
                source={{ uri: finalUri }}
                style={styles.photoImage}
                resizeMode="contain"
              />
            </View>
          </ViewShot>
          {compositeUri ? (
            <Text style={{ marginVertical: 10 }}>
              Image composée et envoyée ! 
            </Text>
          ) : (
            <ActivityIndicator size="large" />
          )}
          <Button title="Faire une nouvelle réception" onPress={resetCapture} />
        </View>
      );
    } else {
      return (
        <View style={styles.container}>
          <Text style={{ marginBottom: 10 }}>Photo Finale</Text>
          <Image
            source={{ uri: finalUri }}
            style={{ width: 300, aspectRatio: 1 }}
            resizeMode="contain"
          />
          <Text style={{ marginVertical: 10 }}>Nom du fichier : {finalFileName}</Text>
          <Button title="Faire une nouvelle réception" onPress={resetCapture} />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {showModeDialog && renderModeDialog()}
      {showLotInput && renderLotInput()}
      {finalUri ? (
        renderFinalPicture()
      ) : uri ? (
        <View style={styles.container}>
          <Image
            source={{ uri }}
            style={{ width: 300, aspectRatio: 1 }}
            resizeMode="contain"
          />
          <Button onPress={() => setUri(null)} title="Prendre une nouvelle photo" />
        </View>
      ) : (
        <CameraView
          style={styles.camera}
          ref={ref}
          mode={mode}
          facing={facing}
          mute={false}
          responsiveOrientationWhenOrientationLocked
        >
          <View style={styles.shutterContainer}>
            <Pressable onPress={() => setMode((prev) => (prev === "picture" ? "video" : "picture"))}>
              {mode === "picture" ? (
                <AntDesign name="picture" size={32} color="white" />
              ) : (
                <Feather name="video" size={32} color="white" />
              )}
            </Pressable>
            <Pressable
              onPress={
                mode === "picture"
                  ? takePicture
                  : async () => {
                      if (recording) {
                        setRecording(false);
                        ref.current?.stopRecording();
                      } else {
                        setRecording(true);
                        const video = await ref.current?.recordAsync();
                        console.log({ video });
                      }
                    }
              }
            >
              {({ pressed }) => (
                <View style={[styles.shutterBtn, { opacity: pressed ? 0.5 : 1 }]}>
                  <View
                    style={[
                      styles.shutterBtnInner,
                      { backgroundColor: mode === "picture" ? "white" : "red" },
                    ]}
                  />
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => setFacing((prev) => (prev === "back" ? "front" : "back"))}>
              <FontAwesome6 name="rotate-left" size={32} color="white" />
            </Pressable>
          </View>
        </CameraView>
      )}
      {showSignaturePad && renderSignaturePad()}
      {isUploading && renderUploadingPopup()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  shutterContainer: {
    position: "absolute",
    bottom: 44,
    left: 0,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 5,
    borderColor: "white",
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  uploadingContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingContent: {
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  uploadingText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 16,
  },
  compositeContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 10,
    marginVertical: 10,
  },
  leftPanel: {
    width: 200,
    paddingRight: 10,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  compositeText: {
    fontSize: 14,
    marginBottom: 10,
  },
  signatureImage: {
    width: 180,
    height: 100,
  },
  rightPanel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  photoImage: {
    width: 300,
    height: 300,
  },
});
