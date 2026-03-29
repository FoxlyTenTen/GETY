import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

export default function TreatmentProgressHeader() {
    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Treatment Progress</Text>

            <TouchableOpacity style={styles.profileBtn}>
                <Image
                    source={require('../../assets/images/profile.avif')}
                    style={styles.profileImage}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fbfdfb',
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
    profileBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: '#2eb86a' },
    profileImage: { width: '100%', height: '100%' },
});
