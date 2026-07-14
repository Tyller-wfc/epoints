import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('tickets')
export class Ticket {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'reporter_id', type: 'varchar', length: 255 })
  reporter_id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  severity: string;

  @Column({ name: 'assigned_to', type: 'varchar', length: 255 })
  assigned_to: string;

  @Column({ default: 'Open' })
  status: string;

  @Column({ name: 'points_reward', default: 100 })
  points_reward: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  acknowledged_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date | null;

  @Column('text', { nullable: true })
  resolution_note: string;

  @Column({ name: 'points_earned_actual', nullable: true })
  points_earned_actual: number;

  @Column({ name: 'negligence_penalized', default: false })
  negligence_penalized: boolean;

  @Column({ name: 'secondary_fault', default: false })
  secondary_fault: boolean;

  @Column({ name: 'mtta_minutes', nullable: true })
  mtta_minutes: number;

  @Column({ name: 'quick_ack_rewarded', nullable: true })
  quick_ack_rewarded: number;

  @Column({ name: 'mttr_minutes', nullable: true })
  mttr_minutes: number;
}
