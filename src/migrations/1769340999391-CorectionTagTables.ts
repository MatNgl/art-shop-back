import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorectionTagTables1769340999391 implements MigrationInterface {
  name = 'CorectionTagTables1769340999391';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tags" DROP COLUMN "tag_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tags" ADD "tag_id" uuid NOT NULL`);
  }
}
