import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import {
  Card,
  Title,
  TextInput,
  Button,
  Paragraph,
  ActivityIndicator,
  RadioButton,
} from 'react-native-paper';
import { expenseAPI, Vendor, Category, CreateExpenseRequest } from '../../shared/api/client';
import { getErrorMessage } from '../../shared/utils/errorHandler';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import VendorSelector from '../components/VendorSelector';
import CategorySelector from '../components/CategorySelector';

const AddExpenseScreen = () => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
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


  const handleSubmit = async () => {
    try {
      if (!formData.comment.trim()) {
        showError('Description is required');
        return;
      }
      if (formData.amount <= 0) {
        showError('Amount must be greater than 0');
        return;
      }
      if (!formData.category.trim()) {
        showError('Category is required');
        return;
      }
      if (formData.vendor_id === 0) {
        showError('Please select a vendor');
        return;
      }

      setSubmitting(true);
      await expenseAPI.createExpense(formData);
      
      showSuccess(`${formData.type === 'income' ? 'Income' : 'Expense'} added successfully!`);
      
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
      showError(getErrorMessage(error, 'Failed to add expense'));
      console.error('Error adding expense:', error);
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.formCard}>
        <Card.Content>
          <Title style={styles.title}>Add New Transaction</Title>

          <TextInput
            label="Description *"
            value={formData.comment}
            onChangeText={(text) => setFormData(prev => ({ ...prev, comment: text }))}
            multiline
            numberOfLines={3}
            mode="outlined"
            style={styles.input}
            placeholder="What is this transaction for?"
            right={formData.comment.length > 0 && (
              <TextInput.Icon 
                icon="keyboard-off-outline" 
                onPress={Keyboard.dismiss}
                size={20}
              />
            )}
          />

          <Paragraph style={styles.label}>Type</Paragraph>
          <RadioButton.Group 
            onValueChange={value => setFormData(prev => ({ ...prev, type: value }))} 
            value={formData.type}
          >
            <View style={styles.radioContainer}>
              <RadioButton.Item label="💸 Expense" value="expense" />
              <RadioButton.Item label="💰 Income" value="income" />
            </View>
          </RadioButton.Group>

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
            right={formData.amount > 0 && (
              <TextInput.Icon 
                icon="keyboard-off-outline" 
                onPress={Keyboard.dismiss}
                size={20}
              />
            )}
          />

          <Paragraph style={styles.label}>Category *</Paragraph>
          <CategorySelector
            selectedCategoryName={formData.category}
            onCategorySelect={(categoryName) => setFormData(prev => ({ ...prev, category: categoryName }))}
            style={styles.selector}
            error={!formData.category.trim()}
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

          <Paragraph style={styles.label}>Vendor *</Paragraph>
          <VendorSelector
            selectedVendorId={formData.vendor_id}
            onVendorSelect={(vendorId) => setFormData(prev => ({ ...prev, vendor_id: vendorId }))}
            style={styles.selector}
            error={formData.vendor_id === 0}
          />

          <TextInput
            label="Date *"
            value={formData.date}
            onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
            right={formData.date.length > 0 && (
              <TextInput.Icon 
                icon="keyboard-off-outline" 
                onPress={Keyboard.dismiss}
                size={20}
              />
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
            icon="plus"
          >
            {submitting ? 'Adding...' : `Add ${formData.type === 'income' ? 'Income' : 'Expense'}`}
          </Button>
          </Card.Content>
          </Card>
          
          {/* Toast notifications */}
          <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
  selector: {
    marginBottom: 16,
    zIndex: 1,
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