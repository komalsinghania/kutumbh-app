import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import { LEGAL } from '@/lib/legal';
import { pageOpenGraph } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Privacy Policy — RokaMaybe',
  description: 'How RokaMaybe collects, uses, stores, and protects your personal data.',
  openGraph: pageOpenGraph(
    'Privacy Policy — RokaMaybe',
    'How RokaMaybe collects, uses, stores, and protects your personal data.',
  ),
};

const email = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={`This Privacy Policy explains how ${LEGAL.entity} (“we”, “us”, “${LEGAL.appName}”) collects, uses, stores, shares, and protects personal data when you use the ${LEGAL.appName} application and website at ${LEGAL.website} (the “Service”).`}
    >
      <p>
        We are based in {LEGAL.placeOfBusiness}. This Policy is written to comply with India’s{' '}
        <strong>Digital Personal Data Protection Act, 2023 (“DPDPA”)</strong>.
      </p>

      <div className="note">
        <strong>Available in your language.</strong> You may request this Policy and our consent notice in English or
        any language listed in the Eighth Schedule to the Constitution of India. Email {email} and we will provide it. A
        Hindi version is available on request.
      </div>

      <h2>1. Who we are, and who to contact</h2>
      <div className="table-wrap">
      <table>
        <tbody>
          <tr>
            <td><strong>Data Fiduciary</strong></td>
            <td>Komal Singhania, sole proprietor, trading as {LEGAL.appName}</td>
          </tr>
          <tr>
            <td><strong>Place of business</strong></td>
            <td>{LEGAL.placeOfBusiness}</td>
          </tr>
          <tr>
            <td><strong>Full postal address</strong></td>
            <td>Available on request — email us</td>
          </tr>
          <tr>
            <td><strong>Grievance Officer</strong></td>
            <td>{LEGAL.grievanceOfficer}</td>
          </tr>
          <tr>
            <td><strong>Contact for everything</strong></td>
            <td>{email}</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p>
        Under the DPDPA, we are the <strong>Data Fiduciary</strong> — we determine why and how your personal data is
        processed. You are the <strong>Data Principal</strong>.
      </p>
      <p>
        {LEGAL.appName} is built and run by one person. When you write to us, you are writing to her.
      </p>

      <h2>2. About data you add concerning other people</h2>
      <p>
        {LEGAL.appName} lets you record details about prospective matches (“<strong>Prospects</strong>”) — names,
        photos, phone numbers, birth details, biodata, and your own notes, flags, and ratings.
      </p>
      <p>This is the most important section in this Policy, so it is written plainly.</p>

      <h3>What you are responsible for</h3>
      <p>
        You decide who to add, what to record, and why. You confirm you have a lawful basis or the person’s consent to
        store their information here.
      </p>
      <p>
        In the arranged marriage process a biodata is created and circulated precisely so that prospective matches and
        their families can consider it. That is the document’s purpose. But your <strong>private notes, flags, and
        ratings</strong> are different — that is information <em>you</em> create, and the Prospect has never seen or
        agreed to it. Please hold that responsibly.
      </p>

      <h3>What we are responsible for</h3>
      <p>
        We provide the system that stores and processes this data, so we do not pretend to be a neutral pipe. We are
        responsible for keeping it secure, for making sure only you can see it, for not using it for our own purposes,
        and for honouring deletion requests — including requests from Prospects themselves.
      </p>

      <h3>Use it for what it’s for</h3>
      <p>
        Prospect data may be recorded only for your own genuine, personal purpose of considering a match. It may not be
        used to harass, surveil, profile, share, publish, or build a record on any person.
      </p>

      <h3>Prospects must be adults</h3>
      <p>
        <strong>You may not add a Prospect who is under 18.</strong> The Service enforces this: if a Prospect’s age is
        under 18 — whether you type it in, edit it, or our AI reads it from an uploaded biodata — the Service will
        block it. If we discover a child’s data here despite that, we will delete it.
      </p>

      <h3>If you are a Prospect reading this</h3>
      <p>
        If you believe your information may be held in {LEGAL.appName} by someone considering a match with you, write
        to {email}.
      </p>
      <p>
        <strong>We will act on your request.</strong> If we are reasonably satisfied the request is genuine, we will
        delete your information — without needing the account holder’s permission. You do not need to be a user of{' '}
        {LEGAL.appName} to ask this of us. We will not ignore you.
      </p>

      <h2>3. Information we collect</h2>
      <h3>a) Account information</h3>
      <ul>
        <li>Your name and email address, via email/password or Google sign-in.</li>
        <li>Authentication identifiers managed by Google Firebase.</li>
      </ul>
      <h3>b) Your profile and preferences</h3>
      <ul>
        <li>Age, city, education, profession, income range, diet, family preferences, and dealbreakers.</li>
        <li>
          Astrology-related details you choose to provide: date, time and place of birth; rashi; nakshatra; gotra;
          manglik status.
        </li>
        <li>A profile photo, if you upload one.</li>
      </ul>
      <h3>c) Prospect data you enter</h3>
      <ul>
        <li>Names, ages, cities, professions, photos, phone numbers, family details and biodata of prospective matches.</li>
        <li>Notes, conversation logs, ratings, flags, family scorecards and meeting feedback you record.</li>
        <li>Documents or images you upload for AI biodata extraction.</li>
      </ul>
      <h3>d) Cookies and technical data</h3>
      <ul>
        <li>
          <strong>Strictly necessary</strong> cookies and local storage, to keep you signed in and to remember your
          cookie choice.
        </li>
        <li><strong>Analytics</strong>, only if you consent — see Section 9.</li>
      </ul>
      <p>
        <strong>We do not collect:</strong> location tracking, your contact list, advertising identifiers, or
        behavioural profiles. We run no advertising and no session-recording tools.
      </p>

      <h2>4. How we use your information</h2>
      <ul>
        <li>
          To provide the Service — store your prospects, compute compatibility and kundli (guna milan) scores, show
          your pipeline.
        </li>
        <li>To run AI biodata extraction on documents and images you upload.</li>
        <li>To secure the Service and diagnose problems.</li>
        <li>
          To email you about your account. <strong>We do not send marketing or newsletter emails.</strong>
        </li>
        <li>To understand, in aggregate, which features are used — only with your consent (Section 9).</li>
      </ul>
      <p>
        <strong>We do not</strong> sell your data, share it with advertisers, use it to train AI models, or use it to
        introduce you to anyone. {LEGAL.appName} is a private tool, not a matchmaking platform. Nobody is matched with
        you by us. Nobody browses your prospects.
      </p>

      <h2>5. Our basis for processing (DPDPA §§ 6 and 7)</h2>
      <p>
        We process your personal data on the basis of <strong>your consent</strong>, given when you create an account
        and provide information, having been told what it will be used for.
      </p>
      <p>
        Where you voluntarily provide data for a purpose and have not indicated that you object, we may also rely on the{' '}
        <strong>“certain legitimate uses”</strong> provision at Section 7 of the DPDPA.
      </p>
      <p>
        We do not rely on “legitimate interests” — that concept does not exist under Indian law.
      </p>

      <h3>Withdrawing consent</h3>
      <p>You may withdraw consent at any time, as easily as you gave it:</p>
      <ul>
        <li><strong>In the app:</strong> Profile → Danger Zone → “Delete my account &amp; data”</li>
        <li><strong>By email:</strong> {email}</li>
      </ul>
      <p>
        On withdrawal we stop processing your data and ensure our processors erase it, unless a law requires us to keep
        it. Withdrawing consent does not make our earlier processing unlawful. The consequence of withdrawal is that you
        can no longer use the Service.
      </p>

      <h2>6. Sharing and processors</h2>
      <p>
        We do not sell your personal data. We share it only with the service providers who make the Service work:
      </p>
      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Processor</th>
            <th>What they do</th>
            <th>Where they process</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Google Firebase</strong></td>
            <td>Authentication, database, storage</td>
            <td><strong>India (asia-south1, Mumbai)</strong></td>
          </tr>
          <tr>
            <td><strong>Anthropic</strong></td>
            <td>AI extraction of biodata you upload</td>
            <td>United States</td>
          </tr>
          <tr>
            <td><strong>Vercel</strong></td>
            <td>Application hosting, cookieless analytics</td>
            <td>Global</td>
          </tr>
          <tr>
            <td><strong>PostHog</strong></td>
            <td>Product analytics (only with your consent)</td>
            <td>European Union</td>
          </tr>
          <tr>
            <td><strong>Razorpay</strong></td>
            <td>Payments — <em>currently not in use</em></td>
            <td>India</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p>
        Each is engaged under a contract as required by DPDPA §8(2). We remain responsible to you for their compliance.
      </p>
      <p>
        <strong>Where your data actually lives.</strong> Your account, your prospects, your notes, and your photos are
        stored in <strong>India</strong>, in Google’s Mumbai region. That is deliberate.
      </p>
      <p>
        <strong>On AI processing.</strong> When you use biodata extraction, the document is sent to Anthropic’s API in
        the United States solely to return the extracted fields. <strong>It is not used to train AI models.</strong> We
        do not retain it beyond producing your result. This is a transient transfer, but it is a real one, and you
        should know about it.
      </p>
      <p>
        <strong>On analytics.</strong> PostHog is hosted in the European Union. It only runs if you accept analytics
        cookies. It identifies you only by an internal account identifier — never your name, email, or phone number.
      </p>
      <p>We may also disclose data where required by law, court order, or a lawful government request.</p>

      <h2>7. Transfers outside India</h2>
      <p>
        Your core data is stored in India. However, as set out above, some processing happens outside India — AI
        extraction in the United States, and analytics in the European Union.
      </p>
      <p>
        Under <strong>DPDPA §16</strong>, transfers outside India are permitted except to countries or territories that
        the Central Government notifies as restricted. Neither the United States nor the European Union is currently
        subject to such a restriction. If a restriction is notified in future that affects our processors, we will
        comply with it.
      </p>
      <p>
        We do not use “standard contractual clauses” — that is a European mechanism, not an Indian one. We rely on §16
        and on our contracts with each processor.
      </p>

      <h2>8. How long we keep your data</h2>
      <p>
        <strong>While your account is active,</strong> we keep your data so the Service works.
      </p>
      <p>
        <strong>Deleting things yourself.</strong> You can delete individual prospects, notes, conversations, flags,
        and photos at any time inside the app. Deletion is immediate.
      </p>
      <p>
        <strong>Deleting everything.</strong> Profile → Danger Zone → <strong>“Delete my account &amp; data”</strong>.
        This permanently removes your profile and every prospect, note, conversation, flag, rating, photo, meeting
        record, and activity log entry. It is immediate and irreversible. You may also email {email} and we will do it
        for you.
      </p>
      <p>
        <strong>If you stop using {LEGAL.appName}.</strong> Many people find a match and simply stop logging in —
        leaving behind information about other people who never consented to it sitting here indefinitely. That should
        not happen.
      </p>
      <p>
        <strong>If your account is inactive for 24 months, we will delete it and all its data.</strong> We will email
        you twice before we do — at 22 months and at 23 months — so nothing disappears without warning.
      </p>
      <p>
        <strong>After deletion</strong>, your data is removed from our live systems immediately and completely.
      </p>

      <h2>9. Cookies and analytics</h2>
      <p>
        <strong>Strictly necessary cookies</strong> keep you signed in and remember your cookie choice. These always
        run. No consent is required for them and you cannot turn them off while using the Service.
      </p>
      <p>
        <strong>Analytics cookies</strong> only run if you accept them on our cookie banner. If you decline, they never
        load at all — this is enforced in our code, not just promised.
      </p>
      <p>Our analytics setup is deliberately restrained:</p>
      <ul>
        <li><strong>Vercel Analytics</strong> — cookieless, collects no personal data.</li>
        <li>
          <strong>PostHog</strong> — EU-hosted. Automatic event capture is <strong>off</strong>. Session recording is{' '}
          <strong>off</strong>. It identifies you only by an internal account identifier, never by your name, email, or
          phone number.
        </li>
      </ul>
      <p>
        We use no advertising cookies, no tracking pixels, and no session-replay tools. We never will on this product —
        recording your screen would mean recording other people’s biodatas and your private notes about them.
      </p>

      <h2>10. Security (DPDPA § 8(5))</h2>
      <ul>
        <li>
          Your data is readable and writable <strong>only by your authenticated account</strong>. This is enforced by
          database security rules at the infrastructure level, not merely by the app.
        </li>
        <li>All data is encrypted in transit (HTTPS) and encrypted at rest by our infrastructure provider.</li>
        <li>API keys and credentials are held server-side and never exposed to your browser.</li>
        <li>Access to our systems is restricted.</li>
      </ul>
      <p>
        No system is perfectly secure, but we take reasonable technical and organisational measures to protect your
        information, and we keep working on them.
      </p>

      <h2>11. If there is a data breach (DPDPA § 8(6))</h2>
      <p>If a personal data breach occurs, we will:</p>
      <ol>
        <li>
          Notify the <strong>Data Protection Board of India</strong> in the form and within the time the law requires.
        </li>
        <li>
          Notify <strong>every affected person directly and without delay</strong> — telling you what happened, what
          data was involved, what we are doing about it, and what you can do to protect yourself.
        </li>
      </ol>
      <p>We will not stay quiet about a breach to protect ourselves.</p>

      <h2>12. Your rights (DPDPA §§ 11–14)</h2>
      <p>Subject to law, you have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> — a summary of the personal data we hold about you, how it is processed, and who it
          has been shared with.
        </li>
        <li>
          <strong>Correction, completion, updating and erasure</strong> — correct what’s wrong, complete what’s
          missing, delete what you want gone.
        </li>
        <li><strong>Grievance redressal</strong> — complain to us and have it addressed.</li>
        <li>
          <strong>Nominate</strong> — nominate another person to exercise your rights if you die or become
          incapacitated. Email us their name and contact details and we will record it.
        </li>
        <li><strong>Withdraw consent</strong> — at any time, as in Section 5.</li>
      </ul>
      <p>
        <strong>How to exercise them:</strong> email {email}.
      </p>
      <p>
        <strong>Our timeline:</strong> we will acknowledge within <strong>72 hours</strong> and resolve within{' '}
        <strong>30 days</strong>. If something needs longer, we will tell you why rather than go silent.
      </p>
      <p>
        <strong>If we let you down,</strong> you may complain to the <strong>Data Protection Board of India</strong>. We
        would rather you came to us first — but this is your right, not a favour we grant.
      </p>

      <h2>13. Your duties (DPDPA § 15)</h2>
      <p>
        The Act places duties on Data Principals too. In short: don’t impersonate anyone when providing data, don’t
        suppress material information, and don’t file false or frivolous complaints. The Act provides penalties for
        breaching these duties.
      </p>

      <h2>14. Children (DPDPA § 9)</h2>
      <p>
        The Service is for adults aged 18 or over. We do not knowingly collect the personal data of anyone under 18 —
        whether as an account holder or as a Prospect.
      </p>
      <p>
        <strong>As a user:</strong> you confirm you are 18 or over when you sign up. If we learn an account belongs to
        someone under 18, we will delete it and its data.
      </p>
      <p>
        <strong>As a Prospect:</strong> the Service blocks any Prospect whose age is under 18, on every path — adding,
        editing, and AI extraction from an uploaded biodata. See Section 2.
      </p>
      <p>
        We do not track, behaviourally monitor, or target advertising at children. We don’t do those things to anyone.
      </p>
      <p>If you believe a child’s data is held here, email {email} and we will act promptly.</p>

      <h2>15. Changes to this Policy</h2>
      <p>
        We may update this Policy. We will revise the “Last updated” date above, and for material changes we will
        notify you by email or in the app before they take effect.
      </p>

      <h2>16. Contact</h2>
      <p>
        <strong>Grievance Officer:</strong> {LEGAL.grievanceOfficer}
        <br />
        <strong>Email:</strong> {email}
        <br />
        <strong>Address:</strong> {LEGAL.placeOfBusiness} — full postal address available on request
      </p>
      <p>
        <strong>Data Protection Board of India</strong> — for complaints you feel we have not resolved.
      </p>
    </LegalLayout>
  );
}
