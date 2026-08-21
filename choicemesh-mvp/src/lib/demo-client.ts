/**
 * Demo mode.
 *
 * `?demo=1` runs the real ChoiceMesh interface against an in-memory store that
 * mimics the parts of the Supabase client the app uses. Nothing is sent to
 * Supabase and nothing is persisted: a reload restores the seeded room.
 *
 * This exists for two reasons. It lets the product be reviewed before the
 * backend is connected, and it gives a portfolio visitor a link that works
 * without an account and without waking a paused database.
 *
 * The AI call is NOT faked here. Demo mode still posts to /api/parse-details,
 * so the DeepSeek round trip a visitor sees is the real one. Only the group
 * state around it is simulated.
 */

import type { DetailDraft } from "./details";

const DEMO_FLAG = "choicemesh:demo";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") {
    window.sessionStorage.setItem(DEMO_FLAG, "1");
    return true;
  }
  return window.sessionStorage.getItem(DEMO_FLAG) === "1";
}

type Row = Record<string, any>;

const DEMO_USER = { id: "demo-user", email: "you@demo.choicemesh" };
const DEMO_ROOM_ID = "demo-room-0000-0000-000000000001";
const DEMO_PROPOSAL_ID = "demo-prop-0000-0000-000000000001";
const DEMO_PENDING_ID = "demo-prop-0000-0000-000000000002";

