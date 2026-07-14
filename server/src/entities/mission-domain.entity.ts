import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('mission_domains')
export class MissionDomain {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'mission_id' })
  missionId: string;

  @Column({ name: 'domain_id' })
  domainId: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;
}
