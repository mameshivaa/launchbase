function buildVoteSummary(
  featureIds: string[],
  votes: { feature_request_id: string; user_id: string }[] | null,
  userId: string | null
) {
  const voteCounts: Record<string, number> = {};
  const userVotedIds: string[] = [];

  for (const id of featureIds) {
    voteCounts[id] = 0;
  }

  // MVP: aggregate from raw feature_votes rows (RLS allows public SELECT).
  // Production should replace this with a vote-count view or SECURITY DEFINER RPC
  // so voter user_ids are not exposed to clients.
  for (const vote of votes ?? []) {
    voteCounts[vote.feature_request_id] =
      (voteCounts[vote.feature_request_id] ?? 0) + 1;
    if (userId && vote.user_id === userId) {
      userVotedIds.push(vote.feature_request_id);
    }
  }

  return { voteCounts, userVotedIds };
}

export { buildVoteSummary };
