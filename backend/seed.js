require('dotenv').config();
const connectDB = require('./config/db');
const Category = require('./models/Category');

const defaultCategories = [
  { name: 'Groceries', color: '#5B7553', monthlyBudget: 300 },
  { name: 'Dining Out', color: '#B5654A', monthlyBudget: 150 },
  { name: 'Transport', color: '#4A6B8A', monthlyBudget: 80 },
  { name: 'Rent', color: '#8A6D4A', monthlyBudget: 600 },
  { name: 'Utilities', color: '#6B5B95', monthlyBudget: 100 },
  { name: 'Entertainment', color: '#B08968', monthlyBudget: 60 },
  { name: 'Health', color: '#7A8B6F', monthlyBudget: 50 },
  { name: 'Shopping', color: '#A65D57', monthlyBudget: 100 },
  { name: 'Other', color: '#9A9689', monthlyBudget: 0 }
];

async function seed() {
  await connectDB();
  for (const cat of defaultCategories) {
    await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true });
  }
  console.log('Seeded default categories.');
  process.exit(0);
}

seed();
