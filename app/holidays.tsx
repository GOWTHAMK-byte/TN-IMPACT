import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Card } from '@/components/ui';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Hardcoded 2026 holidays (can be fetched from API in real app)
const HOLIDAYS = [
    { date: '2026-01-01', name: 'New Year\'s Day' },
    { date: '2026-01-19', name: 'Martin Luther King Jr. Day' },
    { date: '2026-02-16', name: 'Presidents\' Day' },
    { date: '2026-03-30', name: 'Eid al-Fitr' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-25', name: 'Memorial Day' },
    { date: '2026-06-19', name: 'Juneteenth' },
    { date: '2026-07-03', name: 'Independence Day' },
    { date: '2026-09-07', name: 'Labor Day' },
    { date: '2026-10-12', name: 'Indigenous Peoples\' Day' },
    { date: '2026-11-11', name: 'Veterans Day' },
    { date: '2026-11-26', name: 'Thanksgiving Day' },
    { date: '2026-12-25', name: 'Christmas Day' }
];

export default function HolidaysScreen() {
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState<string>('');

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const upcomingHolidays = useMemo(() => {
        return HOLIDAYS.filter(h => h.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    }, [todayStr]);

    const markedDates = useMemo(() => {
        const marks: any = {};
        HOLIDAYS.forEach(h => {
            marks[h.date] = {
                marked: true,
                dotColor: Colors.accent,
                selected: h.date === selectedDate,
                selectedColor: h.date === selectedDate ? Colors.accent : undefined
            };
        });

        // Also mark today if not already marked
        if (!marks[todayStr]) {
            marks[todayStr] = { marked: false, textColor: Colors.primary }; // Just a different style maybe, default marks it if current
        }

        if (selectedDate && !marks[selectedDate]) {
            marks[selectedDate] = { selected: true, selectedColor: Colors.card };
        }
        return marks;
    }, [selectedDate, todayStr]);

    const onDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);
    };

    const getHolidayForSelectedDate = () => {
        return HOLIDAYS.find(h => h.date === selectedDate);
    };

    const daySelectedHoliday = getHolidayForSelectedDate();

    return (
        <View style={styles.container}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Company Holidays</Text>
                    <Text style={styles.subtitle}>Plan ahead with the corporate holiday schedule.</Text>
                </View>

                <Card style={styles.calendarCard}>
                    <Calendar
                        current={todayStr}
                        onDayPress={onDayPress}
                        markedDates={markedDates}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: Colors.textSecondary,
                            selectedDayBackgroundColor: Colors.accent,
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: Colors.accent,
                            dayTextColor: Colors.text,
                            textDisabledColor: Colors.textTertiary,
                            dotColor: Colors.accent,
                            selectedDotColor: '#ffffff',
                            arrowColor: Colors.accent,
                            monthTextColor: Colors.text,
                            indicatorColor: Colors.accent,
                            textDayFontWeight: '500',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 15,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 13
                        }}
                    />
                </Card>

                {daySelectedHoliday && (
                    <View style={styles.selectedHolidayAlert}>
                        <Feather name="anchor" size={20} color={Colors.accent} />
                        <Text style={styles.selectedHolidayText}>{daySelectedHoliday.name}</Text>
                    </View>
                )}

                <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Upcoming Holidays</Text>

                    {upcomingHolidays.map(holiday => {
                        const [y, m, d] = holiday.date.split('-');
                        const monthName = MONTHS[parseInt(m, 10) - 1];
                        const isSelected = holiday.date === selectedDate;
                        return (
                            <View key={holiday.date} style={[styles.holidayRow, isSelected && styles.holidayRowSelected]}>
                                <View style={styles.dateBox}>
                                    <Text style={styles.dateMonth}>{monthName}</Text>
                                    <Text style={styles.dateDay}>{d}</Text>
                                </View>
                                <View style={styles.nameBox}>
                                    <Text style={styles.holidayName}>{holiday.name}</Text>
                                    <Text style={styles.holidayType}>Company Holiday</Text>
                                </View>
                            </View>
                        );
                    })}

                    {upcomingHolidays.length === 0 && (
                        <Text style={{ color: Colors.textTertiary, padding: 10, textAlign: 'center' }}>No more holidays this year.</Text>
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingTop: 40, gap: 24 },
    header: { gap: 8 },
    title: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
    subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
    calendarCard: {
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    selectedHolidayAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)'
    },
    selectedHolidayText: { fontSize: 15, fontWeight: '700', color: Colors.accent },
    listSection: { gap: 12, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
    holidayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 12,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    holidayRowSelected: {
        borderColor: Colors.accent,
        backgroundColor: 'rgba(56, 189, 248, 0.05)',
    },
    dateBox: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        width: 56,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    dateMonth: { fontSize: 11, fontWeight: '800', color: Colors.accent, letterSpacing: 1 },
    dateDay: { fontSize: 22, fontWeight: '900', color: Colors.text, marginTop: -2 },
    nameBox: { flex: 1, gap: 4 },
    holidayName: { fontSize: 16, fontWeight: '700', color: Colors.text },
    holidayType: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' }
});
