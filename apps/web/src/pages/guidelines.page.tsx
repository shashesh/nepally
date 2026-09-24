import React from 'react';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@nepally/shared';
import LegalDocument from '../components/legal/LegalDocument';
import { Callout } from '../components/legal/Callout';

export default function GuidelinesPage() {
  return (
    <LegalDocument
      title="Community Guidelines"
      description="How to be a good neighbor on Nepally, and what happens when someone is not."
      intro={
        <p>
          Nepally works because people trust what they read here. These guidelines describe what that trust
          requires. They apply to posts, comments, events, marketplace listings, and direct messages.
        </p>
      }
    >
      <h2>Be a good neighbor</h2>
      <ul>
        <li>Treat people the way you would at a community gathering. Disagree with ideas, not people.</li>
        <li>Write in whichever language you are comfortable with. Nepali, English, or a mix are all welcome.</li>
        <li>Answer questions when you can. A short, accurate reply is worth more than a long guess.</li>
      </ul>

      <h2>Keep it real</h2>
      <ul>
        <li>Only post housing, jobs, and items you can actually offer. Say clearly what it is, where it is, and what it costs.</li>
        <li>
          Scams are the fastest way to lose the community&apos;s trust and your account. Never ask for a deposit, a
          fee, or copies of documents before the other person has seen the place, met you, or verified the job.
          Never pressure someone to pay by wire transfer, gift card, or cryptocurrency.
        </li>
        <li>Do not post the same thing repeatedly or across every tag. One clear post is enough.</li>
        <li>Use your real name. Public profiles show only your first name and last initial, so there is no need to hide behind an alias.</li>
      </ul>

      <h2>Respect privacy</h2>
      <ul>
        <li>Do not share anyone&apos;s phone number, address, immigration status, documents, or photos without their permission.</li>
        <li>Take personal arrangements to direct messages once you have connected.</li>
      </ul>

      <Callout>
        <p>
          The Emergency tag is for real emergencies where the community can help: someone is missing, stranded, in
          the hospital far from family, or has lost their home. Call 911 first for anything life-threatening.
          Emergency posts are reviewed by a moderator before they go live, and misusing the tag will get an account banned.
        </p>
      </Callout>

      <h2>No harassment or hate</h2>
      <ul>
        <li>No threats, bullying, slurs, or attacks based on caste, ethnicity, religion, gender, sexuality, disability, or where someone is from.</li>
        <li>No sexual content, and no content that sexualizes anyone.</li>
        <li>Politics is welcome as discussion, not as a reason to harass other members.</li>
      </ul>

      <h2>Marketplace</h2>
      <ul>
        <li>Describe items honestly, include real photos, and mark a listing sold when it sells.</li>
        <li>Nothing illegal, counterfeit, stolen, or restricted. No weapons, drugs, or prescription medication.</li>
        <li>Businesses are welcome to list services, but keep promotion to the Marketplace and use paid promotion rather than spamming the feed.</li>
      </ul>

      <h2>Reporting</h2>
      <p>
        If you see something that breaks these guidelines, use <strong>Report</strong> on the post, listing, profile, or
        message. Tell us briefly what is wrong. Reports are private; the person you report is not told who reported them.
        You can report each item once, and a moderator reviews every report.
      </p>

      <h2>What happens when guidelines are broken</h2>
      <ul>
        <li>A post that receives several reports is hidden automatically until a moderator reviews it.</li>
        <li>Moderators can remove content, dismiss a report, or ban an account. Banned accounts lose their posts and can no longer post.</li>
        <li>Scams, harassment, and misuse of the Emergency tag usually result in an immediate ban.</li>
        <li>
          If you think a decision was wrong, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the details
          and we will take a second look.
        </li>
      </ul>

      <p>
        For how reporting and verification work step by step, see the <Link href="/help">Help Center</Link>.
      </p>
    </LegalDocument>
  );
}
