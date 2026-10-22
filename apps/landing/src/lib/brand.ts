export const BRAND_NAME = 'Catiche';
export const CONTACT_EMAIL = 'contact@catiche.fr';

// The site in a title and a description, for the home page's metadata, its shared link and the web manifest: the
// product in the present (docs/produit.md), Tom introduced as an artificial intelligence, as on the page itself.
export const SITE_TITLE = `${BRAND_NAME}\xa0: votre enfant apprend à organiser ses devoirs`;
export const SITE_DESCRIPTION = 'Tom, une intelligence artificielle, aide votre enfant à organiser ses devoirs, de la 6ᵉ à la 3ᵉ.';

// The e-mail the button « Demander une invitation par e-mail » prepares: accounts open on invitation
// (apps/server/src/platform/auth/auth.ts). encodeURIComponent writes a space as %20, which every mail client reads.
const INVITATION = {
  subject: `Invitation à ${BRAND_NAME}`,
  body: `Bonjour, je souhaite recevoir une invitation pour ${BRAND_NAME}. Classe de mon enfant (facultatif)\xa0: `,
};
export const INVITATION_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(INVITATION.subject)}&body=${encodeURIComponent(INVITATION.body)}`;

// Victor's own site, linked from his name in the footer.
export const AUTHOR_URL = 'https://www.victorlenain.fr/';

// The application's address: the staging until production exists (docs/etat.md), where accounts open on invitation.
const APP_URL = 'https://staging.catiche.fr';
export const SIGN_IN_URL = `${APP_URL}/connexion`;
