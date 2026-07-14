import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true, length: 60 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column('text')
  description: string;

  @Column({ default: true })
  enabled: boolean;
}
