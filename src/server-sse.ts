#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

// HermesWhois API endpoints
const HERMESWHOIS_API = "https://hermeswhois.tr/whois.php";
const HERMESWHOIS_SSL_API = "https://hermeswhois.tr/ssl.php";

// Import types and functions from main index
// (We'll need to refactor to share code)

// Types for HermesWhois API
interface WhoisResponse {
  main?: {
    response_id?: string;
    domain: string;
    domainCode?: string;
    CreationDate?: string;
    CreationDateTimestamp?: number | string;
    ExpiryDate?: string;
    ExpiryDateTimestamp?: number | string;
    UpdatedDate?: string;
    UpdatedDateTimestamp?: number | string;
    SponsoringRegistrar?: string;
    SponsoringRegistrarTimestamp?: number | string;
    RegistrarURL?: string;
    RegistrarURLTimestamp?: number | string;
    Registrant?: string;
    RegistrantTimestamp?: number | string;
    DomainStatus?: string;
    DomainStatusTimestamp?: number | string;
    DNS?: string;
    DNSTimestamp?: number | string;
    DNSSEC?: string;
    DNSSECTimestamp?: number | string;
    RegistrantContactEmail?: string;
    RegistrantContactEmailTimestamp?: number | string;
    whois?: string;
    created_at?: string;
    unregistered?: string;
  };
  result?: string;
  whois?: string;
  cache?: string;
  unregistered?: string;
}

interface SSLResponse {
  main?: {
    response_id?: string;
    domain: string;
    ssl_domain?: string;
    issuer?: string;
    issuer_organization?: string;
    valid_from_timestamp?: number | string;
    valid_to_timestamp?: number | string;
    serial_number?: string;
    hash?: string;
    version?: number | string;
    alt_names?: string;
    valid_from_date?: string;
    valid_to_date?: string;
    created_at?: string;
  };
  result?: string;
  cache?: string;
  error?: string;
}

