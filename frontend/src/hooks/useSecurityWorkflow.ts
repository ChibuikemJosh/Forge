import { useCallback, useMemo, useReducer, useRef } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { analyzeSecurity, applyProposal, fetchBackendHealth, getProposal, reviewProposal, rollbackProposal, tryDemoOrder } from "../services/api/client";
import type { ApiLogEntry, ExploitEntry, FixApplicationResponse, FixProposal, SecurityAnalysisResponse } from "../features/security/types";

export type Phase = "idle" | "exploited" | "analyzing" | "confirmed" | "reviewing" | "approved" | "applying" | "applied" | "reanalyzing" | "fixed_in_source" | "resolved" | "error";
export interface SecState {
  step: number; phase: Phase; busy: boolean; error: string | null; retryStep: number;
  analysis: SecurityAnalysisResponse | null; proposal: FixProposal | null; proposalId: string | null;
  exploits: ExploitEntry[]; logs: ApiLogEntry[]; application: FixApplicationResponse | null;
  attackStatus: number | null; attackBody: unknown; replaying: boolean; replayNonce: number;
  selectedSymbol: string | null; selectedNodeId: string | null; backendOk: boolean | null;
  hasReanalyzed: boolean; reviewer: string;
}
const initial: SecState = { step: 0, phase: "idle", busy: false, error: null, retryStep: 0, analysis: null, proposal: null, proposalId: null, exploits: [], logs: [], application: null, attackStatus: null, attackBody: null, replaying: false, replayNonce: 0, selectedSymbol: null, selectedNodeId: null, backendOk: null, hasReanalyzed: false, reviewer: "" };
type Action = { type: "patch"; patch: Partial<SecState> } | { type: "log"; entry: ApiLogEntry } | { type: "exploit"; entry: ExploitEntry };
function reducer(s: SecState, a: Action): SecState {
  if (a.type === "log") return { ...s, logs: [a.entry, ...s.logs].slice(0, 80) };
  if (a.type === "exploit") return { ...s, exploits: [a.entry, ...s.exploits].slice(0, 20) };
  return { ...s, ...a.patch };
}
let seq = 1;
const RESTART_MSG = "Backend restarted and lost review state. Restore `backend/app/security_demo.py` with `git checkout` and re-analyze.";
function is404(e: unknown) { return e instanceof Error && /404/.test(e.message); }

