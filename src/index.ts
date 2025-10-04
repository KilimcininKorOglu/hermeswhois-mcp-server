#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// HermesWhois API endpoints
const HERMESWHOIS_API = "https://hermeswhois.tr/whois.php";
const HERMESWHOIS_SSL_API = "https://hermeswhois.tr/ssl.php";

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

// Types for SSL API
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
  // Clean domain - remove http(s):// if present
  const urlPattern = /https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  if (urlPattern.test(domain)) {
    const url = new URL(domain);
    domain = url.hostname;
  }

  // Make POST request to HermesWhois API
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

  // Check for errors
  if (data.result !== "200" && data.result != null) {
    throw new Error(`API Error: ${data.result}`);
  }

  // Check if domain is not registered (different responses for different TLDs)
  if (data.unregistered === "unregistered") {
    throw new Error("Domain is not registered");
  }

  // For .tr domains, check if unregistered field is "404"
  if (data.main?.unregistered === "404") {
    throw new Error("Domain is not registered");
  }

  // Additional check: if CreationDate and ExpiryDate are missing or "404", domain is likely not registered
  if (
    data.main &&
    (!data.main.CreationDate || data.main.CreationDate === "404") &&
    (!data.main.ExpiryDate || data.main.ExpiryDate === "404")
  ) {
    throw new Error("Domain is not registered");
  }

  return data;
}

// Format whois data for display
function formatWhoisData(data: WhoisResponse): string {
  const { main, cache } = data;
  let output = "=== HermesWhois Domain Lookup ===\n\n";

  if (!main) {
    return output + "No domain information available.";
  }

  // Add basic domain info
  if (main.domain) output += `Domain: ${main.domain}\n`;
  if (main.CreationDate && main.CreationDate !== "404")
    output += `Created: ${main.CreationDate}\n`;
  if (main.ExpiryDate && main.ExpiryDate !== "404")
    output += `Expires: ${main.ExpiryDate}\n`;
  if (main.UpdatedDate && main.UpdatedDate !== "404")
    output += `Updated: ${main.UpdatedDate}\n`;

  // Add status
  if (main.DomainStatus && main.DomainStatus !== "404") {
    const status = main.DomainStatus.replace(/<br>/g, " ");
    output += `Status: ${status}\n`;
  }

  // Add registrar info
  if (main.SponsoringRegistrar && main.SponsoringRegistrar !== "404")
    output += `Registrar: ${main.SponsoringRegistrar}\n`;
  if (main.RegistrarURL && main.RegistrarURL !== "404")
    output += `Registrar URL: ${main.RegistrarURL}\n`;

  // Add registrant
  if (main.Registrant && main.Registrant !== "404")
    output += `Registrant: ${main.Registrant}\n`;
  if (main.RegistrantContactEmail && main.RegistrantContactEmail !== "404")
    output += `Contact Email: ${main.RegistrantContactEmail}\n`;

  // Add DNS servers
  if (main.DNS && main.DNS !== "404") output += `Name Servers: ${main.DNS}\n`;

  // Add DNSSEC
  if (main.DNSSEC && main.DNSSEC !== "404")
    output += `DNSSEC: ${main.DNSSEC}\n`;

  // Add cache status
  if (cache) output += `\nCache Status: ${cache}\n`;

  // Add raw whois data
  if (data.whois) {
    output += "\n=== Raw Whois Data ===\n";
    const rawWhois = data.whois
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&Uuml;/g, "Ü")
      .replace(/&uuml;/g, "ü")
      .replace(/&Ccedil;/g, "Ç")
      .replace(/<br>/g, "\n");
    output += rawWhois;
  }

  return output;
}

// SSL Lookup tool function
async function lookupSSL(domain: string): Promise<SSLResponse> {
  // Clean domain - remove http(s):// if present
  const urlPattern = /https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  if (urlPattern.test(domain)) {
    const url = new URL(domain);
    domain = url.hostname;
  }

  // Make POST request to HermesWhois SSL API
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

  // Check for errors
  if (data.error) {
    throw new Error(data.error);
  }

  if (data.result !== "200" && data.result != null) {
    throw new Error(`API Error: ${data.result}`);
  }

  return data;
}

// Format SSL data for display
function formatSSLData(data: SSLResponse): string {
  const { main, cache } = data;
  let output = "=== SSL Certificate Information ===\n\n";

  if (!main) {
    return output + "No SSL certificate information available.";
  }

  // Add basic SSL info
  if (main.domain) output += `Domain: ${main.domain}\n`;
  if (main.ssl_domain) output += `SSL Domain (CN): ${main.ssl_domain}\n`;

  // Add validity period
  if (main.valid_from_date) output += `Valid From: ${main.valid_from_date}\n`;
  if (main.valid_to_date) output += `Valid To: ${main.valid_to_date}\n`;

  // Calculate days until expiry
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
      output += `⚠️  EXPIRED ${Math.abs(daysUntilExpiry)} days ago!\n`;
    }
  }

  // Add issuer info
  if (main.issuer) output += `\nIssuer: ${main.issuer}\n`;
  if (main.issuer_organization)
    output += `Issuer Organization: ${main.issuer_organization}\n`;

  // Add certificate details
  if (main.serial_number) output += `\nSerial Number: ${main.serial_number}\n`;
  if (main.hash) output += `Hash: ${main.hash}\n`;
  if (main.version !== undefined) output += `Version: ${main.version}\n`;

  // Add alternative names
  if (main.alt_names) {
    output += `\n=== Subject Alternative Names ===\n`;
    const altNames = main.alt_names.split(", ");
    // Show first 10 alt names, then count
    if (altNames.length > 10) {
      output += altNames.slice(0, 10).join("\n") + "\n";
      output += `\n... and ${altNames.length - 10} more domains\n`;
    } else {
      output += altNames.join("\n") + "\n";
    }
  }

  // Add cache status
  if (cache) output += `\nCache Status: ${cache}\n`;

  return output;
}

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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HermesWhois MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
