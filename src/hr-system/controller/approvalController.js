// src/hr-system/controller/approvalController.js
const ApprovalFlow = require("../models/ApprovalFlow");
// sendEmail should send plain emails. dummy OK for now.
const sendEmail = require("../utils/sendEmail");

/**
 * GET /api/approvals/my-requests?email=abc@company.com
 *  -> employee ke saare submitted flows (newest first)
 */

async function getMyRequests(req, res) {
  try {
    const email = String(req.query.email || "").toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    // sirf us user ki submitted requests lao
    const flows = await ApprovalFlow.find(
      { requesterEmail: email },
      {
        formName: 1,
        status: 1,
        createdAt: 1,
        approvals: 1,
        currentStep: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    // sirf readable summary banao
    const shaped = flows.map((f) => ({
      _id: f._id,
      formName: f.formName,
      status: f.status, // "Pending" | "Approved" | "Rejected"
      createdAt: f.createdAt,
      currentStep: f.currentStep,
      approvals: (f.approvals || []).map((a) => ({
        role: a.role,
        name: a.name,
        email: a.email,
        status: a.status,
        comment:a.comment
      })),
    }));

    return res.json(shaped);
  } catch (err) {
    console.error("getMyRequests error", err);
    return res.status(500).json({ error: err.message });
  }
}



/**
 * GET /api/approvals/:flowId
 * ek flow ka full timeline
 */
async function getFlowStatus(req, res) {
  try {
    const { flowId } = req.params;
    const flow = await ApprovalFlow.findById(flowId).lean();
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" });
    }
    return res.json(flow);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/approvals/:flowId/action?step=1&decision=approve&comment=ok
 * email se approver click karega
 */
async function handleApprovalAction(req, res) {
  try {
    const { flowId } = req.params;
    const { step, decision, comment } = req.query;

    const stepNum = Number(step);
    const stepIndex = stepNum - 1;

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const flow = await ApprovalFlow.findById(flowId);
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" });
    }

    // yeh step abhi active hai?
    if (flow.currentStep !== stepNum) {
      return res
        .status(400)
        .json({ error: "This step is not active anymore" });
    }

    // update approver status
    flow.approvals[stepIndex].status =
      decision === "approve" ? "Approved" : "Rejected";
    flow.approvals[stepIndex].approvedAt = new Date();
    flow.approvals[stepIndex].comment = comment || null;

    // 1) REJECT
    if (decision === "reject") {
      flow.status = "Rejected";
      await flow.save();

      // email requester
      await sendEmail({
        to: flow.requesterEmail,
        subject: `Your ${flow.formName} request was rejected`,
        body: `Your ${flow.formName} request has been rejected by ${flow.approvals[stepIndex].name}.`,
      });

      return res.send("Request has been marked as REJECTED. ✅");
    }

    // 2) APPROVED
    const isLastStep = stepNum === flow.approvals.length;

    if (isLastStep) {
      // sab approve
      flow.status = "Approved";
      await flow.save();

      await sendEmail({
        to: flow.requesterEmail,
        subject: `Your ${flow.formName} request is fully approved 🎉`,
        body: `Your ${flow.formName} request has been approved by all approvers.`,
      });

      return res.send("Request is FULLY APPROVED. 🎉");
    } else {
      // next approver ko bhejo
      const nextStep = stepNum + 1;
      flow.currentStep = nextStep;
      await flow.save();

      const nextApprover = flow.approvals[nextStep - 1];
      const approveLink = `${process.env.APP_BASE_URL}/api/approvals/${flow._id}/action?step=${nextStep}&decision=approve`;
      const rejectLink = `${process.env.APP_BASE_URL}/api/approvals/${flow._id}/action?step=${nextStep}&decision=reject`;

      const emailBody = `
You have a pending approval for ${flow.formName}.

Requested by: ${flow.requesterName} (${flow.requesterEmail})

Details:
${Object.entries(flow.formDataPayload?.answers || {})
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n")}

Approve: ${approveLink}
Reject: ${rejectLink}
`;

      await sendEmail({
        to: nextApprover.email,
        subject: `Approval required: ${flow.formName} - Step ${nextStep}`,
        body: emailBody,
      });

      return res.send(
        `Step ${stepNum} APPROVED ✅. Next approver notified.`
      );
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .send("Internal server error: " + err.message);
  }
}

// jis approver ki email de, uske saare "Pending" steps wale flows de do
async function getPendingForApprover(req, res) {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const normalized = email.toLowerCase();

    const flows = await ApprovalFlow.find({
      status: { $ne: "Rejected" }, // reject ho chuka to inbox me kyu?
      approvals: {
        $elemMatch: {
          email: normalized,
          status: "Pending",
        },
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(flows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}


/**
 * GET /api/approvals/all
 *  -> saare flows (newest first)
 */
async function getAllApprovals(req, res) {
  try {
    const flows = await ApprovalFlow.find(
      {},
      {
        formName: 1,
        status: 1,
        createdAt: 1,
        currentStep: 1,
        approvals: 1,
        requesterName: 1,
        requesterEmail: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    const shaped = flows.map((f) => ({
      _id: f._id,
      formName: f.formName,
      status: f.status,
      createdAt: f.createdAt,
      currentStep: f.currentStep,
      requester: {
        name: f.requesterName,
        email: f.requesterEmail,
      },
      approvals: (f.approvals || []).map((a) => ({
        role: a.role,
        name: a.name,
        email: a.email,
        status: a.status,
        comment: a.comment,
        approvedAt: a.approvedAt,
      })),
    }));

    return res.json(shaped);
  } catch (err) {
    console.error("getAllApprovals error", err);
    return res.status(500).json({ error: err.message });
  }
}




module.exports = {
  getMyRequests,     // 👈 naya
  getFlowStatus,
  handleApprovalAction,
  getPendingForApprover,
  getAllApprovals,
};

