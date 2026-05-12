import type {
  Capabilities,
  DraftTemplate,
  Finding,
  FindingDetail,
  MirrorTemplate,
  WorkflowDefinition,
} from "./types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export const findingsApi = {
  list: () => api<{ data: Finding[] }>(`/findings`).then((r) => r.data),
  detail: (id: number) =>
    api<{ data: FindingDetail }>(`/findings/${id}`).then((r) => r.data),
};

export const templatesApi = {
  latest: (templateKey: string) =>
    api<{ data: MirrorTemplate }>(`/workflow-templates/${templateKey}/latest`)
      .then((r) => r.data)
      .catch(() => null),
  draft: (templateKey: string) =>
    api<{ data: DraftTemplate }>(`/workflow-templates/${templateKey}/draft`)
      .then((r) => r.data)
      .catch(() => null),
  saveDraft: (
    templateKey: string,
    body: {
      definition: WorkflowDefinition;
      name: string;
      service: string;
      basedOnVersion: number | null;
    },
  ) =>
    api<{ ok: true }>(`/workflow-templates/${templateKey}/draft`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  discardDraft: (templateKey: string) =>
    api<{ ok: true }>(`/workflow-templates/${templateKey}/draft`, {
      method: "DELETE",
    }),
  publish: (templateKey: string) =>
    api<{ data: MirrorTemplate }>(
      `/workflow-templates/${templateKey}/publish`,
      { method: "POST" },
    ).then((r) => r.data),
  versions: (templateKey: string) =>
    api<{ data: MirrorTemplate[] }>(
      `/workflow-templates/${templateKey}/versions`,
    ).then((r) => r.data),
  version: (templateKey: string, version: number) =>
    api<{ data: MirrorTemplate }>(
      `/workflow-templates/${templateKey}/versions/${version}`,
    ).then((r) => r.data),
  revert: (templateKey: string, version: number) =>
    api<{ data: MirrorTemplate }>(
      `/workflow-templates/${templateKey}/versions/${version}/revert`,
      { method: "POST" },
    ).then((r) => r.data),
};

export const capabilitiesApi = {
  get: () =>
    api<{ data: Capabilities }>(`/workflow-capabilities`).then((r) => r.data),
};
