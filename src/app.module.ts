import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ActivityLogModule } from './modules/activity-logs';
import { UsersModule } from './modules/users';
@Module({
  imports: [
    // Charge les variables d'environnement depuis .env
    ConfigModule.forRoot({
      isGlobal: true, // Accessible partout sans réimporter
    }),

    // Configuration TypeORM avec les variables d'environnement
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Charge toutes les entités automatiquement
        synchronize: false, // JAMAIS true en prod — on utilisera les migrations
        logging: false, // Affiche les requêtes SQL en dev
      }),
    }),
    AuthModule,
    ActivityLogModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
