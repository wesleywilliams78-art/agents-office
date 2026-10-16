// The two house styles the SOP builder knows. Everything that differs between Imran's Diner and Creamy lives here:
// colours, the wordmark, the header text and the poster fonts. The layouts are the same for both.
const imrans = {
  id: 'imrans-diner', name: "Imran's Diner", creator: 'Imran’s Diner Operations',
  wordmark: 'Imran’s', headerRest: 'DINER OPERATIONS MANUAL', posterMark: "Imran's", posterHeaderRest: 'OPERATIONS MANUAL', posterFooterRest: "IMRAN'S DINER OPERATIONS MANUAL",
  c: { GROUND: '424242', PANEL: '363636', STRIPE: '3C3C3C', HAIR: '5A5A5A', TEXT: 'F5F5F5', MUTED: 'CFCFCF', ACCENT: 'FF9711', SECOND: 'FFFEEF', WAVE2: '54595F', DIVIDER: '6B6B6B', INK: '262626', KEYTAG: 'B35F00' },
  fonts: { mark: 'Averia Serif Libre', markWeight: 700, head: 'Roboto', label: 'Poppins',
    css: 'https://fonts.googleapis.com/css2?family=Averia+Serif+Libre:wght@700&family=Poppins:wght@600;700&family=Roboto:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap' },
};
const creamy = {
  id: 'creamy', name: 'Creamy', creator: 'Creamy Operations',
  wordmark: 'creamy', headerRest: 'OPERATIONS MANUAL', posterMark: 'creamy', posterHeaderRest: 'OPERATIONS MANUAL', posterFooterRest: 'CREAMY OPERATIONS MANUAL',
  c: { GROUND: '0A0A0A', PANEL: '141414', STRIPE: '131313', HAIR: '2E2E2E', TEXT: 'F4EFF2', MUTED: 'B9B1B6', ACCENT: 'ED1589', SECOND: 'FF7FC4', WAVE2: '4B1F37', DIVIDER: '3A3A3A', INK: '0A0A0A', KEYTAG: '0A0A0A' },
  fonts: { mark: 'Cookie', markWeight: 400, head: 'Urbanist', label: 'Sora',
    css: 'https://fonts.googleapis.com/css2?family=Cookie&family=Sora:wght@600;700&family=Urbanist:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap' },
};
const BRANDS = { 'imrans-diner': imrans, creamy };
const hex2rgb = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
module.exports = { BRANDS, hex2rgb };
