import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('task_domains')
export class TaskDomain {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true, length: 80 })
  code: string;

  @Column({ length: 120 })
  name: string;

  @Column('text')
  description: string;

  @Column({ default: true })
  enabled: boolean;
}
