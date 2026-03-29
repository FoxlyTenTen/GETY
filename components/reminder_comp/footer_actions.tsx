import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function FooterActions() {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.bulkBtn}>
                <Ionicons name="checkmark-done-outline" size={20} color="#111827" />
                <Text style={styles.bulkText}>Mark All as Completed</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    bulkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderRadius: 30,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        flex: 1,
        marginRight: 16,
    },
    bulkText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#064e3b',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#064e3b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 6,
    },
});
