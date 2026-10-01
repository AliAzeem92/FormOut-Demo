import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  if (process.env.POSTEX_API_TOKEN) return;
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}

loadEnvLocal();

const token = process.env.POSTEX_API_TOKEN ? process.env.POSTEX_API_TOKEN.trim() : "";

if (!token) {
  console.error("Error: POSTEX_API_TOKEN is not set or empty in .env.local");
  process.exit(1);
}

const BASE_URL = "https://api.postex.pk/services/integration/api/order";

async function syncCities() {
  try {
    let res = await fetch(`${BASE_URL}/v2/get-operational-city?operationalCityType=Delivery`, {
      method: "GET",
      headers: {
        token: token,
      },
    });

    if (res.status === 400) {
      const fallbackRes = await fetch(`${BASE_URL}/v2/get-operational-city?operationalCityType=delivery`, {
        method: "GET",
        headers: {
          token: token,
        },
      });
      if (fallbackRes.ok) {
        res = fallbackRes;
      }
    }

    if (!res.ok) {
      console.error(`PostEx API request failed with HTTP ${res.status}`);
      process.exit(1);
    }

    const data = await res.json().catch(() => null);

    if (!data || data.statusCode !== "200" || !Array.isArray(data.dist)) {
      console.error(
        `Failed to retrieve cities from PostEx. statusCode: ${data?.statusCode}, statusMessage: ${data?.statusMessage}`
      );
      process.exit(1);
    }

    // Filter: countryName is Pakistan and isDeliveryCity is true (boolean or string "true")
    const filtered = data.dist.filter((entry) => {
      const isPak = entry.countryName && entry.countryName.trim().toLowerCase() === "pakistan";
      const isDeliv = entry.isDeliveryCity === true || entry.isDeliveryCity === "true";
      return isPak && isDeliv && entry.operationalCityName && entry.operationalCityName.trim();
    });

    if (filtered.length === 0) {
      console.error("No valid delivery cities found for Pakistan in PostEx response. Aborting rewrite.");
      process.exit(1);
    }

    // Deduplicate case-insensitively (e.g., "Adda Plot" vs "ADDA PLOT")
    const lowerMap = new Map();
    let removedCount = 0;
    for (const entry of filtered) {
      const name = entry.operationalCityName.trim();
      const lower = name.toLowerCase();
      if (lowerMap.has(lower)) {
        removedCount++;
      } else {
        lowerMap.set(lower, name);
      }
    }

    const uniqueCityNames = Array.from(lowerMap.values()).sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" })
    );

    const dateStr = new Date().toISOString().split("T")[0];

    const fileContent = `// GENERATED from PostEx get-operational-city on ${dateStr}. Run npm run sync:cities to refresh.

export interface CityOption {
  value: string;
  label: string;
}

export const CITIES: readonly CityOption[] = [
${uniqueCityNames.map((name) => `  { value: ${JSON.stringify(name)}, label: ${JSON.stringify(name)} },`).join("\n")}
] as const;

export const CITY_VALUES = CITIES.map((c) => c.value);
`;

    const targetPath = path.resolve(process.cwd(), "lib", "cities.ts");
    fs.writeFileSync(targetPath, fileContent, "utf8");

    console.log(`Case-insensitive duplicates removed: ${removedCount}`);
    console.log(`Successfully synced ${uniqueCityNames.length} operational delivery cities to lib/cities.ts`);
    console.log("First 10 cities:");
    uniqueCityNames.slice(0, 10).forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  } catch (error) {
    console.error("Network or execution error while syncing cities:", error.message);
    process.exit(1);
  }
}

syncCities();
