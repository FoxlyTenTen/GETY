import React from 'react';
import { View, TouchableOpacity, StyleSheet, Linking, Text, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
    latitude: number;
    longitude: number;
    label?: string;
};

export default function MapPreview({ latitude, longitude, label = 'Tree Location' }: Props) {
    const openGoogleMaps = () => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    };

    // Static map image from OpenStreetMap — no native module needed
    const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=600x300&markers=${latitude},${longitude},red-pushpin`;

    return (
        <TouchableOpacity style={styles.container} onPress={openGoogleMaps} activeOpacity={0.9}>
            <Image
                source={{ uri: mapUrl }}
                style={styles.mapImage}
                resizeMode="cover"
            />
            <View style={styles.tapHint}>
                <Ionicons name="navigate" size={13} color="#fff" />
                <Text style={styles.tapHintText}>Tap to open in Google Maps</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%', height: 180, borderRadius: 16,
        overflow: 'hidden', marginBottom: 12,
        backgroundColor: '#e5e7eb',
    },
    mapImage: { width: '100%', height: '100%' },
    tapHint: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.50)', paddingVertical: 7,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
    },
    tapHintText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
