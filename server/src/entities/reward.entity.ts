import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('rewards')
export class Reward {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ name: 'points_cost' })
  points_cost: number;

  @Column()
  category: string;

  @Column()
  image: string;

  @Column({ default: 10 })
  inventory: number;

  @Column({ name: 'level_required', default: 1 })
  level_required: number;
}
