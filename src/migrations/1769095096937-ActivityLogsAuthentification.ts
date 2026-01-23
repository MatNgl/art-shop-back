import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivityLogsAuthentification1769095096937 implements MigrationInterface {
  name = 'ActivityLogsAuthentification1769095096937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor_type" character varying(50) NOT NULL, "actor_user_id" uuid, "action_type" character varying(100) NOT NULL, "entity_type" character varying(100) NOT NULL, "entity_id" uuid, "severity" character varying(30) NOT NULL DEFAULT 'INFO', "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_c29be5a121446eff251fa05d0ec" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_c29be5a121446eff251fa05d0ec"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
  }
}
