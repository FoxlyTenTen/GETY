import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

export default function Scan() {
    const handleScan = () => {
        router.push('/pages/scanpage');
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Image Section */}
                <View style={styles.imageWrapper}>
                    <Image
                        source={require('../../assets/images/leaf.jpeg')}
                        style={styles.leafImage}
                        resizeMode="cover"
                    />
                    <View style={styles.scanBadge}>
                        <Ionicons name="scan" size={28} color="#fff" />
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.content}>
                    <Text style={styles.title}>Scan Leaf</Text>
                    <Text style={styles.description}>
                        Identify pests and diseases instantly with AI-powered diagnostics. Keep your plants thriving.
                    </Text>

                    <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={handleScan}>
                        <Text style={styles.buttonText}>Start Scan</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 4,
    },
    imageWrapper: {
        height: 180,
        width: '100%',
        position: 'relative',
    },
    leafImage: {
        width: '100%',
        height: '100%',
    },
    scanBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(46, 184, 106, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -32,
        marginLeft: -32,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 22,
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#2eb86a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 18,
        gap: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});