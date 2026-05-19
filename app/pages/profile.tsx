import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queries';

const PRIMARY = '#1e5b43';

type Profile = {
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    farm_name: string | null;
    location: string | null;
    experience_years: string | null;
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const [profile, setProfile] = useState<Profile>({
        full_name: '', email: '', avatar_url: null,
        phone: null, farm_name: null, location: null, experience_years: null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [memberSince, setMemberSince] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);

        const { data } = await supabase
            .from('users')
            .select('full_name, email, avatar_url, phone, farm_name, location, experience_years, created_at')
            .eq('id', user.id)
            .maybeSingle();

        if (data) {
            setProfile({
                full_name: data.full_name ?? '',
                email: data.email ?? user.email ?? '',
                avatar_url: data.avatar_url ?? null,
                phone: data.phone ?? null,
                farm_name: data.farm_name ?? null,
                location: data.location ?? null,
                experience_years: data.experience_years ?? null,
            });
            if (data.created_at) {
                setMemberSince(new Date(data.created_at).toLocaleDateString('en-MY', {
                    month: 'long', year: 'numeric',
                }));
            }
        }
        setLoading(false);
    };

    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled || !result.assets[0]) return;
        await uploadAvatar(result.assets[0].uri);
    };

    const uploadAvatar = async (localUri: string) => {
        if (!userId) return;
        setUploading(true);
        try {
            const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
            const path = `avatars/${userId}.${ext}`;
            const response = await fetch(localUri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();

            const { error } = await supabase.storage
                .from('leaf-images')
                .upload(path, arrayBuffer, {
                    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                    upsert: true,
                });
            if (error) throw error;

            const { data } = supabase.storage.from('leaf-images').getPublicUrl(path);
            const publicUrl = data.publicUrl + `?t=${Date.now()}`;

            await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId);
            setProfile(p => ({ ...p, avatar_url: publicUrl }));
        } catch (e: any) {
            Alert.alert('Upload failed', e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        if (!profile.full_name.trim()) {
            Alert.alert('Name required', 'Please enter your full name.');
            return;
        }
        setSaving(true);
        const { error } = await supabase.from('users').update({
            full_name: profile.full_name.trim(),
            phone: profile.phone?.trim() || null,
            farm_name: profile.farm_name?.trim() || null,
            location: profile.location?.trim() || null,
            experience_years: profile.experience_years?.trim() || null,
        }).eq('id', userId);
        setSaving(false);

        if (error) {
            Alert.alert('Save failed', error.message);
        } else {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.homeData(userId) });
            Alert.alert('Saved', 'Your profile has been updated.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                </View>
            </SafeAreaView>
        );
    }

    const avatarUri = profile.avatar_url;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                    {saving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.saveBtnText}>Save</Text>
                    }
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
                            {uploading ? (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            ) : avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Ionicons name="person" size={44} color="#fff" />
                                </View>
                            )}
                            <View style={styles.cameraIcon}>
                                <Ionicons name="camera" size={14} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>Tap to change photo</Text>
                        {memberSince && (
                            <Text style={styles.memberSince}>Member since {memberSince}</Text>
                        )}
                    </View>

                    {/* Personal Info */}
                    <SectionHeader label="PERSONAL INFORMATION" />
                    <View style={styles.card}>
                        <Field
                            icon="person-outline"
                            label="Full Name"
                            value={profile.full_name}
                            placeholder="Enter your full name"
                            onChangeText={v => setProfile(p => ({ ...p, full_name: v }))}
                        />
                        <Divider />
                        <Field
                            icon="mail-outline"
                            label="Email"
                            value={profile.email}
                            placeholder="—"
                            editable={false}
                        />
                        <Divider />
                        <Field
                            icon="call-outline"
                            label="Phone Number"
                            value={profile.phone ?? ''}
                            placeholder="e.g. 011-2345678"
                            keyboardType="phone-pad"
                            onChangeText={v => setProfile(p => ({ ...p, phone: v }))}
                        />
                    </View>

                    {/* Farm Info */}
                    <SectionHeader label="FARM INFORMATION" />
                    <View style={styles.card}>
                        <Field
                            icon="leaf-outline"
                            label="Farm / Estate Name"
                            value={profile.farm_name ?? ''}
                            placeholder="e.g. Ladang Hijau Sdn Bhd"
                            onChangeText={v => setProfile(p => ({ ...p, farm_name: v }))}
                        />
                        <Divider />
                        <Field
                            icon="location-outline"
                            label="Location / State"
                            value={profile.location ?? ''}
                            placeholder="e.g. Pahang, Malaysia"
                            onChangeText={v => setProfile(p => ({ ...p, location: v }))}
                        />
                        <Divider />
                        <Field
                            icon="time-outline"
                            label="Years of Experience"
                            value={profile.experience_years ?? ''}
                            placeholder="e.g. 5"
                            keyboardType="numeric"
                            onChangeText={v => setProfile(p => ({ ...p, experience_years: v }))}
                        />
                    </View>

                    {/* Account Info */}
                    <SectionHeader label="ACCOUNT" />
                    <View style={styles.card}>
                        <View style={styles.fieldRow}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#6b7280" />
                            <View style={styles.fieldContent}>
                                <Text style={styles.fieldLabel}>Account Type</Text>
                                <Text style={styles.fieldValueMuted}>Standard User</Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
    return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Divider() {
    return <View style={styles.fieldDivider} />;
}

function Field({ icon, label, value, placeholder, editable = true, onChangeText, keyboardType }: {
    icon: string; label: string; value: string; placeholder: string;
    editable?: boolean; onChangeText?: (v: string) => void; keyboardType?: any;
}) {
    return (
        <View style={styles.fieldRow}>
            <Ionicons name={icon as any} size={18} color={editable ? '#6b7280' : '#9ca3af'} />
            <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                    style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
                    value={value}
                    placeholder={placeholder}
                    placeholderTextColor="#d1d5db"
                    editable={editable}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType ?? 'default'}
                />
            </View>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8faf9' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    saveBtn: {
        backgroundColor: PRIMARY, paddingHorizontal: 18, paddingVertical: 8,
        borderRadius: 20, minWidth: 60, alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    avatarSection: { alignItems: 'center', paddingVertical: 28 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
        backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    },
    cameraIcon: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#f8faf9',
    },
    avatarHint: { fontSize: 13, color: '#9ca3af', marginTop: 10 },
    memberSince: { fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: '600' },

    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: '#9ca3af',
        letterSpacing: 1.2, marginBottom: 8, marginTop: 16,
    },

    card: {
        backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    fieldRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14,
    },
    fieldContent: { flex: 1 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
    fieldInput: { fontSize: 15, color: '#111827', fontWeight: '500', padding: 0 },
    fieldInputDisabled: { color: '#9ca3af' },
    fieldValueMuted: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
    fieldDivider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 30 },
});
