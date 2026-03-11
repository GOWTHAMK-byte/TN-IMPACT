import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, TicketCategory, TicketPriority } from '@/contexts/DataContext';

// ─── Catalogue Item Config ────────────────────────────────────────────────────

interface CatalogueItemConfig {
  category: TicketCategory;
  label: string;
  icon: string;
  color: string;
  fields: FormField[];
}

interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

const HARDWARE_FIELDS: FormField[] = [
  { id: 'device_type', label: 'Device Type', placeholder: 'Select device type', type: 'select', options: ['Laptop', 'Monitor', 'Phone', 'Keyboard', 'Mouse', 'Headset', 'Other'], required: true },
  { id: 'urgency_reason', label: 'Urgency Reason', placeholder: 'Why is this needed?', type: 'text' },
  { id: 'current_device', label: 'Current Device (if replacing)', placeholder: 'e.g. MacBook Pro 2019', type: 'text' },
];

const SOFTWARE_FIELDS: FormField[] = [
  { id: 'software_name', label: 'Software Name', placeholder: 'e.g. Adobe Photoshop', type: 'text', required: true },
  { id: 'license_type', label: 'License Type', placeholder: 'Select license type', type: 'select', options: ['Individual', 'Team', 'Enterprise', 'Not Sure'] },
  { id: 'justification', label: 'Business Justification', placeholder: 'How will this be used?', type: 'textarea' },
];

const ACCESS_FIELDS: FormField[] = [
  { id: 'resource_name', label: 'System / Resource', placeholder: 'e.g. Shared Drive, VPN, Jira', type: 'text', required: true },
  { id: 'access_level', label: 'Access Level', placeholder: 'Select access level', type: 'select', options: ['Read Only', 'Read/Write', 'Admin', 'Not Sure'] },
  { id: 'duration', label: 'Duration', placeholder: 'Select duration', type: 'select', options: ['Permanent', '1 Month', '3 Months', '6 Months', 'Project-based'] },
];

const NETWORK_FIELDS: FormField[] = [
  { id: 'issue_type', label: 'Issue Type', placeholder: 'Select issue type', type: 'select', options: ['No Internet', 'Slow Connection', 'VPN Down', 'Wi-Fi Cannot Connect', 'Port Request', 'Other'] },
  { id: 'location', label: 'Location / Area', placeholder: 'e.g. Floor 3, Desk B12', type: 'text' },
];

const CATALOGUE_ITEMS: Record<string, CatalogueItemConfig> = {
  // Hardware
  request_laptop: { category: 'Hardware', label: 'Request Laptop', icon: 'laptop-outline', color: '#F59E0B', fields: HARDWARE_FIELDS },
  request_monitor: { category: 'Hardware', label: 'Request Monitor', icon: 'desktop-outline', color: '#F59E0B', fields: HARDWARE_FIELDS },
  request_phone: { category: 'Hardware', label: 'Request Phone', icon: 'phone-portrait-outline', color: '#F59E0B', fields: HARDWARE_FIELDS },
  repair_replace: { category: 'Hardware', label: 'Repair / Replace', icon: 'build-outline', color: '#F59E0B', fields: HARDWARE_FIELDS },
  // Software
  adobe_license: { category: 'Software', label: 'Adobe CC License', icon: 'color-palette-outline', color: '#6366F1', fields: SOFTWARE_FIELDS },
  ms_office: { category: 'Software', label: 'Microsoft Office', icon: 'document-text-outline', color: '#6366F1', fields: SOFTWARE_FIELDS },
  dev_tools: { category: 'Software', label: 'Dev Tools', icon: 'code-slash-outline', color: '#6366F1', fields: SOFTWARE_FIELDS },
  other_software: { category: 'Software', label: 'Other Software', icon: 'cube-outline', color: '#6366F1', fields: SOFTWARE_FIELDS },
  // Access
  vpn_access: { category: 'Access', label: 'VPN Access', icon: 'shield-checkmark-outline', color: '#06B6D4', fields: ACCESS_FIELDS },
  shared_drive: { category: 'Access', label: 'Shared Drive Access', icon: 'folder-open-outline', color: '#06B6D4', fields: ACCESS_FIELDS },
  system_account: { category: 'Access', label: 'System Account', icon: 'person-add-outline', color: '#06B6D4', fields: ACCESS_FIELDS },
  password_reset: { category: 'Access', label: 'Password Reset', icon: 'lock-open-outline', color: '#06B6D4', fields: ACCESS_FIELDS },
  // Network
  connectivity: { category: 'Network', label: 'Connectivity Issue', icon: 'cloud-offline-outline', color: '#10B981', fields: NETWORK_FIELDS },
  wifi_setup: { category: 'Network', label: 'Wi-Fi Setup', icon: 'wifi-outline', color: '#10B981', fields: NETWORK_FIELDS },
  firewall_request: { category: 'Network', label: 'Port / Firewall', icon: 'git-network-outline', color: '#10B981', fields: NETWORK_FIELDS },
  // Other
  general_request: { category: 'Other', label: 'General IT Request', icon: 'chatbox-ellipses-outline', color: '#8B5CF6', fields: [] },
};

