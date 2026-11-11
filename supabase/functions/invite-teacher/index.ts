import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// Local dev servers (any port) are always allowed so the admin portal works
// whichever port Vite picks. CORS is not the security boundary here: every
// request still needs a signed-in administrator's JWT (checked below).
const LOCAL_DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

function isAllowedOrigin(origin: string): boolean {
  return allowedOrigins.has(origin) || LOCAL_DEV_ORIGIN.test(origin);
}

type InviteRequest = {
  action?: "invite" | "resend";
  email?: string;
  full_name?: string;
  faculty_id?: string;
  department_id?: string;
  designation?: string;
  phone?: string | null;
  qualification?: string | null;
  avatar_url?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function responseHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function requiredText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Temporary passwords: 12 characters with upper, lower, digit and symbol, no
// look-alike characters (0/O, 1/l/I).
const PASSWORD_SETS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "@#$%&*!?"];

function randomIndex(max: number): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function generateTemporaryPassword(length = 12): string {
  const all = PASSWORD_SETS.join("");
  const chars = PASSWORD_SETS.map((set) => set[randomIndex(set.length)]);
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Supabase Auth emails cannot carry a password, so the temporary password is
// sent through Resend (https://resend.com). Needs RESEND_API_KEY and MAIL_FROM.
async function sendTemporaryPasswordEmail(
  to: string,
  fullName: string,
  password: string,
  loginUrl: string,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  // Tolerate a value pasted with surrounding quotes or spaces.
  const from = Deno.env.get("MAIL_FROM")?.trim().replace(/^["']+|["']+$/g, "").trim();
  if (!apiKey || !from) {
    return { sent: false, reason: "Email sending is not configured (RESEND_API_KEY / MAIL_FROM)." };
  }
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1b1c1e">
      <h2 style="color:#6E351D">Welcome to Dudex Smart Academy</h2>
      <p>Hello ${escapeHtml(fullName)},</p>
      <p>Your faculty account has been created. Sign in to the Teacher Portal with:</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 12px 6px 0;color:#756e67">Email</td><td style="padding:6px 0"><strong>${escapeHtml(to)}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#756e67">Temporary password</td><td style="padding:6px 0"><strong style="font-family:monospace;font-size:16px">${escapeHtml(password)}</strong></td></tr>
      </table>
      <p><a href="${escapeHtml(loginUrl)}" style="background:#6E351D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Sign in to the Teacher Portal</a></p>
      <p>You will be asked to choose your own permanent password after signing in. You can change it any time from your profile, or use "Forgot password?" on the sign-in page.</p>
      <p style="color:#756e67;font-size:12px">If you did not expect this email, contact your academy administrator.</p>
    </div>`;
  const text =
    `Hello ${fullName},\n\nYour Dudex Smart Academy faculty account has been created.\n\n` +
    `Email: ${to}\nTemporary password: ${password}\nSign in: ${loginUrl}\n\n` +
    `You will be asked to choose your own permanent password after signing in.`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your Dudex Smart Academy teacher account",
        html,
        text,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      // Only the shape of MAIL_FROM is logged, never its value: a mistyped secret
      // could hold something sensitive.
      console.error(
        "Resend rejected the temporary password email:",
        response.status,
        detail,
        "MAIL_FROM looks like an email address:",
        /^([^<>]*<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(from),
      );
      return { sent: false, reason: `The email provider rejected the message (HTTP ${response.status}).` };
    }
    return { sent: true };
  } catch (error) {
    console.error("Temporary password email failed:", error);
    return { sent: false, reason: "The email provider could not be reached." };
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = responseHeaders(origin);

  if (origin && !isAllowedOrigin(origin)) {
    return json({ error: "Origin is not allowed." }, 403, responseHeaders(null));
  }
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const teacherPortalUrl = Deno.env.get("TEACHER_PORTAL_URL");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !teacherPortalUrl) {
    return json({ error: "Teacher invitation service is not fully configured." }, 500, headers);
  }

  let loginUrl: string;
  try {
    const portalUrl = new URL(teacherPortalUrl);
    const localHttp =
      portalUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(portalUrl.hostname);
    if (
      (portalUrl.protocol !== "https:" && !localHttp) ||
      portalUrl.username ||
      portalUrl.password
    ) {
      throw new Error("Invalid portal URL.");
    }
    loginUrl = new URL("/login", portalUrl).toString();
  } catch {
    return json({ error: "TEACHER_PORTAL_URL must be HTTPS, or localhost HTTP for development." }, 500, headers);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication is required." }, 401, headers);
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "A valid signed-in administrator session is required." }, 401, headers);
  }

  const { data: isAdmin, error: adminCheckError } = await caller.rpc("dudex_is_admin");
  if (adminCheckError || isAdmin !== true) {
    return json({ error: "Active administrator access is required." }, 403, headers);
  }

  let body: InviteRequest;
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return json({ error: "Request body must be a JSON object." }, 400, headers);
    }
    body = parsed as InviteRequest;
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400, headers);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ error: "A valid email address is required." }, 400, headers);
  }
  const action = body.action ?? "invite";
  if (action !== "invite" && action !== "resend") {
    return json({ error: "Unsupported invitation action." }, 400, headers);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingProfile, error: profileLookupError } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .ilike("email", email)
    .maybeSingle();
  if (profileLookupError) {
    console.error("Teacher invitation profile lookup failed:", profileLookupError.message);
    return json({ error: "Could not verify the account for this email." }, 500, headers);
  }

  if (existingProfile?.role === "admin") {
    return json({ error: "An administrator account cannot be invited as a teacher." }, 409, headers);
  }

  if (action === "resend") {
    if (existingProfile?.role !== "teacher") {
      return json({ error: "No teacher account exists for this email." }, 404, headers);
    }
    const { data: teacherProfile, error: teacherProfileError } = await admin
      .from("teacher_profiles")
      .select("status")
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (teacherProfileError) {
      console.error("Teacher profile lookup failed:", teacherProfileError.message);
      return json({ error: "Could not verify the teacher profile." }, 500, headers);
    }
    if (!teacherProfile || teacherProfile.status !== "active") {
      return json({ error: "Only active teacher accounts can receive setup emails." }, 409, headers);
    }

    const { error: allowListError } = await admin.from("allowed_emails").upsert(
      {
        email,
        role: "teacher",
        full_name: existingProfile.full_name ?? email.split("@")[0],
        status: "active",
        created_by: authData.user.id,
      },
      { onConflict: "email" },
    );
    if (allowListError) {
      console.error("Teacher allow-list update failed:", allowListError.message);
      return json({ error: "Could not register this teacher email for access." }, 500, headers);
    }

    const temporaryPassword = generateTemporaryPassword();
    const { error: passwordError } = await admin.auth.admin.updateUserById(existingProfile.id, {
      password: temporaryPassword,
      user_metadata: { must_change_password: true },
    });
    if (passwordError) {
      console.error("Teacher temporary password reset failed:", passwordError.message);
      return json({ error: "Could not set a new temporary password." }, 502, headers);
    }
    const delivery = await sendTemporaryPasswordEmail(
      existingProfile.email ?? email,
      existingProfile.full_name ?? email.split("@")[0],
      temporaryPassword,
      loginUrl,
    );
    return json({
      ok: true,
      mode: "temporary_password_reset",
      email_sent: delivery.sent,
      ...(delivery.sent ? {} : { email_error: delivery.reason, temporary_password: temporaryPassword }),
    }, 200, headers);
  }

  if (
    !requiredText(body.full_name, 120) ||
    !requiredText(body.faculty_id, 120) ||
    !isUuid(body.department_id) ||
    !requiredText(body.designation, 120) ||
    (body.phone != null && (typeof body.phone !== "string" || body.phone.length > 40)) ||
    (body.qualification != null &&
      (typeof body.qualification !== "string" || body.qualification.length > 300)) ||
    (body.avatar_url != null &&
      (
        typeof body.avatar_url !== "string" ||
        body.avatar_url.length > 2048 ||
        !body.avatar_url.startsWith("https://")
      ))
  ) {
    return json({ error: "Teacher details are incomplete or invalid." }, 400, headers);
  }

  const fullName = body.full_name.trim();
  let userId = existingProfile?.id;
  let mode: "created" | "existing_account";
  const temporaryPassword = generateTemporaryPassword();

  const { error: allowListError } = await admin.from("allowed_emails").upsert(
    {
      email,
      role: "teacher",
      full_name: fullName,
      status: "active",
      created_by: authData.user.id,
    },
    { onConflict: "email" },
  );
  if (allowListError) {
    console.error("Teacher allow-list update failed:", allowListError.message);
    return json({ error: "Could not register this teacher email for access." }, 500, headers);
  }

  if (!existingProfile) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, must_change_password: true },
    });
    if (createError || !created.user) {
      console.error("Teacher Auth account creation failed:", createError?.message ?? "No user returned.");
      return json({ error: "Could not create the teacher Auth account." }, 502, headers);
    }
    userId = created.user.id;
    mode = "created";
  } else {
    mode = "existing_account";
  }

  const { data: teacherProfileId, error: provisioningError } = await caller.rpc(
    "provision_teacher_account",
    {
      target_email: email,
      target_full_name: fullName,
      target_faculty_id: body.faculty_id.trim(),
      target_department_id: body.department_id,
      target_designation: body.designation.trim(),
      target_phone: body.phone?.trim() || null,
      target_qualification: body.qualification?.trim() || null,
      target_avatar_url: body.avatar_url?.trim() || null,
    },
  );

  if (provisioningError || !teacherProfileId) {
    if (mode === "created" && userId) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Failed to roll back unprovisioned invite:", deleteError.message);
        return json({
          error: "Teacher provisioning failed and the new Auth account could not be removed. Contact an administrator.",
        }, 500, headers);
      }
    }
    console.error("Teacher provisioning failed:", provisioningError?.message ?? "No profile returned.");
    return json({
      error: mode === "created"
        ? "Teacher provisioning failed; the new Auth account was rolled back."
        : "Teacher provisioning failed; the account password was not changed.",
    }, 500, headers);
  }

  if (mode === "existing_account" && userId) {
    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });
    if (passwordError) {
      console.error("Existing teacher temporary password failed:", passwordError.message);
      return json({
        error: "Teacher access was provisioned, but a temporary password could not be set. Use Resend Welcome Email on the teacher profile.",
        provisioned: true,
        teacher_profile_id: teacherProfileId,
      }, 502, headers);
    }
  }

  const delivery = await sendTemporaryPasswordEmail(email, fullName, temporaryPassword, loginUrl);

  return json({
    ok: true,
    mode,
    user_id: userId,
    teacher_profile_id: teacherProfileId,
    email_sent: delivery.sent,
    // Only returned when the email could not be sent, so the admin can pass it on.
    ...(delivery.sent ? {} : { email_error: delivery.reason, temporary_password: temporaryPassword }),
  }, 200, headers);
});
