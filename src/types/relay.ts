/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { ScanConfig } from "./config.js";
import { AgentType, IAgentManager } from "./manager.js";
import {
  ClientConfig,
  SendRelayMessageRequest,
  GetRelayTaskRequest,
  CancelRelayTaskRequest,
  AgentRelayRequest,
  SearchRelayRequest,
} from "./schema.js";
import { AgentCard, Task, SendMessageSuccessResult } from "@artinet/sdk";

export interface IAgentRelay extends IAgentManager {
  discoverAgents(config: ScanConfig): Promise<AgentCard[]>;
  registerAgent(agent: AgentType | ClientConfig): Promise<AgentCard>;
  deregisterAgent(agentId: string): Promise<void>;
  sendMessage(
    params: SendRelayMessageRequest
  ): Promise<SendMessageSuccessResult>;
  getTask(params: GetRelayTaskRequest): Promise<Task>;
  cancelTask(params: CancelRelayTaskRequest): Promise<Task>;
  getAgentCard(params: AgentRelayRequest): Promise<AgentCard | undefined>;
  searchAgents(params: SearchRelayRequest): Promise<AgentCard[]>;
}
