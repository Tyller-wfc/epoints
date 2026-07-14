import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('role_task_domains')
export class RoleTaskDomain {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ name: 'domain_id' })
  domainId: string;

  @Column({ name: 'relation_type', length: 10 })
  relationType: 'P' | 'S' | 'R';
}
