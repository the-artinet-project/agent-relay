/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import z from "zod";

export const ClientConfigSchema = z.object({
  url: z.string().url().describe("The URL of the agent to register."),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe("The headers to send to the agent."),
  fallbackPath: z
    .string()
    .optional()
    .describe(
      "The fallback path to use if the agent does not support the request."
    ),
});
export type ClientConfig = z.infer<typeof ClientConfigSchema>;
