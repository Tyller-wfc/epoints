import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('missions')
export class Mission {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ name: 'base_points' })
  base_points: number;

  @Column('float', { default: 1.0 })
  multiplier: number;

  @Column({ default: 'Available' })
  status: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  assigned_to: string;

  @Column('text', { nullable: true })
  proof_of_work: string;
}
