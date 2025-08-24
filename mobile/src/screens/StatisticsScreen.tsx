import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, DataTable, Chip } from 'react-native-paper';
import { expenseAPI, Expense, formatAmount } from '../../../shared/api/client';

const { width } = Dimensions.get('window');

const StatisticsScreen = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getExpenses();
      setExpenses(response.data);
    } catch (error) {
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

  const filteredExpenses = getFilteredExpenses();
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;
  const expensesByType = getExpensesByVendorType();
  const topVendors = getTopVendors();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Total Spent</Title>
            <Paragraph style={styles.summaryAmount}>
              {formatAmount(totalAmount)}
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Expenses</Title>
            <Paragraph style={styles.summaryAmount}>{filteredExpenses.length}</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Average</Title>
            <Paragraph style={styles.summaryAmount}>
              {formatAmount(avgExpense)}
            </Paragraph>
          </Card.Content>
        </Card>
      </View>

      {/* Expenses by Category */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title>Expenses by Category</Title>
          {expensesByType.length > 0 ? (
            <View style={styles.categoryList}>
              {expensesByType.map((item, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Paragraph style={styles.categoryName}>{item.name}</Paragraph>
                    <Paragraph style={styles.categoryAmount}>
                      {formatAmount(item.value)} ({item.percentage}%)
                    </Paragraph>
                  </View>
                  <View 
                    style={[
                      styles.categoryBar,
                      { width: `${item.percentage}%` }
                    ]} 
                  />
                </View>
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
    fontSize: 14,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  chartCard: {
    marginBottom: 16,
  },
  categoryList: {
    marginTop: 16,
  },
  categoryItem: {
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    flex: 1,
    fontWeight: 'bold',
  },
  categoryAmount: {
    color: '#666',
  },
  categoryBar: {
    height: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
});

export default StatisticsScreen;