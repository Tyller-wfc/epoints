import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('service_mission_links')
@Index(['serviceRecordId', 'missionId'], { unique: true })
export class ServiceMissionLink {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'service_record_id' })
  serviceRecordId: string;

  @Column({ name: 'mission_id' })
  missionId: string;

  @Column({ name: 'participant_user_id' })
  participantUserId: string;

  @Column({ name: 'allocation_weight' })
  allocationWeight: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
