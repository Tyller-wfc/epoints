import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('mission_notification_recipients')
export class MissionNotificationRecipient {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'mission_id' })
  missionId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'match_type', length: 10 })
  matchType: string;

  @Column({ name: 'role_names', length: 500 })
  roleNames: string;

  @Column({ name: 'mentioned', default: true })
  mentioned: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
