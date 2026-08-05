import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { monthKey } from "@/lib/format";

// Comercios frecuentes con categorías sugeridas
const MERCHANTS = [
  { name: "OXXO", normalizedName: "oxxo", category: "Conveniencia" },
  { name: "Starbucks", normalizedName: "starbucks", category: "Café" },
  { name: "Costco", normalizedName: "costco", category: "Despensa" },
  { name: "Walmart", normalizedName: "walmart", category: "Despensa" },
  { name: "Netflix", normalizedName: "netflix", category: "Streaming" },
  { name: "Spotify", normalizedName: "spotify", category: "Streaming" },
  { name: "Amazon", normalizedName: "amazon", category: "Compras Online" },
  { name: "Uber", normalizedName: "uber", category: "Transporte" },
  { name: "Uber Eats", normalizedName: "uber eats", category: "Restaurantes" },
  { name: "Rappi", normalizedName: "rappi", category: "Restaurantes" },
  { name: "Shell", normalizedName: "shell", category: "Gasolina" },
  { name: "Pemex", normalizedName: "pemex", category: "Gasolina" },
  { name: "Farmacias del Ahorro", normalizedName: "farmacias del ahorro", category: "Salud" },
  { name: "Sanborns", normalizedName: "sanborns", category: "Restaurantes" },
  { name: "Cinépolis", normalizedName: "cinepolis", category: "Entretenimiento" },
  { name: "Apple", normalizedName: "apple", category: "Tecnología" },
  { name: "Mercado Libre", normalizedName: "mercado libre", category: "Compras Online" },
  { name: "Vips", normalizedName: "vips", category: "Restaurantes" },
  { name: "Toks", normalizedName: "toks", category: "Restaurantes" },
  { name: "7-Eleven", normalizedName: "7-eleven", category: "Conveniencia" },
];

const SUBCATEGORIES: Record<string, string[]> = {
  Despensa: ["Frutas y verduras", "Carnes", "Lácteos", "Abarrotes", "Limpieza"],
  Restaurantes: ["Comida rápida", "Cena", "Desayuno", "Comida"],
  Café: ["Bebidas", "Postres"],
  Transporte: ["Taxi", "Transporte público", "Ride-sharing"],
  Gasolina: ["Magna", "Premium", "Diésel"],
  Streaming: ["Video", "Música", "Gaming"],
  "Compras Online": ["Electrónica", "Hogar", "Ropa", "Libros"],
  Salud: ["Medicamentos", "Consultas", "Farmacia"],
  Hogar: ["Renta", "Servicios", "Mantenimiento"],
  Servicios: ["Luz", "Agua", "Gas", "Internet", "Teléfono"],
  Entretenimiento: ["Cine", "Conciertos", "Eventos"],
  Educación: ["Cursos", "Libros", "Colegiatura"],
  Tecnología: ["Software", "Hardware", "Accesorios"],
};

