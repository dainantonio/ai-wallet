import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usageRouter from "./usage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usageRouter);

export default router;
