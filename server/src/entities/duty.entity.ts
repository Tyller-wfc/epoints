import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('duty')
export class Duty {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  user_id: string;

  @Column({ name: 'shift_start' })
  shift_start: string;

  @Column({ name: 'shift_end' })
  shift_end: string;

  @Column({ name: 'is_active', default: false })
  is_active: boolean;
}
