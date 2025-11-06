const express = require("express");
const router = express.Router();

const {
  getFlowStatus,
  handleApprovalAction,
  getMyRequests,
  getPendingForApprover,
} = require("../controller/approvalController");

// ✅ STATIC ROUTES FIRST
router.get("/my-requests", getMyRequests);          // <-- pehle
router.get("/", getPendingForApprover);             // <-- phir

// ✅ DYNAMIC ROUTES LAST
router.get("/:flowId/action", handleApprovalAction);
router.get("/:flowId", getFlowStatus);

module.exports = router;
