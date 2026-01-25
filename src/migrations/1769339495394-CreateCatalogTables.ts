import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogTables1769339495394 implements MigrationInterface {
  name = 'CreateCatalogTables1769339495394';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tag_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "created_by" uuid NOT NULL, "modified_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d90243459a697eadb8ad56e9092" UNIQUE ("name"), CONSTRAINT "UQ_b3aa10c29ea4e61a830362bd25a" UNIQUE ("slug"), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "description" text, "short_description" text, "status" character varying(30) NOT NULL DEFAULT 'DRAFT', "featured" boolean NOT NULL DEFAULT false, "seo_title" character varying(255), "seo_description" text, "created_by" uuid NOT NULL, "modified_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE ("slug"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "formats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "width_mm" integer NOT NULL, "height_mm" integer NOT NULL, "is_custom" boolean NOT NULL DEFAULT false, "created_by" uuid NOT NULL, "modified_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e99e1793fec9a30a4b463b46869" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "materials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid NOT NULL, "modified_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2fd1a93ecb222a28bef28663fa0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "format_id" uuid NOT NULL, "material_id" uuid NOT NULL, "price" numeric(10,2) NOT NULL, "stock_qty" integer NOT NULL DEFAULT '0', "status" character varying(50) NOT NULL DEFAULT 'AVAILABLE', "created_by" uuid NOT NULL, "modified_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "url" text NOT NULL, "alt_text" character varying(255), "position" integer NOT NULL DEFAULT '0', "status" character varying(30) NOT NULL DEFAULT 'AVAILABLE', "is_primary" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_tags" ("product_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_8ca809b37ff76596b63fe60ac41" PRIMARY KEY ("product_id", "tag_id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5b0c6fc53c574299ecc7f9ee22" ON "product_tags" ("product_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_f2cd3faf2e129a4c69c05a291e" ON "product_tags" ("tag_id") `);
    await queryRunner.query(
      `ALTER TABLE "tags" ADD CONSTRAINT "FK_32f027a90ce9c91c9b8ff830d22" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ADD CONSTRAINT "FK_02391c9d6a56c3d288f653c32a6" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_c1af9b47239151e255f62e03247" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_34dbaebec7523c3b8d17bbe5801" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "formats" ADD CONSTRAINT "FK_4fc549ebed489392752885a6dd4" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "formats" ADD CONSTRAINT "FK_9c433f69c0342390bfb60941bd8" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" ADD CONSTRAINT "FK_1f1c275e1f89a675d516927605d" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" ADD CONSTRAINT "FK_c2e98bf4c31d8d7064d3253ea50" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_6343513e20e2deab45edfce1316" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_407ffc0a4c9516b207448c59de2" FOREIGN KEY ("format_id") REFERENCES "formats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_f9e79c91966ca2f7e18b8b9187c" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_5b2ab6ccdeaa7415dc77915fc3b" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_a9d40c4180f665305b9da6f5b3b" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_70f820611cd702e086905784397" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_tags" ADD CONSTRAINT "FK_5b0c6fc53c574299ecc7f9ee22e" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_tags" ADD CONSTRAINT "FK_f2cd3faf2e129a4c69c05a291e8" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_tags" DROP CONSTRAINT "FK_f2cd3faf2e129a4c69c05a291e8"`);
    await queryRunner.query(`ALTER TABLE "product_tags" DROP CONSTRAINT "FK_5b0c6fc53c574299ecc7f9ee22e"`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_70f820611cd702e086905784397"`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT "FK_a9d40c4180f665305b9da6f5b3b"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT "FK_5b2ab6ccdeaa7415dc77915fc3b"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT "FK_f9e79c91966ca2f7e18b8b9187c"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT "FK_407ffc0a4c9516b207448c59de2"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT "FK_6343513e20e2deab45edfce1316"`);
    await queryRunner.query(`ALTER TABLE "materials" DROP CONSTRAINT "FK_c2e98bf4c31d8d7064d3253ea50"`);
    await queryRunner.query(`ALTER TABLE "materials" DROP CONSTRAINT "FK_1f1c275e1f89a675d516927605d"`);
    await queryRunner.query(`ALTER TABLE "formats" DROP CONSTRAINT "FK_9c433f69c0342390bfb60941bd8"`);
    await queryRunner.query(`ALTER TABLE "formats" DROP CONSTRAINT "FK_4fc549ebed489392752885a6dd4"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_34dbaebec7523c3b8d17bbe5801"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_c1af9b47239151e255f62e03247"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_02391c9d6a56c3d288f653c32a6"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_32f027a90ce9c91c9b8ff830d22"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f2cd3faf2e129a4c69c05a291e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5b0c6fc53c574299ecc7f9ee22"`);
    await queryRunner.query(`DROP TABLE "product_tags"`);
    await queryRunner.query(`DROP TABLE "product_images"`);
    await queryRunner.query(`DROP TABLE "product_variants"`);
    await queryRunner.query(`DROP TABLE "materials"`);
    await queryRunner.query(`DROP TABLE "formats"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
