import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const HEAL_TASKS = [
    {
        id: '1',
        title: 'Spider Mites Detected',
        subtitle: 'Your Fiddle Leaf Fig needs treatment.',
        icon: 'virus-outline',
        iconBg: '#fee2e2',
        iconColor: '#ef4444',
        progress: 0.6,
        progressColor: '#ef4444',
        actionIcon: 'medical-bag',
    },
    {
        id: '2',
        title: 'Thirsty Aloe Vera',
        subtitle: 'Soil moisture is critically low (12%).',
        icon: 'water-outline',
        iconBg: '#e0f2fe',
        iconColor: '#0ea5e9',
        button: 'WATER NOW',
    },
];

export default function Heal() {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Heal your Plants</Text>
            
            {HEAL_TASKS.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                    <View style={[styles.iconWrapper, { backgroundColor: task.iconBg }]}>
                        {task.icon.includes('virus') ? (
                            <MaterialCommunityIcons name={task.icon as any} size={24} color={task.iconColor} />
                        ) : (
                            <Ionicons name={task.icon as any} size={24} color={task.iconColor} />
                        )}
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
                        
                        {task.progress && (
                            <View style={styles.progressContainer}>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${task.progress * 100}%`, backgroundColor: task.progressColor }]} />
                                </View>
                            </View>
                        )}
                    </View>

                    {task.button ? (
                        <TouchableOpacity style={styles.actionBtn}>
                            <Text style={styles.btnText}>{task.button}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.iconBtn}>
                            <MaterialCommunityIcons name={task.actionIcon as any} size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 16,
    },
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 1,
    },
    iconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 16,
        marginRight: 8,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    taskSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 8,
    },
    progressContainer: {
        width: '100%',
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#f3f4f6',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    actionBtn: {
        backgroundColor: '#2eb86a',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    btnText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2eb86a',
        alignItems: 'center',
        justifyContent: 'center',
    },
});