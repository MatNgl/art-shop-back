import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesAndSubcategories1770675317980 implements MigrationInterface {
  name = 'AddCategoriesAndSubcategories1770675317980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "position" integer NOT NULL DEFAULT '0', "created_by" uuid NOT NULL, "modified_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subcategories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "position" integer NOT NULL DEFAULT '0', "category_id" uuid NOT NULL, "created_by" uuid NOT NULL, "modified_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_290ef46936579a55f65f81f5e4c" UNIQUE ("slug"), CONSTRAINT "PK_793ef34ad0a3f86f09d4837007c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_categories" ("product_id" uuid NOT NULL, "category_id" uuid NOT NULL, CONSTRAINT "PK_54f2e1dbf14cfa770f59f0aac8f" PRIMARY KEY ("product_id", "category_id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_8748b4a0e8de6d266f2bbc877f" ON "product_categories" ("product_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_9148da8f26fc248e77a387e311" ON "product_categories" ("category_id") `);
    await queryRunner.query(
      `CREATE TABLE "product_subcategories" ("product_id" uuid NOT NULL, "subcategory_id" uuid NOT NULL, CONSTRAINT "PK_93af490f6a95118ff3a25a4f25c" PRIMARY KEY ("product_id", "subcategory_id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_9ea3ccab53cc58049272697457" ON "product_subcategories" ("product_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_9bf92d1759317165b83ccfe8d6" ON "product_subcategories" ("subcategory_id") `,
    );
    await queryRunner.query(`ALTER TABLE "product_images" ALTER COLUMN "public_id" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_23ad9291e0e22cdf46ae7ec5461" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_8aa989a208a2c6564b57d298df3" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcategories" ADD CONSTRAINT "FK_f7b015bc580ae5179ba5a4f42ec" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcategories" ADD CONSTRAINT "FK_e771023ba9bb027ef4328c0aff2" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcategories" ADD CONSTRAINT "FK_f9e9ed2ab3a5a41317375c3422a" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "FK_8748b4a0e8de6d266f2bbc877f6" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "FK_9148da8f26fc248e77a387e3112" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_subcategories" ADD CONSTRAINT "FK_9ea3ccab53cc58049272697457e" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_subcategories" ADD CONSTRAINT "FK_9bf92d1759317165b83ccfe8d6f" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_subcategories" DROP CONSTRAINT "FK_9bf92d1759317165b83ccfe8d6f"`);
    await queryRunner.query(`ALTER TABLE "product_subcategories" DROP CONSTRAINT "FK_9ea3ccab53cc58049272697457e"`);
    await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_9148da8f26fc248e77a387e3112"`);
    await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_8748b4a0e8de6d266f2bbc877f6"`);
    await queryRunner.query(`ALTER TABLE "subcategories" DROP CONSTRAINT "FK_f9e9ed2ab3a5a41317375c3422a"`);
    await queryRunner.query(`ALTER TABLE "subcategories" DROP CONSTRAINT "FK_e771023ba9bb027ef4328c0aff2"`);
    await queryRunner.query(`ALTER TABLE "subcategories" DROP CONSTRAINT "FK_f7b015bc580ae5179ba5a4f42ec"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_8aa989a208a2c6564b57d298df3"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_23ad9291e0e22cdf46ae7ec5461"`);
    await queryRunner.query(`ALTER TABLE "product_images" ALTER COLUMN "public_id" SET DEFAULT ''`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9bf92d1759317165b83ccfe8d6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9ea3ccab53cc58049272697457"`);
    await queryRunner.query(`DROP TABLE "product_subcategories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9148da8f26fc248e77a387e311"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8748b4a0e8de6d266f2bbc877f"`);
    await queryRunner.query(`DROP TABLE "product_categories"`);
    await queryRunner.query(`DROP TABLE "subcategories"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
