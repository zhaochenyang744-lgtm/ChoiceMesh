"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { createDemoClient, isDemoMode, offlineDraft } from "@/lib/demo-client";
import type { DetailDraft } from "@/lib/details";

type Page = "create" | "now" | "details" | "publish" | "result";
type Attendance = DetailDraft["attendance"];
type Room = { id: string; title: string; starts_at: string | null; minimum_confirmations: number; invite_code: string; published_version: number };
type Proposal = { id: string; title: string; starts_at: string | null; estimated_cost: number | null; note: string | null; status: "current" | "pending" | "superseded" | "withdrawn"; created_by: string };
type Summary = { response_count: number; confirmed_count: number; cannot_attend_count: number; uncertain_count: number; boundary_risk_count: number; minimum_required: number; can_publish: boolean };
type PrivateDetail = { original_reply: string | null; parsed_detail: DetailDraft; attendance: Attendance; confirmed_at: string | null };
type PublishedVersion = { version: number; proposal_snapshot: { title?: string; starts_at?: string | null }; published_at: string };

const emptySummary: Summary = { response_count: 0, confirmed_count: 0, cannot_attend_count: 0, uncertain_count: 0, boundary_risk_count: 0, minimum_required: 3, can_publish: false };
const emptyDraft: DetailDraft = { attendance: "not_specified", travel_limit_minutes: null, budget_limit: null, confirmation_by: null, summary: "No attendance decision identified.", unparsed_notes: null };

