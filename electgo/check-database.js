const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database state...\n');

    // Check Transaction table
    const transactions = await prisma.transaction.findMany();
    console.log(`📊 Transaction table: ${transactions.length} records`);
    
    if (transactions.length > 0) {
      console.log('Sample transactions:');
      transactions.slice(0, 3).forEach(t => {
        console.log(`  - ID: ${t.id}, Type: ${t.type}, Quantity: ${t.quantity}, Date: ${t.timestamp}`);
      });
    }

    // Check Sale table
    const sales = await prisma.sale.findMany();
    console.log(`\n💰 Sale table: ${sales.length} records`);
    
    if (sales.length > 0) {
      console.log('Sample sales:');
      sales.slice(0, 3).forEach(s => {
        console.log(`  - ID: ${s.id}, Item: ${s.item}, Price: ${s.price}, Date: ${s.date}`);
      });
    }

    // Check Product table
    const products = await prisma.product.findMany();
    console.log(`\n📦 Product table: ${products.length} records`);
    
    if (products.length > 0) {
      console.log('Sample products:');
      products.slice(0, 3).forEach(p => {
        console.log(`  - ID: ${p.id}, Name: ${p.name}, Quantity: ${p.quantity}, Price: ${p.unitPrice}`);
      });
    }

    // Check Expense table
    const expenses = await prisma.expense.findMany();
    console.log(`\n💸 Expense table: ${expenses.length} records`);
    
    if (expenses.length > 0) {
      console.log('Sample expenses:');
      expenses.slice(0, 3).forEach(e => {
        console.log(`  - ID: ${e.id}, Item: ${e.item}, Amount: ${e.amount}, Date: ${e.date}`);
      });
    }

    console.log('\n✅ Database check complete!');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 