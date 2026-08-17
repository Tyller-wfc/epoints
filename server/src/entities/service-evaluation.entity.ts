import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('service_evaluations')
@Index(['serviceRecordId', 'participantId'], { unique: true })
export class ServiceEvaluation {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'service_record_id' })
  serviceRecordId: string;

  @Column({ name: 'participant_id' })
  participantId: string;

  @Column({ name: 'evaluator_id' })
  evaluatorId: string;

  @Column({ name: 'outcome_score' })
  outcomeScore: number;

  @Column({ name: 'professionalism_score' })
  professionalismScore: number;

  @Column({ name: 'initiative_score' })
  initiativeScore: number;

  @Column({ name: 'warmth_score' })
  warmthScore: number;

  @Column({ name: 'fairness_score' })
  fairnessScore: number;

  @Column({ name: 'collaboration_score' })
  collaborationScore: number;

  @Column({ name: 'total_score' })
  totalScore: number;

  @Column({ name: 'points_awarded' })
  pointsAwarded: number;

  @Column({ name: 'settlement_type', length: 32, default: 'service_standalone' })
  settlementType: string;

  @Column({ name: 'evaluation_comment', type: 'text' })
  evaluationComment: string;

  @Column({ name: 'improvement_required', type: 'text', nullable: true })
  improvementRequired: string | null;

  @Column({ length: 20, default: 'Published' })
  status: string;

  @CreateDateColumn({ name: 'evaluated_at', type: 'timestamp' })
  evaluatedAt: Date;
}
