import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';

export default function ProfileSection() {
    return (
        <View style={styles.container}>
            <View style={styles.userInfo}>
                <Image 
                    source={require('../../assets/images/profile.avif')} 
                    style={styles.profileImage} 
                />
                <View style={styles.textContainer}>
                    <Text style={styles.welcomeText}>WELCOME BACK</Text>
                    <Text style={styles.userName}>Good morning, Adli!</Text>
                </View>
            </View>
            
            <TouchableOpacity style={styles.notificationBtn}>
                <Ionicons name="notifications" size={24} color="#1f2937" />
                <View style={styles.badge} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: 'transparent',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileImage: {
        height: 52,
        width: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#fff',
    },
    textContainer: {
        justifyContent: 'center',
    },
    welcomeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    notificationBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2eb86a',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
});