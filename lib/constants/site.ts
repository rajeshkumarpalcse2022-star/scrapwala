/** Public support contact channels (WhatsApp wa.me format digits only). */
export const SUPPORT_WHATSAPP_NUMBER = "918348977500";
export const SUPPORT_WHATSAPP_DISPLAY = "+91 83489 77500";
export const SUPPORT_PHONE_TEL = "+918348977500";
export const SUPPORT_PHONE_DISPLAY = "+91 83489 77500";

export function getWhatsAppLink(): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
}
