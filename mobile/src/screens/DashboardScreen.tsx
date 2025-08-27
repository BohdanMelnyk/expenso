import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, DataTable, Chip, ActivityIndicator, Badge } from 'react-native-paper';
import { expenseAPI, Expense, formatAmount } from '../../shared/api/client';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

const DashboardScreen = () => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<'current_month' | 'this_year' | 'overall'>('current_month');

  useEffect(() => {
    fetchExpenses();
  }, [selectedRange]);

  const getDateRangeParams = (range: 'current_month' | 'this_year' | 'overall'): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (range) {
      case 'current_month':
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        return {
          startDate: firstDayOfMonth.toISOString().split('T')[0],
          endDate: lastDayOfMonth.toISOString().split('T')[0]
        };
      case 'this_year':
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`
        };
      case 'overall':
      default:
        return {};
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRangeParams(selectedRange);
      const response = await expenseAPI.getActualExpenses(startDate, endDate);
      setExpenses(response.data);
    } catch (error) {
      showError('Failed to fetch expenses');
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseAPI.deleteExpense(id);
              setExpenses(expenses.filter(expense => expense.id !== id));
              showSuccess('Expense deleted successfully');
            } catch (error) {
              showError('Failed to delete expense');
              console.error('Error deleting expense:', error);
            }
          },
        },
      ]
    );
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getAverageExpense = () => {
    return expenses.length > 0 ? getTotalExpenses() / expenses.length : 0;
  };

  const getPaymentMethodStats = () => {
    const cardExpenses = expenses.filter(exp => exp.paid_by_card);
    const cashExpenses = expenses.filter(exp => !exp.paid_by_card);
    const cardAmount = cardExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const cashAmount = cashExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const total = getTotalExpenses();
    
    return {
      cardCount: cardExpenses.length,
      cashCount: cashExpenses.length,
      cardAmount,
      cashAmount,
      cardPercentage: total > 0 ? ((cardAmount / total) * 100).toFixed(1) : '0',
      cashPercentage: total > 0 ? ((cashAmount / total) * 100).toFixed(1) : '0',
    };
  };

  const getRangeLabel = (range: 'current_month' | 'this_year' | 'overall'): string => {
    switch (range) {
      case 'current_month': return 'This Month';
      case 'this_year': return 'This Year';
      case 'overall': return 'Overall';
      default: return 'This Month';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const paymentStats = getPaymentMethodStats();

  return (
    <ScrollView style={styles.container}>
      {/* Header with Filter Controls */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.headerTitle}>
            Expense Dashboard
          </Title>
          <Paragraph style={styles.headerSubtitle}>
            Showing actual expenses - {getRangeLabel(selectedRange)}
          </Paragraph>
          
          {/* Date Range Filter */}
          <View style={styles.filterContainer}>
            <Button
              mode={selectedRange === 'current_month' ? 'contained' : 'outlined'}
              onPress={() => setSelectedRange('current_month')}
              style={styles.filterButton}
              compact
            >
              This Month
            </Button>
            <Button
              mode={selectedRange === 'this_year' ? 'contained' : 'outlined'}
              onPress={() => setSelectedRange('this_year')}
              style={styles.filterButton}
              compact
            >
              This Year
            </Button>
            <Button
              mode={selectedRange === 'overall' ? 'contained' : 'outlined'}
              onPress={() => setSelectedRange('overall')}
              style={styles.filterButton}
              compact
            >
              Overall
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Enhanced Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Total Spent</Title>
            <Paragraph style={styles.summaryAmount}>
              {formatAmount(getTotalExpenses())}
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Expenses</Title>
            <Paragraph style={styles.summaryAmount}>{expenses.length}</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Average</Title>
            <Paragraph style={styles.summaryAmount}>
              {formatAmount(getAverageExpense())}
            </Paragraph>
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

      {/* Recent Expenses */}
      <Card style={styles.expensesCard}>
        <Card.Content>
          <Title>Recent Expenses</Title>
          {expenses.length === 0 ? (
            <Paragraph style={styles.emptyText}>No expenses found.</Paragraph>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Description</DataTable.Title>
                <DataTable.Title numeric>Amount</DataTable.Title>
                <DataTable.Title>Vendor</DataTable.Title>
                <DataTable.Title>Payment</DataTable.Title>
                <DataTable.Title>Actions</DataTable.Title>
              </DataTable.Header>

              {expenses.slice(0, 10).map((expense) => (
                <DataTable.Row key={expense.id}>
                  <DataTable.Cell>
                    <View>
                      <Paragraph numberOfLines={1}>{expense.description}</Paragraph>
                      <Paragraph style={styles.dateText}>
                        {formatDate(expense.date)}
                      </Paragraph>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Paragraph>{formatAmount(expense.amount)}</Paragraph>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {expense.vendor ? (
                      <Chip mode="outlined" compact>
                        {expense.vendor.name}
                      </Chip>
                    ) : (
                      <Paragraph>Unknown</Paragraph>
                    )}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Chip 
                      mode="flat" 
                      compact
                      style={{
                        backgroundColor: expense.paid_by_card ? '#e3f2fd' : '#e8f5e8',
                      }}
                      textStyle={{
                        color: expense.paid_by_card ? '#1976d2' : '#388e3c',
                        fontSize: 10,
                      }}
                    >
                      {expense.paid_by_card ? '💳' : '💵'}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Button
                      mode="text"
                      onPress={() => handleDelete(expense.id)}
                      textColor="#f44336"
                      compact
                    >
                      Delete
                    </Button>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={fetchExpenses}
        style={styles.refreshButton}
        icon="refresh"
      >
        Refresh
      </Button>
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
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
  headerCard: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 2,
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
  expensesCard: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  refreshButton: {
    marginBottom: 32,
  },
});

export default DashboardScreen;