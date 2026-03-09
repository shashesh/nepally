import React from 'react';
import { formatPublicName, type EventRsvp } from '@nusa/shared';
import Avatar from '../Avatar';
import styles from './AttendeeList.module.css';

interface Props {
  attendees: EventRsvp[];
  loading?: boolean;
  onClose: () => void;
}

export default function AttendeeList({ attendees, loading, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Attendees</span>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : attendees.length === 0 ? (
          <div className={styles.empty}>No attendees yet.</div>
        ) : (
          <div className={styles.list}>
            {attendees.map((rsvp) => (
              <div key={rsvp.id} className={styles.attendeeRow}>
                <Avatar
                  name={rsvp.user?.full_name ?? '?'}
                  photoUrl={rsvp.user?.profile_photo}
                  trustLevel={rsvp.user?.trust_level}
                  size="small"
                />
                <span className={styles.attendeeName}>
                  {rsvp.user ? formatPublicName(rsvp.user.full_name) : 'User'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
