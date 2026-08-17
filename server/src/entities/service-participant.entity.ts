import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('service_participants')
export class ServiceParticipant {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'service_record_id' })
  serviceRecordId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'participant_role', length: 32 })
  participantRole: string;

  @Column('text')
  responsibility: string;

  @Column({ name: 'contribution_weight', default: 100 })
  contributionWeight: number;

  @Column({ name: 'work_summary', type: 'text', nullable: true })
  workSummary: string | null;
}
