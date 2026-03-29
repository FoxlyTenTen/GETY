import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function MilestoneSegments() {
    return (
        <View style={styles.container}>
            <View style={styles.segmentWrapper}>
                <TouchableOpacity style={[styles.segmentBtn, styles.activeBtn]}>
                    <Text style={[styles.segmentText, styles.activeText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.segmentBtn}>
                    <Text style={styles.segmentText}>Completed</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.segmentBtn}>
                    <Text style={styles.segmentText}>Ongoing</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    segmentWrapper: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 24,
        padding: 5,
        justifyContent: 'space-between',
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    activeBtn: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '700',
    },
    activeText: {
        color: '#166534',
    },
});
