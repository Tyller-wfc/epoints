import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  avatar: string;

  @Column({ name: 'avatar_object_key', type: 'varchar', length: 700, nullable: true, select: false })
  avatarObjectKey: string | null;

  @Column({ name: 'avatar_mime_type', type: 'varchar', length: 100, nullable: true, select: false })
  avatarMimeType: string | null;

  @Column()
  role: string;

  @Column({ name: 'role_type' })
  roleType: string;

  @Column({ name: 'points_balance', default: 0 })
  points_balance: number;

  @Column({ name: 'points_earned_lifetime', default: 0 })
  points_earned_lifetime: number;

  @Column({ name: 'penalties_count', default: 0 })
  penalties_count: number;

  @Column({ name: 'points_deducted_total', default: 0 })
  points_deducted_total: number;

  @Column({ name: 'phone_encrypted', type: 'text', nullable: true, select: false })
  phoneEncrypted: string | null;

  @Column({ name: 'phone_hash', type: 'varchar', length: 64, nullable: true, select: false })
  phoneHash: string | null;

  @Column({ default: true })
  enabled: boolean;

  @Column({ length: 20, default: 'Available' })
  availability: string;
}
