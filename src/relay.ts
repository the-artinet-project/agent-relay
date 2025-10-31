/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  A2AClient,
  AgentCard,
  MessageSendParams,
  SendMessageSuccessResult,
  TaskQueryParams,
  Task,
  TaskIdParams,
} from "@artinet/sdk";
import {
  AgentType,
  IAgentRelay,
  ClientConfig,
  AgentRelayConfig,
  ScanConfig,
} from "./types/index.js";
import { AgentManager, getAgentCard } from "./manager.js";
import { scanAgents, DEFAULT_MAX_THREADS } from "./scan.js";
import { getAgentRuntimePath } from "./sync.js";

export const DEFAULT_SYNC_INTERVAL = parseInt(
  process.env.ARTINET_RELAY_SYNC_INTERVAL || "30000"
);

/**
 * @description AgentRelay is a class that manages the agents and their interactions.
 * It scans for agents on the network and registers them.
 * It also provides a way to send messages to the agents and get tasks from them.
 * It also provides a way to get the agent card and search for agents.
 */
export class AgentRelay extends AgentManager implements IAgentRelay {
  private config: Required<AgentRelayConfig>;
  private timeoutId: NodeJS.Timeout | null = null;
  constructor(config: AgentRelayConfig) {
    super(config.agents ?? new Map());
    this.config = {
      ...config,
      abortSignal: config.abortSignal ?? new AbortController().signal,
      syncInterval: config.syncInterval ?? DEFAULT_SYNC_INTERVAL,
      configPath: config.configPath ?? getAgentRuntimePath(),
      scanConfig: {
        ...(config.scanConfig ?? {}),
        host: config.scanConfig?.host ?? "localhost",
        startPort: config.scanConfig?.startPort ?? 3000,
        endPort: config.scanConfig?.endPort ?? 3100,
        threads: config.scanConfig?.threads ?? DEFAULT_MAX_THREADS,
      },
      agents: config.agents ?? new Map(),
    };
  }
  /**
   * @description Create a new AgentRelay instance and ensure its ready to use
   * @param config - The configuration for the AgentRelay
   * @returns The AgentRelay instance
   */
  static async create(config: AgentRelayConfig): Promise<AgentRelay> {
    const relay = new AgentRelay(config);
    await relay.findAgents(relay.config.scanConfig);
    relay.startSync().catch((error) => {
      console.error("Error running sync: ", error);
      throw error;
    });
    return relay;
  }

  override getAgent(agentId: string): AgentType | undefined {
    //to avoid recursive calls
    if (agentId === this.config.callerId) {
      return undefined;
    }
    return super.getAgent(agentId);
  }

  override async close(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    await super.close();
  }

  private async startSync(): Promise<void> {
    this.timeoutId = setInterval(async () => {
      await this.findAgents(this.config.scanConfig);
    }, this.config.syncInterval);
  }

  private async findAgents(config: ScanConfig): Promise<void> {
    const configs = await scanAgents(config).catch((error) => {
      console.error(`Error scanning agents: ${error}`);
      return [];
    });
    for (const config of configs) {
      await this.registerAgent(config).catch((error) => {
        console.warn(`Error registering agent: ${error}`);
      });
    }
  }

  //todo if agent is not a server, serverfy it?
  // I think we'll avoid this for now
  // Because it will allow Relay's to have local environments that are unique to them
  async registerAgent(agent: AgentType | ClientConfig): Promise<AgentCard> {
    let agentCard = await getAgentCard(agent);
    if (
      !agentCard &&
      "url" in agent &&
      "headers" in agent &&
      "fallbackPath" in agent
    ) {
      try {
        agent = new A2AClient(agent.url, agent.headers, agent.fallbackPath);
        agentCard = await agent.agentCard();
      } catch (error) {
        // console.error("error creating client for agent: ", error);
        throw error;
      }
    } else if (!agentCard) {
      throw new Error("Invalid agent type");
    }
    await super.setAgent(agent as AgentType);
    return agentCard;
  }

  async deregisterAgent(id: string): Promise<void> {
    super.deleteAgent(id);
  }

  async sendMessage(
    agentId: string,
    messageParams: MessageSendParams
  ): Promise<SendMessageSuccessResult> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    const sendMessageResult = await agent.sendMessage(messageParams);
    if (!sendMessageResult) {
      throw new Error(`Failed to send message to agent ${agentId}`);
    }
    return sendMessageResult;
  }

  async getTask(agentId: string, taskQuery: TaskQueryParams): Promise<Task> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    const task = await agent.getTask(taskQuery);
    if (!task) {
      throw new Error(`Task ${agentId} not found`);
    }
    return task;
  }

  async cancelTask(agentId: string, taskId: TaskIdParams): Promise<Task> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    const task = await agent.cancelTask(taskId);
    if (!task) {
      throw new Error(`Task ${agentId} not found`);
    }
    return task;
  }

  async getAgentCard(agentId: string): Promise<AgentCard> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    let agentCard = await getAgentCard(agent);
    if (!agentCard) {
      throw new Error(`Invalid agent type`);
    }
    return agentCard;
  }

  async searchAgents(query: string): Promise<AgentCard[]> {
    const agents = this.getAgents();
    return (
      await Promise.all(
        agents.map(async (agent) =>
          agent instanceof A2AClient ? await agent.agentCard() : agent.agentCard
        )
      )
    ).filter(
      (agentCard) =>
        agentCard.name.toLowerCase().includes(query.toLowerCase()) ||
        agentCard.description.toLowerCase().includes(query.toLowerCase()) ||
        agentCard.skills.some(
          (skill) =>
            skill.name.toLowerCase().includes(query.toLowerCase()) ||
            skill.description.toLowerCase().includes(query.toLowerCase())
        )
    );
  }
}
