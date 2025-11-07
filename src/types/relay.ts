/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { ScanConfig } from "./config.js";
import { AgentType, IAgentManager } from "./manager.js";
import { ClientConfig } from "./schema.js";
import {
  AgentCard,
  TaskQueryParams,
  Task,
  TaskIdParams,
  MessageSendParams,
  SendMessageSuccessResult,
} from "@artinet/sdk";

export interface IAgentRelay extends IAgentManager {
  discoverAgents(config: ScanConfig): Promise<AgentCard[]>;
  registerAgent(agent: AgentType | ClientConfig): Promise<AgentCard>;
  deregisterAgent(agentId: string): Promise<void>;
  sendMessage(
    agentId: string,
    messageParams: MessageSendParams
  ): Promise<SendMessageSuccessResult>;
  getTask(agentId: string, taskQuery: TaskQueryParams): Promise<Task>;
  cancelTask(agentId: string, taskId: TaskIdParams): Promise<Task>;
  getAgentCard(agentId: string): Promise<AgentCard | undefined>;
  searchAgents(query: string): Promise<AgentCard[]>;
}
