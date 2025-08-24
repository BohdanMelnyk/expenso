import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, DataTable, Chip, ActivityIndicator } from 'react-native-paper';
import { expenseAPI, Expense, formatAmount } from '../../../shared/api/client';

const DashboardScreen = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getExpenses();
      setExpenses(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch expenses');
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
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Summary Cards */}
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
            <Title style={styles.summaryTitle}>Total Expenses</Title>
            <Paragraph style={styles.summaryAmount}>{expenses.length}</Paragraph>
          </Card.Content>
        </Card>
      </View>

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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
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