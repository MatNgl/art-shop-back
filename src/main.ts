import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

=========================================
`);
}
void bootstrap();
