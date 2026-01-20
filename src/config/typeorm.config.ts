import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(__dirname, '../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['dist/**/*.entity.js'], // Entités compilées
  migrations: ['dist/migrations/*.js'], // Migrations compilées
  synchronize: false, // Toujours false — on utilise les migrations
};
console.log('TypeORM Config:', {
  host: process.env.DB_HOST,
  username: process.env.DB_USERNAME,
  database: process.env.DB_NAME,
});
// Export pour la CLI TypeORM
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
