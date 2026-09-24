import React from 'react';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@nepally/shared';
import LegalDocument from '../components/legal/LegalDocument';
import { Faq, FaqItem } from '../components/legal/Faq';

export default function HelpPage() {
  return (
    <LegalDocument
      title="Help Center"
      description="Answers to common questions about accounts, posting, messaging, reporting, and the Marketplace on Nepally."
      intro={
        <p>
          Quick answers to the questions we hear most. If yours is not here, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and a real person will reply.
        </p>
      }
    >
      <h2>Getting started</h2>
      <Faq>
        <FaqItem question="Why do you ask for my ZIP code?">
          <p>
            Nepally is organized by metro area. Your ZIP code tells us which metro you belong to, so your feed shows
            posts from people near you. Only your metro area is shown to others, never your ZIP code.
          </p>
        </FaqItem>
        <FaqItem question="What do New, Verified, and Contributor mean?">
          <p>
            Every account starts as <strong>New</strong> and can read everything. Confirm your email address, or sign in
            with Google, to become <strong>Verified</strong> and unlock posting, commenting, messaging, and reporting.
            Members who consistently help others are recognized as <strong>Contributors</strong>.
          </p>
        </FaqItem>
        <FaqItem question="I signed up but cannot post.">
          <p>
            Check your inbox for the confirmation email (and your spam folder). Open the link or enter the code in the
            app. If the email never arrives, sign in and use <strong>Resend verification</strong>, or contact support.
          </p>
        </FaqItem>
      </Faq>

      <h2>Posting</h2>
      <Faq>
        <FaqItem question="How do tags work?">
          <p>
            Every post has one to three tags such as Housing, Jobs, Help, Question, or Discussion. Tags are how people
            filter the feed, so pick the ones that describe your post best. You can add up to three photos.
          </p>
        </FaqItem>
        <FaqItem question="What happens when I use the Emergency tag?">
          <p>
            Emergency posts are held for review and published once a moderator confirms they describe a real
            situation where the community can help. You will see the post in your own profile while it waits. For
            anything life-threatening, call 911 first; Nepally is a community notice board, not an emergency service.
          </p>
        </FaqItem>
        <FaqItem question="Can I edit or delete a post?">
          <p>Yes. Open the post menu to edit the title, body, tags, and photos, or to delete it. Deleted posts cannot be recovered.</p>
        </FaqItem>
        <FaqItem question="What is a Global post?">
          <p>
            Global posts appear in every metro area&apos;s feed instead of only yours. They are available to Premium
            members, who can also save up to five locations and switch between them.
          </p>
        </FaqItem>
      </Faq>

      <h2>Messaging and staying safe</h2>
      <Faq>
        <FaqItem question="How do I contact someone about a post?">
          <p>
            Use <strong>Message</strong> on the post or the member&apos;s profile. Conversations are private to the two of
            you. You can block a member from the conversation menu at any time.
          </p>
        </FaqItem>
        <FaqItem question="How do I avoid scams?">
          <ul>
            <li>See the place, meet the person, or verify the employer before paying anything.</li>
            <li>Never send deposits by wire transfer, gift card, or cryptocurrency.</li>
            <li>Never share passport, visa, or Social Security details in a message.</li>
            <li>If something feels off, report it. Reports are private.</li>
          </ul>
        </FaqItem>
      </Faq>

      <h2>Reporting</h2>
      <Faq>
        <FaqItem question="How do I report a post, listing, profile, or message?">
          <p>
            Open the menu on the item and choose <strong>Report</strong>, pick a reason, and add a short note. You can
            report each item once. The person you report is not told who reported them.
          </p>
        </FaqItem>
        <FaqItem question="What happens after I report something?">
          <p>
            A moderator reviews every report. Content that receives several reports is hidden automatically while it
            waits. Moderators can remove the content, dismiss the report, or ban the account. See the{' '}
            <Link href="/guidelines">Community Guidelines</Link> for what we act on.
          </p>
        </FaqItem>
      </Faq>

      <h2>Marketplace and promotions</h2>
      <Faq>
        <FaqItem question="How do I promote a listing?">
          <p>
            Open your listing and choose <strong>Promote</strong>. Pick a duration, pay securely through Stripe, and the
            promotion starts as soon as the payment is confirmed. Receipts come from Stripe by email.
          </p>
        </FaqItem>
        <FaqItem question="Can I get a refund?">
          <p>
            Promotions start immediately, so fees are generally non-refundable once live, except where the law
            requires it or we could not deliver the promotion. If a charge looks wrong, email support with the
            listing and the date of the charge.
          </p>
        </FaqItem>
      </Faq>

      <h2>Your account</h2>
      <Faq>
        <FaqItem question="How do I change my password or notification settings?">
          <p>
            Open your profile menu. <strong>Change Password</strong> and <strong>Notification Preferences</strong> are both
            there. Push notifications also need to be allowed in your phone or browser settings.
          </p>
        </FaqItem>
        <FaqItem question="How do I delete my account?">
          <p>
            Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email address on your account with the
            subject &quot;Delete my account&quot;. We will confirm the request and delete your account, including your
            profile, posts, comments, messages, listings, and photos, within 30 days. See the <Link href="/privacy">Privacy Policy</Link> for what
            we may need to keep and why.
          </p>
        </FaqItem>
      </Faq>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We aim to reply within two business days.
      </p>
    </LegalDocument>
  );
}
