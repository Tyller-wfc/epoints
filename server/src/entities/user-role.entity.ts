import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ type: 'tinyint', default: 2 })
  level: number;
}