export function useSecurityWorkflow() {
  const [state, dispatch] = useReducer(reducer, initial);
  const abortRef = useRef<AbortController | null>(null);
  const patch = useCallback((p: Partial<SecState>) => dispatch({ type: "patch", patch: p }), []);
  const log = useCallback((method: string, path: string, status: number | string, durationMs: number) => {
    dispatch({ type: "log", entry: { id: seq++, at: new Date().toLocaleTimeString(), method, path, status, durationMs } });
  }, []);
  const signal = useCallback(() => { abortRef.current?.abort(); const c = new AbortController(); abortRef.current = c; return c.signal; }, []);

  const checkHealth = useCallback(async () => {
    const t = performance.now();
    try { await fetchBackendHealth(signal()); patch({ backendOk: true }); log("GET", "/api/health", 200, Math.round(performance.now() - t)); }
    catch { patch({ backendOk: false }); log("GET", "/api/health", "ERR", Math.round(performance.now() - t)); }
  }, [log, patch, signal]);

  const runExploit = useCallback(async (kind: "try" | "replay") => {
    patch({ busy: true, error: null, replaying: kind === "replay", replayNonce: kind === "replay" ? Date.now() : state.replayNonce });
    const t = performance.now();
    try {
      const r = await tryDemoOrder("vulnerable", "order-bob", "customer-alice", signal());
      log("GET", "/api/demo/vulnerable/orders/order-bob", r.status, r.durationMs);
      dispatch({ type: "exploit", entry: { id: seq++, at: new Date().toLocaleTimeString(), kind, status: r.status, body: r.body, durationMs: r.durationMs } });
      patch({ busy: false, replaying: kind === "replay", attackStatus: r.status, attackBody: r.body, phase: kind === "try" ? "exploited" : state.phase, step: kind === "try" ? Math.max(state.step, 0) : state.step });
      // keep replaying true briefly for animation; cleared by canvas callback / timeout
      if (kind === "replay") {
        setTimeout(() => patch({ replaying: false }), 2600);
        if (r.status === 403) {
          const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (!reduced) try { confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 }, colors: ["#c2410c", "#4ade80", "#ff7a29"] }); } catch { /* unavailable */ }
          toast.success("Attack blocked — 403");
        } else if (r.status === 200) toast.error("Attack still succeeds — 200 leak");
      } else {
        toast[r.status === 200 ? "error" : "success"](`Exploit returned ${r.status}`);
        if (state.step === 0) patch({ step: 0 });
      }
      void t;
      return r;
    } catch (e) {
      log("GET", "/api/demo/vulnerable/orders/order-bob", "ERR", Math.round(performance.now() - t));
      const msg = e instanceof Error ? e.message : "Request failed";
      patch({ busy: false, replaying: false, error: msg, phase: "error", retryStep: state.step, backendOk: false });
      toast.error(msg);
      return null;
    }
  }, [log, patch, signal, state.phase, state.replayNonce, state.step]);

  const doAnalyze = useCallback(async (isReanalyze: boolean) => {
    patch({ busy: true, error: null, phase: isReanalyze ? "reanalyzing" : "analyzing" });
    const t = performance.now();
    try {
      const res = await analyzeSecurity({ signal: signal() });
      log("POST", "/api/security/analyze", 200, Math.round(performance.now() - t));
      if (res.status === "failed") { patch({ busy: false, analysis: res, phase: "error", error: res.error ?? "Analysis failed", retryStep: isReanalyze ? 5 : 1 }); toast.error(res.error ?? "Analysis failed"); return; }
      let proposal = res.fix_proposal;
      let step = isReanalyze ? 5 : 1;
      let phase: Phase = res.outcome === "satisfied" ? "resolved" : res.outcome === "confirmed" ? "confirmed" : isReanalyze ? "fixed_in_source" : "confirmed";
      if (res.fix_proposal) {
        patch({ proposalId: res.fix_proposal.proposal_id });
        try {
          const t2 = performance.now();
          proposal = await getProposal(res.fix_proposal.proposal_id, signal());
          log("GET", `/api/security/proposals/${res.fix_proposal.proposal_id}`, 200, Math.round(performance.now() - t2));
          if (!isReanalyze) {
            if (proposal.application_status === "applied") { step = 5; phase = "applied"; }
            else if (proposal.review_status === "approved") { step = 4; phase = "approved"; }
            else if (proposal.review_status === "rejected") { step = 3; phase = "reviewing"; }
            else step = 1;
          }
        } catch { /* keep analysis proposal */ }
      }
      patch({ busy: false, analysis: res, proposal: proposal ?? state.proposal, proposalId: res.fix_proposal?.proposal_id ?? state.proposalId, step, phase, hasReanalyzed: isReanalyze ? true : state.hasReanalyzed, application: isReanalyze ? state.application : state.application });
      toast.success(`Analysis: ${res.outcome}`);
    } catch (e) {
      log("POST", "/api/security/analyze", "ERR", Math.round(performance.now() - t));
      const msg = e instanceof Error ? e.message : "Analysis failed";
      patch({ busy: false, error: msg, phase: "error", retryStep: isReanalyze ? 5 : 1, backendOk: false });
      toast.error(msg);
    }
  }, [log, patch, signal, state.application, state.hasReanalyzed, state.proposal, state.proposalId]);

  const analyze = useCallback(() => doAnalyze(false), [doAnalyze]);
  const reanalyze = useCallback(() => doAnalyze(true), [doAnalyze]);

  const doReview = useCallback(async (decision: "approved" | "rejected", reviewer: string, reason?: string) => {
    const id = state.proposalId ?? state.proposal?.proposal_id;
    if (!id) return;
    patch({ busy: true, error: null });
    const t = performance.now();
    try {
      await reviewProposal(id, { decision, reviewer, actor: "human", reason }, signal());
      log("POST", `/api/security/proposals/${id}/review`, 200, Math.round(performance.now() - t));
      const t2 = performance.now();
      const p = await getProposal(id, signal()).catch(() => null);
      log("GET", `/api/security/proposals/${id}`, p ? 200 : "ERR", Math.round(performance.now() - t2));
      patch({ busy: false, proposal: p ?? (state.proposal ? { ...state.proposal, review_status: decision } : null), phase: decision === "approved" ? "approved" : "reviewing", step: decision === "approved" ? 4 : 3 });
      toast.success(decision === "approved" ? "Approved as human reviewer" : "Rejected");
    } catch (e) {
      log("POST", `/api/security/proposals/${id}/review`, "ERR", Math.round(performance.now() - t));
      const msg = is404(e) ? RESTART_MSG : e instanceof Error ? e.message : "Review failed";
      patch({ busy: false, error: msg, phase: "error", retryStep: 3 }); toast.error(msg);
    }
  }, [log, patch, signal, state.proposal, state.proposalId]);

  const doApply = useCallback(async () => {
    const id = state.proposalId ?? state.proposal?.proposal_id;
    if (!id) return;
    patch({ busy: true, error: null, phase: "applying" });
    const t = performance.now();
    try {
      const r = await applyProposal(id, signal());
      log("POST", `/api/security/proposals/${id}/apply`, 200, Math.round(performance.now() - t));
      const p = await getProposal(id, signal()).catch(() => null);
      patch({ busy: false, application: r, proposal: p ?? state.proposal, phase: "applied", step: 5, hasReanalyzed: false });
      toast.success("Fix applied");
    } catch (e) {
      log("POST", `/api/security/proposals/${id}/apply`, "ERR", Math.round(performance.now() - t));
      const msg = is404(e) ? RESTART_MSG : e instanceof Error ? e.message : "Apply failed";
      patch({ busy: false, error: msg, phase: "error", retryStep: 4 }); toast.error(msg);
    }
  }, [log, patch, signal, state.proposal, state.proposalId]);

  const doRollback = useCallback(async () => {
    const id = state.proposalId ?? state.proposal?.proposal_id;
    if (!id) return;
    patch({ busy: true, error: null });
    const t = performance.now();
    try {
      const r = await rollbackProposal(id, signal());
      log("POST", `/api/security/proposals/${id}/rollback`, 200, Math.round(performance.now() - t));
      const p = await getProposal(id, signal()).catch(() => null);
      patch({ busy: false, application: r, proposal: p ?? (state.proposal ? { ...state.proposal, application_status: "not_applied", rollback_available: false } : null), phase: "approved", step: 4, hasReanalyzed: false, attackStatus: null, attackBody: null });
      toast.success("Rolled back to vulnerable state");
    } catch (e) {
      log("POST", `/api/security/proposals/${id}/rollback`, "ERR", Math.round(performance.now() - t));
      const msg = is404(e) ? RESTART_MSG : e instanceof Error ? e.message : "Rollback failed";
      patch({ busy: false, error: msg, phase: "error", retryStep: state.step }); toast.error(msg);
    }
  }, [log, patch, signal, state.proposal, state.proposalId, state.step]);

  const actions = useMemo(() => ({
    checkHealth, tryExploit: () => runExploit("try"), replay: () => runExploit("replay"), analyze, reanalyze,
    review: doReview, apply: doApply, rollback: doRollback,
    goStep: (n: number) => patch({ step: n }),
    setReviewer: (v: string) => patch({ reviewer: v }),
    selectSymbol: (s: string | null) => patch({ selectedSymbol: s }),
    selectNode: (id: string | null, symbol?: string | null) => patch({ selectedNodeId: id, selectedSymbol: symbol ?? state.selectedSymbol }),
    clearSelection: () => patch({ selectedNodeId: null, selectedSymbol: null }),
    retry: () => { patch({ error: null, phase: "idle" }); },
  }), [analyze, checkHealth, doApply, doReview, doRollback, patch, reanalyze, runExploit, state.selectedSymbol]);

  return { state, actions };
}
