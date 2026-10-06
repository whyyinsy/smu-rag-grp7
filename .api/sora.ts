import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/sora - Status and model capabilities
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ready',
    engine: 'sora-video-engine',
    supportedResolutions: ['1080p', '720p', '4k'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDurationSeconds: 60,
    timestamp: new Date().toISOString()
  });
});

// POST /api/sora - Submit video generation job or prompt
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '16:9', duration = 5 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "prompt" parameter in request body'
      });
    }

    // Generate unique job id
    const jobId = `sora_job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return res.status(202).json({
      success: true,
      jobId,
      status: 'queued',
      prompt,
      aspectRatio,
      duration,
      createdAt: new Date().toISOString(),
      message: 'Video rendering request queued successfully'
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to process Sora video generation request',
      details: err.message
    });
  }
});

// GET /api/sora/:jobId - Check job status
router.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  return res.json({
    jobId,
    status: 'completed',
    progress: 100,
    completedAt: new Date().toISOString(),
    videoUrl: `/media/${jobId}.mp4`
  });
});

export default router;
