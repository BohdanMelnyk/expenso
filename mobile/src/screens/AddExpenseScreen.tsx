import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Card,
  Title,
  TextInput,
  Button,
  Paragraph,
  ActivityIndicator,
  RadioButton,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { expenseAPI, vendorAPI, categoryAPI, Vendor, Category, CreateExpenseRequest } from '../../../shared/api/client';
import { getErrorMessage } from '../../../shared/utils/errorHandler';

const AddExpenseScreen = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateExpenseRequest>({
    comment: '',
    amount: 0,
    vendor_id: 0,
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense',
    paid_by_card: true, // Default to card payment
  });

  useEffect(() => {
    fetchVendors();
    fetchCategories();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getVendors();
      setVendors(response.data);
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to fetch vendors'));
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getCategories();
      setCategories(response.data);
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to fetch categories'));
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.comment.trim()) {
        Alert.alert('Error', 'Description is required');
        return;
      }
      if (formData.amount <= 0) {
        Alert.alert('Error', 'Amount must be greater than 0');
        return;
      }
      if (!formData.category.trim()) {
        Alert.alert('Error', 'Category is required');
        return;
      }
      if (formData.vendor_id === 0) {
        Alert.alert('Error', 'Please select a vendor');
        return;
      }

      setSubmitting(true);
      await expenseAPI.createExpense(formData);
      
      Alert.alert('Success', 'Expense added successfully!');
      
      // Reset form
      setFormData({
        comment: '',
        amount: 0,
        vendor_id: 0,
        date: new Date().toISOString().split('T')[0],
        category: '',
        type: 'expense',
        paid_by_card: true, // Reset to default (card payment)
      });
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to add expense'));
      console.error('Error adding expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getVendorsByType = (type: string) => {
    return vendors.filter(vendor => vendor.type === type);
  };

  const vendorTypes = [
    { key: 'food_store', label: 'Food Stores' },
    { key: 'shop', label: 'Shops' },
    { key: 'eating_out', label: 'Eating Out' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'else', label: 'Other' },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <Title style={styles.title}>Add New Expense</Title>

          <TextInput
            label="Description *"
            value={formData.comment}
            onChangeText={(text) => setFormData(prev => ({ ...prev, comment: text }))}
            multiline
            numberOfLines={3}
            mode="outlined"
            style={styles.input}
            placeholder="What did you spend money on?"
          />

          <TextInput
            label="Amount (€) *"
            value={formData.amount > 0 ? formData.amount.toString() : ''}
            onChangeText={(text) => {
              const amount = parseFloat(text) || 0;
              setFormData(prev => ({ ...prev, amount }));
            }}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            placeholder="0.00"
          />

          <Paragraph style={styles.label}>Category *</Paragraph>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Select a category" value="" />
              {categories.map(category => (
                <Picker.Item 
                  key={category.id} 
                  label={`${category.icon} ${category.name}`} 
                  value={category.name} 
                />
              ))}
            </Picker>
          </View>

          <Paragraph style={styles.label}>Vendor *</Paragraph>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vendor_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Select a vendor" value={0} />
              {vendorTypes.map(type => {
                const typeVendors = getVendorsByType(type.key);
                if (typeVendors.length === 0) return null;
                
                return typeVendors.map(vendor => (
                  <Picker.Item 
                    key={vendor.id} 
                    label={`${vendor.name} (${type.label})`} 
                    value={vendor.id} 
                  />
                ));
              })}
            </Picker>
          </View>

          <TextInput
            label="Date *"
            value={formData.date}
            onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />

          <Paragraph style={styles.label}>Payment Method</Paragraph>
          <RadioButton.Group 
            onValueChange={value => setFormData(prev => ({ ...prev, paid_by_card: value === 'card' }))} 
            value={formData.paid_by_card ? 'card' : 'cash'}
          >
            <View style={styles.radioContainer}>
              <RadioButton.Item label="💳 Card" value="card" />
              <RadioButton.Item label="💵 Cash" value="cash" />
            </View>
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
            icon="plus"
          >
            {submitting ? 'Adding...' : 'Add Expense'}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    marginBottom: 32,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  radioContainer: {
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
});

export default AddExpenseScreen;