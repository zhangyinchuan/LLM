import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const PROXY_API_KEY = process.env.PROXY_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const MODELS = [
  {
    id: "claude-opus-4-20250514",
    object: "model",
    created: 1715644800,
    owned_by: "anthropic",
  },
  {
    id: "claude-sonnet-4-20250514",
    object: "model",
    created: 1715644800,
    owned_by: "anthropic",
  },
  {
    id: "claude-haiku-4-20250514",
    object: "model",
    created: 1715644800,
    owned_by: "anthropic",
  },
];

// Middleware: verify Bearer token
function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        message: "Missing or invalid Authorization header",
        type: "invalid_request_error",
        code: "invalid_api_key",
      },
    });
  }
  const token = authHeader.slice(7);
  if (token !== PROXY_API_KEY) {
    return res.status(401).json({
      error: {
        message: "Invalid API key",
        type: "invalid_request_error",
        code: "invalid_api_key",
      },
    });
  }
  next();
}

// GET /v1/models
router.get("/models", authMiddleware, (_req: Request, res: Response) => {
  res.json({
    object: "list",
    data: MODELS,
  });
});

// POST /v1/chat/completions
router.post(
  "/chat/completions",
  authMiddleware,
  async (req: Request, res: Response) => {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const { model, messages, stream, max_tokens, temperature, top_p } =
      req.body;

    // Extract system message
    let systemPrompt: string | undefined;
    const filteredMessages: Array<{ role: string; content: string }> = [];

    for (const msg of messages || []) {
      if (msg.role === "system") {
        systemPrompt = msg.content;
      } else if (msg.role === "user" || msg.role === "assistant") {
        filteredMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const anthropicParams: any = {
      model: model || "claude-sonnet-4-20250514",
      messages: filteredMessages,
      max_tokens: max_tokens || 4096,
    };

    if (systemPrompt) {
      anthropicParams.system = systemPrompt;
    }
    if (temperature !== undefined) {
      anthropicParams.temperature = temperature;
    }
    if (top_p !== undefined) {
      anthropicParams.top_p = top_p;
    }

    const completionId = `chatcmpl-${uuidv4().replace(/-/g, "").slice(0, 29)}`;

    if (stream) {
      // --- Streaming response ---
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      // Keepalive interval
      const keepalive = setInterval(() => {
        try {
          res.write(": keepalive\n\n");
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        } catch {
          // ignore
        }
      }, 5000);

      let closed = false;
      req.on("close", () => {
        closed = true;
        clearInterval(keepalive);
      });

      try {
        anthropicParams.stream = true;
        const stream = await client.messages.create(anthropicParams);

        for await (const event of stream as any) {
          if (closed) break;

          let chunk: any = null;

          if (event.type === "content_block_start") {
            chunk = {
              id: completionId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: model || "claude-sonnet-4-20250514",
              choices: [
                {
                  index: 0,
                  delta: { role: "assistant", content: "" },
                  finish_reason: null,
                },
              ],
            };
          } else if (event.type === "content_block_delta") {
            const text = event.delta?.text || "";
            chunk = {
              id: completionId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: model || "claude-sonnet-4-20250514",
              choices: [
                {
                  index: 0,
                  delta: { content: text },
                  finish_reason: null,
                },
              ],
            };
          } else if (event.type === "message_delta") {
            const stopReason = event.delta?.stop_reason;
            let finishReason = "stop";
            if (stopReason === "max_tokens") finishReason = "length";
            chunk = {
              id: completionId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: model || "claude-sonnet-4-20250514",
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: finishReason,
                },
              ],
              usage: event.usage
                ? {
                    prompt_tokens: event.usage.input_tokens || 0,
                    completion_tokens: event.usage.output_tokens || 0,
                    total_tokens:
                      (event.usage.input_tokens || 0) +
                      (event.usage.output_tokens || 0),
                  }
                : undefined,
            };
          }

          if (chunk) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        }

        if (!closed) {
          res.write("data: [DONE]\n\n");
          res.end();
        }
      } catch (err: any) {
        clearInterval(keepalive);
        if (!closed) {
          const errorChunk = {
            error: {
              message: err.message || "Internal server error",
              type: "server_error",
            },
          };
          res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
          res.end();
        }
      } finally {
        clearInterval(keepalive);
      }
    } else {
      // --- Non-streaming response ---
      try {
        const response = await client.messages.create(anthropicParams);

        let content = "";
        for (const block of (response as any).content || []) {
          if (block.type === "text") {
            content += block.text;
          }
        }

        let finishReason = "stop";
        if ((response as any).stop_reason === "max_tokens")
          finishReason = "length";

        const result = {
          id: completionId,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: model || "claude-sonnet-4-20250514",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: content,
              },
              finish_reason: finishReason,
            },
          ],
          usage: {
            prompt_tokens: (response as any).usage?.input_tokens || 0,
            completion_tokens: (response as any).usage?.output_tokens || 0,
            total_tokens:
              ((response as any).usage?.input_tokens || 0) +
              ((response as any).usage?.output_tokens || 0),
          },
        };

        res.json(result);
      } catch (err: any) {
        const status = err.status || 500;
        res.status(status).json({
          error: {
            message: err.message || "Internal server error",
            type: "server_error",
          },
        });
      }
    }
  }
);

export default router;
