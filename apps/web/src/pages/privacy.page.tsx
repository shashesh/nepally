import React from 'react';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@nepally/shared';
import LegalDocument from '../components/legal/LegalDocument';

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="What Nepally collects, why, who processes it, and the choices you have."
      intro={
        <p>
          Nepally is a community platform for the Nepali diaspora in the United States. This policy explains what
          we collect when you use the Nepally website and mobile app, how we use it, and the choices you have. We
          keep it short on purpose; if anything is unclear, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      }
    >
      <h2>What we collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Your email address, full name, and a password. Passwords are stored only as a hash by our authentication provider.</li>
        <li>If you sign in with Google, the name and email address on your Google account.</li>
      </ul>

      <h3>Location</h3>
      <ul>
        <li>
          Your ZIP code, which we map to a US Census metro area so we can show you posts near you. Premium members
          can save additional ZIP codes.
        </li>
        <li>
          On mobile, if you grant location permission, we read your device location once to suggest a ZIP code.
          We do not store precise coordinates or track you in the background.
        </li>
      </ul>

      <h3>Profile details you choose to add</h3>
      <ul>
        <li>A profile photo, a short bio, your hometown district in Nepal, college, years in the US, and languages you speak.</li>
      </ul>

      <h3>Content you create</h3>
      <ul>
        <li>Posts, comments, event listings, marketplace listings, photos, direct messages, and reports you submit about other content.</li>
      </ul>

      <h3>Device and usage data</h3>
      <ul>
        <li>Push notification tokens for the devices and browsers where you enable notifications.</li>
        <li>Basic technical logs (IP address, browser or device type, timestamps) kept by our hosting providers to run and secure the service.</li>
      </ul>

      <h3>Payments</h3>
      <ul>
        <li>
          If you pay to promote a marketplace listing, Stripe processes the payment. We receive a transaction reference,
          amount, and status. We never see or store your full card number.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the service: build your local feed, show your posts to your metro area, and deliver messages and notifications.</li>
        <li>To verify accounts. Confirming your email or signing in with Google moves you from a New account to a Verified account, which unlocks posting.</li>
        <li>To keep the community safe: review reports, hide content that receives multiple reports, and suspend accounts that break the <Link href="/guidelines">Community Guidelines</Link>.</li>
        <li>To respond when you contact support.</li>
        <li>To meet legal obligations and enforce our <Link href="/terms">Terms of Service</Link>.</li>
      </ul>
      <p>We do not sell your personal information and we do not run advertising that shares your data with third parties.</p>

      <h2>What other members can see</h2>
      <ul>
        <li>
          Your public profile shows your first name and last initial, your trust badge, your metro area, the year you
          joined, and your public posts, events, and listings. Any optional profile details you add are public too.
        </li>
        <li>Your email address, ZIP code, phone number, and exact location are never shown to other members.</li>
        <li>Direct messages are visible only to the people in the conversation.</li>
        <li>Posts tagged Emergency are reviewed by a moderator before they appear in the feed.</li>
      </ul>

      <h2>Who processes your data</h2>
      <p>We rely on a small number of providers to run Nepally. Each only receives what it needs for its role:</p>
      <ul>
        <li><strong>Supabase</strong>: database, authentication, and file storage, hosted in the United States.</li>
        <li><strong>Google</strong>: optional sign-in with your Google account.</li>
        <li><strong>Vercel</strong>: hosting for the website.</li>
        <li><strong>Expo</strong>: delivery of push notifications to the mobile app.</li>
        <li><strong>Stripe</strong>: payment processing for paid listing promotions.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and content while your account is active. When you delete your account, we remove your
        profile, posts, comments, messages, listings, and photos within 30 days. We may keep limited records longer
        where the law requires it, for example payment records, or to investigate abuse.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit or remove profile details, posts, and listings at any time from the app.</li>
        <li>Turn notifications on or off per category in Notification Preferences.</li>
        <li>Revoke location permission in your device settings; you can still enter a ZIP code manually.</li>
        <li>
          Delete your account. See the <Link href="/help">Help Center</Link> for the steps, or email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your account email and we will delete your account for you.
        </li>
      </ul>

      <h2>Children</h2>
      <p>Nepally is for adults. You must be at least 18 years old to create an account. We do not knowingly collect information from anyone under 18.</p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, access to production systems is limited to the people who operate the service,
        and database access rules restrict every member to their own data. No system is perfectly secure, so please
        use a strong, unique password.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        When we change this policy we update the date at the top of this page. For material changes we will also
        notify you in the app or by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests about your data: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalDocument>
  );
}
