// src/app/dashboard/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import useListPublishedStories from '@/hooks/useListPublishedStories';
import ThemeToggle from '../../components/ThemeToggle';

type AnyStory = Record<string, any>;

type BucketStats = {
  count: number;
  avgRating: number | null;
  pctOfTotal: number;
  byGenre: Record<string, { count: number; pctOfTotal: number }>;
  byType: Record<string, { count: number; pctOfTotal: number }>;
  byPlan: Record<'Free' | 'Paid' | 'Unknown', { count: number; pctOfTotal: number }>;
};

function asArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.includes(',') ? val.split(',').map(s => s.trim()).filter(Boolean) : [val];
  }
  return [];
}

function getOwnerUid(s: AnyStory): string | null {
  return s?.ownerUid ?? s?.authorId ?? s?.creator?.id ?? null;
}

function getTypeLabel(s: AnyStory): 'Short' | 'Novela' | 'Campaign' | 'Unknown' {
  return s?.storyType ?? 'Unknown';
}

function getPlanLabel(s: AnyStory): 'Free' | 'Paid' | 'Unknown' {
  // If you later store plan/tier on story.creator, we’ll pick it up here.
  const c = s?.creator || {};
  const raw = c.tier ?? c.plan ?? c.membership ?? c.accountType ?? c.role ?? '';
  const isPaid = c.isPaid ?? s?.isPaidCreator ?? null;
  if (typeof isPaid === 'boolean') return isPaid ? 'Paid' : 'Free';
  const ss = String(raw || '').toLowerCase();
  if (!ss) return 'Unknown';
  if (ss.includes('free')) return 'Free';
  if (ss.includes('premium') || ss.includes('creator') || ss.includes('paid') || ss.includes('pro')) return 'Paid';
  return 'Unknown';
}

function getRatingNumber(s: AnyStory): number | null {
  if (typeof s?.ratingSum === 'number' && typeof s?.ratingCount === 'number' && s.ratingCount > 0) {
    return s.ratingSum / s.ratingCount;
  }
  if (typeof s?.averageRating === 'number') return s.averageRating;
  if (typeof s?.ratingsAvg === 'number') return s.ratingsAvg;
  if (typeof s?.ratingAvg === 'number') return s.ratingAvg;
  if (typeof s?.avgRating === 'number') return s.avgRating;
  return null;
}

function average(nums: number[]): number | null {
  const valid = nums.filter(n => typeof n === 'number' && !Number.isNaN(n));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function buildStats(all: AnyStory[], subset: AnyStory[]): { allStats: BucketStats; subsetStats: BucketStats } {
  const total = Math.max(all.length, 1);

  const compute = (stories: AnyStory[]): BucketStats => {
    const count = stories.length;
    const ratings = stories.map(getRatingNumber).filter((n): n is number => n !== null);
    const avgRating = average(ratings);

    const genreCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const planCounts: Record<'Free' | 'Paid' | 'Unknown', number> = { Free: 0, Paid: 0, Unknown: 0 };

    stories.forEach(s => {
      const genres = asArray(s?.genres);
      if (genres.length === 0) {
        genreCounts['(Uncategorized)'] = (genreCounts['(Uncategorized)'] ?? 0) + 1;
      } else {
        genres.forEach(g => {
          const key = g || '(Uncategorized)';
          genreCounts[key] = (genreCounts[key] ?? 0) + 1;
        });
      }
      const t = getTypeLabel(s);
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;

      const p = getPlanLabel(s);
      planCounts[p] = (planCounts[p] ?? 0) + 1;
    });

    const byGenre = Object.fromEntries(
      Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, { count: v, pctOfTotal: (v / total) * 100 }])
    );
    const byType = Object.fromEntries(
      Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, { count: v, pctOfTotal: (v / total) * 100 }])
    );
    const byPlan = {
      Free: { count: planCounts.Free, pctOfTotal: (planCounts.Free / total) * 100 },
      Paid: { count: planCounts.Paid, pctOfTotal: (planCounts.Paid / total) * 100 },
      Unknown: { count: planCounts.Unknown, pctOfTotal: (planCounts.Unknown / total) * 100 },
    };

    return { count, avgRating, pctOfTotal: (count / total) * 100, byGenre, byType, byPlan };
  };

  return { allStats: compute(all), subsetStats: compute(subset) };
}

