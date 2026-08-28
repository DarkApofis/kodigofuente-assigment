import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1787788800000 implements MigrationInterface {
  name = 'InitialSchema1787788800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "promotion_status" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "discount_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT')`,
    );

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"       varchar(120) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_categories_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        varchar(120) NOT NULL,
        "category_id" uuid NOT NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_products_name" UNIQUE ("name"),
        CONSTRAINT "fk_products_category" FOREIGN KEY ("category_id")
          REFERENCES "categories" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"           varchar(120) NOT NULL,
        "product_id"     uuid NULL,
        "category_id"    uuid NULL,
        "discount_type"  "discount_type" NOT NULL,
        "discount_value" numeric(10,2) NOT NULL,
        "start_date"     date NOT NULL,
        "end_date"       date NOT NULL,
        "status"         "promotion_status" NOT NULL DEFAULT 'SCHEDULED',
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_promotions_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_promotions_category" FOREIGN KEY ("category_id")
          REFERENCES "categories" ("id") ON DELETE RESTRICT,
        -- Exactly one target: product XOR category
        CONSTRAINT "chk_promotions_target_xor" CHECK (
          ("product_id" IS NOT NULL AND "category_id" IS NULL) OR
          ("product_id" IS NULL AND "category_id" IS NOT NULL)
        ),
        CONSTRAINT "chk_promotions_date_range" CHECK ("end_date" > "start_date"),
        CONSTRAINT "chk_promotions_value_positive" CHECK ("discount_value" > 0),
        -- Percentages are only valid between 1 and 100
        CONSTRAINT "chk_promotions_percentage_range" CHECK (
          "discount_type" <> 'PERCENTAGE' OR
          ("discount_value" >= 1 AND "discount_value" <= 100)
        )
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_promotions_status" ON "promotions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_promotions_dates" ON "promotions" ("start_date", "end_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "promotions"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TYPE "discount_type"`);
    await queryRunner.query(`DROP TYPE "promotion_status"`);
  }
}
