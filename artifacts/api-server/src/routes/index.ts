import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usageRouter from "./usage";
import authRouter from "./auth";
import walletRouter from "./wallet";
import costsRouter from "./costs";
import proxyRouter from "./proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletRouter);
router.use(usageRouter);
router.use(costsRouter);
router.use(proxyRouter);

export default router;
