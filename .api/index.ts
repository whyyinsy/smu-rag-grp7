import { Router } from 'express';
import healthRouter from './health.ts';
import soraRouter from './sora.ts';
import hdbRouter from './hdb.ts';
import onemapRouter from './onemap.ts';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/sora', soraRouter);
apiRouter.use('/hdb', hdbRouter);
apiRouter.use('/onemap', onemapRouter);

export default apiRouter;
