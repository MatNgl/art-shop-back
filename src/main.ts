import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173', // URL du frontend Vite
    credentials: true, // Autorise les cookies/headers d'auth
  });
  // Validation automatique des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non définies dans le DTO
      forbidNonWhitelisted: true, // Rejette les requêtes avec des propriétés inconnues
      transform: true, // Transforme les données en instances de classes
    }),
  );

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Art Shop API')
    .setDescription('API de la plateforme de vente en ligne pour artiste')
    .setVersion('1.0')
    .addBearerAuth() // Ajout de l'authentification JWT
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`
=========================================
   🎨 Art Shop - Environnement Dev
=========================================

   🚀 Dev Hub      : http://localhost:8000
   📘 Swagger      : http://localhost:${port}/api
   🗄️  CloudBeaver : http://localhost:8080
      Connexion Google : http://localhost:3000/auth/google

=========================================
`);
}

void bootstrap();
