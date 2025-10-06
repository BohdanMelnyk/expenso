import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExpenseData {
  id: number;
  amount: number;
  comment: string;
  date: string;
  category: string;
  vendor?: { name: string };
  paid_by_card: boolean;
  tags?: string[];
}

interface IncomeData {
  id: number;
  amount: number;
  comment: string;
  date: string;
  source: string;
}

interface ExportData {
  expenses: ExpenseData[];
  incomes: IncomeData[];
  period?: string;
}

export const exportToPDF = (data: ExportData) => {
  const doc = new jsPDF();
  const currentDate = new Date().toLocaleDateString();
  
  // Header
  doc.setFontSize(20);
  doc.text('Expenso Financial Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${currentDate}`, 20, 30);
  if (data.period) {
    doc.text(`Period: ${data.period}`, 20, 40);
  }
  
  let yPosition = data.period ? 50 : 40;
  
  // Expenses Section
  if (data.expenses.length > 0) {
    doc.setFontSize(16);
    doc.text('Expenses', 20, yPosition);
    yPosition += 10;
    
    const expenseRows = data.expenses.map(expense => [
      expense.date,
      expense.comment,
      expense.category,
      expense.vendor?.name || '-',
      expense.paid_by_card ? 'Card' : 'Cash',
      `€${expense.amount.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Description', 'Category', 'Vendor', 'Payment', 'Amount']],
      body: expenseRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        5: { halign: 'right' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 20;
  }
  
  // Incomes Section
  if (data.incomes.length > 0) {
    doc.setFontSize(16);
    doc.text('Incomes', 20, yPosition);
    yPosition += 10;
    
    const incomeRows = data.incomes.map(income => [
      income.date,
      income.comment,
      income.source,
      `€${income.amount.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Description', 'Source', 'Amount']],
      body: incomeRows,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 20;
  }
  
  // Summary
  if (data.expenses.length > 0 || data.incomes.length > 0) {
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncomes = data.incomes.reduce((sum, income) => sum + income.amount, 0);
    const netAmount = totalIncomes - totalExpenses;
    
    doc.setFontSize(14);
    doc.text('Summary', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.text(`Total Expenses: €${totalExpenses.toFixed(2)}`, 20, yPosition);
    doc.text(`Total Incomes: €${totalIncomes.toFixed(2)}`, 20, yPosition + 10);
    doc.text(`Net Amount: €${netAmount.toFixed(2)}`, 20, yPosition + 20);
  }
  
  // Save the PDF
  const filename = `expenso-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};