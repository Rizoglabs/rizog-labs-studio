import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const durationLabels: Record<string, string> = {
  "1M": "1 Bulan",
  "6M": "6 Bulan",
  "1Y": "1 Tahun",
  "LIFETIME": "Selamanya",
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomToken(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    try {
      const userId = ctx.userClaims?.id;
      if (!userId) return json({ error: "UNAUTHENTICATED" }, 401);

      const body = await req.json();
      const action = body?.action;
if (action === "product_list") {
        const { data, error } = await ctx.supabaseAdmin.from("products")
          .select("id, product_code, name, display_name, brand, platform, status, description, current_version, rizogkey_engine_version, rizogkey_protocol_version, created_at, updated_at")
          .order("name", { ascending: true });
        if (error) throw error;
        return json({ data: data ?? [] });
      }

      if (action === "product_detail") {
        const productCode = String(body?.product_code ?? "").trim().toUpperCase();
        if (!productCode) return json({ error: "MISSING_PRODUCT_CODE" }, 400);
        const { data: product, error } = await ctx.supabaseAdmin.from("products")
          .select("id, product_code, name, display_name, brand, platform, status, description, current_version, rizogkey_engine_version, rizogkey_protocol_version, created_at, updated_at")
          .eq("product_code", productCode).maybeSingle();
        if (error) throw error;
        if (!product) return json({ error: "PRODUCT_NOT_FOUND" }, 404);
        const [installations, licenses] = await Promise.all([
          ctx.supabaseAdmin.from("installations").select("id", { count: "exact", head: true }).eq("product_id", product.id),
          ctx.supabaseAdmin.from("licenses").select("id", { count: "exact", head: true }).eq("product_id", product.id),
        ]);
        if (installations.error) throw installations.error;
        if (licenses.error) throw licenses.error;
        return json({ data: { ...product, installation_count: installations.count ?? 0, license_count: licenses.count ?? 0 } });
      }

      if (action === "product_create") {
        const productCode = String(body?.product_code ?? "").trim().toUpperCase();
        const name = String(body?.name ?? "").trim();
        if (!/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(productCode) || productCode.length > 64)
          return json({ error: "INVALID_PRODUCT_CODE" }, 400);
        if (!name || name.length > 120) return json({ error: "INVALID_PRODUCT_NAME" }, 400);
        const platform = String(body?.platform ?? "UNKNOWN").trim().toUpperCase();
        const status = String(body?.status ?? "INACTIVE").trim().toUpperCase();
        if (!["ANDROID", "IOS", "WEB", "DESKTOP", "UNKNOWN"].includes(platform))
          return json({ error: "INVALID_PLATFORM" }, 400);
        if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status))
          return json({ error: "INVALID_PRODUCT_STATUS" }, 400);
        const optional = (value: unknown, max: number) => {
          const text = String(value ?? "").trim();
          return text ? text.slice(0, max) : null;
        };
        const now = new Date().toISOString();
        const { data, error } = await ctx.supabaseAdmin.from("products").insert({
          product_code: productCode, name,
          display_name: optional(body?.display_name, 120) ?? name,
          brand: optional(body?.brand, 80) ?? "RizogLabs",
          platform, status, description: optional(body?.description, 1000),
          current_version: optional(body?.current_version, 32),
          rizogkey_engine_version: optional(body?.rizogkey_engine_version, 32),
          rizogkey_protocol_version: optional(body?.rizogkey_protocol_version, 32),
          updated_at: now,
        }).select("id, product_code, name, display_name, brand, platform, status, description, current_version, rizogkey_engine_version, rizogkey_protocol_version, created_at, updated_at").single();
        if (error?.code === "23505") return json({ error: "PRODUCT_CODE_EXISTS" }, 409);
        if (error) throw error;
        return json({ data });
      }

      if (action === "product_update") {
        const productCode = String(body?.product_code ?? "").trim().toUpperCase();
        if (!productCode) return json({ error: "MISSING_PRODUCT_CODE" }, 400);
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        const optional = (value: unknown, max: number) => {
          const text = String(value ?? "").trim();
          return text ? text.slice(0, max) : null;
        };
        if (Object.hasOwn(body, "name")) {
          const name = String(body.name ?? "").trim();
          if (!name || name.length > 120) return json({ error: "INVALID_PRODUCT_NAME" }, 400);
          patch.name = name;
        }
        if (Object.hasOwn(body, "display_name")) patch.display_name = optional(body.display_name, 120);
        if (Object.hasOwn(body, "brand")) patch.brand = optional(body.brand, 80);
        if (Object.hasOwn(body, "description")) patch.description = optional(body.description, 1000);
        if (Object.hasOwn(body, "current_version")) patch.current_version = optional(body.current_version, 32);
        if (Object.hasOwn(body, "rizogkey_engine_version")) patch.rizogkey_engine_version = optional(body.rizogkey_engine_version, 32);
        if (Object.hasOwn(body, "rizogkey_protocol_version")) patch.rizogkey_protocol_version = optional(body.rizogkey_protocol_version, 32);
        if (Object.hasOwn(body, "platform")) {
          const platform = String(body.platform ?? "").trim().toUpperCase();
          if (!["ANDROID", "IOS", "WEB", "DESKTOP", "UNKNOWN"].includes(platform))
            return json({ error: "INVALID_PLATFORM" }, 400);
          patch.platform = platform;
        }
        if (Object.hasOwn(body, "status")) {
          const status = String(body.status ?? "").trim().toUpperCase();
          if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status))
            return json({ error: "INVALID_PRODUCT_STATUS" }, 400);
          patch.status = status;
        }
        const { data, error } = await ctx.supabaseAdmin.from("products").update(patch)
          .eq("product_code", productCode)
          .select("id, product_code, name, display_name, brand, platform, status, description, current_version, rizogkey_engine_version, rizogkey_protocol_version, created_at, updated_at")
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "PRODUCT_NOT_FOUND" }, 404);
        return json({ data });
      }


      if (action === "generate") {
        const productCode = String(body?.product_code ?? "").trim().toUpperCase();
        const customerName = String(body?.customer_name ?? "").trim();
        const installationCode = String(body?.installation_code ?? "").trim().toUpperCase();
        const durationCode = String(body?.duration_code ?? "").trim().toUpperCase();
        const deviceLimit = Number(body?.device_limit ?? 1);

        if (!productCode || !customerName || !installationCode) return json({ error: "MISSING_REQUIRED_FIELDS" }, 400);
        if (!Object.hasOwn(durationLabels, durationCode)) return json({ error: "INVALID_DURATION" }, 400);
        if (!Number.isInteger(deviceLimit) || deviceLimit < 1 || deviceLimit > 99) return json({ error: "INVALID_DEVICE_LIMIT" }, 400);

        const { data: product, error: productError } = await ctx.supabaseAdmin
          .from("products")
          .select("id, product_code, name, status")
          .eq("product_code", productCode)
          .eq("status", "ACTIVE")
          .single();

        if (productError || !product) return json({ error: "PRODUCT_NOT_FOUND" }, 404);

        const { data: activeInstallation } = await ctx.supabaseAdmin
          .from("installations")
          .select("id")
          .eq("product_id", product.id)
          .eq("installation_code", installationCode)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (activeInstallation) {
          const { data: activeLicense } = await ctx.supabaseAdmin
            .from("licenses")
            .select("id")
            .eq("installation_id", activeInstallation.id)
            .eq("status", "ACTIVE")
            .maybeSingle();

          if (activeLicense) return json({ error: "INSTALLATION_ALREADY_LICENSED" }, 409);
        }

        const prefix = product.product_code.replace(/[^A-Z0-9]/g, "").slice(0, 3).padEnd(3, "X");

        for (let attempt = 0; attempt < 5; attempt++) {
          const code = prefix + "-ACT-" + randomToken(4) + "-" + randomToken(4) + "-" + randomToken(4);
          const codeHash = await sha256Hex(code);

          const { data: created, error: insertError } = await ctx.supabaseAdmin
            .from("activation_codes")
            .insert({
              product_id: product.id,
              customer_name: customerName,
              installation_code: installationCode,
              duration_code: durationCode,
              duration_label: durationLabels[durationCode],
              device_limit: deviceLimit,
              code_hash: codeHash,
              code_hint: code.slice(-4),
              status: "GENERATED",
              generated_by: userId,
            })
            .select("id, product_id, customer_name, installation_code, duration_code, duration_label, device_limit, code_hint, status, generated_at")
            .single();

          if (!insertError && created) {
            return json({
              data: {
                ...created,
                product_code: product.product_code,
                product_name: product.name,
                activation_code: code,
              },
            });
          }

          if (insertError?.code !== "23505") throw insertError;
        }

        return json({ error: "CODE_GENERATION_FAILED" }, 500);
      }

      if (action === "list") {
        const { data, error } = await ctx.supabaseAdmin
          .from("activation_codes")
          .select("id, customer_name, installation_code, duration_code, duration_label, device_limit, code_hint, status, generated_at, used_at, activated_at, revoked_at, products(name, product_code)")
          .order("generated_at", { ascending: false })
          .limit(500);

        if (error) throw error;

        return json({
          data: (data ?? []).map((row: any) => ({
            id: row.id,
            customer_name: row.customer_name,
            installation_code: row.installation_code,
            duration_code: row.duration_code,
            duration_label: row.duration_label,
            device_limit: row.device_limit,
            code_hint: row.code_hint,
            status: row.status,
            generated_at: row.generated_at,
            used_at: row.used_at,
            activated_at: row.activated_at,
            revoked_at: row.revoked_at,
            product_name: row.products?.name ?? row.products?.product_code ?? "Unknown",
            product_code: row.products?.product_code ?? "",
          })),
        });
      }

      if (action === "stats") {
        const stats: Record<string, number> = { GENERATED: 0, USED: 0, REVOKED: 0 };
        for (const status of Object.keys(stats)) {
          const { count, error } = await ctx.supabaseAdmin
            .from("activation_codes")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          if (error) throw error;
          stats[status] = count ?? 0;
        }

        const { count: activeLicenses, error: licenseError } = await ctx.supabaseAdmin
          .from("licenses")
          .select("id", { count: "exact", head: true })
          .eq("status", "ACTIVE");

        if (licenseError) throw licenseError;
        return json({ data: { ...stats, ACTIVE_LICENSES: activeLicenses ?? 0 } });
      }

      if (action === "revoke") {
        const id = String(body?.id ?? "").trim();
        const reason = String(body?.reason ?? "ADMIN_ACTION").trim();
        if (!id) return json({ error: "MISSING_ID" }, 400);

        const { data: activation, error: activationError } = await ctx.supabaseAdmin
          .from("activation_codes")
          .select("id, status, installation_id")
          .eq("id", id)
          .maybeSingle();

        if (activationError) throw activationError;
        if (!activation) return json({ error: "ACTIVATION_NOT_FOUND" }, 404);
        if (activation.status === "REVOKED") return json({ error: "ALREADY_REVOKED" }, 409);

        const now = new Date().toISOString();

        const { data: updated, error: updateError } = await ctx.supabaseAdmin
          .from("activation_codes")
          .update({
            status: "REVOKED",
            revoked_at: now,
            revoked_by: userId,
            revoke_reason: reason,
            updated_at: now,
          })
          .eq("id", id)
          .select("id, status, revoked_at, revoke_reason")
          .single();

        if (updateError) throw updateError;

        const { data: license } = await ctx.supabaseAdmin
          .from("licenses")
          .select("id, status, installation_id")
          .eq("activation_code_id", id)
          .maybeSingle();

        if (license && license.status === "ACTIVE") {
          const { error: licenseUpdateError } = await ctx.supabaseAdmin
            .from("licenses")
            .update({
              status: "REVOKED",
              revoked_at: now,
              revoke_reason: reason,
              revoked_by: userId,
              updated_at: now,
            })
            .eq("id", license.id);

          if (licenseUpdateError) throw licenseUpdateError;

          const { error: eventError } = await ctx.supabaseAdmin.from("license_events").insert({
            license_id: license.id,
            installation_id: license.installation_id,
            activation_code_id: id,
            event_type: "REVOKED",
            actor_user_id: userId,
            metadata: { reason },
          });

          if (eventError) throw eventError;
        }

        return json({ data: updated });
      }

      if (action === "license_list") {
        const { data, error } = await ctx.supabaseAdmin
          .from("licenses")
          .select("id, customer_name, duration_code, device_limit, status, activated_at, expires_at, offline_until, last_validated_at, revoked_at, revoke_reason, products(name, product_code), installations(installation_code, platform, client_version, last_seen_at)")
          .order("activated_at", { ascending: false })
          .limit(500);

        if (error) throw error;

        return json({
          data: (data ?? []).map((row: any) => ({
            id: row.id,
            customer_name: row.customer_name,
            duration_code: row.duration_code,
            device_limit: row.device_limit,
            status: row.status,
            activated_at: row.activated_at,
            expires_at: row.expires_at,
            offline_until: row.offline_until,
            last_validated_at: row.last_validated_at,
            revoked_at: row.revoked_at,
            revoke_reason: row.revoke_reason,
            product_name: row.products?.name ?? row.products?.product_code ?? "Unknown",
            product_code: row.products?.product_code ?? "",
            installation_code: row.installations?.installation_code ?? "",
            platform: row.installations?.platform ?? "unknown",
            client_version: row.installations?.client_version ?? "",
            last_seen_at: row.installations?.last_seen_at ?? null,
          })),
        });
      }

      return json({ error: "UNKNOWN_ACTION" }, 400);
    } catch (error) {
      console.error(error);
      return json({ error: "INTERNAL_ERROR" }, 500);
    }
  }),
};
