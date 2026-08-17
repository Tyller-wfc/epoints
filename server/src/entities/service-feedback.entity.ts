import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('service_feedback')
export class ServiceFeedback {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'service_record_id' })
  serviceRecordId: string;

  @Column({ name: 'source_type', length: 40 })
  sourceType: string;

  @Column({ name: 'satisfaction_level', length: 20 })
  satisfactionLevel: string;

  @Column('text')
  content: string;

  @Column({ name: 'evidence_note', type: 'text', nullable: true })
  evidenceNote: string | null;

  @Column({ name: 'recorded_by' })
  recordedBy: string;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamp' })
  occurredAt: Date;
}
