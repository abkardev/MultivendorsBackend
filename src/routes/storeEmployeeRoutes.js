import express from "express";
import { protect } from "../middlewares/auth.js";
import { loadSubscription, enforceEmployeeLimit } from "../middlewares/planLimits.js";
import {
  getEmployees,
  getEmployee,
  addEmployee,
  inviteEmployee,
  updateEmployee,
  removeEmployee,
  acceptInvitation,
  getEmployeeCount,
} from "../controllers/storeEmployeeController.js";

const router = express.Router();

router.use(protect);
router.use(loadSubscription);

router.get("/count", getEmployeeCount);
router.get("/", getEmployees);
router.get("/:id", getEmployee);
router.post("/add", enforceEmployeeLimit, addEmployee);
router.post("/invite", enforceEmployeeLimit, inviteEmployee);
router.post("/accept-invitation", acceptInvitation);
router.put("/:id", updateEmployee);
router.delete("/:id", removeEmployee);

export default router;
