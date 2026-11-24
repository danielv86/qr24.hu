import { setResponseHeader } from 'h3'
import type { MailSettings } from '#shared/types/api'
import { apiSuccess, defineApiHandler, getClientIp } from '../../utils/api'
import { requireAdmin } from '../../utils/auth'
import { loadMailSettings, mailSettingsView } from '../../utils/mail-settings'
import { sendMail } from '../../utils/mailer'
import { enforceRateLimit } from '../../utils/rate-limit'
import { assertSameOrigin, mailTestSchema, readJsonBody } from '../../utils/validation'

function testMessage(to: string) {
  const text = `Szia!

Ez egy teszt e-mail a QRKOD24.hu admin felületéről.

Ha ezt a levelet látod, az SMTP beállítások működnek: a rendszer ezen a szerveren
keresztül küldi majd a megerősítő és jelszó-visszaállító leveleket.

QRKOD24.hu`
  const html = `<!doctype html>
<html lang="hu">
<body style="margin:0;padding:24px;background:#f5f3ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ddd6fe;border-radius:16px">
    <tr>
      <td style="padding:28px">
        <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9">QRKOD24.hu</p>
        <h1 style="margin:14px 0 0;font-size:22px;line-height:1.3">Az SMTP beállítások működnek</h1>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#475569">
          Ez egy teszt e-mail a QRKOD24.hu admin felületéről. A rendszer ezen a szerveren
          keresztül küldi majd a megerősítő és jelszó-visszaállító leveleket.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
  return { to, subject: 'QRKOD24.hu – SMTP teszt e-mail', html, text }
}

export default defineApiHandler(async (event) => {
  assertSameOrigin(event)
  await enforceRateLimit(event, {
    bucket: 'admin-mail-test',
    key: getClientIp(event),
    limit: 10,
    windowSeconds: 10 * 60,
    message: 'Túl sok teszt e-mail. Próbáld később.',
  })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)

  const input = await readJsonBody(event, mailTestSchema)
  const stored = await loadMailSettings()
  // A felületen még nem mentett értékekkel is lehessen próbálkozni; a jelszó
  // üresen hagyva a mentett jelszót használjuk.
  const settings: MailSettings = input.settings
    ? {
        enabled: input.settings.enabled,
        host: input.settings.host,
        port: input.settings.port,
        secure: input.settings.secure,
        user: input.settings.user,
        password: input.settings.password || stored.password,
        fromEmail: input.settings.fromEmail,
        fromName: input.settings.fromName,
      }
    : stored

  await sendMail(testMessage(input.to), { settings, force: true })
  return apiSuccess(event, { ...mailSettingsView(settings), sentTo: input.to })
})
