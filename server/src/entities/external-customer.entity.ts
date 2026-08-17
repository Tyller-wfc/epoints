import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('external_customers')
export class ExternalCustomer {
  @PrimaryColumn()
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 160, default: '' })
  organization: string;

  @Column({ name: 'contact_name', length: 80, default: '' })
  contactName: string;

  @Column({ name: 'contact_phone_encrypted', type: 'text', nullable: true, select: false })
  contactPhoneEncrypted: string | null;

  @Column({ name: 'service_preferences', type: 'text', nullable: true })
  servicePreferences: string | null;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
