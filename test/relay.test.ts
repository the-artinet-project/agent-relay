import { scanAgents } from "../src/scan.js";
import { AgentRelay } from "../src/relay.js";
import {
  createAgentServer,
  AgentBuilder,
  ExpressAgentServer,
  getContent,
} from "@artinet/sdk";
import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
} from "@jest/globals";
import { Server } from "http";
import { join } from "path";
jest.setTimeout(10000);
const TEST_CONFIG_PATH = join(process.cwd(), "test", "config");
describe("AgentRelay", () => {
  let agentServer: ExpressAgentServer;
  let server: Server;
  describe("scanAgents", () => {
    beforeEach(async () => {
      agentServer = createAgentServer({
        agent: AgentBuilder()
          .text(() => "hello world!")
          .createAgent({
            agentCard: {
              name: "test-agent",
              url: "http://localhost:3000/a2a",
              version: "1.0.0",
              protocolVersion: "0.3.0",
              defaultInputModes: ["text"],
              defaultOutputModes: ["text"],
              capabilities: {
                streaming: true,
                pushNotifications: true,
                stateTransitionHistory: true,
              },
              description: "A test agent",
              skills: [
                {
                  id: "test-skill",
                  name: "test-skill",
                  description: "A test skill",
                },
              ],
            },
          }),
      });
      server = agentServer.app.listen(3001, () => {});
      //wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    afterEach(async () => {
      await server.close();
    });
    it("it should detect local agent server", async () => {
      const configs = await scanAgents({
        host: "localhost",
        startPort: 3001,
        endPort: 3001,
      });
      expect(configs).toHaveLength(1);
      expect(configs[0].url).toBe("http://localhost:3001");
      expect(configs[0].headers).toBeUndefined();
      expect(configs[0].fallbackPath).toBeUndefined();
    });

    it("should detect multiple local servers", async () => {
      const server2 = agentServer.app.listen(4002, () => {});
      const configs = await scanAgents({
        host: "localhost",
        startPort: 3000,
        endPort: 5000,
      });
      expect(configs).toHaveLength(2);
      expect(configs[0].url).toBe("http://localhost:3001");
      expect(configs[1].url).toBe("http://localhost:4002");
      await server2.close();
    });
    describe("Relay Operations", () => {
      let relay: AgentRelay;
      beforeEach(async () => {
        relay = await AgentRelay.create({
          callerId: "test-caller",
          scanConfig: {
            host: "localhost",
            startPort: 3000,
            endPort: 5000,
            fallbackPath: "/.well-known/agent-card.json",
          },
          abortSignal: new AbortController().signal,
          syncInterval: 2500,
          configPath: TEST_CONFIG_PATH,
        });
      });
      afterEach(async () => {
        await relay.close();
      });
      it("should capture agents on start", async () => {
        expect(relay.getAgentCount()).toBeGreaterThanOrEqual(1);
      });
      it("should get agentIds", async () => {
        const agentIds = await relay.getAgentIds();
        expect(agentIds.length).toBeGreaterThanOrEqual(1);
        expect(agentIds).toContain("test-agent");
      });
      it("should get agentCount", async () => {
        const agentCount = await relay.getAgentCount();
        expect(agentCount).toBeGreaterThanOrEqual(1);
      });
      it("should get agent", async () => {
        const agent = await relay.getAgent("test-agent");
        expect(agent).toBeDefined();
      });
      it("should get agentCard", async () => {
        const agentCard = await relay.getAgentCard("test-agent");
        expect(agentCard).toBeDefined();
        expect(agentCard?.name).toBe("test-agent");
      });
      it("should search agents", async () => {
        const agents = await relay.searchAgents("test-agent");
        expect(agents.length).toBeGreaterThanOrEqual(1);
        expect(agents[0].name).toBe("test-agent");
      });
      it("should send message", async () => {
        const response = await relay.sendMessage("test-agent", {
          message: {
            role: "user",
            kind: "message",
            parts: [
              {
                text: "hello",
                kind: "text",
              },
            ],
            messageId: "123",
          },
        });
        expect(response).toBeDefined();
        const content = getContent(response);
        expect(content).toBe("hello world!");
      });
      it("should register agent", async () => {
        let timeoutId: NodeJS.Timeout | undefined = undefined;
        const testAgent = AgentBuilder()
          .text(async ({ command }) => {
            await new Promise((resolve) => {
              timeoutId = setTimeout(() => {
                resolve("hello world!");
              }, 4000);
            });
            return "hello world!";
          })
          .createAgent({
            agentCard: {
              name: "test-agent-2",
              url: "http://localhost:3000/a2a",
              version: "1.0.0",
              protocolVersion: "0.3.0",
              defaultInputModes: ["text"],
              defaultOutputModes: ["text"],
              capabilities: {
                streaming: true,
                pushNotifications: true,
                stateTransitionHistory: true,
              },
              description: "A test agent",
              skills: [
                {
                  id: "test-skill",
                  name: "test-skill",
                  description: "A test skill",
                },
              ],
            },
          });
        const agentCard = await relay.registerAgent(testAgent);
        expect(agentCard).toBeDefined();
        expect(agentCard?.name).toBe("test-agent-2");
        await testAgent.stop();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      it("should get task", async () => {
        let timeoutId: NodeJS.Timeout | undefined = undefined;
        const testAgent = AgentBuilder()
          .text(async ({ command }) => {
            await new Promise((resolve) => {
              timeoutId = setTimeout(() => {
                resolve("hello world!");
              }, 4000);
            });
            return "hello world!";
          })
          .createAgent({
            agentCard: {
              name: "test-agent",
              url: "http://localhost:3000/a2a",
              version: "1.0.0",
              protocolVersion: "0.3.0",
              defaultInputModes: ["text"],
              defaultOutputModes: ["text"],
              capabilities: {
                streaming: true,
                pushNotifications: true,
                stateTransitionHistory: true,
              },
              description: "A test agent",
              skills: [
                {
                  id: "test-skill",
                  name: "test-skill",
                  description: "A test skill",
                },
              ],
            },
          });
        const agentCard = await relay.registerAgent(testAgent);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const response = relay.sendMessage(agentCard.name, {
          message: {
            role: "user",
            kind: "message",
            taskId: "123",
            parts: [
              {
                text: "hello",
                kind: "text",
              },
            ],
            messageId: "123",
          },
        });
        expect(response).toBeDefined();
        await new Promise((resolve) => setTimeout(resolve, 500));
        const task = await relay.getTask(agentCard.name, {
          id: "123",
        });
        expect(task).toBeDefined();
        expect(task?.status?.state).toBe("submitted");
        await testAgent.stop();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      it("should cancel task", async () => {
        let timeoutId: NodeJS.Timeout | undefined = undefined;
        const testAgent = AgentBuilder()
          .text(async ({ command }) => {
            await new Promise((resolve) => {
              timeoutId = setTimeout(() => {
                resolve(true);
              }, 4000);
            });
            return "hello world!";
          })
          .createAgent({
            agentCard: {
              name: "test-agent",
              url: "http://localhost:3000/a2a",
              version: "1.0.0",
              protocolVersion: "0.3.0",
              defaultInputModes: ["text"],
              defaultOutputModes: ["text"],
              capabilities: {
                streaming: true,
                pushNotifications: true,
                stateTransitionHistory: true,
              },
              description: "A test agent",
              skills: [
                {
                  id: "test-skill",
                  name: "test-skill",
                  description: "A test skill",
                },
              ],
            },
          });
        const agentCard = await relay.registerAgent(testAgent);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const response = relay.sendMessage(agentCard.name, {
          message: {
            role: "user",
            kind: "message",
            taskId: "123",
            parts: [
              {
                text: "hello",
                kind: "text",
              },
            ],
            messageId: "123",
          },
        });
        expect(response).toBeDefined();
        await new Promise((resolve) => setTimeout(resolve, 500));
        const task = await relay.cancelTask(agentCard.name, {
          id: "123",
        });
        expect(task?.status?.state).toBe("canceled");
        await testAgent.stop();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      it("should detect new agent", async () => {
        expect(relay.getAgentCount()).toBe(1);
        const agentServer2 = createAgentServer({
          agent: AgentBuilder()
            .text(() => "hello world!")
            .createAgent({
              agentCard: {
                name: "test-agent-2",
                url: "http://localhost:3000/a2a",
                version: "1.0.0",
                protocolVersion: "0.3.0",
                defaultInputModes: ["text"],
                defaultOutputModes: ["text"],
                capabilities: {
                  streaming: true,
                  pushNotifications: true,
                  stateTransitionHistory: true,
                },
                description: "A test agent",
                skills: [
                  {
                    id: "test-skill",
                    name: "test-skill",
                    description: "A test skill",
                  },
                ],
              },
            }),
        });
        const server2 = agentServer2.app.listen(4005, () => {});
        await new Promise((resolve) => setTimeout(resolve, 5000));
        expect(relay.getAgentCount()).toBe(2);
        await server2.close();
      }, 100000);
    });
  });
  it("should pass empty array when no servers found", async () => {
    const configs = await scanAgents({
      host: "localhost",
      startPort: 3000,
      endPort: 6000,
    });
    expect(configs).toHaveLength(0);
  });
  it("relay should be empty when no agents found", async () => {
    const relay = await AgentRelay.create({
      callerId: "test-caller",
      scanConfig: {
        host: "localhost",
        startPort: 3000,
        endPort: 6000,
      },
      abortSignal: new AbortController().signal,
      syncInterval: 2500,
      configPath: TEST_CONFIG_PATH,
    });
    expect(relay.getAgentCount()).toBe(0);
    await relay.close();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });
});
