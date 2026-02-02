import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { User } from '../../users/entities/user.entity';

export enum ProductVariantImageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('product_variant_images')
export class ProductVariantImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========================================
  // Relations
  // ========================================

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  // ========================================
  // Cloudinary
  // ========================================

  /** Identifiant Cloudinary */
  @Column({ name: 'public_id', type: 'varchar', length: 255 })
  publicId!: string;

  /** URL de base (HTTPS) */
  @Column({ type: 'text' })
  url!: string;

  // ========================================
  // Métadonnées
  // ========================================

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText?: string;

  /** Position d'affichage (0 = première) */
  @Column({ type: 'integer', default: 0 })
  position!: number;

  /** Image principale de la variante */
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({
    type: 'varchar',
    length: 30,
    default: ProductVariantImageStatus.ACTIVE,
  })
  status!: ProductVariantImageStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
