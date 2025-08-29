import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, DataTable, Chip, Surface } from 'react-native-paper';
import { expenseAPI, Expense, formatAmount } from '../../shared/api/client';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

const { width } = Dimensions.get('window');

const StatisticsScreen = () => {
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getActualExpenses();
      setExpenses(response.data);
    } catch (error) {
      showError('Failed to fetch expenses');
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };


  // Filter expenses by period
  const getFilteredExpenses = () => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedPeriod) {
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return expenses.filter(expense => new Date(expense.date) >= cutoffDate);
  };

  // Group expenses by vendor type
  const getExpensesByVendorType = () => {
    const filteredExpenses = getFilteredExpenses();
    const groupedData: { [key: string]: number } = {};

    filteredExpenses.forEach(expense => {
      if (expense.vendor) {
        const type = expense.vendor.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        groupedData[type] = (groupedData[type] || 0) + expense.amount;
      }
    });

    return Object.entries(groupedData)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Get top vendors
  const getTopVendors = () => {
    const filteredExpenses = getFilteredExpenses();
    const vendorData: { [key: string]: { name: string; amount: number; count: number } } = {};

    filteredExpenses.forEach(expense => {
      if (expense.vendor) {
        const vendorId = expense.vendor.id.toString();
        if (!vendorData[vendorId]) {
          vendorData[vendorId] = {
            name: expense.vendor.name,
            amount: 0,
            count: 0
          };
        }
        vendorData[vendorId].amount += expense.amount;
        vendorData[vendorId].count += 1;
      }
    });

    return Object.values(vendorData)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  };

  const getVendorTypeIcon = (type: string) => {
    switch (type.toLowerCase().replace(' ', '_')) {
      case 'food_store': return '🛒';
      case 'eating_out': return '🍽️';
      case 'transport': return '🚗';
      case 'household': return '🏠';
      case 'clothing': return '👕';
      case 'care': return '💊';
      case 'living': return '🏡';
      case 'subscriptions': return '📱';
      case 'tourism': return '✈️';
      case 'car': return '🚙';
      case 'salary': return '💰';
      case 'else': return '📦';
      default: return '📦';
    }
  };

  const getPaymentMethodStats = () => {
    const filteredExpenses = getFilteredExpenses();
    const cardExpenses = filteredExpenses.filter(exp => exp.paid_by_card);
    const cashExpenses = filteredExpenses.filter(exp => !exp.paid_by_card);
    const cardAmount = cardExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const cashAmount = cashExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      cardCount: cardExpenses.length,
      cashCount: cashExpenses.length,
      cardAmount,
      cashAmount,
      cardPercentage: total > 0 ? ((cardAmount / total) * 100).toFixed(1) : '0',
      cashPercentage: total > 0 ? ((cashAmount / total) * 100).toFixed(1) : '0',
    };
  };

  const handleCategoryPress = (categoryName: string) => {
    const filteredExpenses = getFilteredExpenses();
    const categoryExpenses = filteredExpenses.filter(expense => 
      expense.vendor && expense.vendor.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) === categoryName
    );
    const categoryAmount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    showInfo(`${categoryName}: ${categoryExpenses.length} expenses totaling ${formatAmount(categoryAmount)}`);
  };

  const filteredExpenses = getFilteredExpenses();
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;
  const expensesByType = getExpensesByVendorType();
  const topVendors = getTopVendors();
  const paymentStats = getPaymentMethodStats();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.scrollContainer}>
      {/* Period Selection */}
      <Card style={styles.periodCard}>
        <Card.Content>
          <Title>Time Period</Title>
          <View style={styles.periodButtons}>
            <Button
              mode={selectedPeriod === 'month' ? 'contained' : 'outlined'}
              onPress={() => setSelectedPeriod('month')}
              style={styles.periodButton}
              compact
            >
              Last Month
            </Button>
            <Button
              mode={selectedPeriod === 'quarter' ? 'contained' : 'outlined'}
              onPress={() => setSelectedPeriod('quarter')}
              style={styles.periodButton}
              compact
            >
              3 Months
            </Button>
            <Button
              mode={selectedPeriod === 'year' ? 'contained' : 'outlined'}
              onPress={() => setSelectedPeriod('year')}
              style={styles.periodButton}
              compact
            >
              Last Year
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Enhanced Summary Stats */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Total Actual Expenses</Title>
            <Paragraph style={styles.summaryAmount}>
              {formatAmount(totalAmount)}
            </Paragraph>
            <Paragraph style={styles.summarySubtext}>Excluding salary income</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Number of Expenses</Title>
            <Paragraph style={styles.summaryAmount}>{filteredExpenses.length}</Paragraph>
            <Paragraph style={styles.summarySubtext}>Spending transactions</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Average Expense</Title>
            <Paragraph style={styles.summaryAmount}>
              {formatAmount(avgExpense)}
            </Paragraph>
            <Paragraph style={styles.summarySubtext}>Per transaction</Paragraph>
          </Card.Content>
        </Card>
      </View>

      {/* Payment Method Stats */}
      <Card style={styles.paymentCard}>
        <Card.Content>
          <Title>💳 Card vs 💵 Cash</Title>
          <View style={styles.paymentStats}>
            <View style={styles.paymentMethod}>
              <Chip mode="flat" style={styles.cardChip}>
                💳 Card: {paymentStats.cardCount} ({paymentStats.cardPercentage}%)
              </Chip>
            </View>
            <View style={styles.paymentMethod}>
              <Chip mode="flat" style={styles.cashChip}>
                💵 Cash: {paymentStats.cashCount} ({paymentStats.cashPercentage}%)
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Expenses by Category */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title>
            Expenses by Category
            <Paragraph style={styles.clickHint}>(Tap for details)</Paragraph>
          </Title>
          {expensesByType.length > 0 ? (
            <View style={styles.categoryList}>
              {expensesByType.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => handleCategoryPress(item.name)}
                  style={styles.categoryItem}
                  activeOpacity={0.7}
                >
                  <Surface style={styles.categoryCard} elevation={1}>
                    <View style={styles.categoryHeader}>
                      <Paragraph style={styles.categoryIcon}>
                        {getVendorTypeIcon(item.name)}
                      </Paragraph>
                      <View style={styles.categoryInfo}>
                        <Paragraph style={styles.categoryName}>{item.name}</Paragraph>
                        <Paragraph style={styles.categoryAmount}>
                          {formatAmount(item.value)} ({item.percentage}%)
                        </Paragraph>
                      </View>
                    </View>
                    <View style={styles.categoryBarContainer}>
                      <View 
                        style={[
                          styles.categoryBar,
                          { width: `${Math.max(parseFloat(item.percentage), 5)}%` }
                        ]} 
                      />
                    </View>
                  </Surface>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Paragraph style={styles.emptyText}>No data available for this period</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Top Vendors */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title>Top Vendors</Title>
          {topVendors.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Vendor</DataTable.Title>
                <DataTable.Title numeric>Amount</DataTable.Title>
                <DataTable.Title numeric>Count</DataTable.Title>
              </DataTable.Header>

              {topVendors.map((vendor, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>
                    <Paragraph numberOfLines={1}>{vendor.name}</Paragraph>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Paragraph>{formatAmount(vendor.amount)}</Paragraph>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Chip mode="outlined" compact>
                      {vendor.count}
                    </Chip>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          ) : (
            <Paragraph style={styles.emptyText}>No data available for this period</Paragraph>
          )}
        </Card.Content>
      </Card>
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      </View>
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
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodCard: {
    marginBottom: 16,
  },
  periodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  periodButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 2,
  },
  summaryTitle: {
    fontSize: 12,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summarySubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  paymentCard: {
    marginBottom: 16,
  },
  paymentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  paymentMethod: {
    flex: 1,
    marginHorizontal: 4,
  },
  cardChip: {
    backgroundColor: '#E3F2FD',
  },
  cashChip: {
    backgroundColor: '#E8F5E8',
  },
  chartCard: {
    marginBottom: 16,
  },
  clickHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  categoryList: {
    marginTop: 16,
  },
  categoryItem: {
    marginBottom: 8,
  },
  categoryCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoryAmount: {
    color: '#666',
    fontSize: 12,
  },
  categoryBarContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
});

export default StatisticsScreen;