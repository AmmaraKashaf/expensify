import { PrismaClient, TransactionType, PaymentMethod } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining",     icon: "utensils",      colorHex: "#F97316" },
  { name: "Transport",         icon: "car",           colorHex: "#3B82F6" },
  { name: "Shopping",          icon: "shopping-bag",  colorHex: "#8B5CF6" },
  { name: "Bills & Utilities", icon: "zap",           colorHex: "#EF4444" },
  { name: "Entertainment",     icon: "film",          colorHex: "#EC4899" },
  { name: "Health & Fitness",  icon: "heart",         colorHex: "#10B981" },
  { name: "Education",         icon: "book",          colorHex: "#06B6D4" },
  { name: "Groceries",         icon: "shopping-cart", colorHex: "#84CC16" },
  { name: "Rent & Housing",    icon: "home",          colorHex: "#1A1F36" },
  { name: "Travel",            icon: "plane",         colorHex: "#0EA5E9" },
  { name: "Gifts & Donations", icon: "gift",          colorHex: "#F59E0B" },
  { name: "Miscellaneous",     icon: "circle",        colorHex: "#6B7280" },
  { name: "Salary",            icon: "briefcase",     colorHex: "#10B981" },
  { name: "Freelance",         icon: "laptop",        colorHex: "#0EA5E9" },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Seeding default categories...");

  // Upsert default categories
  const categoryMap: Record<string, string> = {};
  for (const cat of DEFAULT_CATEGORIES) {
    const c = await prisma.category.upsert({
      where: { id: cat.name }, // won't match, triggers create
      update: {},
      create: { name: cat.name, icon: cat.icon, colorHex: cat.colorHex, isDefault: true },
    }).catch(() =>
      prisma.category.findFirst({ where: { name: cat.name, isDefault: true } }).then((c) => c!)
    );
    categoryMap[cat.name] = c.id;
  }

  // Re-fetch to ensure we have all IDs
  const cats = await prisma.category.findMany({ where: { isDefault: true } });
  for (const c of cats) categoryMap[c.name] = c.id;

  console.log("Creating demo user...");
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@wealthlens.app" },
    update: {},
    create: {
      email: "demo@wealthlens.app",
      displayName: "Demo User",
      baseCurrency: "USD",
      themePreference: "system",
    },
  });

  console.log("Seeding demo transactions (3 months)...");

  type TxSeed = {
    categoryName: string;
    type: TransactionType;
    amount: number;
    merchantName: string;
    daysBack: number;
    paymentMethod: PaymentMethod;
  };

  const txSeeds: TxSeed[] = [
    // Salaries (monthly)
    { categoryName: "Salary",          type: "income",  amount: 4800,  merchantName: "Monthly Salary",     daysBack: 2,   paymentMethod: "bank_transfer" },
    { categoryName: "Salary",          type: "income",  amount: 4800,  merchantName: "Monthly Salary",     daysBack: 32,  paymentMethod: "bank_transfer" },
    { categoryName: "Salary",          type: "income",  amount: 4800,  merchantName: "Monthly Salary",     daysBack: 62,  paymentMethod: "bank_transfer" },
    { categoryName: "Freelance",       type: "income",  amount: 650,   merchantName: "Freelance Project",  daysBack: 10,  paymentMethod: "bank_transfer" },
    { categoryName: "Freelance",       type: "income",  amount: 950,   merchantName: "Client Project",     daysBack: 45,  paymentMethod: "bank_transfer" },

    // Rent
    { categoryName: "Rent & Housing",  type: "expense", amount: 1200,  merchantName: "Monthly Rent",       daysBack: 3,   paymentMethod: "bank_transfer" },
    { categoryName: "Rent & Housing",  type: "expense", amount: 1200,  merchantName: "Monthly Rent",       daysBack: 33,  paymentMethod: "bank_transfer" },
    { categoryName: "Rent & Housing",  type: "expense", amount: 1200,  merchantName: "Monthly Rent",       daysBack: 63,  paymentMethod: "bank_transfer" },

    // Food
    { categoryName: "Food & Dining",   type: "expense", amount: 24.50, merchantName: "Starbucks",          daysBack: 1,   paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 67.20, merchantName: "Tandoori Nights",    daysBack: 4,   paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 12.00, merchantName: "McDonald's",         daysBack: 6,   paymentMethod: "cash" },
    { categoryName: "Food & Dining",   type: "expense", amount: 45.80, merchantName: "Olive Garden",       daysBack: 11,  paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 8.50,  merchantName: "Subway",             daysBack: 14,  paymentMethod: "cash" },
    { categoryName: "Food & Dining",   type: "expense", amount: 32.00, merchantName: "Thai Palace",        daysBack: 18,  paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 15.75, merchantName: "Chipotle",           daysBack: 22,  paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 58.40, merchantName: "The Cheesecake Factory", daysBack: 28, paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 9.00,  merchantName: "Starbucks",          daysBack: 35,  paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 41.20, merchantName: "Sushi Bar",          daysBack: 40,  paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 22.50, merchantName: "Pizza Hut",          daysBack: 50,  paymentMethod: "cash" },
    { categoryName: "Food & Dining",   type: "expense", amount: 76.00, merchantName: "Birthday Dinner",    daysBack: 58,  paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 13.40, merchantName: "Dunkin",             daysBack: 65,  paymentMethod: "card" },
    { categoryName: "Food & Dining",   type: "expense", amount: 38.90, merchantName: "Italian Bistro",     daysBack: 72,  paymentMethod: "card" },

    // Groceries
    { categoryName: "Groceries",       type: "expense", amount: 142.30, merchantName: "Whole Foods",       daysBack: 5,   paymentMethod: "card" },
    { categoryName: "Groceries",       type: "expense", amount: 98.60,  merchantName: "Trader Joe's",      daysBack: 19,  paymentMethod: "card" },
    { categoryName: "Groceries",       type: "expense", amount: 156.10, merchantName: "Walmart",           daysBack: 36,  paymentMethod: "card" },
    { categoryName: "Groceries",       type: "expense", amount: 112.50, merchantName: "Costco",            daysBack: 52,  paymentMethod: "card" },
    { categoryName: "Groceries",       type: "expense", amount: 87.40,  merchantName: "Kroger",            daysBack: 70,  paymentMethod: "card" },

    // Transport
    { categoryName: "Transport",       type: "expense", amount: 42.00,  merchantName: "Uber",              daysBack: 2,   paymentMethod: "card" },
    { categoryName: "Transport",       type: "expense", amount: 85.00,  merchantName: "Gas Station",       daysBack: 8,   paymentMethod: "card" },
    { categoryName: "Transport",       type: "expense", amount: 35.50,  merchantName: "Lyft",              daysBack: 15,  paymentMethod: "card" },
    { categoryName: "Transport",       type: "expense", amount: 92.00,  merchantName: "Shell",             daysBack: 25,  paymentMethod: "card" },
    { categoryName: "Transport",       type: "expense", amount: 28.00,  merchantName: "Parking",           daysBack: 31,  paymentMethod: "cash" },
    { categoryName: "Transport",       type: "expense", amount: 89.00,  merchantName: "BP Gas",            daysBack: 48,  paymentMethod: "card" },
    { categoryName: "Transport",       type: "expense", amount: 15.00,  merchantName: "Metro Card",        daysBack: 60,  paymentMethod: "card" },

    // Bills
    { categoryName: "Bills & Utilities", type: "expense", amount: 120.00, merchantName: "Electric Bill",  daysBack: 7,   paymentMethod: "bank_transfer" },
    { categoryName: "Bills & Utilities", type: "expense", amount: 89.99,  merchantName: "Internet",       daysBack: 7,   paymentMethod: "bank_transfer" },
    { categoryName: "Bills & Utilities", type: "expense", amount: 65.00,  merchantName: "Water Bill",     daysBack: 7,   paymentMethod: "bank_transfer" },
    { categoryName: "Bills & Utilities", type: "expense", amount: 120.00, merchantName: "Electric Bill",  daysBack: 37,  paymentMethod: "bank_transfer" },
    { categoryName: "Bills & Utilities", type: "expense", amount: 89.99,  merchantName: "Internet",       daysBack: 37,  paymentMethod: "bank_transfer" },
    { categoryName: "Bills & Utilities", type: "expense", amount: 120.00, merchantName: "Electric Bill",  daysBack: 67,  paymentMethod: "bank_transfer" },

    // Entertainment
    { categoryName: "Entertainment",   type: "expense", amount: 15.99,  merchantName: "Netflix",          daysBack: 5,   paymentMethod: "card" },
    { categoryName: "Entertainment",   type: "expense", amount: 9.99,   merchantName: "Spotify",          daysBack: 5,   paymentMethod: "card" },
    { categoryName: "Entertainment",   type: "expense", amount: 14.99,  merchantName: "Disney+",          daysBack: 5,   paymentMethod: "card" },
    { categoryName: "Entertainment",   type: "expense", amount: 48.00,  merchantName: "Concert Tickets",  daysBack: 20,  paymentMethod: "card" },
    { categoryName: "Entertainment",   type: "expense", amount: 26.00,  merchantName: "Movie Theater",    daysBack: 38,  paymentMethod: "card" },
    { categoryName: "Entertainment",   type: "expense", amount: 15.99,  merchantName: "Netflix",          daysBack: 35,  paymentMethod: "card" },
    { categoryName: "Entertainment",   type: "expense", amount: 9.99,   merchantName: "Spotify",          daysBack: 35,  paymentMethod: "card" },
    { categoryName: "Entertainment",   type: "expense", amount: 72.00,  merchantName: "Game Purchase",    daysBack: 55,  paymentMethod: "card" },

    // Shopping
    { categoryName: "Shopping",        type: "expense", amount: 89.99,  merchantName: "Amazon",           daysBack: 9,   paymentMethod: "card" },
    { categoryName: "Shopping",        type: "expense", amount: 145.00, merchantName: "Nike",             daysBack: 21,  paymentMethod: "card" },
    { categoryName: "Shopping",        type: "expense", amount: 34.50,  merchantName: "Target",           daysBack: 30,  paymentMethod: "card" },
    { categoryName: "Shopping",        type: "expense", amount: 210.00, merchantName: "Apple Store",      daysBack: 44,  paymentMethod: "card" },
    { categoryName: "Shopping",        type: "expense", amount: 67.80,  merchantName: "H&M",              daysBack: 59,  paymentMethod: "card" },
    { categoryName: "Shopping",        type: "expense", amount: 155.20, merchantName: "Best Buy",         daysBack: 75,  paymentMethod: "card" },

    // Health
    { categoryName: "Health & Fitness", type: "expense", amount: 50.00, merchantName: "Gym Membership",  daysBack: 6,   paymentMethod: "bank_transfer" },
    { categoryName: "Health & Fitness", type: "expense", amount: 35.00, merchantName: "Doctor Visit",    daysBack: 23,  paymentMethod: "card" },
    { categoryName: "Health & Fitness", type: "expense", amount: 50.00, merchantName: "Gym Membership",  daysBack: 36,  paymentMethod: "bank_transfer" },
    { categoryName: "Health & Fitness", type: "expense", amount: 78.50, merchantName: "Pharmacy",        daysBack: 42,  paymentMethod: "card" },
    { categoryName: "Health & Fitness", type: "expense", amount: 50.00, merchantName: "Gym Membership",  daysBack: 66,  paymentMethod: "bank_transfer" },

    // Education
    { categoryName: "Education",       type: "expense", amount: 29.99,  merchantName: "Udemy Course",     daysBack: 13,  paymentMethod: "card" },
    { categoryName: "Education",       type: "expense", amount: 49.99,  merchantName: "Coursera",         daysBack: 46,  paymentMethod: "card" },
  ];

  // Clean up existing demo transactions
  await prisma.transaction.deleteMany({ where: { userId: demoUser.id } });

  for (const seed of txSeeds) {
    const catId = categoryMap[seed.categoryName];
    if (!catId) { console.warn(`Category not found: ${seed.categoryName}`); continue; }

    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        categoryId: catId,
        type: seed.type,
        amount: seed.amount,
        currency: "USD",
        convertedAmount: seed.amount,
        merchantName: seed.merchantName,
        date: daysAgo(seed.daysBack),
        paymentMethod: seed.paymentMethod,
        tags: [],
      },
    });
  }

  console.log(`Seeded ${txSeeds.length} demo transactions.`);
  console.log("Done! Demo login: demo@wealthlens.app (use Supabase to create this user)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
