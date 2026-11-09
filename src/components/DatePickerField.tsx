import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from '@/i18n/useTranslation';
import { LOOK } from '@/theme/look';
import { dateFromISO, isoFromDate, shortDate } from '@/utils/sowing';

/**
 * A date box: one tap opens the phone's small month / day / year wheels, so nobody has to
 * know how to type a date. `value` and `onChange` use YYYY-MM-DD; the box shows "Nov 10, 2026".
 */
export const DatePickerField: React.FC<{
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;      // today unless a different last day is given
  autoOpen?: boolean;      // open the wheels as soon as the box appears
  style?: StyleProp<ViewStyle>;
}> = ({ value, onChange, minimumDate, maximumDate, autoOpen, style }) => {
  const tr = useTranslation();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);

  const picked = value ? dateFromISO(value) : null;
  const year = value.slice(0, 4);
  return (
    <>
      <TouchableOpacity style={[s.box, style]} onPress={() => setOpen(true)} activeOpacity={0.75} accessibilityRole="button">
        <Ionicons name="calendar-outline" size={17} color="#6B7280" />
        <Text style={[s.text, !picked && s.hint]} numberOfLines={1}>
          {picked ? `${shortDate(value, tr)}, ${year}` : tr.pickDateHint}
        </Text>
        <View style={s.chevron}><Ionicons name="chevron-down" size={16} color="#6B7280" /></View>
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          mode="date"
          display="spinner"
          value={picked ?? maximumDate ?? new Date()}
          minimumDate={minimumDate}
          maximumDate={maximumDate ?? new Date()}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(isoFromDate(date));
          }}
        />
      )}
    </>
  );
};

const s = StyleSheet.create({
  box:  { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: LOOK.page },
  text: { flex: 1, fontSize: 15, color: LOOK.ink, fontFamily: 'Inter_500Medium' },
  hint: { color: '#9CA3AF' },
  chevron: { marginLeft: 'auto' },
});
