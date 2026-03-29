import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width, height } = Dimensions.get('window');

const tips = [
  {
    id: 1,
    icon: 'sunny-outline' as const,
    title: 'Good Lighting',
    description: 'Ensure the leaf is well-lit for clarity',
  },
  {
    id: 2,
    icon: 'scan-outline' as const,
    title: 'Fill Frame',
    description: 'Get close enough to see vein details',
  },
  {
    id: 3,
    icon: 'partly-sunny-outline' as const,
    title: 'Avoid Shadows',
    description: 'No harsh shadows obscuring the leaf',
  },
  {
    id: 4,
    icon: 'leaf-outline' as const,
    title: 'Single Leaf',
    description: 'Focus on one leaf at a time for accuracy',
  },
];

export default function ScanPage() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // ── Navigate to analysis with image URI ──────────────────────────────────
  const goToAnalysis = (uri: string) => {
    router.push({ pathname: '/pages/analysis', params: { imageUri: uri } });
  };

  // ── Open device gallery ──────────────────────────────────────────────────
  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow gallery access to upload a photo.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      goToAnalysis(result.assets[0].uri);
    }
  };

  // ── Enable / open camera ─────────────────────────────────────────────────
  const handleEnableCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera Permission',
          'Camera access is required to snap a photo.',
        );
        return;
      }
    }
    setCameraOpen(true);
  };

  // ── Take photo ───────────────────────────────────────────────────────────
  const handleSnap = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      setCameraOpen(false);
      if (photo?.uri) goToAnalysis(photo.uri);
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1e5b43" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="leaf" size={18} color="#1e5b43" />
          <Text style={styles.headerTitle}>Scan Leaf</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner ── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Scan Your Leaf</Text>
            <Text style={styles.heroSubtitle}>
              Point your camera at an infected leaf or upload a photo for instant AI diagnosis.
            </Text>
          </View>
          <View style={styles.heroIconBox}>
            <Ionicons name="leaf" size={40} color="#a8e6cf" />
          </View>
        </View>

        {/* ── Viewfinder Card ── */}
        <View style={styles.viewfinderCard}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />

          <View style={styles.cameraIconCircle}>
            <Ionicons name="camera" size={36} color="#1e5b43" />
          </View>
          <Text style={styles.viewfinderHint}>Tap below to start scanning</Text>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.snapButton}
              activeOpacity={0.85}
              onPress={handleEnableCamera}
            >
              <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.snapButtonText}>Snap Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryButton}
              activeOpacity={0.85}
              onPress={handleGallery}
            >
              <MaterialCommunityIcons
                name="image-multiple-outline"
                size={20}
                color="#1e5b43"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.galleryButtonText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tips ── */}
        <Text style={styles.tipsHeader}>Tips for Best Results</Text>
        <View style={styles.tipsContainer}>
          {tips.map((tip) => (
            <View key={tip.id} style={styles.tipCard}>
              <View style={styles.tipIconCircle}>
                <Ionicons name={tip.icon} size={20} color="#1e5b43" />
              </View>
              <View style={styles.tipTextWrapper}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Camera Modal ── */}
      <Modal visible={cameraOpen} animationType="slide" statusBarTranslucent>
        <View style={styles.cameraContainer}>
          {/* Camera fills entire container */}
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

          {/* Overlay corners — absolute positioned, NOT children of CameraView */}
          <View style={styles.cameraOverlay} pointerEvents="none">
            <View style={[styles.camCorner, styles.camTL]} />
            <View style={[styles.camCorner, styles.camTR]} />
            <View style={[styles.camCorner, styles.camBL]} />
            <View style={[styles.camCorner, styles.camBR]} />
          </View>

          {/* Camera Controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.camCloseBtn}
              onPress={() => setCameraOpen(false)}
            >
              <Ionicons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shutterBtn} onPress={handleSnap}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <View style={{ width: 48 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8faf9' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#f8faf9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e9',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e5b43',
  },
  headerSpacer: { width: 38 },

  /* Scroll */
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  /* Hero Banner */
  heroBanner: {
    backgroundColor: '#1e5b43',
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#1e5b43',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  heroTextBlock: { flex: 1, paddingRight: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  heroIconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Viewfinder Card */
  viewfinderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#a8e6cf',
    borderStyle: 'dashed',
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#1e5b43',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 14, left: 14,
    borderRightWidth: 0, borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: 14, right: 14,
    borderLeftWidth: 0, borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: 14, left: 14,
    borderRightWidth: 0, borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: 14, right: 14,
    borderLeftWidth: 0, borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },
  cameraIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#e8f5e9',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  viewfinderHint: {
    fontSize: 13, color: '#9ca3af', fontWeight: '600', marginBottom: 20,
  },
  actionButtonsContainer: {
    width: '100%',
    gap: 12,
  },

  /* Tips */
  tipsHeader: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  tipsContainer: { gap: 12 },
  tipCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, gap: 14,
  },
  tipIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#e8f5e9',
    alignItems: 'center', justifyContent: 'center',
  },
  tipTextWrapper: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  tipDescription: { fontSize: 13, color: '#6b7280', lineHeight: 18 },

  /* Actions */
  snapButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e5b43', borderRadius: 30, paddingVertical: 18,
    shadowColor: '#1e5b43', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
  },
  snapButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: 0.3 },
  galleryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff', borderRadius: 30, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#a8e6cf',
  },
  galleryButtonText: { fontSize: 15, fontWeight: '700', color: '#1e5b43', letterSpacing: 0.2 },

  /* Camera Modal */
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  camCorner: {
    position: 'absolute', width: 40, height: 40,
    borderColor: '#ffffff', borderWidth: 3,
  },
  camTL: {
    top: height * 0.2, left: width * 0.15,
    borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8,
  },
  camTR: {
    top: height * 0.2, right: width * 0.15,
    borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8,
  },
  camBL: {
    bottom: height * 0.25, left: width * 0.15,
    borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8,
  },
  camBR: {
    bottom: height * 0.25, right: width * 0.15,
    borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8,
  },
  cameraControls: {
    position: 'absolute', bottom: 50, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  camCloseBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2eb86a',
  },
});