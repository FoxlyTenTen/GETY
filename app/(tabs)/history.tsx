import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/common/AppHeader';
import Dashboard from '@/components/history_comp/dashboard';
import ScanHistoryList from '@/components/history_comp/scanhistorylist';
import { useLanguage } from '@/context/LanguageContext';

export default function HistoryPage() {
    const { t } = useLanguage();
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />

            <AppHeader title={t.scanHistory} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Search Bar */}
                <Dashboard />

                {/* Scan List */}
                <ScanHistoryList />

                {/* Padding for bottom nav */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8faf9',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
});
