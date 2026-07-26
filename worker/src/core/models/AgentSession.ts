import type { TaskExecutionPayload } from "./TaskDef.js";


export type AgentSessionKey = {
  namespace: string;
  workflowInstId: string;
  taskId: string;
};

export function agentSessionKey(payload: TaskExecutionPayload): AgentSessionKey {
  return {
    namespace: payload.namespace,
    workflowInstId: payload.workflow_inst_id,
    taskId: payload.task.id,
  };
}

export function serializeAgentSessionKey(key: AgentSessionKey): string {
  return `${key.namespace}$${key.workflowInstId}$${key.taskId}`;
}
