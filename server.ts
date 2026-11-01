import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { extractAndAnalyzeArchive, analyzeProjectDirectory } from './src/server/analyzer';
import { workerManager } from './src/server/worker';
import { DEMO_PROJECTS, generateDemoProjectZip } from './src/server/demoProjects';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Temp uploads storage
const uploadBaseDir = path.join('/tmp', 'mcc_uploads');
fs.mkdirSync(uploadBaseDir, { recursive: true });

const upload = multer({
  dest: path.join('/tmp', 'mcc_multer_tmp'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP archive files (.zip) are supported.'));
    }
  },
});

// Cache for inspected projects
const inspectedProjects = new Map<string, { extractedPath: string; metadata: any }>();

// 1. Inspect Uploaded ZIP
app.post('/api/projects/upload', upload.single('archive'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No ZIP archive uploaded.' });
    return;
  }

  const uploadId = crypto.randomUUID();
  const targetDir = path.join(uploadBaseDir, uploadId);
  fs.mkdirSync(targetDir, { recursive: true });

  try {
    const scanResult = extractAndAnalyzeArchive(req.file.path, targetDir);
    // Cleanup temporary uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // ignore
    }

    inspectedProjects.set(uploadId, {
      extractedPath: targetDir,
      metadata: scanResult.metadata,
    });

    res.json({
      uploadId,
      metadata: scanResult.metadata,
      filename: req.file.originalname,
    });
  } catch (err: any) {
    try {
      if (req.file) fs.unlinkSync(req.file.path);
    } catch {}
    res.status(400).json({ error: err.message || 'Failed to inspect project archive.' });
  }
});

// 2. Demo Projects list & loader
app.get('/api/demo-projects', (req: Request, res: Response) => {
  res.json(DEMO_PROJECTS);
});

app.post('/api/projects/demo', (req: Request, res: Response) => {
  const { demoId } = req.body;
  if (!demoId) {
    res.status(400).json({ error: 'Missing demoId.' });
    return;
  }

  const uploadId = crypto.randomUUID();
  const targetDir = path.join(uploadBaseDir, uploadId);
  fs.mkdirSync(targetDir, { recursive: true });

  try {
    const zipBuffer = generateDemoProjectZip(demoId);
    const tempZipFile = path.join(targetDir, 'demo.zip');
    fs.writeFileSync(tempZipFile, zipBuffer);

    const scanResult = extractAndAnalyzeArchive(tempZipFile, targetDir);
    fs.unlinkSync(tempZipFile);

    inspectedProjects.set(uploadId, {
      extractedPath: targetDir,
      metadata: scanResult.metadata,
    });

    res.json({
      uploadId,
      metadata: scanResult.metadata,
      filename: `${demoId}.zip`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate demo project.' });
  }
});

// 3. Start Compilation
app.post('/api/builds/start', (req: Request, res: Response) => {
  const { uploadId, projectName } = req.body;
  const project = inspectedProjects.get(uploadId);

  if (!project) {
    res.status(404).json({ error: 'Uploaded project session expired or not found. Please upload again.' });
    return;
  }

  const job = workerManager.createJob(
    projectName || project.metadata.name || 'Minecraft Mod',
    project.metadata,
    project.extractedPath
  );

  // Trigger compilation asynchronously
  workerManager.startBuild(job.id, project.extractedPath).catch((err) => {
    console.error(`Build ${job.id} runtime error:`, err);
  });

  res.json({ jobId: job.id });
});

// 4. Builds list & details
app.get('/api/builds', (req: Request, res: Response) => {
  res.json(workerManager.getAllJobs());
});

app.get('/api/builds/:id', (req: Request, res: Response) => {
  const job = workerManager.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Build not found.' });
    return;
  }
  res.json(job);
});

// 5. SSE Real-Time Logs Stream
app.get('/api/builds/:id/stream', (req: Request, res: Response) => {
  const jobId = req.params.id;
  const job = workerManager.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Build not found.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send current state
  res.write(`event: init\ndata: ${JSON.stringify(job)}\n\n`);

  // Keep-alive heartbeat every 10 seconds to prevent proxy / Cloud Run idle disconnects
  const heartbeat = setInterval(() => {
    res.write(`: keep-alive\n\n`);
  }, 10000);

  // Subscribe to live events
  const unsubscribe = workerManager.subscribe(jobId, (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// 6. Cancel Build
app.post('/api/builds/:id/cancel', (req: Request, res: Response) => {
  const success = workerManager.cancelBuild(req.params.id);
  res.json({ success });
});

// 7. Download Artifact (.jar)
app.get('/api/builds/:id/artifacts/:filename', (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const artifactPath = workerManager.getArtifactPath(id, filename);

  if (!artifactPath || !fs.existsSync(artifactPath)) {
    res.status(404).send('Artifact file not found or expired.');
    return;
  }

  res.setHeader('Content-Type', 'application/java-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
  const stream = fs.createReadStream(artifactPath);
  stream.pipe(res);
});

// 8. Download Raw Logs
app.get('/api/builds/:id/logs', (req: Request, res: Response) => {
  const job = workerManager.getJob(req.params.id);
  if (!job) {
    res.status(404).send('Build not found.');
    return;
  }

  const logContent = job.logs
    .map(l => `[${l.timestamp}] [${l.stage}] [${l.level.toUpperCase()}] ${l.message}`)
    .join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mcc-build-${job.id.slice(0, 8)}.log"`);
  res.send(logContent);
});

// 9. System Environment Status
app.get('/api/system/status', (req: Request, res: Response) => {
  res.json(workerManager.getSystemStatus());
});

// Setup Vite or Static Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MCC Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
