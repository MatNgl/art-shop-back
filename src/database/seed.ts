import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../config/typeorm.config';
import { Role } from '../modules/roles/entities/role.entity';

async function seed() {
  const dataSource = new DataSource({
    ...dataSourceOptions,
    entities: [Role],
  });

  await dataSource.initialize();
  console.log('🌱 Connexion à la base de données établie');

  const roleRepository = dataSource.getRepository(Role);

  const roles = [
    { code: 'SUPER_ADMIN', label: 'Super Administrateur' },
    { code: 'ADMIN', label: 'Administrateur' },
    { code: 'USER', label: 'Utilisateur' },
    { code: 'GUEST', label: 'Invité' },
  ];

  for (const roleData of roles) {
    const existingRole = await roleRepository.findOne({
      where: { code: roleData.code },
    });

    if (!existingRole) {
      const role = roleRepository.create(roleData);
      await roleRepository.save(role);
      console.log(`✅ Rôle créé : ${roleData.code}`);
    } else {
      console.log(`⏭️  Rôle existant : ${roleData.code}`);
    }
  }

  await dataSource.destroy();
  console.log('🌱 Seed terminé !');
}

seed().catch((error) => {
  console.error('❌ Erreur lors du seed :', error);
  process.exit(1);
});