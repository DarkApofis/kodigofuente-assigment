import { AppDataSource } from '../config/data-source';

// Idempotent seed: relies on UNIQUE(name) + ON CONFLICT DO NOTHING,
// so it is safe to run on every container start.
// Category and product names are in Spanish on purpose: they are end-user
// facing data for a Spanish-speaking POS, not code.

const CATEGORIES = ['Bebidas', 'Panadería', 'Lácteos', 'Snacks'];

const PRODUCTS: Array<{ name: string; category: string }> = [
  { name: 'Café americano 12oz', category: 'Bebidas' },
  { name: 'Jugo de naranja natural 500ml', category: 'Bebidas' },
  { name: 'Gaseosa cola 400ml', category: 'Bebidas' },
  { name: 'Croissant de mantequilla', category: 'Panadería' },
  { name: 'Baguette artesanal', category: 'Panadería' },
  { name: 'Torta de chocolate (porción)', category: 'Panadería' },
  { name: 'Leche entera 1L', category: 'Lácteos' },
  { name: 'Yogur de fresa 200g', category: 'Lácteos' },
  { name: 'Papas fritas 150g', category: 'Snacks' },
  { name: 'Galletas de avena x6', category: 'Snacks' },
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const categoryValues = CATEGORIES.map((_, i) => `($${i + 1})`).join(', ');
    await AppDataSource.query(
      `INSERT INTO categories (name) VALUES ${categoryValues}
       ON CONFLICT (name) DO NOTHING`,
      CATEGORIES,
    );

    const productValues = PRODUCTS.map(
      (_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`,
    ).join(', ');
    const productParams = PRODUCTS.flatMap((p) => [p.name, p.category]);
    await AppDataSource.query(
      `INSERT INTO products (name, category_id)
       SELECT v.name, c.id
       FROM (VALUES ${productValues}) AS v(name, category_name)
       JOIN categories c ON c.name = v.category_name
       ON CONFLICT (name) DO NOTHING`,
      productParams,
    );

    const [{ categories }] = (await AppDataSource.query(
      'SELECT count(*)::int AS categories FROM categories',
    )) as Array<{ categories: number }>;
    const [{ products }] = (await AppDataSource.query(
      'SELECT count(*)::int AS products FROM products',
    )) as Array<{ products: number }>;
    console.log(`Seed done: ${categories} categories, ${products} products`);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
