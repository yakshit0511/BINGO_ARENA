import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';

export const getHealth = (_req: Request, res: Response): void => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    message: 'Bingo Arena server is running',
    database: dbStatus,
  });
};
