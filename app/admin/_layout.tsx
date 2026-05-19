
import { Stack, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function AdminLayout() {
    const { isAdmin, loading, session } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!session) {
                router.replace('/auth/login');
            } else if (!isAdmin) {
                router.replace('/(tabs)');
            }
        }
    }, [loading, session, isAdmin]);

    if (loading || !isAdmin) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#1e5b43" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="knowledge-base-upload" />
            <Stack.Screen name="dashboard" />
        </Stack>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8faf9',
    },
});
