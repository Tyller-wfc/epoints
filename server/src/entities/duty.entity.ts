import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('duty')
export class Duty {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  user_id: string;

  @Column({ name: 'duty_date', type: 'varchar', length: 10, nullable: true, default: null })
  duty_date: string | null;

  @Column({ name: 'shift_start' })
  shift_start: string;

  @Column({ name: 'shift_end' })
  shift_end: string;

  @Column({ name: 'is_active', default: false })
  is_active: boolean;
}
