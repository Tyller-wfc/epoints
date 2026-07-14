import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class PiiService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = createHash('sha256').update(config.get<string>('PII_ENCRYPTION_KEY') || 'epoints-local-pii-key').digest();
  }

  normalizePhone(value: string) {
    let phone = (value || '').replace(/[\s()-]/g, '');
    if (!phone) return '';
    if (/^1\d{10}$/.test(phone)) phone = `+86${phone}`;
    if (!/^\+\d{6,20}$/.test(phone)) throw new BadRequestException('手机号格式不正确');
    return phone;
  }

  encrypt(value: string) {
    if (!value) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
  }

  decrypt(value: string | null | undefined) {
    if (!value) return '';
    try {
      const [iv, tag, encrypted] = value.split('.').map((item) => Buffer.from(item, 'base64'));
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      return '';
    }
  }

  hash(value: string) {
    return value ? createHash('sha256').update(value).digest('hex') : null;
  }

  mask(value: string) {
    return value.length > 7 ? `${value.slice(0, 4)}****${value.slice(-4)}` : value;
  }
}
