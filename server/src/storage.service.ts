import { BadRequestException, Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { Attachment } from './entities/attachment.entity';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx',
  '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.log', '.json', '.zip', '.7z',
]);

const AVATAR_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const endpoint = new URL(config.get<string>('MINIO_ENDPOINT') || 'http://127.0.0.1:9000');
    this.bucket = config.get<string>('MINIO_BUCKET') || 'epoints-attachments';
    this.client = new Client({
      endPoint: endpoint.hostname,
      port: Number(endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80)),
      useSSL: endpoint.protocol === 'https:',
      accessKey: config.get<string>('MINIO_ACCESS_KEY') || '',
      secretKey: config.get<string>('MINIO_SECRET_KEY') || '',
    });
  }

  async onModuleInit() {
    try {
      if (!(await this.client.bucketExists(this.bucket))) await this.client.makeBucket(this.bucket);
    } catch (error) {
      throw new ServiceUnavailableException(`MinIO 初始化失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async uploadFiles(ownerType: 'mission' | 'ticket', ownerId: string, userId: string, files: Express.Multer.File[]) {
    const uploaded: Attachment[] = [];
    try {
      for (const file of files) {
        const originalName = this.normalizeOriginalName(file.originalname);
        this.validateFile(file, originalName);
        const extension = extname(originalName).toLowerCase();
        const now = new Date();
        const objectKey = `${ownerType}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${randomUUID()}${extension}`;
        await this.client.putObject(this.bucket, objectKey, file.buffer, file.size, {
          'Content-Type': file.mimetype,
          'X-Amz-Meta-Original-Name': encodeURIComponent(originalName),
        });
        const attachment = new Attachment();
        attachment.id = randomUUID();
        attachment.ownerType = ownerType;
        attachment.ownerId = ownerId;
        attachment.originalName = originalName.slice(0, 500);
        attachment.objectKey = objectKey;
        attachment.mimeType = file.mimetype || 'application/octet-stream';
        attachment.fileSize = file.size;
        attachment.checksum = createHash('sha256').update(file.buffer).digest('hex');
        attachment.isImage = file.mimetype.startsWith('image/');
        attachment.uploadedBy = userId;
        uploaded.push(attachment);
      }
      return uploaded;
    } catch (error) {
      await this.deleteObjects(uploaded.map((item) => item.objectKey));
      throw error;
    }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const originalName = this.normalizeOriginalName(file.originalname);
    const extension = extname(originalName).toLowerCase();
    const expectedMimeType = AVATAR_MIME_TYPES[extension];
    if (!expectedMimeType || file.mimetype !== expectedMimeType) throw new BadRequestException('头像仅支持 JPG、PNG、WebP 或 GIF 图片');
    if (!file.size) throw new BadRequestException('头像文件不能为空');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('头像文件不能超过 5 MB');
    if (!this.hasValidImageSignature(file.buffer, expectedMimeType)) throw new BadRequestException('头像文件内容与图片格式不匹配');
    const now = new Date();
    const objectKey = `avatars/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${userId}/${randomUUID()}${extension}`;
    await this.client.putObject(this.bucket, objectKey, file.buffer, file.size, {
      'Content-Type': expectedMimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return { objectKey, mimeType: expectedMimeType };
  }

  async uploadRewardImage(rewardId: string, userId: string, file: Express.Multer.File) {
    const originalName = this.normalizeOriginalName(file.originalname);
    const extension = extname(originalName).toLowerCase();
    const expectedMimeType = AVATAR_MIME_TYPES[extension];
    if (!expectedMimeType || file.mimetype !== expectedMimeType) throw new BadRequestException('商品图片仅支持 JPG、PNG、WebP 或 GIF');
    if (!file.size) throw new BadRequestException('商品图片不能为空');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('商品图片不能超过 5 MB');
    if (!this.hasValidImageSignature(file.buffer, expectedMimeType)) throw new BadRequestException('商品图片内容与文件格式不匹配');
    const now = new Date();
    const objectKey = `rewards/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${rewardId}/${randomUUID()}${extension}`;
    await this.client.putObject(this.bucket, objectKey, file.buffer, file.size, {
      'Content-Type': expectedMimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return Object.assign(new Attachment(), {
      id: randomUUID(), ownerType: 'reward' as const, ownerId: rewardId,
      originalName: originalName.slice(0, 500), objectKey, mimeType: expectedMimeType,
      fileSize: file.size, checksum: createHash('sha256').update(file.buffer).digest('hex'),
      isImage: true, uploadedBy: userId,
    });
  }

  getObject(objectKey: string) {
    return this.client.getObject(this.bucket, objectKey);
  }

  async deleteObjects(objectKeys: string[]) {
    if (!objectKeys.length) return;
    await Promise.allSettled(objectKeys.map((key) => this.client.removeObject(this.bucket, key)));
  }

  private validateFile(file: Express.Multer.File, originalName: string) {
    const extension = extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) throw new BadRequestException(`不支持的附件格式：${extension || originalName}`);
    if (!file.size) throw new BadRequestException(`附件不能为空：${originalName}`);
    if (file.size > 20 * 1024 * 1024) throw new BadRequestException(`附件超过 20 MB：${originalName}`);
    if (['.txt', '.csv', '.log', '.json'].includes(extension) && file.buffer.includes(0)) {
      throw new BadRequestException(`文本附件内容无效：${originalName}`);
    }
  }

  private hasValidImageSignature(buffer: Buffer, mimeType: string) {
    if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === 'image/gif') return buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return false;
  }

  private normalizeOriginalName(name: string) {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? name : decoded;
  }
}
