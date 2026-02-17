import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PostStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';
import { createPost, POST_EXPIRY_DAYS } from '@nusa/shared';
import { getMetroArea } from '../../utils/storage';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius, heights } from '../../styles/spacing';

type Props = NativeStackScreenProps<PostStackParamList, 'CreatePost'>;

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Housing',
  jobs: 'Jobs',
  emergency: 'Emergency',
  travel: 'Travel',
};

const ROOM_TYPES = ['Private Room', 'Shared Room', 'Studio', '1BR', '2BR+'];
const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship'];
const EMERGENCY_TYPES = ['Medical', 'Legal', 'Financial', 'Travel', 'Housing', 'Other'];
const URGENCY_LEVELS = ['Critical', 'High', 'Medium'];

function PickerField({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (val: string) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pickerRow}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.pickerChip, value === opt && styles.pickerChipActive]}
              onPress={() => onSelect(opt)}
            >
              <Text
                style={[
                  styles.pickerChipText,
                  value === opt && styles.pickerChipTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function CreatePostScreen({ route, navigation }: Props) {
  const { category } = route.params;
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Housing fields
  const [rentAmount, setRentAmount] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [roomType, setRoomType] = useState(ROOM_TYPES[0]);

  // Jobs fields
  const [companyName, setCompanyName] = useState('');
  const [payMin, setPayMin] = useState('');
  const [payMax, setPayMax] = useState('');
  const [employmentType, setEmploymentType] = useState(EMPLOYMENT_TYPES[0]);

  // Emergency fields
  const [emergencyType, setEmergencyType] = useState(EMERGENCY_TYPES[0]);
  const [urgency, setUrgency] = useState(URGENCY_LEVELS[1]);
  const [contactPhone, setContactPhone] = useState('');
  const [contactName, setContactName] = useState('');

  // Travel fields
  const [travelDate, setTravelDate] = useState('');
  const [travelFrom, setTravelFrom] = useState('');
  const [travelTo, setTravelTo] = useState('');
  const [airline, setAirline] = useState('');
  const [seatsAvailable, setSeatsAvailable] = useState('1');

  useLayoutEffect(() => {
    navigation.setOptions({ title: `New ${CATEGORY_LABELS[category]} Post` });
  }, [category, navigation]);

  const buildFields = (): Record<string, any> => {
    switch (category) {
      case 'housing':
        return {
          rentAmount: rentAmount ? Number(rentAmount) : 0,
          moveInDate,
          roomType: roomType.toLowerCase().replace(/\s+/g, '-'),
        };
      case 'jobs':
        return {
          companyName,
          employmentType: employmentType.toLowerCase().replace(/\s+/g, '-'),
          payRate: {
            min: payMin ? Number(payMin) : 0,
            max: payMax ? Number(payMax) : 0,
            type: 'annual',
          },
        };
      case 'emergency':
        return {
          emergencyType: emergencyType.toLowerCase(),
          urgency: urgency.toLowerCase(),
          contactPhone,
          contactName,
          verified: false,
          redAlertSent: false,
        };
      case 'travel':
        return {
          travelDate,
          route: { from: travelFrom, to: travelTo },
          airline: airline || undefined,
          seatsAvailable: seatsAvailable ? Number(seatsAvailable) : 1,
        };
      default:
        return {};
    }
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (!description.trim()) return 'Description is required';

    switch (category) {
      case 'housing':
        if (!rentAmount) return 'Rent amount is required';
        break;
      case 'jobs':
        if (!companyName.trim()) return 'Company name is required';
        break;
      case 'emergency':
        if (!contactPhone.trim()) return 'Contact phone is required';
        if (!contactName.trim()) return 'Contact name is required';
        break;
      case 'travel':
        if (!travelDate.trim()) return 'Travel date is required';
        if (!travelFrom.trim()) return 'Departure city is required';
        if (!travelTo.trim()) return 'Destination city is required';
        break;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Missing Information', validationError);
      return;
    }

    if (category === 'emergency') {
      Alert.alert(
        'Emergency Disclaimer',
        'This platform is a community notice board. For life-threatening emergencies, always call 911 first. Your post will be reviewed by community moderators.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'I Understand', onPress: submitPost },
        ]
      );
      return;
    }

    await submitPost();
  };

  const submitPost = async () => {
    if (!user) return;

    if (!user.metro_area_id || !user.zip_code) {
      Alert.alert('Location Required', 'Please complete onboarding with a valid ZIP code before posting.');
      return;
    }

    setSubmitting(true);
    try {
      const metro = await getMetroArea();
      const cityName = metro?.name?.split('-')[0]?.trim() || metro?.name || 'Unknown';
      const stateName = metro?.state || 'Unknown';

      const expiryDays = POST_EXPIRY_DAYS[category];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      const result = await createPost(supabase, {
        metroAreaId: user.metro_area_id,
        category,
        title: title.trim(),
        description: description.trim(),
        fields: buildFields(),
        expiryDate: expiryDate.toISOString(),
        locationZipCode: user.zip_code,
        locationCity: cityName,
        locationState: stateName,
      });

      if (result.error) {
        Alert.alert('Error', result.error.message);
        return;
      }

      Alert.alert('Post Created', 'Your post is now live!', [
        { text: 'OK', onPress: () => navigation.navigate('CategorySelect') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderHousingFields = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Rent Amount ($/month) *</Text>
        <TextInput
          style={styles.input}
          value={rentAmount}
          onChangeText={setRentAmount}
          placeholder="e.g. 800"
          keyboardType="numeric"
          placeholderTextColor={colors.text.disabled}
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Move-in Date</Text>
        <TextInput
          style={styles.input}
          value={moveInDate}
          onChangeText={setMoveInDate}
          placeholder="e.g. 2026-03-01"
          placeholderTextColor={colors.text.disabled}
        />
      </View>
      <PickerField
        label="Room Type"
        options={ROOM_TYPES}
        value={roomType}
        onSelect={setRoomType}
      />
    </>
  );

  const renderJobsFields = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Company or business name"
          placeholderTextColor={colors.text.disabled}
        />
      </View>
      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.flex1]}>
          <Text style={styles.label}>Pay Min ($)</Text>
          <TextInput
            style={styles.input}
            value={payMin}
            onChangeText={setPayMin}
            placeholder="Min"
            keyboardType="numeric"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
        <View style={[styles.fieldGroup, styles.flex1]}>
          <Text style={styles.label}>Pay Max ($)</Text>
          <TextInput
            style={styles.input}
            value={payMax}
            onChangeText={setPayMax}
            placeholder="Max"
            keyboardType="numeric"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
      </View>
      <PickerField
        label="Employment Type"
        options={EMPLOYMENT_TYPES}
        value={employmentType}
        onSelect={setEmploymentType}
      />
    </>
  );

  const renderEmergencyFields = () => (
    <>
      <PickerField
        label="Emergency Type"
        options={EMERGENCY_TYPES}
        value={emergencyType}
        onSelect={setEmergencyType}
      />
      <PickerField
        label="Urgency"
        options={URGENCY_LEVELS}
        value={urgency}
        onSelect={setUrgency}
      />
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Contact Name *</Text>
        <TextInput
          style={styles.input}
          value={contactName}
          onChangeText={setContactName}
          placeholder="Who to contact"
          placeholderTextColor={colors.text.disabled}
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Contact Phone *</Text>
        <TextInput
          style={styles.input}
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="Phone number"
          keyboardType="phone-pad"
          placeholderTextColor={colors.text.disabled}
        />
      </View>
    </>
  );

  const renderTravelFields = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Travel Date *</Text>
        <TextInput
          style={styles.input}
          value={travelDate}
          onChangeText={setTravelDate}
          placeholder="e.g. 2026-03-15"
          placeholderTextColor={colors.text.disabled}
        />
      </View>
      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.flex1]}>
          <Text style={styles.label}>From *</Text>
          <TextInput
            style={styles.input}
            value={travelFrom}
            onChangeText={setTravelFrom}
            placeholder="Departure"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
        <View style={[styles.fieldGroup, styles.flex1]}>
          <Text style={styles.label}>To *</Text>
          <TextInput
            style={styles.input}
            value={travelTo}
            onChangeText={setTravelTo}
            placeholder="Destination"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.flex1]}>
          <Text style={styles.label}>Airline</Text>
          <TextInput
            style={styles.input}
            value={airline}
            onChangeText={setAirline}
            placeholder="Optional"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
        <View style={[styles.fieldGroup, styles.flex1]}>
          <Text style={styles.label}>Seats</Text>
          <TextInput
            style={styles.input}
            value={seatsAvailable}
            onChangeText={setSeatsAvailable}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
      </View>
    </>
  );

  const renderCategoryFields = () => {
    switch (category) {
      case 'housing':
        return renderHousingFields();
      case 'jobs':
        return renderJobsFields();
      case 'emergency':
        return renderEmergencyFields();
      case 'travel':
        return renderTravelFields();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Common fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={`What's your ${category} post about?`}
              placeholderTextColor={colors.text.disabled}
              maxLength={120}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Provide more details..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>
            {CATEGORY_LABELS[category]} Details
          </Text>

          {/* Category-specific fields */}
          {renderCategoryFields()}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Publish Post</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex1: {
    flex: 1,
  },
  content: {
    padding: spacing.s,
    paddingBottom: spacing.xl,
  },
  fieldGroup: {
    marginBottom: spacing.s,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xxs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    height: heights.input,
    paddingHorizontal: spacing.s,
    ...typography.input,
    color: colors.text.primary,
  },
  multiline: {
    height: 120,
    paddingTop: spacing.s,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.s,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.s,
    fontSize: 18,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pickerChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerChipActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  pickerChipText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
  },
  pickerChipTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary.main,
    height: heights.button.primary,
    borderRadius: borderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.m,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
