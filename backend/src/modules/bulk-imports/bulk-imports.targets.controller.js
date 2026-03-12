import { getImportTargetsService } from './bulk-imports.targets.service.js';

export const getImportTargetsHandler = async (req, res, next) => {
  try {
    const { portfolioId, portfolio_id } = req.query || {};
    const portfolioValue = portfolioId ?? portfolio_id;
    const data = await getImportTargetsService({ portfolioId: portfolioValue });
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};
