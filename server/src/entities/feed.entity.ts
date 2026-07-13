import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('feed')
export class Feed {
  @PrimaryColumn()
  id: string;

  @Column()
  type: string;

  @Column('text')
  message: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
