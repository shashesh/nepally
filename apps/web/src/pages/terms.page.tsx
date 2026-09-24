import React from 'react';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@nepally/shared';
import LegalDocument from '../components/legal/LegalDocument';
import { Callout } from '../components/legal/Callout';

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="The rules for using Nepally, what we are and are not responsible for, and how paid promotions work."
      intro={
        <p>
          These Terms are the agreement between you and Nepally for using the Nepally website and mobile app. By
          creating an account or using the service you agree to them, to our{' '}
          <Link href="/privacy">Privacy Policy</Link>, and to the{' '}
          <Link href="/guidelines">Community Guidelines</Link>.
        </p>
      }
    >
      <Callout>
        <p>
          Nepally is a community notice board, not an emergency service. It is not a replacement for 911. If someone
          is in danger or needs urgent medical help, call 911 or your local emergency number first.
        </p>
      </Callout>

      <h2>1. Who can use Nepally</h2>
      <p>
        You must be at least 18 years old and able to enter into a binding agreement. You are responsible for
        everything that happens under your account, so keep your password private and tell us right away if you
        think someone else is using it.
      </p>

      <h2>2. What Nepally is</h2>
      <p>
        Nepally lets members of the Nepali community in the United States post housing leads, jobs, questions,
        events, marketplace listings, and requests for help, organized by metro area. Nepally is a community notice
        board. We do not verify landlords, employers, sellers, or the accuracy of any post, and we are not a party to
        any arrangement you make with another member. Use your own judgement, meet in public places, and never send
        money or documents to someone you have not verified.
      </p>

      <h2>3. Emergencies</h2>
      <p>
        Posts tagged Emergency are reviewed by volunteer moderators before they are published, and members may
        choose to help. Nepally cannot guarantee that anyone will see or respond to an emergency post, or how quickly.
        Nepally is not a replacement for 911, professional medical care, legal advice, or law enforcement.
      </p>

      <h2>4. Accounts and trust levels</h2>
      <p>
        New accounts can read but not post until the email address is confirmed or the account is linked to Google.
        Accounts that consistently help the community may be recognized as Contributors. Accounts that receive
        confirmed reports may lose posting rights or be banned. Provide accurate information and do not create
        accounts on behalf of someone else.
      </p>

      <h2>5. Your content</h2>
      <p>
        You own what you post. By posting you give Nepally a non-exclusive, royalty-free license to store, display,
        and distribute that content within the service so other members can see it. You confirm that you have the
        right to share it, including any photos of other people.
      </p>
      <p>
        We may remove or hide content and suspend accounts that break these Terms or the Community Guidelines,
        with or without notice. Content that receives several reports is hidden automatically until a moderator
        reviews it.
      </p>

      <h2>6. What you may not do</h2>
      <ul>
        <li>Post scams, fraudulent listings, or fake job offers, or ask for deposits, fees, or documents before a legitimate transaction.</li>
        <li>Harass, threaten, or discriminate against anyone, or share someone else&apos;s private information.</li>
        <li>Impersonate a person, organization, or Nepally itself.</li>
        <li>Post anything illegal, or use the service for anything illegal.</li>
        <li>Scrape, copy, or bulk-download member data, or interfere with the service or its security.</li>
        <li>Create multiple accounts to evade a ban or to manipulate reports, likes, or trust levels.</li>
      </ul>

      <h2>7. Premium and paid promotions</h2>
      <p>
        Some features, such as global posts and extra saved locations, are available to Premium members. Marketplace
        sellers can pay to promote a listing for a set number of days. Prices are shown before you pay and payments
        are processed by Stripe under its own terms. A promotion starts as soon as the payment is confirmed. Because
        promotions begin immediately, fees are generally non-refundable once a promotion is live, except where the
        law requires a refund or where we are unable to deliver the promotion. If a promoted listing is removed for
        breaking these Terms, the fee is not refunded. Questions about a charge: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2>8. Ending your account</h2>
      <p>
        You can delete your account at any time (see the <Link href="/help">Help Center</Link>). We may suspend or
        terminate accounts that break these Terms. Sections 5, 9, 10, and 11 survive termination.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        Nepally is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express or
        implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement.
        We do not guarantee that the service will be uninterrupted, error-free, or that any post is accurate or safe.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Nepally and the volunteers who run it are not liable for any indirect,
        incidental, special, consequential, or punitive damages, or for any loss arising from your dealings with other
        members, and our total liability for any claim relating to the service is limited to the greater of $100 or
        the amount you paid us in the 12 months before the claim.
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You agree to defend and hold harmless Nepally and its volunteers from claims arising from content you post or
        your breach of these Terms.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the United States and of the state in which Nepally is organized,
        without regard to conflict-of-law rules. Any dispute will be resolved in the courts located in that state,
        and you consent to their jurisdiction.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms. We will change the date at the top of this page and, for material changes, notify
        you in the app or by email. Continuing to use Nepally after a change means you accept the updated Terms.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </LegalDocument>
  );
}
