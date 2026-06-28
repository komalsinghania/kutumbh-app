import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy — RokaMaybe',
  description: 'How RokaMaybe collects, uses, stores, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={`This Privacy Policy explains how ${LEGAL.entity} (“we”, “us”, “${LEGAL.appName}”) collects, uses, shares, and protects personal data when you use the ${LEGAL.appName} application and website (the “Service”). By using the Service, you agree to this Policy.`}
    >
      <div className="note">
        <strong>About data you add about other people.</strong> {LEGAL.appName} lets you record details about
        prospective matches (“Prospects”) — including names, photos, phone numbers, and birth details. You are
        responsible for ensuring you have a lawful basis or the person’s consent to store and process their
        information here. For that data, you are the data controller and we act as a processor on your behalf.
      </div>

      <h2>1. Who we are</h2>
      <p>
        The Service is operated by {LEGAL.entity}. For any privacy questions or requests, contact us at{' '}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>

      <h2>2. Information we collect</h2>
      <h3>a) Account information</h3>
      <ul>
        <li>Your name and email address (via email/password or Google sign-in).</li>
        <li>Authentication identifiers managed by our auth provider (Google Firebase).</li>
      </ul>
      <h3>b) Your profile &amp; preferences</h3>
      <ul>
        <li>Age, city, education, profession, income range, diet, family preferences and dealbreakers.</li>
        <li>Astrology-related details you choose to provide (date, time and place of birth; rashi; nakshatra; gotra; manglik status).</li>
      </ul>
      <h3>c) Prospect data you enter</h3>
      <ul>
        <li>Names, ages, cities, professions, photos, phone numbers, family details and biodata of prospective matches.</li>
        <li>Notes, conversation logs, ratings, flags and meeting feedback you record.</li>
        <li>Documents or images you upload for automated biodata extraction.</li>
      </ul>
      <h3>d) Technical &amp; usage data</h3>
      <ul>
        <li>Essential cookies/local storage used to keep you signed in.</li>
        <li>Basic technical logs (e.g. error diagnostics) needed to run and secure the Service.</li>
      </ul>

      <h2>3. How we use your information</h2>
      <ul>
        <li>To provide the Service — store your prospects, compute compatibility and kundli (guna) scores, and show your pipeline.</li>
        <li>To run the optional AI biodata-extraction feature on documents/images you upload.</li>
        <li>To secure the Service, prevent abuse, and debug problems.</li>
        <li>To communicate with you about your account or important changes.</li>
      </ul>

      <h2>4. Legal bases for processing</h2>
      <p>
        Where applicable law (such as India’s Digital Personal Data Protection Act, 2023, or the EU/UK GDPR)
        requires it, we rely on: your <strong>consent</strong>; performance of our <strong>contract</strong> with
        you (to provide the Service); and our <strong>legitimate interests</strong> in operating and securing the
        Service. You can withdraw consent at any time (see “Your rights”).
      </p>

      <h2>5. Sharing &amp; sub-processors</h2>
      <p>We do not sell your personal data. We share data only with service providers who help us run the Service:</p>
      <ul>
        <li><strong>Google Firebase</strong> — authentication and database/storage.</li>
        <li><strong>Anthropic</strong> — AI processing of biodata you submit for extraction. Submitted content is sent to Anthropic only to return the extracted fields.</li>
        <li><strong>Vercel</strong> — application hosting and delivery.</li>
      </ul>
      <p>These providers may process data on servers outside your country, including outside India.</p>

      <h2>6. International transfers</h2>
      <p>
        Because our sub-processors operate globally, your data may be transferred to and processed in other
        countries. Where required, we rely on appropriate safeguards (such as the providers’ standard contractual
        clauses) for such transfers.
      </p>

      <h2>7. Data retention &amp; deletion</h2>
      <p>
        We keep your data for as long as your account is active. You can delete individual prospects and their
        records at any time from within the app. To erase your <strong>entire account and all associated data</strong>,
        use <strong>Profile → Danger Zone → “Delete my account &amp; data”</strong>, which permanently removes your
        profile and every prospect, note, conversation, rating, and meeting. You may also email{' '}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> for assistance. Deletion is immediate and
        irreversible, subject to any legal retention obligations.
      </p>

      <h2>8. Security</h2>
      <p>
        Access to your data is restricted so that only your authenticated account can read or write it. We use
        encryption in transit (HTTPS) and access controls on our database. No system is perfectly secure, but we
        take reasonable technical and organisational measures to protect your information.
      </p>

      <h2>9. Your rights</h2>
      <p>Subject to applicable law, you may have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate data or update your profile.</li>
        <li>Delete your data and account.</li>
        <li>Withdraw consent or object to certain processing.</li>
        <li>Lodge a complaint with your data protection authority (e.g. the Data Protection Board of India).</li>
      </ul>
      <p>
        To exercise these rights, contact our Grievance Officer, {LEGAL.grievanceOfficer}, at{' '}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>

      <h2>10. Cookies</h2>
      <p>
        We use strictly necessary cookies/local storage to keep you signed in and to remember your cookie choice.
        We do not use advertising cookies. If we add analytics in future, we will ask for your consent first via the
        cookie banner.
      </p>

      <h2>11. Children</h2>
      <p>
        The Service is intended for adults (18 years or older) exploring marriage prospects. It is not directed at
        children, and we do not knowingly collect data from anyone under 18.
      </p>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. We will revise the “Last updated” date above and, for material
        changes, take reasonable steps to notify you.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions or requests? Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalLayout>
  );
}
