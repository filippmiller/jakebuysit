/**
 * Text-to-Speech Service
 * 
 * Integrates with ElevenLabs API for Jake's voice synthesis
 * Handles caching, S3 upload, and CDN delivery
 */

import axios from 'axios';
import AWS from 'aws-sdk';
const { S3 } = AWS;
import crypto from 'crypto';
import type {
  VoiceSynthesisRequest,
  VoiceSynthesisResult,
  JakeTone
} from '../../../types/jake.js';

export class TTSService {
  private elevenLabsApiKey: string;
  private jakeVoiceId: string;
  private s3: S3;
  private bucket: string;
  private cdnBaseUrl: string;

  constructor() {
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    this.jakeVoiceId = process.env.JAKE_VOICE_ID || '';
    this.bucket = process.env.S3_VOICE_BUCKET || 'jake-voices';
    this.cdnBaseUrl = process.env.CDN_BASE_URL || '';

    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Synthesize voice from script
   */
  async synthesize(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResult> {
    const { script, tone, priority } = request;

    // Generate cache key
    const cacheKey = this.generateCacheKey(script, tone);
    
    // Check if already cached
    const cached = await this.checkCache(cacheKey);
    if (cached) {
      return {
        audio_url: cached.url,
        duration: cached.duration,
        cached: true,
      };
    }

    // Generate voice with ElevenLabs
    const audioBuffer = await this.generateVoice(script, tone);

    // Upload to S3
    const audioUrl = await this.uploadToS3(cacheKey, audioBuffer);

    // Estimate duration
    const duration = this.estimateDuration(script);

    return {
      audio_url: audioUrl,
      duration,
      cached: false,
    };
  }

  /**
   * Generate voice using ElevenLabs API
   */
  private async generateVoice(script: string, tone: JakeTone): Promise<Buffer> {
    try {
      const voiceSettings = this.getVoiceSettings(tone);

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.jakeVoiceId}`,
        {
          text: script,
          model_id: 'eleven_monolingual_v1',
          voice_settings: voiceSettings,
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey,
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
      
    } catch (error) {
      console.error('ElevenLabs API error:', error);
      throw new Error('Voice synthesis failed');
    }
  }

  /**
   * Get voice settings based on tone
   */
  private getVoiceSettings(tone: JakeTone) {
    const baseSettings = {
      stability: 0.65,
      similarity_boost: 0.85,
      style: 0.45,
    };

    // Adjust settings based on tone
    switch (tone) {
      case 'excited':
        return { ...baseSettings, style: 0.6, stability: 0.55 };
      case 'sympathetic':
        return { ...baseSettings, style: 0.35, stability: 0.75 };
      case 'firm':
        return { ...baseSettings, style: 0.4, stability: 0.7 };
      default:
        return baseSettings;
    }
  }

  /**
   * Upload audio to S3 and return CDN URL
   */
  private async uploadToS3(key: string, buffer: Buffer): Promise<string> {
    const s3Key = `tier2/${key}.mp3`;

    await this.s3.putObject({
      Bucket: this.bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=604800', // 7 days
    }).promise();

    return `${this.cdnBaseUrl}/${s3Key}`;
  }

  /**
   * Check if audio is already cached in S3
   */
  private async checkCache(key: string): Promise<{ url: string; duration: number } | null> {
    const s3Key = `tier2/${key}.mp3`;

    try {
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: s3Key,
      }).promise();

      // If exists, return URL
      return {
        url: `${this.cdnBaseUrl}/${s3Key}`,
        duration: 0, // TODO: Store metadata
      };
    } catch (error) {
      return null; // Not cached
    }
  }

  /**
   * Generate cache key from script and tone
   */
  private generateCacheKey(script: string, tone: JakeTone): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${script}-${tone}`)
      .digest('hex');
    
    return hash.substring(0, 16);
  }

  /**
   * Estimate audio duration
   */
  private estimateDuration(script: string): number {
    const wordCount = script.split(/\s+/).length;
    const wordsPerMinute = 150;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }
}

/**
 * Singleton instance
 */
export const ttsService = new TTSService();
