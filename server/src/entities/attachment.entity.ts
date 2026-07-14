import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('attachments')
export class Attachment {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'owner_type', length: 20 })
  ownerType: 'mission' | 'ticket' | 'reward';

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'original_name', length: 500 })
  originalName: string;

  @Column({ name: 'object_key', length: 700, unique: true })
  objectKey: string;

  @Column({ name: 'mime_type', length: 150 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'int', unsigned: true })
  fileSize: number;

  @Column({ length: 64 })
  checksum: string;

  @Column({ name: 'is_image', default: false })
  isImage: boolean;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
