import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectionLengthColumn1769422417423 implements MigrationInterface {
    name = 'CorrectionLengthColumn1769422417423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "formats"
            ALTER COLUMN "name" TYPE character varying(50)
        `);

        await queryRunner.query(`
            ALTER TABLE "materials"
            ALTER COLUMN "name" TYPE character varying(50)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "materials"
            ALTER COLUMN "name" TYPE character varying(100)
        `);

        await queryRunner.query(`
            ALTER TABLE "formats"
            ALTER COLUMN "name" TYPE character varying(100)
        `);
    }
}
