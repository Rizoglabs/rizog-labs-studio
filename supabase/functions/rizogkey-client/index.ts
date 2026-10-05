import { withSupabase } from "npm:@supabase/server";
import * as ed from "npm:@noble/ed25519@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, x-client-info, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map((item) => canonicalize(item)).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + canonicalize(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function mapError(message = "") {
  const known = new Set([
    "MISSING_REQUIRED_FIELDS",
    "PRODUCT_NOT_FOUND",
    "ACTIVATION_USED",
    "ACTIVATION_INVALID",
    "INSTALLATION_MISMATCH",
    "INSTALLATION_REVOKED",
    "INSTALLATION_ALREADY_LICENSED",
    "LICENSE_NOT_FOUND",
    "PRODUCT_MISMATCH",
    "INSTALLATION_NOT_FOUND",
    "INSTALLATION_NOT_BOUND",
    "LICENSE_REVOKED",
    "LICENSE_EXPIRED",
  ]);
  return known.has(message) ? message : "LICENSE_REQUEST_FAILED";
}

async function getSigningMaterial(supabaseAdmin: any) {
  const { data: seedBase64, error: seedError } = await supabaseAdmin.rpc("rizogkey_get_signing_seed");
  if (seedError || !seedBase64) throw new Error("SIGNING_KEY_UNAVAILABLE");

  const seed = base64ToBytes(String(seedBase64));
  if (seed.length !== 32) throw new Error("SIGNING_KEY_INVALID");

  const publicKey = await ed.getPublicKeyAsync(seed);
  const publicKeyBase64 = bytesToBase64(publicKey);

  const { data: settings } = await supabaseAdmin
    .from("rizogkey_settings")
    .select("protocol_version, signing_key_version, signing_public_key, offline_grace_days")
    .eq("id", "default")
    .maybeSingle();

  const keyVersion = Number(settings?.signing_key_version ?? 1);

  if (settings?.signing_public_key !== publicKeyBase64) {
    await supabaseAdmin
      .from("rizogkey_settings")
      .update({
        protocol_version: 1,
        signing_key_version: keyVersion,
        signing_public_key: publicKeyBase64,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");
  }

  return {
    seed,
    publicKeyBase64,
    keyVersion,
    offlineGraceDays: Number(settings?.offline_grace_days ?? 90),
  };
}

async function signedGrant(supabaseAdmin: any, grant: Record<string, unknown>) {
  const signing = await getSigningMaterial(supabaseAdmin);
  const payload = encoder.encode(canonicalize(grant));
  const signature = await ed.signAsync(payload, signing.seed);

  return {
    grant,
    signature: bytesToBase64(signature),
    signing: {
      algorithm: "Ed25519",
      key_version: signing.keyVersion,
      public_key: signing.publicKeyBase64,
    },
  };
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    try {
      const body = await req.json();
      const action = String(body?.action ?? "").trim().toLowerCase();

      if (action === "activate") {
        const productCode = String(body?.product_code ?? "").trim().toUpperCase();
        const installationCode = String(body?.installation_code ?? "").trim().toUpperCase();
        const activationCode = String(body?.activation_code ?? "").trim().toUpperCase();
        const platform = String(body?.platform ?? "unknown").trim().toLowerCase();
        const publicKey = body?.public_key ? String(body.public_key) : null;
        const clientVersion = body?.client_version ? String(body.client_version) : null;

        const { data, error } = await ctx.supabaseAdmin.rpc("rizogkey_activate", {
          p_product_code: productCode,
          p_installation_code: installationCode,
          p_activation_code: activationCode,
          p_platform: platform,
          p_public_key: publicKey,
          p_client_version: clientVersion,
        });

        if (error) {
          console.error("activate", error);
          const mapped = mapError(error.message);
          return json({ error: mapped }, mapped === "PRODUCT_NOT_FOUND" ? 404 : 409);
        }

        const signed = await signedGrant(ctx.supabaseAdmin, { version: 1, ...data });

        return json({
          data: {
            license_grant: signed.grant,
            signature: signed.signature,
            signing: signed.signing,
          },
        });
      }

      if (action === "revalidate") {
        const productCode = String(body?.product_code ?? "").trim().toUpperCase();
        const licenseId = String(body?.license_id ?? "").trim();
        const installationId = String(body?.installation_id ?? "").trim();
        const publicKey = body?.public_key ? String(body.public_key) : null;
        const clientVersion = body?.client_version ? String(body.client_version) : null;

        if (!productCode || !licenseId || !installationId) return json({ error: "MISSING_REQUIRED_FIELDS" }, 400);

        const { data, error } = await ctx.supabaseAdmin.rpc("rizogkey_revalidate", {
          p_product_code: productCode,
          p_license_id: licenseId,
          p_installation_id: installationId,
          p_public_key: publicKey,
          p_client_version: clientVersion,
        });

        if (error) {
          console.error("revalidate", error);
          const code = mapError(error.message);
          return json({ error: code }, code === "LICENSE_NOT_FOUND" ? 404 : 409);
        }

        const signed = await signedGrant(ctx.supabaseAdmin, { version: 1, ...data });

        return json({
          data: {
            license_grant: signed.grant,
            signature: signed.signature,
            signing: signed.signing,
          },
        });
      }

      if (action === "health") {
        const { data } = await ctx.supabaseAdmin
          .from("rizogkey_settings")
          .select("protocol_version, signing_key_version, signing_public_key, offline_grace_days")
          .eq("id", "default")
          .maybeSingle();

        let signingReady = Boolean(data?.signing_key_version && data?.signing_public_key);
        try {
          await getSigningMaterial(ctx.supabaseAdmin);
          signingReady = true;
        } catch {
          signingReady = false;
        }

        return json({
          data: {
            ok: true,
            protocol_version: data?.protocol_version ?? 1,
            signing_ready: signingReady,
            offline_grace_days: data?.offline_grace_days ?? 90,
          },
        });
      }

      return json({ error: "UNKNOWN_ACTION" }, 400);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      if (message === "SIGNING_KEY_UNAVAILABLE" || message === "SIGNING_KEY_INVALID") {
        return json({ error: "SIGNING_NOT_CONFIGURED" }, 503);
      }
      return json({ error: "INTERNAL_ERROR" }, 500);
    }
  }),
};
