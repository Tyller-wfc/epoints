import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('auth_credentials')
export class Credential {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;
}
