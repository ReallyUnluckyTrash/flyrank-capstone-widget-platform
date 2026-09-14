import express from 'express';
import 'dotenv/config';
import authRouter from './routes/authRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import submissionsRouter from './routes/submissionsRoutes.js';
import widgetsRouter from './routes/widgetsRoutes.js';
import widgetLoaderRouter from './routes/widgetLoaderRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json());
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/submissions', submissionsRouter);
app.use('/widgets', widgetsRouter);
app.use('/', widgetLoaderRouter);

app.use((error, req, res, next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).send({ error: 'Invalid JSON payload' });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).send({ error: 'Request payload is too large' });
  }
  return next(error);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export { app };