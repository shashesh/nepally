import { describe, it, expect } from 'vitest';
import { rankFollowSuggestions } from './followSuggestions';

interface TestViewer {
  id: string;
  metroAreaId: string;
  hometownDistrict: string | null;
  college: string | null;
}

interface TestCandidate {
  id: string;
  fullName: string;
  hometownDistrict: string | null;
  college: string | null;
  trustLevel: number;
  followerCount: number;
  createdAt: string;
  profilePhoto: string | null;
}

const viewer: TestViewer = {
  id: 'viewer',
  metroAreaId: 'm-dfw',
  hometownDistrict: 'Pokhara',
  college: 'Pulchowk',
};

describe('rankFollowSuggestions', () => {
  it('ranks a same-district candidate above a same-college candidate', () => {
    const district: TestCandidate = {
      id: 'a', fullName: 'Anish Shrestha', hometownDistrict: 'Pokhara', college: 'Other U',
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const college: TestCandidate = {
      id: 'b', fullName: 'Bina K.C.', hometownDistrict: 'Kathmandu', college: 'Pulchowk',
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [college, district]);
    expect(ranked[0].userId).toBe('a');
    expect(ranked[0].reason).toContain('Pokhara');
    expect(ranked[1].userId).toBe('b');
  });

  it('gives a Level 2 contributor a bonus over a baseline candidate', () => {
    const contributor: TestCandidate = {
      id: 'c', fullName: 'Contributor', hometownDistrict: 'Bhaktapur', college: 'Other',
      trustLevel: 2, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const baseline: TestCandidate = {
      id: 'd', fullName: 'Basic', hometownDistrict: 'Bhaktapur', college: 'Other',
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [baseline, contributor]);
    expect(ranked[0].userId).toBe('c');
    expect(ranked[0].reason).toContain('contributor');
  });

  it('tie-breaks by follower_count desc, then created_at asc', () => {
    const older: TestCandidate = {
      id: 'e', fullName: 'Older', hometownDistrict: 'Pokhara', college: 'Pulchowk',
      trustLevel: 1, followerCount: 5, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const newer: TestCandidate = {
      id: 'f', fullName: 'Newer', hometownDistrict: 'Pokhara', college: 'Pulchowk',
      trustLevel: 1, followerCount: 10, createdAt: '2026-03-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [older, newer]);
    expect(ranked[0].userId).toBe('f');
    expect(ranked[1].userId).toBe('e');
  });

  it('caps output at 3 suggestions', () => {
    const cs: TestCandidate[] = Array.from({ length: 6 }, (_, i) => ({
      id: `u-${i}`,
      fullName: `U${i}`,
      hometownDistrict: 'Bhaktapur',
      college: 'Other',
      trustLevel: 1,
      followerCount: i,
      createdAt: '2026-01-01T00:00:00Z',
      profilePhoto: null,
    }));
    const ranked = rankFollowSuggestions(viewer, cs);
    expect(ranked.length).toBe(3);
  });

  it('masks names via formatPublicName-compatible logic (first + last initial)', () => {
    const c: TestCandidate = {
      id: 'g', fullName: 'Anish Shrestha', hometownDistrict: 'Pokhara', college: null,
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [c]);
    expect(ranked[0].displayName).toBe('Anish S.');
  });

  it('returns an empty array when the candidate list is empty', () => {
    expect(rankFollowSuggestions(viewer, [])).toEqual([]);
  });
});
