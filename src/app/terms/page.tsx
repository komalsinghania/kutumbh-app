import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import { LEGAL } from '@/lib/legal';
import { pageOpenGraph } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms governing your use of the RokaMaybe service.',
  keywords: ['rokamaybe terms', 'terms & conditions', 'legal', 'arranged marriage app terms'],
  alternates: {
    canonical: '/terms',
  },
  openGraph: pageOpenGraph(
    'Terms & Conditions — RokaMaybe',
    'The terms governing your use of the RokaMaybe service.',
  ),
};

const email = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms &amp; Conditions"
      intro={`These Terms & Conditions (“Terms”) govern your use of the ${LEGAL.appName} application and website at ${LEGAL.website} (the “Service”), operated by ${LEGAL.entity}, of ${LEGAL.placeOfBusiness}.`}
    >
      <p>
        By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use
        the Service.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least <strong>18 years old</strong> and legally able to enter into a contract under Indian law.
        By using the Service, you confirm that you are.
      </p>

      <h2>2. Your account</h2>
      <p>
        You are responsible for keeping your login secure and for activity under your account. Tell us at {email} if
        you think someone else has accessed it. Keep the information you give us accurate.
      </p>

      <h2>3. What the Service does — and doesn’t</h2>
      <p>
        {LEGAL.appName} is a <strong>private organisational tool</strong>. It helps you keep track of marriage
        prospects, record your own notes, conversations and meetings, and view informational compatibility and kundli
        (guna milan) scores.
      </p>
      <p>
        It is <strong>not</strong> a matrimonial matchmaking service, a marriage bureau, or a broker.
      </p>
      <ul>
        <li>We do not introduce you to anyone.</li>
        <li>We do not verify, vouch for, or background-check any person.</li>
        <li>We do not match you with anyone, and nobody is matched with you by us.</li>
        <li>Nobody else can see what you record. It is yours.</li>
      </ul>

      <h2>4. Prospect data — your responsibilities</h2>
      <p>
        You may enter information about prospective matches (“<strong>Prospect data</strong>”) — names, photos, phone
        numbers, biodata, and your own notes, flags, and ratings.
      </p>
      <p>You represent and warrant that:</p>
      <ul>
        <li>You have a lawful basis or the necessary consent to collect, upload, and store that information.</li>
        <li>You will use it only for your own lawful, personal purpose of considering a match.</li>
        <li>You will not upload content that is unlawful, defamatory, or infringes anyone’s rights.</li>
        <li>You will not use the Service to harass, stalk, surveil, or build a record on any person.</li>
      </ul>

      <h3>4.1 Prospects must be adults — no exceptions</h3>
      <p>
        <strong>You must not add a Prospect who is under 18 years of age.</strong>
      </p>
      <p>
        This is not a formality. Processing a child’s personal data without verifiable parental consent is prohibited
        under the Digital Personal Data Protection Act, 2023, and we will never have that consent for a Prospect.
      </p>
      <p>
        The Service enforces this technically: any Prospect whose age is under 18 is blocked when adding, when editing,
        and when our AI reads an age from an uploaded biodata. <strong>Do not attempt to work around this.</strong> If
        we discover a child’s data in the Service, we will delete it immediately, and we may terminate the account
        responsible.
      </p>

      <h3>4.2 Prospect takedown — read this before you start</h3>
      <div className="note">
        <strong>
          If a person whose data is held in the Service asks us to remove it, and we are reasonably satisfied the
          request is genuine, we will remove it — from your account, without your permission, and possibly without
          notice to you first.
        </strong>
      </div>
      <p>
        This is a condition of using the Service and it is not negotiable. That person did not sign up for
        {' '}{LEGAL.appName}; you added them. Their right to have their data erased comes ahead of your convenience in
        keeping it. We will tell you afterwards where we reasonably can.
      </p>

      <h3>4.3 Indemnity for Prospect data</h3>
      <p>
        You are responsible for the Prospect data you add. You agree to indemnify and hold us harmless from any claim
        arising out of your collection or use of another person’s information through the Service.
      </p>

      <h2>5. Price — the Service is currently free</h2>
      <p>
        <strong>{LEGAL.appName} is free to use.</strong> Payments are switched off. There is nothing to buy, no card to
        enter, and no charge of any kind at present.
      </p>
      <p>
        <strong>There is no cap on the number of prospects you can track.</strong>
      </p>
      <p>
        <strong>Every feature is available to everyone</strong>, including Compare — the side-by-side decision matrix.
        Nothing is locked, nothing is trial-limited, and no card details are taken anywhere in the Service.
      </p>

      <h3>5.1 When payments resume</h3>
      <p>We intend to charge for the full feature set in future. When we do:</p>
      <ul>
        <li>
          The price will be <strong>₹99, one-time</strong>. <strong>GST is not applicable</strong> — we are not
          GST-registered.
        </li>
        <li>
          It is a <strong>one-time payment, not a subscription.</strong> It does not auto-renew. There is nothing to
          cancel.
        </li>
        <li>
          It has <strong>no expiry.</strong> You buy it once and it stays unlocked. (You may see us describe it as
          “valid until your roka” — that’s how we talk about it, not a technical limit. Nothing expires.)
        </li>
        <li>
          A <strong>7-day free trial</strong> will be available. It takes no card details and converts to nothing — it
          simply expires. <strong>You will never be charged automatically.</strong>
        </li>
        <li>
          Payments will be processed by <strong>Razorpay</strong>. We will never see or store your card or bank
          details.
        </li>
        <li>
          We will tell you before any of this takes effect. <strong>Nothing you use for free today will start charging
          you without notice.</strong>
        </li>
      </ul>

      <h2>6. Refunds and cancellation</h2>
      <p>
        <em>(This section applies once payments are enabled. The Service is currently free, so nothing here is live
        yet.)</em>
      </p>
      <p>
        <strong>Within 7 days of purchase, for any reason:</strong> email {email} and we will refund you in full. You
        do not need to give a reason.
      </p>
      <p>
        <strong>After 7 days:</strong> because this is a one-time unlock of digital features delivered immediately,
        refunds are at our discretion. But if the Service is broken, unavailable for a sustained period, or doesn’t do
        what we said it does — write to us and we will make it right, refund included.
      </p>
      <p>
        <strong>If we discontinue the Service</strong> while your paid access is active, see Section 11.
      </p>
      <p>
        Refunds go back to the original payment method within <strong>7–10 working days</strong> of approval.
      </p>
      <p>
        <strong>Nothing here limits your rights under the Consumer Protection Act, 2019.</strong>
      </p>

      <h2>7. Kundli, compatibility scores and every other number — important</h2>
      <div className="note">
        <p>
          Kundli / guna milan scores, compatibility percentages, flags, family scores, ratings, and every other metric
          in the Service are produced by <strong>automated formulas, for your information and reference only.</strong>
        </p>
        <p>
          They are <strong>not</strong> astrological, religious, legal, financial, medical, or professional advice.
          They are <strong>not</strong> a prediction or guarantee of compatibility, of a marriage, or of any outcome
          whatsoever.
        </p>
        <p>
          Kundli calculations here are computerised and are <strong>no substitute for consulting a qualified Jyotish
          pandit.</strong>
        </p>
        <p>
          <strong>Every decision you make about a person is entirely your own.</strong> {LEGAL.appName} holds your
          information. It does not hold an opinion, and it does not decide anything for you.
        </p>
      </div>

      <h2>8. AI features</h2>
      <p>
        The biodata-extraction feature sends documents and images you upload to a third-party AI service (Anthropic) to
        read them.
      </p>
      <p>
        <strong>AI output may be incomplete or wrong.</strong> Names get misread, dates get transposed, fields get
        missed. <strong>Always review and correct extracted information before relying on it.</strong> We are not
        responsible for decisions made on the basis of unverified extracted data.
      </p>

      <h2>9. Acceptable use</h2>
      <ul>
        <li>Do not use the Service for any unlawful purpose, or to harass, stalk, defame, or harm anyone.</li>
        <li>Do not attempt to breach security, access another user’s data, or disrupt the Service.</li>
        <li>Do not scrape, resell, white-label, or abuse the Service or its automated endpoints.</li>
        <li>Do not upload malware or attempt to interfere with the AI extraction feature.</li>
        <li>Do not attempt to circumvent the under-18 Prospect block.</li>
      </ul>
      <p>We may suspend or terminate accounts that breach this section.</p>

      <h2>10. Intellectual property</h2>
      <p>
        The Service — its software, design, branding, and content — is owned by us or our licensors. “{LEGAL.appName}”
        and the {LEGAL.appName} wordmark are our marks.
      </p>
      <p>
        <strong>You own the data you submit.</strong> We claim no rights over your notes, your prospects, or your
        records, and we will not use them for any purpose beyond running the Service for you.
      </p>

      <h2>11. Data export</h2>
      <p>
        Email {email} and we will send you a copy of your data in a machine-readable format within{' '}
        <strong>30 days</strong>, free of charge.
      </p>

      <h2>12. Changes to, or discontinuation of, the Service</h2>
      <p>{LEGAL.appName} is built and run by one person. We may add, change, or remove features.</p>
      <p>
        If we ever have to discontinue the Service, we will give you at least <strong>60 days’ notice</strong>, provide
        a way to export all your data, and — if you have paid — offer a pro-rata refund or a reasonable alternative.
      </p>

      <h2>13. Disclaimers</h2>
      <p>
        Except as expressly stated in these Terms and to the extent permitted by law, the Service is provided{' '}
        <strong>“as is” and “as available”</strong>. We do not warrant that it will be uninterrupted, error-free, or
        that scores or extracted data will be accurate.
      </p>
      <p>
        <strong>If you are a paying user</strong>, nothing in this section excludes our obligation to provide the
        Service with reasonable care and skill, or any right you have under the{' '}
        <strong>Consumer Protection Act, 2019</strong> that cannot lawfully be excluded.
      </p>

      <h2>14. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or
        punitive damages, nor for any loss arising from:
      </p>
      <ul>
        <li>decisions you make based on the Service;</li>
        <li>the conduct, character, honesty, or actions of any Prospect or third party;</li>
        <li>any inaccuracy in scores, kundli calculations, or AI-extracted data.</li>
      </ul>
      <p>
        To the extent we are found liable, our total aggregate liability will not exceed the greater of{' '}
        <strong>₹99</strong> or the amount you actually paid us in the twelve months before the claim.{' '}
        <strong>If you have paid us nothing, that figure is nil.</strong>
      </p>
      <p>
        Nothing here limits liability for fraud, wilful misconduct, or anything that cannot be limited under Indian law.
      </p>

      <h2>15. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless {LEGAL.entity}, from any claim, damage, or expense arising from your
        use of the Service, your content or Prospect data, or your breach of these Terms.
      </p>

      <h2>16. Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time via <strong>Profile → Danger Zone</strong>.
        We may suspend or terminate your access if you breach these Terms or use the Service unlawfully. On
        termination, your data is handled as set out in our Privacy Policy.
      </p>

      <h2>17. Grievances and consumer complaints</h2>
      <p>
        <strong>Grievance Officer:</strong> {LEGAL.grievanceOfficer}
        <br />
        <strong>Email:</strong> {email}
        <br />
        <strong>Address:</strong> {LEGAL.placeOfBusiness} — full postal address available on request
      </p>
      <p>
        We acknowledge complaints within <strong>72 hours</strong> and aim to resolve them within{' '}
        <strong>30 days</strong>.
      </p>

      <h2>18. Governing law and jurisdiction</h2>
      <p>
        These Terms are governed by the laws of {LEGAL.governingLaw}. The courts at{' '}
        <strong>{LEGAL.jurisdictionCity}</strong> have exclusive jurisdiction.
      </p>
      <p>
        This does not affect any non-waivable right you have under consumer law — including your right to bring a
        consumer complaint where you live.
      </p>

      <h2>19. General</h2>
      <p>
        <strong>Severability.</strong> If any provision is unenforceable, the rest stands.
      </p>
      <p>
        <strong>Entire agreement.</strong> These Terms and the Privacy Policy are the whole agreement between us about
        the Service.
      </p>
      <p>
        <strong>Assignment.</strong> You may not assign these Terms. We may assign them in connection with a sale or
        transfer of the business, on notice to you.
      </p>
      <p>
        <strong>No waiver.</strong> If we don’t enforce a right, that isn’t a waiver of it.
      </p>
      <p>
        <strong>Force majeure.</strong> We are not liable for failures caused by events beyond our reasonable control.
      </p>

      <h2>20. Changes to these Terms</h2>
      <p>
        We may update these Terms. We will revise the “Last updated” date, and for material changes we will notify you
        by email or in the app before they take effect. Continued use after that means you accept them.
      </p>

      <h2>21. Contact</h2>
      <p>Questions? Email {email}. It’s one person reading, and she will reply.</p>
    </LegalLayout>
  );
}
