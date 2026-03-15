#!/usr/bin/env node
/**
 * HermesWhois API - Standalone JavaScript Helper
 * 
 * Bu script, MCP server'a bağlanmadan doğrudan HermesWhois API'sini çağırır.
 * Claude Code veya diğer AI agent'lar bu script'i çalıştırarak
 * token kullanımını %80-98 azaltabilir.
 * 
 * Kullanım:
 *   node scripts/hermeswhois-api.js whois example.com
 *   node scripts/hermeswhois-api.js ssl example.com
 *   node scripts/hermeswhois-api.js both example.com
 * 
 * @see https://blog.cloudflare.com/code-mode/
 */

// ============================================================================
// API Endpoints
// ============================================================================

const WHOIS_API = "https://hermeswhois.tr/whois.php";
const SSL_API = "https://hermeswhois.tr/ssl.php";

// ============================================================================
// Helper Functions
// ============================================================================

function cleanDomain(domain) {
  const urlPattern = /https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
  if (urlPattern.test(domain)) {
    const url = new URL(domain);
    return url.hostname;
  }
  return domain;
}

function isNotFound(value) {
  return value === "404" || value === undefined || value === null;
}

// ============================================================================
// WHOIS Lookup
// ============================================================================

async function whoisLookup(domain) {
  const cleanedDomain = cleanDomain(domain);
  
  const response = await fetch(WHOIS_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `domain=${encodeURIComponent(cleanedDomain)}`,
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  // Check for unregistered domain - multiple detection methods
  // 1. Generic TLDs (.com, .net) - top level unregistered field
  if (data.unregistered === "unregistered") {
    throw new Error("Domain is not registered");
  }

  // 2. Turkish TLDs (.tr) - unregistered in main object
  if (data.main?.unregistered === "404") {
    throw new Error("Domain is not registered");
  }

  // 3. Fallback - missing both creation and expiry dates
  if (data.main && 
      isNotFound(data.main.CreationDate) && 
      isNotFound(data.main.ExpiryDate) &&
      !data.main.CreationDateTimestamp) {
    throw new Error("Domain is not registered");
  }

  const main = data.main;
  
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
  };
}

// ============================================================================
// SSL Lookup
// ============================================================================

async function sslLookup(domain) {
  const cleanedDomain = cleanDomain(domain);
  
  const response = await fetch(SSL_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `domain=${encodeURIComponent(cleanedDomain)}`,
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.result !== "200" && data.result != null) {
    throw new Error(`API Error: ${data.result}`);
  }

  const main = data.main;
  
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
    altNamesCount: main.alt_names?.split(", ").length || 0,
    cached: data.cache === "true",
  };
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
HermesWhois API - Standalone Script

Usage:
  node scripts/hermeswhois-api.js <command> <domain>

Commands:
  whois <domain>  - Look up WHOIS information
  ssl <domain>    - Look up SSL certificate information
  both <domain>   - Look up both WHOIS and SSL

Examples:
  node scripts/hermeswhois-api.js whois google.com
  node scripts/hermeswhois-api.js ssl github.com
  node scripts/hermeswhois-api.js both example.com
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
        let whoisResult = null;
        let sslResult = null;
        let whoisError = null;
        let sslError = null;
        
        try {
          whoisResult = await whoisLookup(domain);
        } catch (e) {
          whoisError = e.message || String(e);
        }
        
        try {
          sslResult = await sslLookup(domain);
        } catch (e) {
          sslError = e.message || String(e);
        }
        
        console.log(JSON.stringify({ 
          whois: whoisResult || { error: whoisError }, 
          ssl: sslResult || { error: sslError }
        }, null, 2));
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message || error}`);
    process.exit(1);
  }
}

// Run
main();
