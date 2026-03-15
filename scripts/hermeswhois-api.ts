/**
 * HermesWhois API - Standalone TypeScript Helper
 * 
 * Bu script, MCP server'a bağlanmadan doğrudan HermesWhois API'sini çağırır.
 * Claude Code veya diğer AI agent'lar bu script'i çalıştırarak
 * token kullanımını %80-98 azaltabilir.
 * 
 * Kullanım:
 *   npx ts-node scripts/hermeswhois-api.ts whois example.com
 *   npx ts-node scripts/hermeswhois-api.ts ssl example.com
 *   npx ts-node scripts/hermeswhois-api.ts both example.com
 * 
 * @see https://blog.cloudflare.com/code-mode/
 */

// ============================================================================
// Types
// ============================================================================

interface WhoisResponse {
  main?: {
    domain: string;
    CreationDate?: string;
    ExpiryDate?: string;
    UpdatedDate?: string;
    SponsoringRegistrar?: string;
    RegistrarURL?: string;
    DNS?: string;
    DNSSEC?: string;
    DomainStatus?: string;
    unregistered?: string;
  };
  result?: string;
  whois?: string;
  cache?: string;
  unregistered?: string;
}

interface SSLResponse {
  main?: {
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
  };
  result?: string;
  cache?: string;
  error?: string;
}

interface WhoisResult {
  domain: string;
  creationDate?: string;
  expiryDate?: string;
  updatedDate?: string;
  registrar?: string;
  registrarUrl?: string;
  nameServers?: string;
  dnssec?: string;
  status?: string;
  cached: boolean;
  rawWhois?: string;
}

interface SSLResult {
  domain: string;
  sslDomain?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry: number;
  expired: boolean;
  issuer?: string;
  issuerOrganization?: string;
  serialNumber?: string;
  hash?: string;
  version?: number;
  altNames?: string[];
  cached: boolean;
}

// ============================================================================
// API Endpoints
// ============================================================================

const WHOIS_API = "https://hermeswhois.tr/whois.php";
const SSL_API = "https://hermeswhois.tr/ssl.php";

// ============================================================================
// Helper Functions
// ============================================================================

function cleanDomain(domain: string): string {
  const urlPattern = /https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  if (urlPattern.test(domain)) {
    const url = new URL(domain);
    return url.hostname;
  }
  return domain;
}

function isNotFound(value: unknown): boolean {
  return value === "404" || value === undefined || value === null;
}

// ============================================================================
// WHOIS Lookup
// ============================================================================

async function whoisLookup(domain: string): Promise<WhoisResult> {
  const cleanedDomain = cleanDomain(domain);
  
  const response = await fetch(WHOIS_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `domain=${encodeURIComponent(cleanedDomain)}`,
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as WhoisResponse;

  // Check for unregistered domain
  if (data.unregistered === "unregistered" || data.main?.unregistered === "404") {
    throw new Error("Domain is not registered");
  }

  if (data.main && isNotFound(data.main.CreationDate) && isNotFound(data.main.ExpiryDate)) {
    throw new Error("Domain is not registered");
  }

  const main = data.main!;
  
  return {
    domain: main.domain,
    creationDate: isNotFound(main.CreationDate) ? undefined : main.CreationDate,
    expiryDate: isNotFound(main.ExpiryDate) ? undefined : main.ExpiryDate,
    updatedDate: isNotFound(main.UpdatedDate) ? undefined : main.UpdatedDate,
    registrar: isNotFound(main.SponsoringRegistrar) ? undefined : main.SponsoringRegistrar,
    registrarUrl: isNotFound(main.RegistrarURL) ? undefined : main.RegistrarURL,
    nameServers: isNotFound(main.DNS) ? undefined : main.DNS,
    dnssec: isNotFound(main.DNSSEC) ? undefined : main.DNSSEC,
    status: isNotFound(main.DomainStatus) ? undefined : main.DomainStatus?.replace(/<br>/g, " "),
    cached: data.cache === "true",
    rawWhois: data.whois,
  };
}

// ============================================================================
// SSL Lookup
// ============================================================================

async function sslLookup(domain: string): Promise<SSLResult> {
  const cleanedDomain = cleanDomain(domain);
  
  const response = await fetch(SSL_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `domain=${encodeURIComponent(cleanedDomain)}`,
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as SSLResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.result !== "200" && data.result != null) {
    throw new Error(`API Error: ${data.result}`);
  }

  const main = data.main!;
  
  // Calculate days until expiry
  let daysUntilExpiry = 0;
  let expired = false;
  
  if (main.valid_to_timestamp) {
    const timestamp = typeof main.valid_to_timestamp === "number"
      ? main.valid_to_timestamp * 1000
      : parseInt(main.valid_to_timestamp) * 1000;
    const expiryDate = new Date(timestamp);
    const now = new Date();
    daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expired = daysUntilExpiry < 0;
  }

  return {
    domain: main.domain,
    sslDomain: main.ssl_domain,
    validFrom: main.valid_from_date,
    validTo: main.valid_to_date,
    daysUntilExpiry: Math.abs(daysUntilExpiry),
    expired,
    issuer: main.issuer,
    issuerOrganization: main.issuer_organization,
    serialNumber: main.serial_number,
    hash: main.hash,
    version: typeof main.version === "number" ? main.version : parseInt(main.version || "0"),
    altNames: main.alt_names?.split(", "),
    cached: data.cache === "true",
  };
}

// ============================================================================
// Exported API Object (for programmatic use)
// ============================================================================

export const hermeswhois = {
  whois_lookup: whoisLookup,
  ssl_lookup: sslLookup,
};

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
HermesWhois API - Standalone Script

Usage:
  npx ts-node scripts/hermeswhois-api.ts <command> <domain>

Commands:
  whois <domain>  - Look up WHOIS information
  ssl <domain>    - Look up SSL certificate information
  both <domain>   - Look up both WHOIS and SSL

Examples:
  npx ts-node scripts/hermeswhois-api.ts whois google.com
  npx ts-node scripts/hermeswhois-api.ts ssl github.com
  npx ts-node scripts/hermeswhois-api.ts both example.com
`);
    process.exit(1);
  }

  const [command, domain] = args;

  try {
    switch (command.toLowerCase()) {
      case "whois": {
        const result = await whoisLookup(domain);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "ssl": {
        const result = await sslLookup(domain);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "both": {
        const [whois, ssl] = await Promise.all([
          whoisLookup(domain),
          sslLookup(domain),
        ]);
        console.log(JSON.stringify({ whois, ssl }, null, 2));
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run if executed directly
main();
