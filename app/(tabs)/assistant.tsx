import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppHeader from '@/components/common/AppHeader';

const SUGGESTED = [
    { id: '1', label: 'What is Pestalotiopsis?' },
    { id: '2', label: 'How to apply Mancozeb?' },
    { id: '3', label: 'Best time to spray fungicide' },
    { id: '4', label: 'Signs of leaf recovery' },
];

export default function AssistantScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <AppHeader title="AI Assistant" />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Intro card */}
                <View style={styles.introCard}>
                    <View style={styles.botIconContainer}>
                        <MaterialCommunityIcons name="robot" size={32} color="#fff" />
                    </View>
                    <Text style={styles.introTitle}>Ask me anything</Text>
                    <Text style={styles.introSubtitle}>
                        I can help you understand your scan results, explain diseases, and guide you through the treatment plan.
                    </Text>
                </View>

                {/* Suggested Prompts */}
                <Text style={styles.sectionTitle}>Suggested Questions</Text>
                <View style={styles.suggestedList}>
                    {SUGGESTED.map(item => (
                        <TouchableOpacity key={item.id} style={styles.suggestionChip} activeOpacity={0.7}>
                            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#235e45" />
                            <Text style={styles.suggestionText}>{item.label}</Text>
                            <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Chat Input Bar */}
            <View style={styles.chatBar}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask about your scan or treatment..."
                        placeholderTextColor="#9ca3af"
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} activeOpacity={0.85}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },
    introCard: {
        backgroundColor: '#1e5b43', borderRadius: 32, padding: 28,
        alignItems: 'center', marginBottom: 32,
        shadowColor: '#1e5b43', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5,
    },
    botIconContainer: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    introTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 },
    introSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
    suggestedList: { gap: 12 },
    suggestionChip: {
        backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    suggestionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1f2937' },
    chatBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#f8faf9', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
        borderTopWidth: 1, borderColor: '#f3f4f6',
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    input: { flex: 1, fontSize: 15, color: '#111827', maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e5b43', alignItems: 'center', justifyContent: 'center' },
});
