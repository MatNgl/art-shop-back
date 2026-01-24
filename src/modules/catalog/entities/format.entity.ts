import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('formats')
export class Format {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'width_mm', type: 'integer' })
  widthMm!: number;

  @Column({ name: 'height_mm', type: 'integer' })
  heightMm!: number;

  @Column({ name: 'is_custom', type: 'boolean', default: false })
  isCustom!: boolean;

  // ========================================
  // Traçabilité
  // ========================================

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @Column({ name: 'modified_by', type: 'uuid', nullable: true })
  modifiedBy?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'modified_by' })
  modifiedByUser?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