function randomAmount(min: number, max: number, decimals = 2): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randomInt(8, 21), randomInt(0, 59), 0, 0);
  return d;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("🌱 Seeding database...");

  await db.expense.deleteMany();
  await db.merchantHint.deleteMany();
  await db.merchant.deleteMany();
  await db.subcategory.deleteMany();
  await db.budget.deleteMany();
  await db.subscription.deleteMany();
  await db.reminder.deleteMany();
  await db.aiInsight.deleteMany();
  await db.savingsGoal.deleteMany();
  await db.account.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  const user = await db.user.create({
    data: {
      email: "demo@moneyflow.app",
      name: "Demo",
      currency: "MXN",
      monthlyGoal: 8000,
    },
  });
  console.log("✓ User created");

  const catMap: Record<string, string> = {};
  for (const c of DEFAULT_CATEGORIES) {
    const created = await db.category.create({
      data: {
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: "expense",
        isDefault: true,
      },
    });
    catMap[c.name] = created.id;

    const subs = SUBCATEGORIES[c.name];
    if (subs) {
      for (const s of subs) {
        await db.subcategory.create({
          data: { name: s, categoryId: created.id },
        });
      }
    }
  }
  if (!catMap["Conveniencia"]) {
    const c = await db.category.create({
      data: {
        name: "Conveniencia",
        icon: "ShoppingCart",
        color: "amber",
        type: "expense",
        isDefault: true,
      },
    });
    catMap["Conveniencia"] = c.id;
  }
  // Categorías de ingreso
  for (const c of DEFAULT_INCOME_CATEGORIES) {
    const created = await db.category.create({
      data: {
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: "income",
        isDefault: true,
      },
    });
    catMap[c.name] = created.id;
  }
  console.log("✓ Categories created");

  const accounts = await Promise.all([
    db.account.create({
      data: {
        name: "Efectivo",
        type: "cash",
        balance: 3200,
        currency: "MXN",
        color: "emerald",
        isDefault: true,
      },
    }),
    db.account.create({
      data: {
        name: "Tarjeta BBVA Oro",
        type: "credit",
        balance: -8450.5,
        currency: "MXN",
        color: "purple",
        bank: "BBVA",
        last4: "4521",
        creditLimit: 30000,
        dueDay: 15,
      },
    }),
    db.account.create({
      data: {
        name: "Débito Santander",
        type: "debit",
        balance: 18450.75,
        currency: "MXN",
        color: "teal",
        bank: "Santander",
        last4: "8832",
      },
    }),
    db.account.create({
      data: {
        name: "Mercado Pago",
        type: "wallet",
        balance: 1250,
        currency: "MXN",
        color: "orange",
      },
    }),
  ]);
  console.log("✓ Accounts created");

  const merMap: Record<string, string> = {};
  for (const m of MERCHANTS) {
    const catId = catMap[m.category];
    const merchant = await db.merchant.create({
      data: {
        name: m.name,
        normalizedName: m.normalizedName,
        defaultCategoryId: catId,
        defaultPaymentMethod: "credit",
        defaultAccountId: accounts[1].id,
        useCount: randomInt(2, 15),
      },
    });
    merMap[m.name] = merchant.id;
    await db.merchantHint.create({
      data: { merchantId: merchant.id, categoryId: catId, score: randomInt(3, 10) },
    });
  }
  console.log("✓ Merchants created");

  const expenseTemplates: Array<{
    merchant: string;
    min: number;
    max: number;
    method?: string;
    accountIdx?: number;
    recurring?: string;
  }> = [
    { merchant: "Netflix", min: 219, max: 219, method: "credit", accountIdx: 1, recurring: "Netflix" },
    { merchant: "Spotify", min: 115, max: 115, method: "credit", accountIdx: 1, recurring: "Spotify" },
    { merchant: "Starbucks", min: 85, max: 180, method: "credit", accountIdx: 1 },
    { merchant: "OXXO", min: 30, max: 250, method: "cash", accountIdx: 0 },
    { merchant: "Costco", min: 800, max: 3500, method: "credit", accountIdx: 1 },
    { merchant: "Walmart", min: 400, max: 1800, method: "credit", accountIdx: 1 },
    { merchant: "Uber", min: 60, max: 220, method: "credit", accountIdx: 1 },
    { merchant: "Uber Eats", min: 180, max: 450, method: "credit", accountIdx: 1 },
    { merchant: "Rappi", min: 150, max: 380, method: "credit", accountIdx: 1 },
    { merchant: "Shell", min: 500, max: 900, method: "credit", accountIdx: 1 },
    { merchant: "Pemex", min: 480, max: 850, method: "credit", accountIdx: 1 },
    { merchant: "Farmacias del Ahorro", min: 120, max: 650, method: "cash", accountIdx: 0 },
    { merchant: "Amazon", min: 200, max: 2200, method: "credit", accountIdx: 1 },
    { merchant: "Sanborns", min: 180, max: 520, method: "credit", accountIdx: 1 },
    { merchant: "Cinépolis", min: 120, max: 380, method: "credit", accountIdx: 1 },
    { merchant: "Mercado Libre", min: 300, max: 2800, method: "credit", accountIdx: 1 },
    { merchant: "Vips", min: 220, max: 580, method: "credit", accountIdx: 1 },
    { merchant: "7-Eleven", min: 25, max: 180, method: "cash", accountIdx: 0 },
  ];

  const totalExpenses = 140;
  for (let i = 0; i < totalExpenses; i++) {
    const t = pick(expenseTemplates);
    const merchant = await db.merchant.findUnique({ where: { normalizedName: t.merchant.toLowerCase() } });
    if (!merchant) continue;
    const category = await db.category.findUnique({ where: { id: merchant.defaultCategoryId! } });
    if (!category) continue;
    const subs = await db.subcategory.findMany({ where: { categoryId: category.id } });
    const amount = randomAmount(t.min, t.max);
    const date = daysAgo(randomInt(0, 89));
    const account = accounts[t.accountIdx ?? 0];

    await db.expense.create({
      data: {
        amount,
        type: "expense",
        currency: "MXN",
        date,
        categoryId: category.id,
        subcategoryId: subs.length ? pick(subs).id : null,
        merchantId: merchant.id,
        merchantName: merchant.name,
        paymentMethod: t.method ?? "cash",
        accountId: account.id,
        notes: "",
        tags: t.recurring ? "recurrente" : "",
        isRecurring: !!t.recurring,
        recurringName: t.recurring,
        source: Math.random() > 0.6 ? "scan" : "manual",
        subtotal: amount / 1.16,
        tax: amount - amount / 1.16,
      },
    });
  }

  // Ingresos de ejemplo (salario mensual de los últimos 3 meses)
  const incomeTemplates: Array<{
    categoryName: string;
    merchantName: string;
    amount: number;
    method: string;
    accountIdx: number;
  }> = [
    { categoryName: "Salario", merchantName: "Mi Empresa SA", amount: 28000, method: "transfer", accountIdx: 2 },
    { categoryName: "Freelance", merchantName: "Cliente Freelance", amount: randomAmount(3000, 8000), method: "transfer", accountIdx: 2 },
    { categoryName: "Inversiones", merchantName: "Broker", amount: randomAmount(500, 2500), method: "transfer", accountIdx: 2 },
  ];
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    for (const inc of incomeTemplates) {
      const catId = catMap[inc.categoryName];
      if (!catId) continue;
      const date = daysAgo(monthOffset * 30 + randomInt(1, 5));
      const account = accounts[inc.accountIdx];
      await db.expense.create({
        data: {
          amount: inc.amount,
          type: "income",
          currency: "MXN",
          date,
          categoryId: catId,
          merchantName: inc.merchantName,
          paymentMethod: inc.method,
          accountId: account.id,
          notes: "",
          tags: "",
          source: "manual",
        },
      });
    }
  }
  console.log("✓ Incomes created");

  const budgets: Array<{ cat: string; amount: number }> = [
    { cat: "Restaurantes", amount: 4000 },
    { cat: "Despensa", amount: 6000 },
    { cat: "Gasolina", amount: 3000 },
    { cat: "Café", amount: 1200 },
    { cat: "Entretenimiento", amount: 1500 },
    { cat: "Compras Online", amount: 3000 },
    { cat: "Transporte", amount: 1500 },
  ];
  for (const b of budgets) {
    const catId = catMap[b.cat];
    if (catId) {
      await db.budget.create({
        data: {
          categoryId: catId,
          amount: b.amount,
          period: "monthly",
          month: monthKey(),
        },
      });
    }
  }
  console.log("✓ Budgets created");

  const subs = [
    // Suscripciones digitales
    { name: "Netflix", type: "subscription", merchantName: "Netflix", amount: 219, period: "monthly", category: "Streaming" },
    { name: "Spotify", type: "subscription", merchantName: "Spotify", amount: 115, period: "monthly", category: "Streaming" },
    { name: "Amazon Prime", type: "subscription", merchantName: "Amazon", amount: 99, period: "monthly", category: "Streaming" },
    { name: "iCloud Storage", type: "subscription", merchantName: "Apple", amount: 49, period: "monthly", category: "Tecnología" },
    // Renta / vivienda
    { name: "Renta departamento", type: "rent", merchantName: "Propietario", amount: 12000, period: "monthly", category: "Hogar" },
    // Servicios básicos
    { name: "Internet Izzi", type: "services", merchantName: "Izzi", amount: 599, period: "monthly", category: "Servicios" },
    { name: "Luz CFE", type: "services", merchantName: "CFE", amount: 850, period: "monthly", category: "Servicios" },
    { name: "Agua SAPAL", type: "services", merchantName: "SAPAL", amount: 320, period: "monthly", category: "Servicios" },
    // Nómina / empleados
    { name: "Nómina Empleado", type: "payroll", merchantName: "Empleado DOM", amount: 4500, period: "weekly", category: "Otros" },
    // Préstamos
    { name: "Colegiatura hijo", type: "loan", merchantName: "Colegio Montessori", amount: 3500, period: "monthly", category: "Educación" },
    { name: "Pago auto", type: "loan", merchantName: "Ford Credit", amount: 5200, period: "monthly", category: "Otros" },
    // Otros
    { name: "Gimnasio Smart Fit", type: "subscription", merchantName: "Smart Fit", amount: 299, period: "monthly", category: "Fitness" },
    { name: "Seguro de auto", type: "other", merchantName: "GNP Seguros", amount: 1200, period: "monthly", category: "Otros" },
  ];
  for (const s of subs) {
    const catId = catMap[s.category];
    const next = new Date();
    next.setDate(next.getDate() + randomInt(1, 25));
    await db.subscription.create({
      data: {
        name: s.name,
        type: s.type,
        merchantName: s.merchantName,
        amount: s.amount,
        currency: "MXN",
        period: s.period,
        nextDate: next,
        categoryId: catId,
        accountId: accounts[1].id,
        active: true,
      },
    });
  }
  console.log("✓ Recurring charges created");

  const reminders = [
    { title: "Pagar tarjeta BBVA Oro", type: "pay_card", dueIn: 5 },
    { title: "Registrar gastos en efectivo", type: "register_cash", dueIn: 1 },
    { title: "Pagar servicio de luz (CFE)", type: "pay_service", dueIn: 8 },
    { title: "Registrar gastos de la semana", type: "register", dueIn: 2 },
  ];
  for (const r of reminders) {
    const due = new Date();
    due.setDate(due.getDate() + r.dueIn);
    await db.reminder.create({
      data: { title: r.title, type: r.type, dueDate: due },
    });
  }
  console.log("✓ Reminders created");

  const goals = [
    { name: "Viaje a Japón", target: 80000, current: 32500, color: "teal", icon: "Plane" },
    { name: "Fondo de emergencia", target: 60000, current: 48000, color: "emerald", icon: "PiggyBank" },
    { name: "MacBook Pro", target: 55000, current: 18500, color: "slate", icon: "Smartphone" },
  ];
  for (const g of goals) {
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + randomInt(3, 12));
    await db.savingsGoal.create({
      data: {
        name: g.name,
        target: g.target,
        current: g.current,
        deadline,
        color: g.color,
        icon: g.icon,
      },
    });
  }
  console.log("✓ Savings goals created");

  const insights = [
    {
      type: "monthly",
      title: "Resumen de este mes",
      content:
        "Este mes gastaste un 22% más en restaurantes comparado con el mes pasado. Tus compras en Amazon aumentaron un 15%. Podrías ahorrar aproximadamente $2,500 si reduces un café por día.",
      period: monthKey(),
    },
    {
      type: "tip",
      title: "Oportunidad de ahorro",
      content:
        "Detectamos 3 suscripciones de streaming activas. Si cancelas una que usas poco, ahorrarías ~$219 al mes ($2,628 al año).",
      period: monthKey(),
    },
    {
      type: "prediction",
      title: "Predicción de cierre de mes",
      content:
        "Con tu ritmo actual, proyectamos que cerrarás el mes con ~$18,450 en gastos, lo cual está dentro de tu presupuesto.",
      period: monthKey(),
    },
  ];
  for (const i of insights) {
    await db.aiInsight.create({ data: i });
  }
  console.log("✓ AI Insights created");

  console.log(`🎉 Seed completado para usuario ${user.email}`);
}

seed()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