function inDays(days: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

type Store = {
  rooms: Row[];
  room_members: Row[];
  proposals: Row[];
  proposal_supports: Row[];
  private_details: Row[];
  published_versions: Row[];
};

function seed(): Store {
  return {
    rooms: [{
      id: DEMO_ROOM_ID,
      title: "Weekend walk and lunch",
      starts_at: inDays(4, 11),
      minimum_confirmations: 3,
      invite_code: "demo",
      created_by: "demo-member-1",
      current_proposal_id: DEMO_PROPOSAL_ID,
      published_version: 0
    }],
    room_members: [
      { room_id: DEMO_ROOM_ID, user_id: DEMO_USER.id },
      { room_id: DEMO_ROOM_ID, user_id: "demo-member-1" },
      { room_id: DEMO_ROOM_ID, user_id: "demo-member-2" },
      { room_id: DEMO_ROOM_ID, user_id: "demo-member-3" }
    ],
    proposals: [
      {
        id: DEMO_PROPOSAL_ID, room_id: DEMO_ROOM_ID, title: "City walk and lunch near Central",
        starts_at: inDays(4, 11), estimated_cost: 45, note: null, status: "current",
        created_by: "demo-member-1", created_at: inDays(-2, 9)
      },
      {
        id: DEMO_PENDING_ID, room_id: DEMO_ROOM_ID, title: "Indoor lunch instead, rain forecast",
        starts_at: inDays(4, 12), estimated_cost: 38, note: "The forecast turned. An indoor option keeps the same day.",
        status: "pending", created_by: "demo-member-2", created_at: inDays(-1, 18)
      }
    ],
    proposal_supports: [],
    // Two members have already confirmed. One of them has a budget limit below
    // the estimated cost, so the shared view shows exactly one boundary risk
    // without revealing whose it is.
    private_details: [
      {
        room_id: DEMO_ROOM_ID, user_id: "demo-member-1", original_reply: null,
        parsed_detail: { attendance: "attending", travel_limit_minutes: 60, budget_limit: 80, confirmation_by: null, summary: "", unparsed_notes: null },
        attendance: "attending", confirmed_at: inDays(-1, 20)
      },
      {
        room_id: DEMO_ROOM_ID, user_id: "demo-member-2", original_reply: null,
        parsed_detail: { attendance: "attending", travel_limit_minutes: 30, budget_limit: 40, confirmation_by: null, summary: "", unparsed_notes: null },
        attendance: "attending", confirmed_at: inDays(-1, 21)
      },
      {
        room_id: DEMO_ROOM_ID, user_id: "demo-member-3", original_reply: null,
        parsed_detail: { attendance: "not_specified", travel_limit_minutes: null, budget_limit: null, confirmation_by: null, summary: "", unparsed_notes: null },
        attendance: "not_specified", confirmed_at: null
      }
    ],
    published_versions: []
  };
}

export function createDemoClient() {
  const db = seed();
  const listeners = new Set<() => void>();
  const notify = () => { listeners.forEach((fn) => fn()); };

  function table(name: keyof Store): Row[] {
    return db[name];
  }

  function roomSummary(roomId: string) {
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) return null;
    const current = db.proposals.find((p) => p.id === room.current_proposal_id);
    const cost = current?.estimated_cost ?? null;
    const details = db.private_details.filter((d) => d.room_id === roomId);
    const confirmed = details.filter((d) => d.confirmed_at);
    const response_count = confirmed.length;
    const confirmed_count = confirmed.filter((d) => d.attendance === "attending").length;
    const cannot_attend_count = confirmed.filter((d) => d.attendance === "cannot_attend").length;
    const uncertain_count = details.filter((d) => !d.confirmed_at || d.attendance === "uncertain" || d.attendance === "not_specified").length;
    const boundary_risk_count = cost === null ? 0 : confirmed.filter((d) => {
      const limit = d.parsed_detail?.budget_limit;
      return typeof limit === "number" && limit <= cost;
    }).length;
    const hasPending = db.proposals.some((p) => p.room_id === roomId && p.status === "pending");
    return {
      response_count,
      confirmed_count,
      cannot_attend_count,
      uncertain_count,
      boundary_risk_count,
      minimum_required: room.minimum_confirmations,
      can_publish: confirmed_count >= room.minimum_confirmations && !hasPending
    };
  }

  // A chainable, awaitable stand-in for the PostgREST query builder, covering
  // only the operations page.tsx actually performs.
  function from(name: keyof Store) {
    const build = (rows: () => Row[]) => {
      const api: any = {
        select: () => api,
        eq: (column: string, value: unknown) => build(() => rows().filter((row) => row[column] === value)),
        order: (column: string, options?: { ascending?: boolean }) => build(() => {
          const sorted = [...rows()].sort((a, b) => String(a[column] ?? "").localeCompare(String(b[column] ?? "")));
          return options?.ascending === false ? sorted.reverse() : sorted;
        }),
        limit: (count: number) => build(() => rows().slice(0, count)),
        single: async () => {
          const found = rows()[0];
          return found ? { data: { ...found }, error: null } : { data: null, error: { message: "No matching row" } };
        },
        maybeSingle: async () => ({ data: rows()[0] ? { ...rows()[0] } : null, error: null }),
        then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data: rows().map((row) => ({ ...row })), error: null }),
        insert: async (values: Row) => {
          table(name).push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...values });
          notify();
          return { data: null, error: null };
        },
        upsert: async (values: Row) => {
          const rowsRef = table(name);
          const index = rowsRef.findIndex((row) => row.room_id === values.room_id && row.user_id === values.user_id);
          if (index >= 0) rowsRef[index] = { ...rowsRef[index], ...values };
          else rowsRef.push({ ...values });
          notify();
          return { data: null, error: null };
        }
      };
      return api;
    };
    // Stands in for the row-level security policy on private_details: reads
    // only ever see the current member's own row.
    if (name === "private_details") return build(() => table(name).filter((row) => row.user_id === DEMO_USER.id));
    return build(() => table(name));
  }

  // Returned awaitable also exposes .single(), because the app calls
  // `rpc("room_summary", …).single()` the way PostgREST allows.
  function rpc(name: string, args: Row = {}) {
    const promise = runRpc(name, args);
    return {
      then: (resolve: any, reject: any) => promise.then(resolve, reject),
      catch: (reject: any) => promise.catch(reject),
      single: () => promise
    };
  }

  async function runRpc(name: string, args: Row = {}) {
    if (name === "room_summary") {
      const summary = roomSummary(args.p_room_id);
      return { data: summary, error: summary ? null : { message: "Room not found" } };
    }

    if (name === "join_room") {
      const room = db.rooms.find((r) => r.invite_code === String(args.p_invite_code).toLowerCase());
      if (!room) return { data: null, error: { message: "Invite not found" } };
      if (!db.room_members.some((m) => m.room_id === room.id && m.user_id === DEMO_USER.id)) {
        db.room_members.push({ room_id: room.id, user_id: DEMO_USER.id });
      }
      notify();
      return { data: room.id, error: null };
    }

    if (name === "create_room") {
      const roomId = crypto.randomUUID();
      const proposalId = crypto.randomUUID();
      db.rooms.push({
        id: roomId, title: args.p_title, starts_at: args.p_starts_at,
        minimum_confirmations: args.p_minimum_confirmations,
        invite_code: crypto.randomUUID().slice(0, 8), created_by: DEMO_USER.id,
        current_proposal_id: proposalId, published_version: 0
      });
      db.room_members.push({ room_id: roomId, user_id: DEMO_USER.id });
      db.proposals.push({
        id: proposalId, room_id: roomId, title: args.p_proposal_title, starts_at: args.p_starts_at,
        estimated_cost: args.p_estimated_cost ?? null, note: null, status: "current",
        created_by: DEMO_USER.id, created_at: new Date().toISOString()
      });
      notify();
      return { data: roomId, error: null };
    }

    if (name === "support_proposal") {
      const proposal = db.proposals.find((p) => p.id === args.p_proposal_id);
      if (!proposal || proposal.status !== "pending") return { data: null, error: { message: "Proposal is not pending" } };
      if (proposal.created_by === DEMO_USER.id) return { data: null, error: { message: "A proposer cannot support their own proposal" } };
      db.proposal_supports.push({ proposal_id: proposal.id, user_id: DEMO_USER.id });
      db.proposals.filter((p) => p.room_id === proposal.room_id && p.status === "current").forEach((p) => { p.status = "superseded"; });
      proposal.status = "current";
      const room = db.rooms.find((r) => r.id === proposal.room_id);
      if (room) room.current_proposal_id = proposal.id;
      // The real rule: a new current proposal clears every confirmation.
      db.private_details.filter((d) => d.room_id === proposal.room_id).forEach((d) => { d.confirmed_at = null; });
      notify();
      // Demo only: the simulated members reconfirm shortly afterwards so the
      // flow keeps moving without a second browser.
      window.setTimeout(() => {
        db.private_details
          .filter((d) => d.room_id === proposal.room_id && d.user_id !== DEMO_USER.id && d.attendance === "attending")
          .forEach((d) => { d.confirmed_at = new Date().toISOString(); });
        notify();
      }, 2600);
      return { data: null, error: null };
    }

    if (name === "publish_room") {
      const summary = roomSummary(args.p_room_id);
      if (!summary?.can_publish) return { data: null, error: { message: "The room is not ready to publish" } };
      const room = db.rooms.find((r) => r.id === args.p_room_id)!;
      const current = db.proposals.find((p) => p.id === room.current_proposal_id);
      room.published_version += 1;
      db.published_versions.push({
        id: crypto.randomUUID(), room_id: room.id, version: room.published_version,
        proposal_snapshot: { id: current?.id, title: current?.title, starts_at: current?.starts_at, estimated_cost: current?.estimated_cost },
        published_by: DEMO_USER.id, published_at: new Date().toISOString()
      });
      notify();
      return { data: room.published_version, error: null };
    }

    return { data: null, error: { message: `Unsupported demo call: ${name}` } };
  }

  return {
    __demo: true,
    auth: {
      getSession: async () => ({ data: { session: { user: DEMO_USER } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOtp: async () => ({ error: { message: "Demo mode does not send sign-in emails." } }),
      signOut: async () => ({ error: null })
    },
    from,
    rpc,
    channel: () => {
      const handlers: Array<() => void> = [];
      const api: any = {
        on: (_event: string, _filter: unknown, handler: () => void) => { handlers.push(handler); return api; },
        subscribe: () => {
          const fan = () => handlers.forEach((handler) => handler());
          listeners.add(fan);
          api.__fan = fan;
          return api;
        }
      };
      return api;
    },
    removeChannel: (channel: any) => { if (channel?.__fan) listeners.delete(channel.__fan); }
  };
}

/**
 * A last-resort local parse used only when the AI endpoint is unavailable in
 * demo mode, so a portfolio visitor never hits a dead end. It is deliberately
 * crude and is never used when the server can reach the model.
 */
export function offlineDraft(text: string): DetailDraft {
  const lower = text.toLowerCase();
  const travel = lower.match(/(\d{1,3})\s*(minutes|minute|mins|min|分钟)/);
  const budget = lower.match(/[$￥¥]\s*(\d{1,5})|(\d{1,5})\s*(dollars|块|元)/);
  const cannot = /(can't|cannot|can not|won't work|不能|来不了)/.test(lower);
  const maybe = /(probably|should be able|might|maybe|大概|应该|可能)/.test(lower);
  const can = /(i can|i'm free|i am free|works for me|可以|有空)/.test(lower);
  const attendance: DetailDraft["attendance"] = cannot ? "cannot_attend" : maybe ? "uncertain" : can ? "attending" : "not_specified";
  return {
    attendance,
    travel_limit_minutes: travel ? Number(travel[1]) : null,
    budget_limit: budget ? Number(budget[1] || budget[2]) : null,
    confirmation_by: null,
    summary: "Offline draft. The AI service was unavailable, so this is a rough local reading of your reply.",
    unparsed_notes: "Demo fallback: please check every field before confirming."
  };
}