const PRIORITIES: { value: TicketPriority; color: string }[] = [
  { value: 'Low', color: Colors.textSecondary },
  { value: 'Medium', color: Colors.accent },
  { value: 'High', color: Colors.warning },
  { value: 'Critical', color: Colors.error },
];

const P = Pressable as any;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewTicketScreen() {
  const { user } = useAuth();
  const { createTicket } = useData();
  const params = useLocalSearchParams<{ category?: string; item?: string; itemLabel?: string }>();

  const catalogueItem = params.item ? CATALOGUE_ITEMS[params.item] : null;

  const [title, setTitle] = useState(catalogueItem?.label || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>(
    (catalogueItem?.category as TicketCategory) || (params.category as TicketCategory) || 'Other'
  );
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const itemColor = catalogueItem?.color || '#8B5CF6';
  const itemIcon = catalogueItem?.icon || 'chatbox-ellipses-outline';
  const headerLabel = catalogueItem?.label || params.itemLabel || 'New IT Request';
  const fields = catalogueItem?.fields || [];

  const isValid = title.trim().length >= 3 && description.trim().length >= 5;

  const setFieldValue = (fieldId: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Build description with form field values
    let fullDescription = description.trim();
    if (fields.length > 0) {
      const fieldLines = fields
        .filter(f => formValues[f.id]?.trim())
        .map(f => `${f.label}: ${formValues[f.id].trim()}`);
      if (fieldLines.length > 0) {
        fullDescription = fieldLines.join('\n') + '\n\n' + fullDescription;
      }
    }

    await createTicket({
      title: title.trim(),
      description: fullDescription,
      category,
      priority,
      status: 'Open',
      createdBy: user.id,
      createdByName: user.name,
    });
    router.back();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Service Header Badge ── */}
      <View style={[styles.serviceBadge, { backgroundColor: itemColor + '12', borderColor: itemColor + '30' }]}>
        <View style={[styles.serviceBadgeIcon, { backgroundColor: itemColor + '20' }]}>
          <Ionicons name={itemIcon as any} size={24} color={itemColor} />
        </View>
        <View style={styles.serviceBadgeInfo}>
          <Text style={styles.serviceBadgeTitle}>{headerLabel}</Text>
          <Text style={styles.serviceBadgeCategory}>{category}</Text>
        </View>
      </View>

      {/* ── Title ── */}
      <Text style={styles.label}>Title</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Brief description of the request..."
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
        />
      </View>

      {/* ── Item-Specific Fields ── */}
      {fields.map(field => (
        <View key={field.id}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={{ color: Colors.error }}> *</Text>}
          </Text>
          {field.type === 'select' && field.options ? (
            <View style={styles.typeGrid}>
              {field.options.map(option => (
                <P
                  key={option}
                  onPress={() => { setFieldValue(field.id, option); Haptics.selectionAsync(); }}
                  style={[
                    styles.typeChip,
                    formValues[field.id] === option && { backgroundColor: itemColor, borderColor: itemColor },
                  ]}
                >
                  <Text style={[
                    styles.typeText,
                    formValues[field.id] === option && { color: '#fff' },
                  ]}>{option}</Text>
                </P>
              ))}
            </View>
          ) : field.type === 'textarea' ? (
            <TextInput
              value={formValues[field.id] || ''}
              onChangeText={val => setFieldValue(field.id, val)}
              placeholder={field.placeholder}
              placeholderTextColor={Colors.textTertiary}
              style={styles.textArea}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          ) : (
            <View style={styles.inputWrap}>
              <TextInput
                value={formValues[field.id] || ''}
                onChangeText={val => setFieldValue(field.id, val)}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
            </View>
          )}
        </View>
      ))}

      {/* ── Priority ── */}
      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map(p => (
          <P
            key={p.value}
            onPress={() => { setPriority(p.value); Haptics.selectionAsync(); }}
            style={[
              styles.priorityChip,
              priority === p.value && { backgroundColor: p.color, borderColor: p.color },
            ]}
          >
            <View style={[styles.priorityDot, { backgroundColor: priority === p.value ? '#fff' : p.color }]} />
            <Text style={[styles.priorityText, priority === p.value && { color: '#fff' }]}>{p.value}</Text>
          </P>
        ))}
      </View>

      {/* ── Additional Notes ── */}
      <Text style={styles.label}>Additional Notes</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Any extra details or context..."
        placeholderTextColor={Colors.textTertiary}
        style={styles.textArea}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* ── Submit ── */}
      <P
        onPress={handleSubmit}
        disabled={!isValid || submitting}
        style={({ pressed }: any) => [
          styles.submitBtn,
          { backgroundColor: itemColor },
          (!isValid || submitting) && styles.submitBtnDisabled,
          pressed && isValid && !submitting && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <Ionicons name={itemIcon as any} size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
      </P>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },

  // Service Badge
  serviceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16,
    borderWidth: 1, marginBottom: 4,
  },
  serviceBadgeIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceBadgeInfo: { flex: 1 },
  serviceBadgeTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  serviceBadgeCategory: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Form
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  inputWrap: { backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  input: { paddingVertical: 14, fontSize: 15, color: Colors.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  typeText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  textArea: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.inputBorder },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, marginTop: 12 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
