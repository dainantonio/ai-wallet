import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usageRouter from "./usage";
import authRouter from "./auth";
import walletRouter from "./wallet";
import costsRouter from "./costs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletRouter);
router.use(usageRouter);
router.use(costsRouter);

export default router;
