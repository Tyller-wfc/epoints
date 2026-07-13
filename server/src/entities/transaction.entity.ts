import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ name: 'reward_id' })
  reward_id: string;

  @Column({ name: 'points_spent' })
  points_spent: number;

  @Column({ default: 'Pending Delivery' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
