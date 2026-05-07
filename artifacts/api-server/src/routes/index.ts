import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import gameRouter from "./game";
import paymentRouter from "./payment";
import referralRouter from "./referral";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(gameRouter);
router.use(paymentRouter);
router.use(referralRouter);
router.use(adminRouter);

export default router;
