import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('point_ledger')
@Index(['userId', 'sourceType', 'sourceId'], { unique: true })
export class PointLedger {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'source_type', length: 24 })
  sourceType: string;

  @Column({ name: 'source_id' })
  sourceId: string;

  @Column({ name: 'points_delta' })
  pointsDelta: number;

  @Column({ name: 'target_type', length: 20, default: 'user' })
  targetType: string;

  @Column({ name: 'target_id', length: 255, default: '' })
  targetId: string;

  @Column('text')
  reason: string;

  @Column({ name: 'operator_id' })
  operatorId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
