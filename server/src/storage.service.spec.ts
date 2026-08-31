import { StorageService } from './storage.service';

describe('StorageService attachment uploads', () => {
  it('accepts markdown and other arbitrary attachment extensions', async () => {
    const service = new StorageService({
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          MINIO_ENDPOINT: 'http://127.0.0.1:9000',
          MINIO_BUCKET: 'epoints-test',
          MINIO_ACCESS_KEY: 'minio',
          MINIO_SECRET_KEY: 'password',
        };
        return values[key];
      }),
    } as any);
    const putObject = jest.fn().mockResolvedValue(undefined);
    (service as any).client = { putObject, removeObject: jest.fn() };

    const buffer = Buffer.from('# Customer service notes');
    const attachments = await service.uploadFiles('service', 'sr-1', 'u-2', [
      {
        originalname: 'README.md',
        mimetype: 'text/markdown',
        size: buffer.length,
        buffer,
      } as Express.Multer.File,
    ]);

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      ownerType: 'service',
      ownerId: 'sr-1',
      originalName: 'README.md',
      mimeType: 'text/markdown',
      fileSize: buffer.length,
      uploadedBy: 'u-2',
    });
    expect(attachments[0].objectKey).toMatch(/^service\/\d{4}\/\d{2}\/.+\.md$/);
    expect(putObject).toHaveBeenCalledTimes(1);
  });
});
