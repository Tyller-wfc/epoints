import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  avatar: string;

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
}