// WhoisLookup tool function
async function lookupWhois(domain: string): Promise<WhoisResponse> {
  const urlPattern = /https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  if (urlPattern.test(domain)) {
    const url = new URL(domain);
    domain = url.hostname;
  }

  const response = await fetch(HERMESWHOIS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `domain=${encodeURIComponent(domain)}`,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as WhoisResponse;

  if (data.result !== "200" && data.result != null) {
    throw new Error(`API Error: ${data.result}`);
  }

  if (data.unregistered === "unregistered") {
    throw new Error("Domain is not registered");
  }

  if (data.main?.unregistered === "404") {
    throw new Error("Domain is not registered");
  }

  if (
    data.main &&
    (!data.main.CreationDate || data.main.CreationDate === "404") &&
    (!data.main.ExpiryDate || data.main.ExpiryDate === "404")
  ) {
    throw new Error("Domain is not registered");
  }

  return data;
}

// SSL Lookup tool function
async function lookupSSL(domain: string): Promise<SSLResponse> {
  const urlPattern = /https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  if (urlPattern.test(domain)) {
    const url = new URL(domain);
    domain = url.hostname;
  }

  const response = await fetch(HERMESWHOIS_SSL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `domain=${encodeURIComponent(domain)}`,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as SSLResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.result !== "200" && data.result != null) {
    throw new Error(`API Error: ${data.result}`);
  }

  return data;
}

// Format functions (simplified for SSE)
function formatWhoisData(data: WhoisResponse): string {
  const { main, cache } = data;
  let output = "=== HermesWhois Domain Lookup ===\n\n";

  if (!main) {
    return output + "No domain information available.";
  }

  if (main.domain) output += `Domain: ${main.domain}\n`;
  if (main.CreationDate && main.CreationDate !== "404")
    output += `Created: ${main.CreationDate}\n`;
  if (main.ExpiryDate && main.ExpiryDate !== "404")
    output += `Expires: ${main.ExpiryDate}\n`;
  if (main.UpdatedDate && main.UpdatedDate !== "404")
    output += `Updated: ${main.UpdatedDate}\n`;

  if (main.DomainStatus && main.DomainStatus !== "404") {
    const status = main.DomainStatus.replace(/<br>/g, " ");
    output += `Status: ${status}\n`;
  }

  if (main.SponsoringRegistrar && main.SponsoringRegistrar !== "404")
    output += `Registrar: ${main.SponsoringRegistrar}\n`;
  if (main.RegistrarURL && main.RegistrarURL !== "404")
    output += `Registrar URL: ${main.RegistrarURL}\n`;

  if (main.DNS && main.DNS !== "404") output += `Name Servers: ${main.DNS}\n`;
  if (main.DNSSEC && main.DNSSEC !== "404")
    output += `DNSSEC: ${main.DNSSEC}\n`;

  if (cache) output += `\nCache Status: ${cache}\n`;

  return output;
}

function formatSSLData(data: SSLResponse): string {
  const { main, cache } = data;
  let output = "=== SSL Certificate Information ===\n\n";

  if (!main) {
    return output + "No SSL certificate information available.";
  }

  if (main.domain) output += `Domain: ${main.domain}\n`;
  if (main.ssl_domain) output += `SSL Domain (CN): ${main.ssl_domain}\n`;

  if (main.valid_from_date) output += `Valid From: ${main.valid_from_date}\n`;
  if (main.valid_to_date) output += `Valid To: ${main.valid_to_date}\n`;

  if (main.valid_to_timestamp) {
    const expiryDate = new Date(
      typeof main.valid_to_timestamp === "number"
        ? main.valid_to_timestamp * 1000
        : parseInt(main.valid_to_timestamp) * 1000
    );
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry > 0) {
      output += `Days Until Expiry: ${daysUntilExpiry} days\n`;
    } else {
      output += `EXPIRED ${Math.abs(daysUntilExpiry)} days ago\n`;
    }
  }

  if (main.issuer) output += `\nIssuer: ${main.issuer}\n`;
  if (main.issuer_organization)
    output += `Issuer Organization: ${main.issuer_organization}\n`;

  if (main.serial_number) output += `\nSerial Number: ${main.serial_number}\n`;
  if (main.hash) output += `Hash: ${main.hash}\n`;
  if (main.version !== undefined) output += `Version: ${main.version}\n`;

  if (main.alt_names) {
    const altNames = main.alt_names.split(", ");
    output += `\nAlternative Names: ${altNames.length} domains\n`;
  }

  if (cache) output += `\nCache Status: ${cache}\n`;

  return output;
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MCP SSE endpoint
app.get("/sse", async (req, res) => {
  console.log("New SSE connection established");

  // Create MCP server
  const server = new Server(
    {
      name: "hermeswhois-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define available tools
  const TOOLS: Tool[] = [
    {
      name: "whois_lookup",
      description:
        "Look up WHOIS information for a domain name using HermesWhois service. Returns domain registration details including creation date, expiry date, registrar, name servers, and more.",
      inputSchema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description:
              "The domain name to look up (e.g., 'example.com' or 'https://example.com')",
          },
        },
        required: ["domain"],
      },
    },
    {
      name: "ssl_lookup",
      description:
        "Look up SSL certificate information for a domain using HermesWhois SSL service. Returns certificate details including validity period, issuer, serial number, alternative names, and expiry status.",
      inputSchema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description:
              "The domain name to check SSL certificate for (e.g., 'example.com' or 'https://example.com')",
          },
        },
        required: ["domain"],
      },
    },
  ];

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "whois_lookup") {
      if (!args) {
        throw new Error("Arguments are required");
      }
      const domain = args.domain as string;

      if (!domain) {
        throw new Error("Domain parameter is required");
      }

      try {
        const whoisData = await lookupWhois(domain);
        const formattedOutput = formatWhoisData(whoisData);

        return {
          content: [
            {
              type: "text",
              text: formattedOutput,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error looking up domain: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "ssl_lookup") {
      if (!args) {
        throw new Error("Arguments are required");
      }
      const domain = args.domain as string;

      if (!domain) {
        throw new Error("Domain parameter is required");
      }

      try {
        const sslData = await lookupSSL(domain);
        const formattedOutput = formatSSLData(sslData);

        return {
          content: [
            {
              type: "text",
              text: formattedOutput,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error looking up SSL certificate: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // Create SSE transport
  const transport = new SSEServerTransport("/message", res);
  await server.connect(transport);

  // Handle client disconnect
  req.on("close", () => {
    console.log("SSE connection closed");
  });
});

// POST endpoint for messages
app.post("/message", express.json(), async (req, res) => {
  // This endpoint will be handled by SSE transport
  res.status(405).json({ error: "Use GET /sse for SSE connection" });
});

// Start server
app.listen(PORT, () => {
  console.log(`HermesWhois MCP Server (SSE) running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
