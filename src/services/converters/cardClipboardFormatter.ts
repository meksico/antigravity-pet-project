export interface CardClipboardFields {
  localNetwork?: string | null
  network?: string | null
  hostname?: string | null
  wifiMac?: string | null
  esetInstanceId?: string | null
  militaryUnit?: string | null
  responsibleRank?: string | null
  responsibleName?: string | null
  responsiblePhone?: string | null
  infosecRank?: string | null
  infosecName?: string | null
  infosecPhone?: string | null
}

/**
 * Formats inventory card attributes into the standardized clipboard text template:
 *
 * Мережа: ІСД-Інтернет
 * Ім'я комп'ютера: DESKTOP-TNFQN4E
 * 04:F0:EE:D5:B8:FD
 * ProductInstanceID: 8f2d2bca-4229-4f34-a607-e4743ba4b5ce
 * Військова частина: A0932
 * Користувач АРМ: Солдат Бугаенко Елена 0686401606
 * НСЗІ Старший лейтенант Романенко А.О. 0679900750
 */
export function formatCardClipboardText(card: CardClipboardFields): string {
  const network = card.localNetwork?.trim() || card.network?.trim() || '—'
  const hostname = card.hostname?.trim() || '—'
  const wifiMac = card.wifiMac?.trim() || '—'
  const esetId = card.esetInstanceId?.trim() || '—'
  const militaryUnit = card.militaryUnit?.trim() || '—'

  const userParts = [
    card.responsibleRank?.trim(),
    card.responsibleName?.trim(),
    card.responsiblePhone?.trim(),
  ].filter((p): p is string => Boolean(p))
  const userArm = userParts.length > 0 ? userParts.join(' ') : '—'

  const infosecParts = [
    card.infosecRank?.trim(),
    card.infosecName?.trim(),
    card.infosecPhone?.trim(),
  ].filter((p): p is string => Boolean(p))
  const infosec = infosecParts.length > 0 ? infosecParts.join(' ') : '—'

  return [
    `Мережа: ${network}`,
    `Ім'я комп'ютера: ${hostname}`,
    wifiMac,
    `ProductInstanceID: ${esetId}`,
    `Військова частина: ${militaryUnit}`,
    `Користувач АРМ: ${userArm}`,
    `НСЗІ ${infosec}`,
  ].join('\n')
}

