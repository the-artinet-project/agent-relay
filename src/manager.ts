/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { A2AClient, A2AService, AgentCard } from "@artinet/sdk";
import { IAgentManager, AgentType, ClientConfig } from "./types/index.js";

export async function getAgentCard(
  agent: AgentType | ClientConfig
): Promise<AgentCard | undefined> {
  if (agent instanceof A2AClient) {
    return await agent.agentCard();
  } else if (agent instanceof A2AService) {
    return agent.agentCard;
  }
  return undefined;
}

export class AgentManager implements IAgentManager {
  private agents: Map<string, AgentType> = new Map();
  constructor(agents: Map<string, AgentType> = new Map()) {
    this.agents = agents;
  }
  getAgent(id: string): AgentType | undefined {
    return this.agents.get(id);
  }
  async setAgent(agent: AgentType): Promise<void> {
    if (agent instanceof A2AClient) {
      const agentCard = await agent.agentCard();
      this.agents.set(agentCard.name, agent);
    } else {
      this.agents.set(agent.agentCard.name, agent);
    }
  }
  deleteAgent(id: string): void {
    this.agents.delete(id);
  }
  getAgents(): AgentType[] {
    return Array.from(this.agents.values());
  }
  async getAgentCards(): Promise<AgentCard[]> {
    const agents = this.getAgents();
    const agentCards = await Promise.all(
      agents.map(async (agent) => await getAgentCard(agent))
    );
    return agentCards.filter(
      (agentCard: AgentCard | undefined) => agentCard !== undefined
    ) as AgentCard[];
  }
  getAgentCount(): number {
    return this.agents.size;
  }
  getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }
  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.agents.values()).map(async (agent) => {
        if ("stop" in agent) {
          await agent.stop();
        }
      })
    );
  }
}
