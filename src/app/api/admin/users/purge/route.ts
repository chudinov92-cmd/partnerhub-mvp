import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import {
  isSmtpConfigured,
  sendTransactionalEmail,
} from "@/lib/emailServer";
import {
  buildModerationPurgeEmail,
  MODERATION_PURGE_REASONS,
  type ModerationPurgeReason,
} from "@/app/api/admin/users/_lib/moderationPurgeEmail";
import {
  lookupAccountForModeration,
  resolveModerationQueryToUid,
} from "@/app/api/admin/users/_lib/resolveModerationQuery";
import { requireSuperAdmin } from "@/app/api/admin/users/_lib/requireSuperAdmin";

const CONFIRM_TEXT = "УДАЛИТЬ";

const REASON_VALUES = new Set<string>(
  MODERATION_PURGE_REASONS.map((r) => r.value),
);

type PurgeRpcResult = {
  ok?: boolean;
  error?: string;
  profile_id?: string | null;
  auth_user_id?: string | null;
  paywall_events?: number;
  map_search?: number;
  daily_activity?: number;
};

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    let body: {
      query?: string;
      confirm?: string;
      reason?: string;
      reason_note?: string;
      send_email?: boolean;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    const confirm = typeof body.confirm === "string" ? body.confirm.trim() : "";
    const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
    const reasonNote =
      typeof body.reason_note === "string" ? body.reason_note.trim() : "";
    const sendEmail = body.send_email !== false;

    if (!query) {
      return NextResponse.json({ error: "Ожидался query" }, { status: 400 });
    }
    if (confirm !== CONFIRM_TEXT) {
      return NextResponse.json(
        { error: `Для подтверждения введите ${CONFIRM_TEXT}` },
        { status: 400 },
      );
    }
    if (!REASON_VALUES.has(reasonRaw)) {
      return NextResponse.json(
        { error: "Выберите причину удаления" },
        { status: 400 },
      );
    }
    const reason = reasonRaw as ModerationPurgeReason;

    const adminSb = createSupabaseAdminClient();
    const preview = await lookupAccountForModeration(adminSb, query);
    if (!preview.found) {
      return NextResponse.json(
        { error: preview.error ?? "Аккаунт не найден" },
        { status: 404 },
      );
    }

    const targetAuthId = preview.auth_user_id ?? null;
    const targetProfileId = preview.profile_id ?? null;

    if (targetAuthId && targetAuthId === auth.authUserId) {
      return NextResponse.json(
        { error: "Нельзя удалить свой аккаунт через модерацию" },
        { status: 400 },
      );
    }
    if (preview.is_admin) {
      return NextResponse.json(
        { error: "Нельзя удалить аккаунт администратора" },
        { status: 400 },
      );
    }

    const email = preview.email?.trim() ?? "";
    let emailSent = false;
    let emailSkipped = false;

    if (sendEmail) {
      if (!email) {
        emailSkipped = true;
      } else {
        if (!isSmtpConfigured()) {
          return NextResponse.json(
            { error: "SMTP не настроен — удаление отменено" },
            { status: 503 },
          );
        }
        const mail = buildModerationPurgeEmail({ reason, reasonNote });
        const sendResult = await sendTransactionalEmail({
          to: email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
        if (!sendResult.ok) {
          return NextResponse.json(
            {
              error: `Не удалось отправить письмо: ${sendResult.error}. Аккаунт не удалён.`,
            },
            { status: 502 },
          );
        }
        emailSent = true;
      }
    } else {
      emailSkipped = true;
    }

    if (email) {
      const { error: banErr } = await adminSb.from("account_bans").upsert(
        {
          email_normalized: email.toLowerCase(),
          reason: `${reason}${reasonNote ? `: ${reasonNote}` : ""}`,
          banned_by: auth.authUserId,
          former_profile_id: targetProfileId,
          former_auth_user_id: targetAuthId,
        },
        { onConflict: "email_normalized" },
      );
      if (banErr) {
        return NextResponse.json({ error: banErr.message }, { status: 500 });
      }
    }

    const { uid, error: resolveErr } = await resolveModerationQueryToUid(
      adminSb,
      query,
    );
    if (resolveErr || !uid) {
      return NextResponse.json(
        { error: resolveErr ?? "Не удалось определить UID" },
        { status: 400 },
      );
    }

    const { data: purgeData, error: purgeErr } = await adminSb.rpc(
      "admin_purge_account",
      { p_uid: uid },
    );
    if (purgeErr) {
      return NextResponse.json({ error: purgeErr.message }, { status: 500 });
    }

    const purge = (purgeData ?? {}) as PurgeRpcResult;
    if (!purge.ok) {
      const errCode = purge.error ?? "purge_failed";
      const message =
        errCode === "target_is_admin"
          ? "Нельзя удалить аккаунт администратора"
          : errCode === "not_found"
            ? "Аккаунт не найден"
            : "Не удалось удалить аккаунт";
      return NextResponse.json({ error: message, code: errCode }, { status: 400 });
    }

    const authIdForDelete = purge.auth_user_id ?? targetAuthId;
    if (authIdForDelete) {
      const { error: authDelErr } =
        await adminSb.auth.admin.deleteUser(authIdForDelete);
      if (authDelErr && !/not found|user not found/i.test(authDelErr.message)) {
        console.error("[admin/purge] auth delete", authDelErr);
      }
    }

    await adminSb.from("admin_audit_log").insert({
      actor_auth_user_id: auth.authUserId,
      action: "profiles.moderation_purge",
      target_type: "profile",
      target_id: targetProfileId ?? targetAuthId ?? uid,
      payload: {
        query,
        reason,
        reason_note: reasonNote || null,
        email_sent: emailSent,
        email_skipped: emailSkipped,
        target_auth_user_id: targetAuthId,
        target_profile_id: targetProfileId,
        purge,
      },
    });

    const { error: mrrErr } = await adminSb.rpc("compute_mrr_snapshot", {
      p_date: yesterdayUtcDate(),
    });
    if (mrrErr && !/does not exist|schema cache|PGRST202/i.test(mrrErr.message)) {
      console.error("[admin/purge] compute_mrr_snapshot", mrrErr);
    }

    return NextResponse.json({
      ok: true,
      email_sent: emailSent,
      email_skipped: emailSkipped,
      purge,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Сервер: не задан SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function yesterdayUtcDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
