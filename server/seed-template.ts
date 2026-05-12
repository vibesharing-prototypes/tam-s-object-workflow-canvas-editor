import type { WorkflowDefinition } from "./rc-workflows.js";

/**
 * The seeded audit-finding workflow. Modeled on the Confluence spec at
 * https://diligentbrands.atlassian.net/wiki/spaces/RCPPM/pages/4970742095/.
 *
 * States: draft → in_review → to_be_published → pending_acceptance →
 * remediation_planning → in_remediation → to_be_approved → closed.
 * Plus a `discarded` terminal reachable from draft and in_review.
 *
 * "Initiate" out of remediation_planning and "Complete" out of
 * in_remediation are described as automatic in the spec; we expose them
 * as manual transitions so the editor demo can visualise them.
 */
export const SEED_TEMPLATE_DEFINITION: WorkflowDefinition = {
  initial: "draft",
  states: {
    draft: {
      on: {
        submit: {
          target: "in_review",
          _editor_metadata: { label: "Submit for approval" },
        },
        discard: {
          target: "discarded",
          _editor_metadata: { label: "Discard" },
        },
      },
      _editor_metadata: {
        position: { x: 80, y: 280 },
        locked: true,
        label: "Draft",
        category: "static",
      },
    },
    in_review: {
      on: {
        approve: {
          target: "to_be_published",
          _editor_metadata: { label: "Approve" },
        },
        decline: {
          target: "draft",
          _editor_metadata: { label: "Decline" },
        },
        discard: {
          target: "discarded",
          _editor_metadata: { label: "Discard" },
        },
      },
      _editor_metadata: {
        position: { x: 320, y: 280 },
        label: "In review",
        category: "waiting",
      },
    },
    to_be_published: {
      on: {
        publish: {
          target: "pending_acceptance",
          _editor_metadata: { label: "Publish" },
        },
      },
      _editor_metadata: {
        position: { x: 560, y: 280 },
        label: "To be published",
        category: "waiting",
      },
    },
    pending_acceptance: {
      on: {
        accept: {
          target: "remediation_planning",
          _editor_metadata: { label: "Accept" },
        },
      },
      _editor_metadata: {
        position: { x: 800, y: 280 },
        label: "Pending acceptance",
        category: "waiting",
      },
    },
    remediation_planning: {
      on: {
        initiate: {
          target: "in_remediation",
          _editor_metadata: { label: "Initiate" },
        },
      },
      _editor_metadata: {
        position: { x: 1040, y: 280 },
        label: "Remediation planning",
        category: "progressing",
      },
    },
    in_remediation: {
      on: {
        complete: {
          target: "to_be_approved",
          _editor_metadata: { label: "Complete" },
        },
      },
      _editor_metadata: {
        position: { x: 1280, y: 280 },
        label: "In remediation",
        category: "progressing",
      },
    },
    to_be_approved: {
      on: {
        approve_close: {
          target: "closed",
          _editor_metadata: { label: "Approve / Close" },
        },
      },
      _editor_metadata: {
        position: { x: 1520, y: 280 },
        label: "To be approved",
        category: "waiting",
      },
    },
    closed: {
      _editor_metadata: {
        position: { x: 1760, y: 200 },
        locked: true,
        label: "Closed",
        category: "completed",
      },
    },
    discarded: {
      _editor_metadata: {
        position: { x: 320, y: 480 },
        locked: true,
        label: "Discarded",
        category: "static",
      },
    },
  },
};

export const SEED_TEMPLATE_NAME = "Audit Finding Workflow";
export const SEED_TEMPLATE_SERVICE = "audit-findings";

export interface SeededFinding {
  external_id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  current_state: string;
  owner_name: string;
  owner_initials: string;
  approver_name: string;
  approver_initials: string;
}

export const SEEDED_FINDINGS: ReadonlyArray<SeededFinding> = [
  {
    external_id: "FI-2312",
    title: "Monthly Invoice Reconciliation",
    severity: "low",
    current_state: "in_review",
    owner_name: "Jane Doe",
    owner_initials: "JD",
    approver_name: "June Toy",
    approver_initials: "JT",
  },
  {
    external_id: "FI-1756",
    title: "Vendor Follow-up Procedures",
    severity: "low",
    current_state: "closed",
    owner_name: "Darlene Robertson",
    owner_initials: "DR",
    approver_name: "Levi Leffler",
    approver_initials: "LL",
  },
  {
    external_id: "FI-1543",
    title: "Absence of Source Documentation in Invoicing",
    severity: "medium",
    current_state: "to_be_published",
    owner_name: "Dianne Russell",
    owner_initials: "AB",
    approver_name: "Geneva Bergstrom",
    approver_initials: "GB",
  },
  {
    external_id: "FI-0352",
    title: "Invoice Approval Workflow Optimization",
    severity: "high",
    current_state: "draft",
    owner_name: "Esther Howard",
    owner_initials: "AB",
    approver_name: "Clark Hagenes",
    approver_initials: "CH",
  },
  {
    external_id: "FI-0861",
    title: "Supplier Payment Schedule Review",
    severity: "medium",
    current_state: "pending_acceptance",
    owner_name: "Brooklyn Simmons",
    owner_initials: "AB",
    approver_name: "Jeanette Turcotte",
    approver_initials: "JT",
  },
  {
    external_id: "FI-2131",
    title: "Expense Report Automation",
    severity: "high",
    current_state: "in_remediation",
    owner_name: "Kristin Watson",
    owner_initials: "AB",
    approver_name: "Jeremy Gleason",
    approver_initials: "JG",
  },
  {
    external_id: "FI-3454",
    title: "Contract Compliance Monitoring",
    severity: "low",
    current_state: "remediation_planning",
    owner_name: "Wade Warren",
    owner_initials: "AB",
    approver_name: "Barbara Kessler",
    approver_initials: "BK",
  },
  {
    external_id: "FI-1354",
    title: "Financial Statement Reconciliation",
    severity: "high",
    current_state: "to_be_approved",
    owner_name: "Bessie Cooper",
    owner_initials: "AB",
    approver_name: "Emanuel Bednar",
    approver_initials: "EB",
  },
  {
    external_id: "FI-2890",
    title: "Stale Vendor Master Data",
    severity: "medium",
    current_state: "discarded",
    owner_name: "Devon Lane",
    owner_initials: "DL",
    approver_name: "Cameron Williamson",
    approver_initials: "CW",
  },
];
