import { ConfigModule } from '@nestjs/config';
import { CloudinaryProvider } from './providers/cloudfinary.provider';
import { StorageService } from './storage.service';
import { Global, Module } from '@nestjs/common';

/**
 * Module de stockage des médias.
 *
 * @Global() rend le StorageService disponible dans tous les modules
 * sans avoir à l'importer explicitement.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudinaryProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
