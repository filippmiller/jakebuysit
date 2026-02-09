/**
 * Photo Upload API — handles S3 uploads for offer photos.
 *
 * POST /api/v1/uploads/photos   Upload up to 6 photos, returns S3 URLs
 */
import { FastifyInstance } from 'fastify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { optionalAuth } from '../middleware/auth.js';

const s3 = new S3Client({
  region: config.aws.region,
  ...(config.aws.accessKeyId && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey!,
    },
  }),
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/uploads/photos
   * Upload photos and return S3 URLs for use in offer creation.
   */
  fastify.post('/photos', { preHandler: optionalAuth }, async (request, reply) => {
    const parts = request.parts();
    const uploadedUrls: string[] = [];
    let fileCount = 0;

    for await (const part of parts) {
      if (part.type !== 'file') continue;

      fileCount++;
      if (fileCount > 6) {
        return reply.status(400).send({ error: 'Maximum 6 photos allowed' });
      }

      if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
        return reply.status(400).send({
          error: `Invalid file type: ${part.mimetype}. Accepted: JPEG, PNG, WebP, HEIC`,
        });
      }

      // Read file buffer
      const buffer = await part.toBuffer();

      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({ error: 'File too large. Maximum 10MB per photo.' });
      }

      // Generate S3 key
      const ext = part.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : part.mimetype.split('/')[1];
      const key = `photos/${randomUUID()}.${ext}`;

      try {
        await s3.send(new PutObjectCommand({
          Bucket: config.aws.s3.bucket,
          Key: key,
          Body: buffer,
          ContentType: part.mimetype,
        }));

        const url = config.aws.s3.cdnUrl
          ? `${config.aws.s3.cdnUrl}/${key}`
          : `https://${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

        uploadedUrls.push(url);
      } catch (err: any) {
        logger.error({ error: err.message, key }, 'S3 upload failed');
        return reply.status(500).send({ error: 'Photo upload failed' });
      }
    }

    if (uploadedUrls.length === 0) {
      return reply.status(400).send({ error: 'At least one photo required' });
    }

    logger.info({ count: uploadedUrls.length }, 'Photos uploaded');

    return { photoUrls: uploadedUrls };
  });
}
