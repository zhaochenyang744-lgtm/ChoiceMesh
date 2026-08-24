export type ProposalState = {
  id: string;
  room_id: string;
  created_by: string;
  status: string;
};

export function supportPendingProposal<T extends ProposalState>(proposals: T[], proposalId: string, actorId: string) {
  const proposal = proposals.find((item) => item.id === proposalId);
  if (!proposal || proposal.status !== "pending") return { proposal: null, error: "Proposal is not pending" };
  if (proposal.created_by === actorId) return { proposal: null, error: "A proposer cannot support their own proposal" };
  proposals.filter((item) => item.room_id === proposal.room_id && item.status === "current")
    .forEach((item) => { item.status = "superseded"; });
  proposals.filter((item) => item.room_id === proposal.room_id && item.status === "pending" && item.id !== proposal.id)
    .forEach((item) => { item.status = "withdrawn"; });
  proposal.status = "current";
  return { proposal, error: null };
}

export function withdrawPendingProposal<T extends ProposalState>(proposals: T[], proposalId: string, actorId: string) {
  const proposal = proposals.find((item) => item.id === proposalId);
  if (!proposal || proposal.status !== "pending") return { proposal: null, error: "Proposal is not pending" };
  if (proposal.created_by !== actorId) return { proposal: null, error: "Only the proposer can withdraw this change" };
  proposal.status = "withdrawn";
  return { proposal, error: null };
}
