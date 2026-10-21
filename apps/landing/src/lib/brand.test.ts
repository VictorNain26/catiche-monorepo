import { describe, expect, it } from 'bun:test';
import { CONTACT_EMAIL, INVITATION_HREF } from './brand';

// The e-mail the button prepares, as a mail client reads its address.
const invitation = new URL(INVITATION_HREF);

describe('INVITATION_HREF', () => {
  it('writes to our address', () => {
    expect(invitation.protocol).toBe('mailto:');
    expect(invitation.pathname).toBe(CONTACT_EMAIL);
  });

  it('carries the subject and the text of the request, accents and spaces kept', () => {
    expect(invitation.searchParams.get('subject')).toBe('Invitation à Catiche');
    expect(invitation.searchParams.get('body')).toBe(
      'Bonjour, je souhaite recevoir une invitation pour Catiche. Classe de mon enfant (facultatif)\xa0: ',
    );
  });

  it('encodes its spaces as %20, which every mail client reads, never as +', () => {
    expect(INVITATION_HREF).not.toContain('+');
    expect(INVITATION_HREF).toContain('Invitation%20%C3%A0%20Catiche');
  });
});
