export const UNSUPPORTED_REASONS: Record<string, string> = {
    'GB': 'Post-Brexit (delar ej prisdata via ENTSO-E)',
    'UK': 'Post-Brexit (delar ej prisdata via ENTSO-E)',
    'IT-SIC': 'Begränsad dataåtkomst (Sicilien)',
    'IT': 'Nationell kod (använd regionala zoner istället)',
    'BA': 'Ej fullständig ENTSO-E rapportering (Bosnien)',
    'MK': 'Ej fullt inkluderad i datasetet (Nordmakedonien)',
    'AL': 'Begränsad anslutning till energimarknaden (Albanien)',
    'RU-1': 'Ingen data (Ryssland)',
    'RU-2': 'Ingen data (Ryssland)',
    'RU-EU': 'Ingen data (Ryssland)',
    'RU-KGD': 'Ingen data (Kaliningrad)',
};

export const getUnsupportedReason = (id: string): string | null => {
    return UNSUPPORTED_REASONS[id] || null;
};
