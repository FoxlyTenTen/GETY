import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

const RECENT_SCANS = [
    { id: '1', image: require('../../assets/images/leaf.jpeg'), name: 'Monstera', status: 'Healthy', pct: '98%', color: '#2eb86a', icon: 'checkmark-circle' },
    { id: '2', image: require('../../assets/images/leaf.jpeg'), name: 'Golden Pothos', status: 'Under-watered', pct: '92%', color: '#f59e0b', icon: 'warning' },
    { id: '3', image: require('../../assets/images/leaf.jpeg'), name: 'Fiddle Leaf', status: 'Healthy', pct: '95%', color: '#2eb86a', icon: 'checkmark-circle' },
];

export default function Recent() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Recent Scans</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                    <Text style={styles.viewAll}>View History</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {RECENT_SCANS.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.9}>
                        <View style={styles.imageWrapper}>
                            <Image source={item.image} style={styles.plantImage} resizeMode="cover" />
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceText}>{item.pct}</Text>
                            </View>
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.plantName}>{item.name}</Text>
                            <View style={styles.statusRow}>
                                <Ionicons name={item.icon as any} size={14} color={item.color} />
                                <Text style={[styles.statusText, { color: item.color }]}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    viewAll: {
        fontSize: 14,
        color: '#2eb86a',
        fontWeight: '700',
    },
    scrollContent: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    card: {
        width: 180,
        backgroundColor: '#fff',
        borderRadius: 24,
        marginRight: 16,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    imageWrapper: {
        width: '100%',
        height: 140,
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
    },
    plantImage: {
        width: '100%',
        height: '100%',
    },
    confidenceBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(46, 184, 106, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    confidenceText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    cardInfo: {
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    plantName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
});