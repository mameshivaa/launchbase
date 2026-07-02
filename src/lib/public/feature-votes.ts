type VoteCountRow = {
  feature_request_id: string;
  vote_count: number;
};

function buildVoteCounts(
  featureIds: string[],
  rows: VoteCountRow[] | null
): Record<string, number> {
  const voteCounts: Record<string, number> = {};

  for (const id of featureIds) {
    voteCounts[id] = 0;
  }

  for (const row of rows ?? []) {
    voteCounts[row.feature_request_id] = Number(row.vote_count ?? 0);
  }

  return voteCounts;
}

function buildUserVotedIds(
  votes: { feature_request_id: string }[] | null
): string[] {
  return (votes ?? []).map((vote) => vote.feature_request_id);
}

export { buildUserVotedIds, buildVoteCounts };
export type { VoteCountRow };
