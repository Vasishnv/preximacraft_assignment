import {Router} from "express"
import { cancelsub, changePlan, getMyInvoices, getMyPayments, getMySubscription } from "../controllers/sub.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";


const subrouter = Router();

subrouter.get("/me",authenticate,getMySubscription);
subrouter.get("/payments",authenticate,getMyPayments);
subrouter.get("/invoices",authenticate,getMyInvoices);
subrouter.post("/cancel",authenticate,cancelsub);
subrouter.post("/change",authenticate,changePlan);

export default subrouter;