function formatWhen(value: string | null) {
  if (!value) return "Time to be confirmed";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function localDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function ChoiceMeshApp() {
  // Database types will be generated from the live schema before production release.
  // Until then, the RPC signatures are validated by the migration and Supabase at runtime.
  const [demo, setDemo] = useState(false);
  const supabase = useMemo<any>(() => (isDemoMode() ? createDemoClient() : getSupabaseBrowserClient()), []);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [page, setPage] = useState<Page>("create");
  const [room, setRoom] = useState<Room | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [privateDetail, setPrivateDetail] = useState<PrivateDetail | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<PublishedVersion | null>(null);
  const [activity, setActivity] = useState("Weekend walk and lunch");
  const [date, setDate] = useState("2026-08-16");
  const [startTime, setStartTime] = useState("11:00");
  const [minimum, setMinimum] = useState(3);
  const [proposalTitle, setProposalTitle] = useState("City walk and lunch");
  const [reply, setReply] = useState("");
  const [draft, setDraft] = useState<DetailDraft | null>(null);
  const [listening, setListening] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeTitle, setChangeTitle] = useState("");
  const [changeDate, setChangeDate] = useState("");
  const [changeTime, setChangeTime] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const roomId = room?.id ?? null;
  const ownConfirmed = Boolean(privateDetail?.confirmed_at);
  const canPublish = Boolean(summary.can_publish && ownConfirmed && proposal);

  useEffect(() => {
    setDemo(isDemoMode());
    if (!supabase) { setAuthLoading(false); return; }
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    };
    void init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: { user: User } | null) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    const remembered = window.localStorage.getItem("choicemesh:last-room");
    if (invite) {
      void joinRoom(invite);
    } else if (isDemoMode()) {
      // Demo visitors land inside a room that is already in progress, because
      // an empty room shows none of the coordination the product is about.
      void joinRoom("demo");
    } else if (remembered) {
      void loadRoom(remembered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!roomId || !supabase) return;
    const channel = supabase.channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => void loadRoom(roomId))
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals", filter: `room_id=eq.${roomId}` }, () => void loadRoom(roomId))
      .on("postgres_changes", { event: "*", schema: "public", table: "private_details", filter: `room_id=eq.${roomId}` }, () => void loadRoom(roomId))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function loadRoom(id: string) {
    setError("");
    const roomResponse = await supabase
      .from("rooms")
      .select("id,title,starts_at,minimum_confirmations,invite_code,published_version,current_proposal_id")
      .eq("id", id)
      .single();
    const roomData = roomResponse.data as unknown as (Room & { current_proposal_id: string | null }) | null;
    const roomError = roomResponse.error;
    if (roomError || !roomData) {
      window.localStorage.removeItem("choicemesh:last-room");
      setRoom(null);
      setProposal(null);
      if (roomError) setError(`Could not load the room: ${roomError.message}`);
      return;
    }

    const currentProposalId = roomData.current_proposal_id as string | null;
    const [{ data: current }, { data: pending }, { data: detail }, { data: summaryData }, { data: published }] = await Promise.all([
      currentProposalId ? supabase.from("proposals").select("id,title,starts_at,estimated_cost,note,status,created_by").eq("id", currentProposalId).single() : Promise.resolve({ data: null }),
      supabase.from("proposals").select("id,title,starts_at,estimated_cost,note,status,created_by").eq("room_id", id).eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("private_details").select("original_reply,parsed_detail,attendance,confirmed_at").eq("room_id", id).maybeSingle(),
      supabase.rpc("room_summary", { p_room_id: id }).single(),
      supabase.from("published_versions").select("version,proposal_snapshot,published_at").eq("room_id", id).order("version", { ascending: false }).limit(1).maybeSingle()
    ]);

    setRoom(roomData as Room);
    setProposal(current as Proposal | null);
    setPendingProposals((pending ?? []) as Proposal[]);
    setSummary((summaryData ?? emptySummary) as Summary);
    setPrivateDetail(detail ? { ...detail, parsed_detail: (detail.parsed_detail || emptyDraft) as DetailDraft } : null);
    setPublishedVersion(published as PublishedVersion | null);
    window.localStorage.setItem("choicemesh:last-room", id);
    if (published && roomData.published_version > 0) setPage("result");
    else if (roomData.current_proposal_id) setPage((currentPage) => currentPage === "create" ? "now" : currentPage);
  }

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const { error: authError } = await supabase.auth.signInWithOtp({ email: authEmail, options: { emailRedirectTo: window.location.origin } });
    if (authError) setError(authError.message);
    else setAuthMessage("Check your email for a secure sign-in link.");
  }

  async function joinRoom(inviteCode: string) {
    const { data, error: joinError } = await supabase.rpc("join_room", { p_invite_code: inviteCode });
    if (joinError || !data) {
      setError(joinError?.message || "This invite could not be opened.");
      return;
    }
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("invite");
    window.history.replaceState({}, "", cleanUrl);
    setToast("You joined the room. Your private details stay private.");
    await loadRoom(data as string);
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activity.trim() || !proposalTitle.trim()) {
      setError("Add an activity and a starting proposal.");
      return;
    }
    setSaving(true);
    setError("");
    const { data, error: createError } = await supabase.rpc("create_room", {
      p_title: activity.trim(),
      p_starts_at: localDateTime(date, startTime),
      p_minimum_confirmations: minimum,
      p_proposal_title: proposalTitle.trim()
    });
    setSaving(false);
    if (createError || !data) {
      setError(createError?.message || "Could not create the room.");
      return;
    }
    setToast("Room created. Share its invite when you are ready.");
    await loadRoom(data as string);
    setPage("now");
  }

  async function analyseReply() {
    if (!reply.trim()) { setError("Say or type a short reply first."); return; }
    setAnalysing(true);
    setError("");
    try {
      const response = await fetch("/api/parse-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply }) });
      const data = (await response.json()) as { draft?: DetailDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "Could not make a draft.");
      setDraft(data.draft);
      setToast("Private draft ready for review.");
    } catch (analysisError) {
      // A demo visitor should never hit a dead end because the model is down.
      if (demo) {
        setDraft(offlineDraft(reply));
        setToast("The AI service is unavailable, so this draft was made locally. Check every field.");
      } else {
        setError(analysisError instanceof Error ? analysisError.message : "Could not make a draft.");
      }
    } finally { setAnalysing(false); }
  }

  function startVoiceInput() {
    type BrowserSpeech = new () => SpeechRecognition;
    const speechWindow = window as unknown as { SpeechRecognition?: BrowserSpeech; webkitSpeechRecognition?: BrowserSpeech };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setError("Voice input is not available in this browser. You can still type your reply."); return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-AU";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError("Voice input could not start. Check microphone permission and try again."); };
    recognition.onresult = (event: SpeechRecognitionEvent) => setReply(Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ").trim());
    recognition.start();
  }

  async function saveDetails() {
    if (!roomId || !draft) return;
    setSaving(true);
    const { error: detailError } = await supabase.from("private_details").upsert({
      room_id: roomId,
      user_id: user?.id,
      original_reply: reply,
      parsed_detail: draft,
      attendance: draft.attendance,
      confirmed_at: new Date().toISOString()
    });
    setSaving(false);
    if (detailError) { setError(detailError.message); return; }
    setToast("Your details are confirmed. The group sees only an anonymous status.");
    await loadRoom(roomId);
  }

  async function copyInvite() {
    if (!room) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${room.invite_code}`;
    try { await navigator.clipboard.writeText(inviteUrl); } catch { /* The link is still shown below. */ }
    window.prompt("Share this invite link", inviteUrl);
    setToast("Invite link copied.");
  }

  async function submitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomId || !user || !changeTitle.trim()) { setError("Add a clear proposal title."); return; }
    setSaving(true);
    const { error: proposalError } = await supabase.from("proposals").insert({
      room_id: roomId,
      title: changeTitle.trim(),
      starts_at: changeDate ? localDateTime(changeDate, changeTime || "12:00") : null,
      note: changeNote.trim() || null,
      status: "pending",
      created_by: user.id,
      base_proposal_id: proposal?.id ?? null
    });
    setSaving(false);
    if (proposalError) { setError(proposalError.message); return; }
    setChangeOpen(false); setChangeTitle(""); setChangeDate(""); setChangeTime(""); setChangeNote("");
    setToast("Change proposed. It stays separate until another member supports it.");
    await loadRoom(roomId);
  }

  async function supportProposal(id: string) {
    const { error: supportError } = await supabase.rpc("support_proposal", { p_proposal_id: id });
    if (supportError) { setError(supportError.message); return; }
    setToast("Proposal supported. Everyone now reviews their own details again.");
    if (roomId) await loadRoom(roomId);
  }

  async function publish() {
    if (!roomId || !canPublish) return;
    setSaving(true);
    const { data, error: publishError } = await supabase.rpc("publish_room", { p_room_id: roomId });
    setSaving(false);
    if (publishError) { setError(publishError.message); return; }
    setToast(`Version ${data} published. Everyone in the room can see the result.`);
    await loadRoom(roomId);
    setPage("result");
  }

  // Order matters: the loading state renders identically on the server and on
  // the first client paint, so demo mode cannot cause a hydration mismatch.
  if (authLoading) return <main className="loading">Loading ChoiceMesh…</main>;
  if (!supabase) return <SetupNotice />;
  if (!user) return <AuthScreen email={authEmail} message={authMessage} error={error} onEmail={setAuthEmail} onSubmit={requestMagicLink} />;

  const activePage = room ? page : "create";
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>C</span><div><b>ChoiceMesh</b><small>shared decisions</small></div></div>
      <p className="nav-kicker">WORKSPACE</p>
      <nav aria-label="Workspace navigation">
        <NavButton active={activePage === "create"} icon="+" onClick={() => { setRoom(null); setPage("create"); }}>New room</NavButton>
        <NavButton disabled={!room} active={activePage === "now"} icon="•" onClick={() => setPage("now")}>Now</NavButton>
        <NavButton disabled={!room} active={activePage === "details"} icon="□" onClick={() => setPage("details")}>My details</NavButton>
        <NavButton disabled={!room} active={activePage === "publish"} icon="↗" onClick={() => setPage("publish")}>Publish</NavButton>
      </nav>
      <div className="side-note"><i />Signed in as {user.email}<br />Private details stay private.</div>
    </aside>

    <section className="workspace">
      {demo && <DemoBanner />}
      {room && <Progress active={activePage} published={Boolean(room.published_version)} />}
      {activePage === "create" && <CreateRoomForm activity={activity} date={date} startTime={startTime} minimum={minimum} proposalTitle={proposalTitle} saving={saving} onActivity={setActivity} onDate={setDate} onTime={setStartTime} onMinimum={setMinimum} onProposal={setProposalTitle} onSubmit={createRoom} />}
      {room && activePage === "now" && <NowPage room={room} proposal={proposal} summary={summary} privateDetail={privateDetail} pendingProposals={pendingProposals} currentUserId={user.id} onInvite={copyInvite} onDetails={() => setPage("details")} onChange={() => setChangeOpen(true)} onSupport={supportProposal} />}
      {room && activePage === "details" && <DetailsPage detail={privateDetail} reply={reply} draft={draft} listening={listening} analysing={analysing} saving={saving} onReply={setReply} onAnalyse={analyseReply} onVoice={startVoiceInput} onDraft={setDraft} onSave={saveDetails} onEdit={() => { setPrivateDetail(null); setDraft(privateDetail?.parsed_detail ?? null); setReply(privateDetail?.original_reply ?? ""); }} />}
      {room && activePage === "publish" && <PublishPage room={room} proposal={proposal} summary={summary} ownConfirmed={ownConfirmed} pendingCount={pendingProposals.length} saving={saving} onPublish={publish} />}
      {room && activePage === "result" && <ResultPage room={room} proposal={proposal} version={publishedVersion} onNow={() => setPage("now")} />}

      {changeOpen && <ChangeModal date={changeDate} time={changeTime} title={changeTitle} note={changeNote} saving={saving} onClose={() => setChangeOpen(false)} onDate={setChangeDate} onTime={setChangeTime} onTitle={setChangeTitle} onNote={setChangeNote} onSubmit={submitChange} />}
      {(toast || error) && <div className={error ? "toast error" : "toast"} role="status">{error || toast}</div>}
    </section>
  </main>;
}

function DemoBanner() {
  return <div className="demo-banner" role="note">
    <b>Demo</b>
    <span>You are signed in as a sample member of a room already in progress. The other members are simulated and nothing is saved. The private-draft analysis is the real AI call.</span>
  </div>;
}

function SetupNotice() {
  return <main className="auth-shell"><section className="auth-card"><div className="brand"><span>C</span><div><b>ChoiceMesh</b><small>shared decisions</small></div></div><p className="eyebrow">SETUP REQUIRED</p><h1>This deployment is not connected yet.</h1><p>ChoiceMesh needs a Supabase project before anyone can sign in. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in the environment, then reload.</p><p className="auth-message">No private data is stored or sent while the app is in this state.</p></section></main>;
}

function AuthScreen({ email, message, error, onEmail, onSubmit }: { email: string; message: string; error: string; onEmail: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <main className="auth-shell"><section className="auth-card"><div className="brand"><span>C</span><div><b>ChoiceMesh</b><small>shared decisions</small></div></div><p className="eyebrow">PRIVATE BY DEFAULT</p><h1>Join a decision room.</h1><p>Sign in with email. Your raw reply, travel limits, and budget stay visible only to you.</p><form onSubmit={onSubmit}><Field label="Email"><input type="email" required value={email} onChange={(event) => onEmail(event.target.value)} placeholder="you@example.com" /></Field><button className="button primary" type="submit">Send secure sign-in link</button></form>{message && <p className="auth-message">{message}</p>}{error && <p className="auth-error">{error}</p>}</section></main>;
}

function CreateRoomForm({ activity, date, startTime, minimum, proposalTitle, saving, onActivity, onDate, onTime, onMinimum, onProposal, onSubmit }: { activity: string; date: string; startTime: string; minimum: number; proposalTitle: string; saving: boolean; onActivity: (value: string) => void; onDate: (value: string) => void; onTime: (value: string) => void; onMinimum: (value: number) => void; onProposal: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="page page-wide"><div className="page-intro"><p className="eyebrow">NEW ROOM</p><h1>Start a shared decision.</h1><p>Set the plan the group will assess, then share a private invite link.</p></div><div className="create-layout"><form className="form-surface create-form" onSubmit={onSubmit}><div className="form-heading"><h2>Activity details</h2><p>The starting proposal opens the discussion. It is not a final decision.</p></div><Field label="What are you planning?"><input value={activity} onChange={(event) => onActivity(event.target.value)} /></Field><Field label="When is it?"><div className="time-row"><input aria-label="Date" type="date" value={date} onChange={(event) => onDate(event.target.value)} /><input aria-label="Start time" type="time" value={startTime} onChange={(event) => onTime(event.target.value)} /></div></Field><fieldset className="rules"><legend>Participation rule</legend><label className="rule"><input type="radio" checked={minimum === 3} onChange={() => onMinimum(3)} /><span><b>Go ahead with 3 confirmations</b><small>Members may be absent, but the group must explicitly accept that before publishing.</small></span></label><label className="rule"><input type="radio" checked={minimum === 4} onChange={() => onMinimum(4)} /><span><b>Everyone invited must confirm</b><small>Use this when every person is essential to the activity.</small></span></label></fieldset><Field label="Starting proposal"><input value={proposalTitle} onChange={(event) => onProposal(event.target.value)} /><span className="field-help">A member can propose a change later. It becomes current only after another member supports it.</span></Field><button className="button primary" type="submit" disabled={saving}>{saving ? "Creating…" : "Create room"}</button></form><aside className="surface create-aside"><p className="eyebrow">AFTER YOU CREATE</p><h2>Invite the group.</h2><ol><li>Share one room link.</li><li>Each person adds their own private details.</li><li>The group sees progress, not anyone’s raw reply.</li></ol><p className="aside-note">You can still update the shared proposal later through a group-supported change.</p></aside></div></section>;
}

function NowPage({ room, proposal, summary, privateDetail, pendingProposals, currentUserId, onInvite, onDetails, onChange, onSupport }: { room: Room; proposal: Proposal | null; summary: Summary; privateDetail: PrivateDetail | null; pendingProposals: Proposal[]; currentUserId: string; onInvite: () => void; onDetails: () => void; onChange: () => void; onSupport: (id: string) => void }) {
  const pendingFromOthers = pendingProposals.filter((item) => item.created_by !== currentUserId);
  return <section className="page"><div className="topline"><div><p className="eyebrow">CHOICEMESH · NOW</p><h1>What is still open?</h1></div><div className="top-actions"><button className="button ghost" onClick={onInvite}>Copy invite link</button><button className="button ghost" onClick={onDetails}>My details</button></div></div><div className="now-grid"><section className="surface plan-card"><div className="section-row"><div><h2>{proposal?.title || "Proposal loading"}</h2><p>{formatWhen(proposal?.starts_at || room.starts_at)} · {room.minimum_confirmations} confirmations needed</p></div><span className={summary.can_publish ? "status green" : "status amber"}>{summary.can_publish ? "Ready to publish" : `${Math.max(0, room.minimum_confirmations - summary.confirmed_count)} more ${room.minimum_confirmations - summary.confirmed_count === 1 ? "confirmation" : "confirmations"} needed`}</span></div><div className="flow"><span><b>Individual details</b><small>Private to each member</small></span><i /><span className="right"><b>Shared proposal</b><small>{proposal?.title || "Loading"}</small></span></div>{!privateDetail?.confirmed_at && <Task icon="□" title="Confirm your private details" copy="Your own words are analysed privately, then you review the draft before saving." action="My details" onClick={onDetails} />}{privateDetail?.confirmed_at && summary.response_count < room.minimum_confirmations && <Task icon="•" title="The group is still waiting for responses" copy="A reminder never submits or confirms details for another person." action="Copy invite" onClick={onInvite} />}{pendingProposals.length > 0 && <div className="pending-list"><b>Proposal changes waiting for support</b>{pendingProposals.map((item) => <div key={item.id} className="pending-item"><span>{item.title}</span>{item.created_by === currentUserId ? <small>Waiting for another member</small> : <button className="button ghost" onClick={() => onSupport(item.id)}>Support change</button>}</div>)}</div>}<div className="proposal-link"><button className="text-button" onClick={onChange}>Propose a change</button><span>A change does not replace the current proposal until another member supports it.</span></div></section><aside className="now-side"><section className="surface metric"><h2>Response progress</h2><strong>{summary.response_count}<sup>/{room.minimum_confirmations}</sup></strong><p>{summary.confirmed_count} members are confirmed attending</p></section><section className="surface awareness"><h2>For awareness</h2><p><span>!</span>{summary.boundary_risk_count ? `${summary.boundary_risk_count} confirmed boundary risk${summary.boundary_risk_count === 1 ? " remains" : "s remain"} visible. ${summary.boundary_risk_count === 1 ? "It does" : "They do"} not require a follow-up by default.` : "No confirmed boundary risks yet."}</p></section></aside></div></section>;
}

function DetailsPage({ detail, reply, draft, listening, analysing, saving, onReply, onAnalyse, onVoice, onDraft, onSave, onEdit }: { detail: PrivateDetail | null; reply: string; draft: DetailDraft | null; listening: boolean; analysing: boolean; saving: boolean; onReply: (value: string) => void; onAnalyse: () => void; onVoice: () => void; onDraft: (draft: DetailDraft | null) => void; onSave: () => void; onEdit: () => void }) {
  const confirmed = Boolean(detail?.confirmed_at);
  return <section className="page page-wide"><div className="page-intro compact"><p className="eyebrow">MY DETAILS · PRIVATE</p><h1>My details</h1><p>Your details are shared only as an anonymous status after you confirm them.</p></div>{confirmed ? <section className="surface confirmed-details"><div className="section-row"><div><h2>Your details are confirmed</h2><p>You can update them if your situation changes.</p></div><span className="status green">Confirmed</span></div><dl className="detail-grid"><div><dt>Attendance</dt><dd>{detail?.attendance.replace("_", " ")}</dd></div><div><dt>Travel limit</dt><dd>{detail?.parsed_detail.travel_limit_minutes ? `${detail.parsed_detail.travel_limit_minutes} minutes` : "Not specified"}</dd></div><div><dt>Budget limit</dt><dd>{detail?.parsed_detail.budget_limit ? `$${detail.parsed_detail.budget_limit}` : "Not specified"}</dd></div><div><dt>Shared view</dt><dd>Status only</dd></div></dl><button className="button ghost" onClick={onEdit}>Update my details</button></section> : <section className="form-surface details-entry"><div className="form-heading"><h2>What works for you?</h2><p>Speak or type naturally. ChoiceMesh makes a private draft for you to check.</p></div><label className="input-label" htmlFor="reply">Your reply</label><div className="reply-wrap"><textarea id="reply" value={reply} onChange={(event) => onReply(event.target.value)} placeholder="For example: I can probably make Sunday, but public transport over 45 minutes will not work. I can confirm by Friday." /><button type="button" className={listening ? "mic listening" : "mic"} onClick={onVoice} aria-label="Voice input" title="Voice input">●<span>{listening ? "Listening" : "Voice input"}</span></button></div><div className="entry-actions"><button className="button primary" onClick={onAnalyse} disabled={analysing}>{analysing ? "Analysing…" : "Analyse my reply"}</button><small>Your original reply and draft never appear in the shared room.</small></div>{draft && <PrivateReview draft={draft} onChange={onDraft} onConfirm={onSave} saving={saving} />}</section>}</section>;
}

function PublishPage({ room, proposal, summary, ownConfirmed, pendingCount, saving, onPublish }: { room: Room; proposal: Proposal | null; summary: Summary; ownConfirmed: boolean; pendingCount: number; saving: boolean; onPublish: () => void }) {
  const ready = summary.can_publish && ownConfirmed && Boolean(proposal);
  return <section className="page"><div className="page-intro compact"><p className="eyebrow">PUBLISH CHECK</p><h1>Ready to publish?</h1><p>Publishing makes the current proposal the shared result and notifies everyone.</p></div><div className="publish-grid"><section className="surface checklist"><h2>Before you publish</h2><ChecklistItem ok={ownConfirmed} text="Your private details are confirmed" /><ChecklistItem ok={summary.confirmed_count >= room.minimum_confirmations} text={`${room.minimum_confirmations} members are confirmed attending`} sub={`${summary.confirmed_count} confirmations are recorded.`} /><ChecklistItem ok={pendingCount === 0} text="No proposal change is waiting for support" /><ChecklistItem ok text="Private reasons remain private" sub="Publishing shares the agreed proposal, never anyone’s raw details." /></section><aside className="publish-panel"><p className="eyebrow">READY TO SHARE</p><h2>{ready ? "Make it official?" : "Waiting for the group"}</h2><p>{ready ? `Publish “${proposal?.title}” as the shared decision.` : "You can review this page now. Publishing unlocks once the group rule is met."}</p><button className="button publish-button" disabled={!ready || saving} onClick={onPublish}>{saving ? "Publishing…" : ready ? "Publish decision" : "Waiting for confirmations"}</button></aside></div></section>;
}

function ResultPage({ room, proposal, version, onNow }: { room: Room; proposal: Proposal | null; version: PublishedVersion | null; onNow: () => void }) {
  return <section className="page"><section className="result-hero"><p className="eyebrow">VERSION {version?.version ?? room.published_version} · PUBLISHED</p><h1>{proposal?.title || version?.proposal_snapshot.title || "The proposal"} is confirmed.</h1><p>{formatWhen(proposal?.starts_at || version?.proposal_snapshot.starts_at || room.starts_at)} · shared with room members</p><div><button className="button primary" onClick={onNow}>Back to room</button></div></section></section>;
}

function ChangeModal({ date, time, title, note, saving, onClose, onDate, onTime, onTitle, onNote, onSubmit }: { date: string; time: string; title: string; note: string; saving: boolean; onClose: () => void; onDate: (value: string) => void; onTime: (value: string) => void; onTitle: (value: string) => void; onNote: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="change-title"><button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">PROPOSAL CHANGE</p><h2 id="change-title">Propose a change</h2><p>A change stays separate until another member supports it. It then asks everyone to confirm their own details again.</p><Field label="Proposed activity"><input value={title} onChange={(event) => onTitle(event.target.value)} placeholder="e.g. Indoor lunch near Central" /></Field><Field label="New date, if changing"><input type="date" value={date} onChange={(event) => onDate(event.target.value)} /></Field><Field label="New time, if changing"><input type="time" value={time} onChange={(event) => onTime(event.target.value)} /></Field><Field label="What changes?"><textarea value={note} onChange={(event) => onNote(event.target.value)} placeholder="Optional note for the group" /></Field><button className="button primary" type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit change proposal"}</button></form></div>;
}

function PrivateReview({ draft, onChange, onConfirm, saving }: { draft: DetailDraft; onChange: (draft: DetailDraft) => void; onConfirm: () => void; saving: boolean }) {
  return <section className="private-review"><div className="section-row"><div><h3>Review your private draft</h3><p>Check it against what you meant. You can edit it before confirming.</p></div><span className="status blue">Private</span></div><div className="draft-fields"><Field label="Attendance"><select value={draft.attendance} onChange={(event) => onChange({ ...draft, attendance: event.target.value as Attendance })}><option value="not_specified">Not specified</option><option value="attending">Can attend</option><option value="uncertain">Still need to confirm</option><option value="cannot_attend">Cannot attend</option></select></Field><Field label="Travel limit (minutes)"><input type="number" min="0" value={draft.travel_limit_minutes ?? ""} onChange={(event) => onChange({ ...draft, travel_limit_minutes: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Budget limit"><input type="number" min="0" value={draft.budget_limit ?? ""} onChange={(event) => onChange({ ...draft, budget_limit: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Confirm by"><input value={draft.confirmation_by ?? ""} onChange={(event) => onChange({ ...draft, confirmation_by: event.target.value || null })} /></Field></div><Field label="Private summary"><textarea value={draft.summary} onChange={(event) => onChange({ ...draft, summary: event.target.value })} /></Field><div className="confirm-row"><small>The group sees only an anonymous status, never your reply, limit, amount, or reason.</small><button className="button primary" onClick={onConfirm} disabled={saving}>{saving ? "Saving…" : "Confirm my details"}</button></div></section>;
}

function Progress({ active, published }: { active: Page; published: boolean }) { const steps: Array<[Page, string]> = [["create", "Create"], ["now", "Now"], ["details", "Details"], ["publish", "Publish"], ["result", "Result"]]; const index = steps.findIndex(([id]) => id === active); return <ol className="progress" aria-label="Decision flow">{steps.map(([id, label], stepIndex) => <li key={id} className={id === active ? "active" : stepIndex < index || (id === "result" && published) ? "done" : ""}><i />{label}</li>)}</ol>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function NavButton({ active, disabled, icon, onClick, children }: { active?: boolean; disabled?: boolean; icon: string; onClick: () => void; children: React.ReactNode }) { return <button className={active ? "nav-button active" : "nav-button"} disabled={disabled} onClick={onClick}><span className="icon" aria-hidden="true">{icon}</span><span>{children}</span></button>; }
function Task({ icon, title, copy, action, onClick }: { icon: string; title: string; copy: string; action: string; onClick: () => void }) { return <div className="task"><span className="icon">{icon}</span><div><b>{title}</b><p>{copy}</p></div><button className="button ghost" onClick={onClick}>{action}</button></div>; }
function ChecklistItem({ ok, text, sub }: { ok: boolean; text: string; sub?: string }) { return <div className="check-item"><span className={ok ? "check ok" : "check"}>{ok ? "✓" : "…"}</span><div><b>{text}</b>{sub && <p>{sub}</p>}</div></div>; }

declare global { interface SpeechRecognition extends EventTarget { lang: string; interimResults: boolean; continuous: boolean; start(): void; onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null; onresult: ((event: SpeechRecognitionEvent) => void) | null; } interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; } }