function fmtPct(n: number) {
  return `${(n || 0).toFixed(1)}%`;
}
function fmtRating(n: number | null) {
  return n == null ? '—' : n.toFixed(2);
}

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full h-2 rounded bg-white/20 dark:bg-white/10 overflow-hidden">
      <div className="h-full bg-[#4A90E2] dark:bg-[#BFA071] transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const { data: stories, isLoading: storiesLoading, error } = useListPublishedStories();

  const allStories = React.useMemo<AnyStory[]>(() => stories || [], [stories]);

  const myStories = React.useMemo<AnyStory[]>(() => {
    if (!user?.uid) return [];
    return allStories.filter(s => getOwnerUid(s) === user.uid);
  }, [allStories, user]);

  const { allStats, subsetStats } = React.useMemo(
    () => buildStats(allStories, myStories),
    [allStories, myStories]
  );

  React.useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || storiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2533] text-[#E0C9A0]">
        <p className="text-xl font-semibold">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-700">
        <p className="text-xl font-semibold">Error loading stories: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans relative px-4 pt-20 pb-16">

      {/* Controls */}
      <div className="fixed top-6 right-4 z-50 flex items-center gap-2">
        <ThemeToggle />
        <Link href="/" className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition transform hover:scale-105">
          Back to Landing
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Stories Comparison Dashboard</h1>
        <p className="opacity-80">Total App vs My Stories — quantity, ratings, genres, types, and creator plans</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-10">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* All Stories */}
          <div className="rounded-xl border-2 border-[#4A5C6E] bg-[#EAF2FA] text-[#233446] dark:bg-[#233446] dark:text-[#E0C9A0] p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">All Stories (App)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/70 dark:bg-white/5">
                <div className="text-sm opacity-70">Count</div>
                <div className="text-3xl font-extrabold">{allStats.count}</div>
              </div>
              <div className="p-4 rounded-lg bg-white/70 dark:bg-white/5">
                <div className="text-sm opacity-70">Avg Rating</div>
                <div className="text-3xl font-extrabold">{fmtRating(allStats.avgRating)}</div>
              </div>
              <div className="col-span-2 p-4 rounded-lg bg-white/70 dark:bg-white/5">
                <div className="flex justify-between text-sm opacity-70 mb-1">
                  <span>% of Total (itself)</span>
                  <span>{fmtPct(allStats.pctOfTotal)}</span>
                </div>
                <Bar pct={allStats.pctOfTotal} />
              </div>
            </div>
          </div>

          {/* My Stories */}
          <div className="rounded-xl border-2 border-[#4A5C6E] bg-[#FFF3E3] text-[#3A2B26] dark:bg-[#2B3544] dark:text-[#E0C9A0] p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">My Stories</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/70 dark:bg-white/5">
                <div className="text-sm opacity-70">Count</div>
                <div className="text-3xl font-extrabold">{subsetStats.count}</div>
              </div>
              <div className="p-4 rounded-lg bg-white/70 dark:bg-white/5">
                <div className="text-sm opacity-70">Avg Rating</div>
                <div className="text-3xl font-extrabold">{fmtRating(subsetStats.avgRating)}</div>
              </div>
              <div className="col-span-2 p-4 rounded-lg bg-white/70 dark:bg-white/5">
                <div className="flex justify-between text-sm opacity-70 mb-1">
                  <span>% of Total (App)</span>
                  <span>{fmtPct(subsetStats.pctOfTotal)}</span>
                </div>
                <Bar pct={subsetStats.pctOfTotal} />
              </div>
            </div>
          </div>
        </div>

        {/* Breakdowns */}
        <section className="space-y-8">
          {/* By Genre */}
          <div>
            <h3 className="text-2xl font-bold mb-3">By Genre</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownTable title="All Stories" rows={objectToRows(allStats.byGenre)} />
              <BreakdownTable title="My Stories" rows={objectToRows(subsetStats.byGenre)} emptyHint="No genres found for your stories yet." />
            </div>
          </div>

          {/* By Type */}
          <div>
            <h3 className="text-2xl font-bold mb-3">By Type (Short / Novela / Campaign)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownTable title="All Stories" rows={objectToRows(allStats.byType)} />
              <BreakdownTable title="My Stories" rows={objectToRows(subsetStats.byType)} />
            </div>
          </div>

          {/* By Creator Plan */}
          <div>
            <h3 className="text-2xl font-bold mb-3">By Creator Plan (Free vs Paid)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownTable title="All Stories" rows={planRows(allStats.byPlan)} />
              <BreakdownTable title="My Stories" rows={planRows(subsetStats.byPlan)} />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/create" className="px-6 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Create New Story</Link>
          <Link href="/discover" className="px-6 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">Discover Stories</Link>
        </div>
      </div>
    </div>
  );
};

/* -------------------------- Subcomponents --------------------------- */
function BreakdownTable({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: { key: string; count: number; pct: number }[];
  emptyHint?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-[#4A5C6E] bg-white/60 dark:bg-[#233446] dark:text-[#E0C9A0] p-5 shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-bold">{title}</h4>
        <span className="text-sm opacity-70">{rows.length} item(s)</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm opacity-80">{emptyHint || 'No data found.'}</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="p-3 rounded-lg bg-white/70 dark:bg-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{r.key}</span>
                <span className="text-sm opacity-75">
                  {r.count} • {fmtPct(r.pct)}
                </span>
              </div>
              <Bar pct={r.pct} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function objectToRows(obj: Record<string, { count: number; pctOfTotal: number }>) {
  return Object.entries(obj).map(([key, v]) => ({ key, count: v.count, pct: v.pctOfTotal }));
}

function planRows(byPlan: Record<'Free' | 'Paid' | 'Unknown', { count: number; pctOfTotal: number }>) {
  const order: Array<'Free' | 'Paid' | 'Unknown'> = ['Free', 'Paid', 'Unknown'];
  return order.map((k) => ({ key: k, count: byPlan[k]?.count ?? 0, pct: byPlan[k]?.pctOfTotal ?? 0 }));
}

export default DashboardPage;
