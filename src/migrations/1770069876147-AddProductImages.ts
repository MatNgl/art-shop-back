import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImages1770069876147 implements MigrationInterface {
  name = 'AddProductImages1770069876147';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_variant_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "variant_id" uuid NOT NULL, "created_by" uuid NOT NULL, "public_id" character varying(255) NOT NULL, "url" text NOT NULL, "alt_text" character varying(255), "position" integer NOT NULL DEFAULT '0', "is_primary" boolean NOT NULL DEFAULT false, "status" character varying(30) NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6e7e0a1e25b7c5d36609aadc6cf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "product_images" ADD "public_id" character varying(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_70f820611cd702e086905784397"`);
    await queryRunner.query(`ALTER TABLE "product_images" ALTER COLUMN "created_by" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "product_images" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`);
    await queryRunner.query(`ALTER TABLE "formats" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "formats" ADD "name" character varying(50) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "materials" ADD "name" character varying(50) NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "UQ_product_format_material" UNIQUE ("product_id", "format_id", "material_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_70f820611cd702e086905784397" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variant_images" ADD CONSTRAINT "FK_463e9e284135250ee15fa64489f" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variant_images" ADD CONSTRAINT "FK_0bfe7a5f47347b88f57674d032e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_variant_images" DROP CONSTRAINT "FK_0bfe7a5f47347b88f57674d032e"`);
    await queryRunner.query(`ALTER TABLE "product_variant_images" DROP CONSTRAINT "FK_463e9e284135250ee15fa64489f"`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_70f820611cd702e086905784397"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT "UQ_product_format_material"`);
    await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "materials" ADD "name" character varying(100) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "formats" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "formats" ADD "name" character varying(100) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "product_images" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'`);
    await queryRunner.query(`ALTER TABLE "product_images" ALTER COLUMN "created_by" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_70f820611cd702e086905784397" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "product_images" DROP COLUMN "public_id"`);
    await queryRunner.query(`DROP TABLE "product_variant_images"`);
  }
}
