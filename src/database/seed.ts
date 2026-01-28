import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../config/typeorm.config';
import { Role } from '../modules/roles/entities/role.entity';
import { User, UserStatus, AuthProvider } from '../modules/users/entities/user.entity';
import { Format } from '../modules/catalog/entities/format.entity';
import { Material } from '../modules/catalog/entities/material.entity';
import { Tag } from '../modules/catalog/entities/tag.entity';
import { Product, ProductStatus } from '../modules/catalog/entities/product.entity';
import * as bcrypt from 'bcrypt';

/**
 * Génère un slug URL-friendly à partir d'un nom
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seed() {
  const dataSource = new DataSource({
    ...dataSourceOptions,
    entities: [Role, User, Format, Material, Tag, Product],
  });

  await dataSource.initialize();
  console.log('🌱 Connexion à la base de données établie');

  // ========================================
  // 1. Seed des rôles
  // ========================================
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

  // ========================================
  // 2. Seed de l'admin système
  // ========================================
  const userRepository = dataSource.getRepository(User);
  const superAdminRole = await roleRepository.findOne({ where: { code: 'SUPER_ADMIN' } });

  if (!superAdminRole) {
    throw new Error('Le rôle SUPER_ADMIN doit exister pour créer les seeds');
  }

  let systemAdmin = await userRepository.findOne({
    where: { email: 'admin@artshop.local' },
  });

  if (!systemAdmin) {
    const passwordHash = await bcrypt.hash('AdminSecure123!', 10);
    systemAdmin = userRepository.create({
      email: 'admin@artshop.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'System',
      roleId: superAdminRole.id,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.LOCAL,
    });
    await userRepository.save(systemAdmin);
    console.log(`✅ Admin système créé : admin@artshop.local`);
  } else {
    console.log(`⏭️  Admin système existant : admin@artshop.local`);
  }

  // ========================================
  // 3. Seed des formats
  // ========================================
  const formatRepository = dataSource.getRepository(Format);

  const formats = [
    { name: 'Original', widthMm: 0, heightMm: 0, isCustom: false },
    { name: 'A5', widthMm: 148, heightMm: 210, isCustom: false },
    { name: 'A4', widthMm: 210, heightMm: 297, isCustom: false },
    { name: 'A3', widthMm: 297, heightMm: 420, isCustom: false },
    { name: 'A2', widthMm: 420, heightMm: 594, isCustom: false },
    { name: 'A1', widthMm: 594, heightMm: 841, isCustom: false },
    { name: 'A0', widthMm: 841, heightMm: 1189, isCustom: false },
  ];

  for (const formatData of formats) {
    const existingFormat = await formatRepository.findOne({
      where: { name: formatData.name },
    });

    if (!existingFormat) {
      const format = formatRepository.create({
        ...formatData,
        createdBy: systemAdmin.id,
      });
      await formatRepository.save(format);
      console.log(`✅ Format créé : ${formatData.name}`);
    } else {
      console.log(`⏭️  Format existant : ${formatData.name}`);
    }
  }

  // ========================================
  // 4. Seed des matériaux
  // ========================================
  const materialRepository = dataSource.getRepository(Material);

  const materials = [
    { name: 'Standard', description: 'Impression numérique standard', isActive: true },
    { name: 'Papier Fine Art', description: 'Papier Hahnemühle 308g, texture douce', isActive: true },
    { name: 'Papier Photo Brillant', description: 'Papier photo haute brillance', isActive: true },
    { name: 'Papier Photo Mat', description: 'Papier photo finition mate', isActive: true },
    { name: 'Toile Canvas', description: 'Toile coton 380g tendue sur châssis', isActive: true },
    { name: 'Dibond Aluminium', description: 'Impression sur plaque aluminium composite', isActive: true },
  ];

  for (const materialData of materials) {
    const existingMaterial = await materialRepository.findOne({
      where: { name: materialData.name },
    });

    if (!existingMaterial) {
      const material = materialRepository.create({
        ...materialData,
        createdBy: systemAdmin.id,
      });
      await materialRepository.save(material);
      console.log(`✅ Matériau créé : ${materialData.name}`);
    } else {
      console.log(`⏭️  Matériau existant : ${materialData.name}`);
    }
  }

  // ========================================
  // 5. Seed des tags
  // ========================================
  const tagRepository = dataSource.getRepository(Tag);

  const tagsData = [
    { name: 'Japon' },
    { name: 'Nature & Paysages' },
    { name: 'Portrait' },
    { name: 'Abstrait' },
    { name: 'Urbain' },
  ];

  const savedTags: Record<string, Tag> = {};

  for (const tagData of tagsData) {
    const existingTag = await tagRepository.findOne({
      where: { name: tagData.name },
    });

    if (!existingTag) {
      const tag = tagRepository.create({
        name: tagData.name,
        slug: generateSlug(tagData.name),
        createdBy: systemAdmin.id,
      });
      const saved = await tagRepository.save(tag);
      savedTags[tagData.name] = saved;
      console.log(`✅ Tag créé : ${tagData.name}`);
    } else {
      savedTags[tagData.name] = existingTag;
      console.log(`⏭️  Tag existant : ${tagData.name}`);
    }
  }

  // ========================================
  // 6. Seed des produits
  // ========================================
  const productRepository = dataSource.getRepository(Product);

  const productsData = [
    {
      name: 'Coucher de soleil sur Tokyo',
      description:
        "Cette œuvre capture la beauté éphémère d'un coucher de soleil sur la baie de Tokyo. Les teintes orangées se mêlent aux silhouettes des gratte-ciels, créant une atmosphère à la fois mélancolique et apaisante.",
      shortDescription: 'Coucher de soleil japonais aux tons orangés',
      status: ProductStatus.PUBLISHED,
      featured: true,
      seoTitle: 'Coucher de soleil Tokyo | Art Shop',
      seoDescription: 'Découvrez cette œuvre unique capturant un coucher de soleil sur Tokyo.',
      tagNames: ['Japon', 'Nature & Paysages', 'Urbain'],
    },
    {
      name: 'Forêt de bambous de Kyoto',
      description:
        "Une immersion dans la célèbre forêt de bambous d'Arashiyama. La lumière filtre à travers les tiges élancées, créant des jeux d'ombre et de lumière hypnotiques.",
      shortDescription: 'Forêt de bambous baignée de lumière',
      status: ProductStatus.PUBLISHED,
      featured: false,
      seoTitle: 'Forêt de bambous Kyoto | Art Shop',
      seoDescription: "Plongez dans l'atmosphère zen de la forêt de bambous de Kyoto.",
      tagNames: ['Japon', 'Nature & Paysages'],
    },
    {
      name: 'Portrait abstrait #01',
      description:
        "Une exploration des formes et des couleurs à travers le prisme de l'abstraction. Ce portrait déconstruit invite à une réflexion sur l'identité et la perception.",
      shortDescription: 'Portrait déstructuré aux couleurs vives',
      status: ProductStatus.DRAFT,
      featured: false,
      seoTitle: 'Portrait abstrait | Art Shop',
      seoDescription: 'Une œuvre abstraite unique explorant les limites du portrait.',
      tagNames: ['Portrait', 'Abstrait'],
    },
  ];

  for (const productData of productsData) {
    const existingProduct = await productRepository.findOne({
      where: { name: productData.name },
    });

    if (!existingProduct) {
      // Récupère les tags associés
      const productTags = productData.tagNames.map((tagName) => savedTags[tagName]).filter((tag) => tag !== undefined);

      const product = productRepository.create({
        name: productData.name,
        slug: generateSlug(productData.name),
        description: productData.description,
        shortDescription: productData.shortDescription,
        status: productData.status,
        featured: productData.featured,
        seoTitle: productData.seoTitle,
        seoDescription: productData.seoDescription,
        tags: productTags,
        createdBy: systemAdmin.id,
      });

      await productRepository.save(product);
      console.log(`✅ Produit créé : ${productData.name} (${productTags.length} tags)`);
    } else {
      console.log(`⏭️  Produit existant : ${productData.name}`);
    }
  }

  await dataSource.destroy();
  console.log('🌱 Seed terminé !');
}

seed().catch((error) => {
  console.error('❌ Erreur lors du seed :', error);
  process.exit(1);
});
