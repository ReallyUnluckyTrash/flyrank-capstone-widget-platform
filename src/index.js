import express from 'express';
import 'dotenv/config';
import authRouter from './routes/authRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import submissionsRouter from './routes/submissionsRoutes.js';
import widgetsRouter from './routes/widgetsRoutes.js';
import widgetLoaderRouter from './routes/widgetLoaderRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/submissions', submissionsRouter);
app.use('/widgets', widgetsRouter);
app.use('/', widgetLoaderRouter);


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export { app };