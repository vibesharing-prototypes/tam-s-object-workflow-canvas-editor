import { Hono } from "hono";

export const capabilitiesRouter = new Hono();

capabilitiesRouter.get("/workflow-capabilities", (c) => {
  return c.json({
    data: {
      guards: [
        {
          name: "approval",
          source: "shared",
          description:
            "Requires sign-off from one or more approvers before the transition completes.",
          params: [
            {
              name: "approvers",
              label: "Approvers",
              type: "string",
              required: true,
              multiple: true,
              placeholder: "user@example.com or role",
            },
          ],
        },
        {
          name: "is-critical",
          source: "shared",
          description: "Passes if finding.severity == 'critical'",
        },
        {
          name: "is-not-critical",
          source: "shared",
          description: "Passes if finding.severity != 'critical'",
        },
      ],
      actions: [
        {
          name: "send-notification",
          source: "shared",
          description: "Sends a notification to one or more recipients",
          params: [
            {
              name: "recipients",
              label: "Recipients",
              type: "string",
              required: true,
              multiple: true,
              placeholder: "user@example.com",
            },
          ],
        },
        {
          name: "run-robot",
          source: "shared",
          description:
            "Triggers a robot. The owning application interprets the robot id.",
          params: [
            {
              name: "robot_id",
              label: "Robot ID",
              type: "string",
              required: true,
              placeholder: "robot_xyz",
            },
          ],
        },
        {
          name: "notify-hoa",
          source: "custom",
          description: "Notifies the Head of Audit",
        },
      ],
    },
  });
});
