import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_records')
export class ServiceRecord {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'service_type', length: 80 })
  serviceType: string;

  @Column('text')
  description: string;

  @Column({ name: 'promised_result', type: 'text' })
  promisedResult: string;

  @Column({ length: 16, default: 'Normal' })
  priority: string;

  @Column({ length: 32, default: 'New' })
  status: string;

  @Column({ name: 'service_mode', length: 20, default: 'Work Hours' })
  serviceMode: string;

  @Column({ name: 'settlement_mode', length: 20, default: 'Standalone' })
  settlementMode: string;

  @Column({ name: 'base_points', default: 100 })
  basePoints: number;

  @Column({ name: 'promised_at', type: 'timestamp', nullable: true })
  promisedAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'customer_confirmed_at', type: 'timestamp', nullable: true })
  customerConfirmedAt: Date | null;

  @Column({ name: 'result_summary', type: 'text', nullable: true })
  resultSummary: string | null;

  @Column({ type: 'varchar', name: 'customer_satisfaction', length: 20, nullable: true })
  customerSatisfaction: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
