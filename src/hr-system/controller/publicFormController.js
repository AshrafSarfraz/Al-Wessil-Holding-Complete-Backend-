// src/hr-system/controller/publicFormController.js

const Form = require("../models/Form");
const ApprovalPriority = require("../models/AprovalPriority"); // ✅ typo fix
const ApprovalFlow = require("../models/ApprovalFlow");
const Manager = require("../models/Managers"); // ✅ for self-select manager
const sendEmail = require("../utils/sendEmail");

// Small helper to print answers nicely (handles objects/arrays)
function prettyValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// GET /api/forms
// list active forms for dropdown
async function getForms(req, res) {
  try {
    const forms = await Form.find({ active: true })
      .select("formKey displayName description active")
      .lean();
    return res.json(forms);
  } catch (err) {
    console.error("getForms error", err);
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/forms/:formKey
// return full form definition (fields...) so frontend can render
async function getFormDefinition(req, res) {
  try {
    const { formKey } = req.params;
    const formDef = await Form.findOne({ formKey, active: true }).lean();
    if (!formDef) {
      return res.status(404).json({ error: "Form not found or inactive" });
    }
    return res.json(formDef);
  } catch (err) {
    console.error("getFormDefinition error", err);
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/forms/:formKey/submit
// body = { employee:{name,email,...}, answers:{...} }
async function submitForm(req, res) {
  try {
    const { formKey } = req.params;
    const { employee, answers = {} } = req.body || {};

    if (!employee || !employee.name || !employee.email) {
      return res.status(400).json({ error: "Missing employee info (name/email required)" });
    }

    const requesterName = String(employee.name).trim();
    const requesterEmail = String(employee.email).toLowerCase().trim();

    // 1) Load form
    const formDef = await Form.findOne({ formKey, active: true }).lean();
    if (!formDef) {
      return res.status(404).json({ error: "Form not found or inactive" });
    }

    // 2) Load static approval chain
    const priority = await ApprovalPriority.findOne({ formName: formKey }).lean();
    if (!priority || !Array.isArray(priority.sequence) || priority.sequence.length === 0) {
      return res.status(400).json({ error: "No approval chain configured for this form" });
    }

    // 3) Build sequence (optionally prepend self-selected manager)
    let sequence = [...priority.sequence];

    if (formDef.allowSelfSelectManager) {
      const managerEmail = String(answers.managerEmail || "").toLowerCase().trim();
      if (!managerEmail) {
        return res.status(400).json({ error: "Please select your manager" });
      }

      const mgr = await Manager.findOne({ email: managerEmail, active: true }).lean();
      if (!mgr) {
        return res.status(400).json({ error: "Selected manager not found or inactive" });
      }

      const managerStep = {
        role: "Manager",
        name: mgr.name,
        email: mgr.email, // keep original; we’ll lowercase later
        order: 1,
      };

      // Re-number the rest after manager
      sequence = [managerStep, ...sequence.map((s, idx) => ({ ...s, order: idx + 2 }))];

      // Optional: de-duplicate if same manager exists later
      const seen = new Set();
      sequence = sequence
        .filter((s) => {
          const key = String(s.email || "").toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((s, i) => ({ ...s, order: i + 1 }));
    }

    // 4) Shape approvals array
    const approvalsArray = sequence
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((a) => ({
        role: a.role,
        name: a.name,
        email: String(a.email || "").toLowerCase(),
        status: "Pending",
        approvedAt: null,
        comment: null,
      }));

    // 5) Create approval flow
    const flowDoc = await ApprovalFlow.create({
      formName: formKey,
      formId: formDef._id, // link back to form
      requesterName,
      requesterEmail,
      currentStep: 1,
      status: "Pending",
      approvals: approvalsArray,
      formDataPayload: {
        employee,
        answers, // includes managerEmail when toggle ON
      },
    });

    // 6) Notify first approver
    const firstApprover = approvalsArray[0];
    if (!firstApprover || !firstApprover.email) {
      return res.status(500).json({ error: "First approver missing email" });
    }

    const approveLink = `${process.env.APP_BASE_URL}/api/approvals/${flowDoc._id}/action?step=1&decision=approve`;
    const rejectLink = `${process.env.APP_BASE_URL}/api/approvals/${flowDoc._id}/action?step=1&decision=reject`;

    const details =
      Object.entries(answers || {})
        .map(([k, v]) => `${k}: ${prettyValue(v)}`)
        .join("\n") || "-";

        const emailBody = `
        New ${formDef.displayName || formKey} request submitted.
        
        Employee: ${requesterName} (${requesterEmail})
        Department: ${employee.department || "-"}
        
        Details:
        ${details}
        
        Please review:
        Approve: ${approveLink}
        Reject: ${rejectLink}
        `.trim();
        
            // 🎨 HTML email (for manager / first approver)
            const html = `
              <div style="font-family: Arial, sans-serif;  ">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#f5f5f5;  border-radius:8px; overflow:hidden;">
                  <tr>
                    <td style="background:#31368A; padding:16px 24px; color:#ffffff;">
                      <table width="100%">
                        <tr>
                          <td style="font-size:20px; font-weight:bold ;">
                            <!-- yahan real logo URL lagao -->
                            <img src="https://alwessilholding.com/wp-content/uploads/elementor/thumbs/white-logo-without-bg-rcstibzjkvfhqjzwzokn5khk5v46zznyb6bizwhx3s.png" 
                            alt="Company Logo" style="height:40px; vertical-align:middle; margin-right:8px;">
                          </td>
                          <td style="text-align:right; font-size:12px;">
                          Self Service
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
        
                  <tr>
                    <td style="padding:24px;">
                      <h1 style="margin:0 0 8px 0; font-size:20px; color:#333;">
                  <strong>${formDef.displayName || formKey}</strong>
                </h1>

                 <p style="margin:0 0 16px 0; color:#555; font-size:14px;">
                 A new request has been submitted and needs your review.
                 </p>
            

                      <h3 style="margin:16px 0 8px 0; font-size:16px; color:#333;">Employee Details</h3>
                      <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse; font-size:14px;">
                        <tr>
                          <td style="border:1px solid #ddd; font-weight:bold; width:30%;">Employee</td>
                          <td style="border:1px solid #ddd;">${requesterName} (${requesterEmail})</td>
                        </tr>
                        <tr>
                          <td style="border:1px solid #ddd; font-weight:bold;">Department</td>
                          <td style="border:1px solid #ddd;">${employee.department || "-"}</td>
                        </tr>
                      </table>
        
                      <h3 style="margin:16px 0 8px 0; font-size:16px; color:#333;">Request Details</h3>
                      <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse; font-size:14px;">
                        ${Object.entries(answers || {})
                          .map(
                            ([k, v]) => `
                              <tr>
                                <td style="border:1px solid #ddd; font-weight:bold; width:30%;">${k}</td>
                                <td style="border:1px solid #ddd;">${prettyValue(v)}</td>
                              </tr>
                            `
                          )
                          .join("")}
                      </table>
        
                      <p style="margin-top:24px; font-size:12px; color:#999; text-align:center;">
                        This is an automated email from the Al Wessil HR workflow system.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            `;
        
            await sendEmail({
              to: firstApprover.email,
              subject: `Approval required: ${formDef.displayName || formKey} - Step 1`,
              body: emailBody, // plain text (fallback)
              html,            // 🎨 design wala
            });
        

    return res.json({
      ok: true,
      message: "Form submitted and first approver notified",
      flowId: flowDoc._id,
    });
  } catch (err) {
    console.error("submitForm error", err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getForms,
  getFormDefinition,
  submitForm,
};
