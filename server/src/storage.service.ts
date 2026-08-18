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

/** 扩展名 → 规范 MIME 类型（头像 & 商品图片共用） */
const AVATAR_MIME_TYPES: Record<string, string> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.bmp':  'image/bmp',
  '.tif':  'image/tiff',
  '.tiff': 'image/tiff',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.svg':  'image/svg+xml',
};

/** 浏览器 / 系统上报的非标准 MIME 别名 → 规范值 */
const MIME_ALIASES: Record<string, string> = {
  'image/jpg':            'image/jpeg',
  'image/pjpeg':          'image/jpeg',  // IE/旧版 Chrome
  'image/x-png':          'image/png',
  'image/x-bmp':          'image/bmp',
  'image/x-ms-bmp':       'image/bmp',
  'image/x-tiff':         'image/tiff',
  'image/x-tif':          'image/tiff',
  'image/heif':           'image/heif',
  'image/heic-sequence':  'image/heic',
  'image/heif-sequence':  'image/heif',
};

const IMAGE_FORMAT_LABEL = 'JPG、PNG、WebP、GIF、BMP、TIFF、AVIF、HEIC 或 SVG';


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
    // 归一化浏览器 / 系统上报的非标准 MIME 别名
    const normalizedMimeType = MIME_ALIASES[file.mimetype] ?? file.mimetype;
    if (!expectedMimeType || normalizedMimeType !== expectedMimeType) {
      throw new BadRequestException(`头像仅支持 ${IMAGE_FORMAT_LABEL} 格式`);
    }
    if (!file.size) throw new BadRequestException('头像文件不能为空');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('头像文件不能超过 5 MB');
    if (!this.hasValidImageSignature(file.buffer, expectedMimeType)) {
      throw new BadRequestException('头像文件内容与扩展名不匹配，请确认文件未被篡改');
    }
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
    const normalizedMimeType = MIME_ALIASES[file.mimetype] ?? file.mimetype;
    if (!expectedMimeType || normalizedMimeType !== expectedMimeType) {
      throw new BadRequestException(`商品图片仅支持 ${IMAGE_FORMAT_LABEL} 格式`);
    }
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

  private hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;

    switch (mimeType) {
      case 'image/jpeg':
        // JPEG 所有变体均以 FF D8 FF 开头（JFIF/Exif/SPIFF/Raw 均满足）
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

      case 'image/png':
        return buffer.length >= 8 &&
          buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

      case 'image/gif':
        return buffer.length >= 6 &&
          (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
           buffer.subarray(0, 6).toString('ascii') === 'GIF89a');

      case 'image/webp':
        return buffer.length >= 12 &&
          buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
          buffer.subarray(8, 12).toString('ascii') === 'WEBP';

      case 'image/bmp':
        // BMP: 'BM'
        return buffer[0] === 0x42 && buffer[1] === 0x4d;

      case 'image/tiff':
        // TIFF 小端：49 49 2A 00；大端：4D 4D 00 2A
        return (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
               (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a);

      case 'image/avif':
      case 'image/heic':
      case 'image/heif':
        // HEIC/HEIF/AVIF 都是 ISO Base Media File Format (ISOBMFF) 容器
        // 偏移 4 开始是 'ftyp' box，后跟品牌标识
        if (buffer.length < 12) return false;
        if (buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return false;
        // 接受常见品牌：heic, heix, hevc, hevx, mif1, msf1, avif, avis
        const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
        return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis'].some(b => brand.startsWith(b));

      case 'image/svg+xml':
        // SVG 是文本格式，检查是否以 '<' 或 UTF-8 BOM 开头，并包含 svg 标签
        const text = buffer.subarray(0, Math.min(512, buffer.length)).toString('utf8').trimStart();
        return text.startsWith('<') && /<svg[\s>]/i.test(text);

      default:
        // 未知格式：放行（后续可按需收紧）
        return true;
    }
  }

  private normalizeOriginalName(name: string) {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? name : decoded;
  }
}
