"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { ChatPanel } from "@/components/ChatPanel";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

export default function DashboardPage() {
  const { ready, loading: guardLoading, session } = useAuthGuard();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState("");
  const [playbookData, setPlaybookData] = useState<{
    icp: string | null;
    proofPoints: Array<{ title?: string; text: string }>;
    playbook: any;
    playbookApproved: boolean;
  }>({ icp: null, proofPoints: [], playbook: null, playbookApproved: false });
  const [icpInput, setIcpInput] = useState("");
  const [proofPointsInput, setProofPointsInput] = useState<Array<{ title?: string; text: string }>>([]);
  const [numSteps, setNumSteps] = useState(3);
  const [editingSteps, setEditingSteps] = useState<Array<{ stepNumber: number; subject: string; body: string; delayDays: number }>>([]);
  const [generatingPlaybook, setGeneratingPlaybook] = useState(false);
  const [playbookError, setPlaybookError] = useState("");
  const [approving, setApproving] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [batches, setBatches] = useState<{ id: string; name: string | null; createdAt: string; leadCount: number }[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [leads, setLeads] = useState<{
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    jobTitle: string | null;
    emailVerified: boolean | null;
    persona: string | null;
    vertical: string | null;
    step1Subject: string | null;
    step1Body: string | null;
  }[]>([]);
  const [verifyingLeads, setVerifyingLeads] = useState(false);
  const [classifyingLeads, setClassifyingLeads] = useState(false);
  const [leadPipelineMessage, setLeadPipelineMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingLeads, setGeneratingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [sendingToInstantly, setSendingToInstantly] = useState(false);
  const [sendToInstantlyResult, setSendToInstantlyResult] = useState<{ campaignName?: string; leads_uploaded?: number; message?: string } | null>(null);
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [subjectLineA, setSubjectLineA] = useState("");
  const [subjectLineB, setSubjectLineB] = useState("");
  const [sentCampaigns, setSentCampaigns] = useState<{ id: string; name: string; instantlyCampaignId: string; createdAt: string; abGroupId?: string | null; variant?: string | null }[]>([]);
  const [selectedSentCampaignId, setSelectedSentCampaignId] = useState<string | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<{
    emails_sent_count?: number;
    open_count?: number;
    link_click_count?: number;
    open_rate_pct?: number;
    click_rate_pct?: number;
    reply_count?: number;
    suggestion?: string | null;
  } | null>(null);
  const [abPartnerAnalytics, setAbPartnerAnalytics] = useState<{
    emails_sent_count?: number;
    open_count?: number;
    link_click_count?: number;
    open_rate_pct?: number;
    click_rate_pct?: number;
    reply_count?: number;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [campaignReplies, setCampaignReplies] = useState<Array<{ id: string; fromEmail: string; subject: string | null; bodySnippet: string | null; classification: string | null; createdAt: string }>>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyLogFrom, setReplyLogFrom] = useState("");
  const [replyLogSubject, setReplyLogSubject] = useState("");
  const [replyLogBody, setReplyLogBody] = useState("");
  const [loggingReply, setLoggingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [performanceMemory, setPerformanceMemory] = useState<{
    byPersona: Record<string, Record<string, number>>;
    byVertical: Record<string, Record<string, number>>;
    suggestion?: string | null;
  } | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [apiImportUrl, setApiImportUrl] = useState("");
  const [apiImportKey, setApiImportKey] = useState("");
  const [importingSheet, setImportingSheet] = useState(false);
  const [importingApi, setImportingApi] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  // Domains & inboxes (Instantly)
  const [instantlyAccounts, setInstantlyAccounts] = useState<Array<{ email: string; first_name: string; last_name: string; warmup_status: number }>>([]);
  const [instantlyAccountsLoading, setInstantlyAccountsLoading] = useState(false);
  const [instantlyError, setInstantlyError] = useState("");
  const [warmupLoading, setWarmupLoading] = useState<string | null>(null);
  const [dfyCheckInput, setDfyCheckInput] = useState("");
  const [dfyCheckResult, setDfyCheckResult] = useState<{ domains: Array<{ domain: string; available: boolean }> } | null>(null);
  const [dfyCheckLoading, setDfyCheckLoading] = useState(false);
  const [preWarmedList, setPreWarmedList] = useState<string[]>([]);
  const [preWarmedLoading, setPreWarmedLoading] = useState(false);
  const [dfyOrderDomain, setDfyOrderDomain] = useState("");
  const [dfyOrderAccounts, setDfyOrderAccounts] = useState<Array<{ first_name: string; last_name: string; email_address_prefix: string }>>([{ first_name: "", last_name: "", email_address_prefix: "" }]);
  const [dfyOrderType, setDfyOrderType] = useState<"dfy" | "pre_warmed_up">("dfy");
  const [dfyOrderSimulation, setDfyOrderSimulation] = useState(true);
  const [dfyOrderLoading, setDfyOrderLoading] = useState(false);
  const [dfyOrderResult, setDfyOrderResult] = useState<Record<string, unknown> | null>(null);
  const [selectedPreWarmedDomain, setSelectedPreWarmedDomain] = useState("");
  const [instantlyAccountsShown, setInstantlyAccountsShown] = useState(10);
  const [instantlyAdvancedOpen, setInstantlyAdvancedOpen] = useState(false);
  const INSTANTLY_ACCOUNTS_PAGE_SIZE = 10;

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/onboarding")
        .then((res) => res.json())
        .then((data) => {
          setWorkspace(data.workspace);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id && workspace?.productSummary) {
      fetch("/api/playbook")
        .then((res) => res.json())
        .then((data) => {
          const pp = Array.isArray(data.proofPoints) ? data.proofPoints : [];
          setPlaybookData({
            icp: data.icp ?? null,
            proofPoints: pp,
            playbook: data.playbook,
            playbookApproved: data.playbookApproved ?? false,
          });
          if (data.icp) setIcpInput(data.icp);
          setProofPointsInput(pp.length ? pp.map((p: { title?: string; text: string }) => ({ ...p })) : []);
          if (data.playbook?.steps) setEditingSteps(data.playbook.steps.map((s: any) => ({ ...s })));
        })
        .catch(() => {});
    }
  }, [session?.user?.id, workspace?.productSummary]);

  useEffect(() => {
    if (session?.user?.id && playbookData.playbookApproved) {
      fetch("/api/leads")
        .then((res) => res.json())
        .then((data) => {
          setBatches(data.batches ?? []);
          if (data.batches?.length && !selectedBatchId) setSelectedBatchId(data.batches[0].id);
        })
        .catch(() => {});
    }
  }, [session?.user?.id, playbookData.playbookApproved]);

  useEffect(() => {
    if (!selectedBatchId) {
      setLeads([]);
      return;
    }
    fetch(`/api/leads?batchId=${selectedBatchId}`)
      .then((res) => res.json())
      .then((data) => setLeads(data.leads ?? []))
      .catch(() => setLeads([]));
  }, [selectedBatchId]);

  useEffect(() => {
    if (!session?.user?.id || !workspace?.domain) return;
    setInstantlyAccountsLoading(true);
    setInstantlyError("");
    fetch("/api/instantly/accounts")
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (data.accounts) setInstantlyAccounts(data.accounts);
        else setInstantlyAccounts([]);
        setInstantlyAccountsShown(INSTANTLY_ACCOUNTS_PAGE_SIZE);
        if (!res.ok) setInstantlyError(data.error ?? "Failed to load accounts");
      })
      .catch((err) => {
        setInstantlyAccounts([]);
        setInstantlyError(err instanceof Error ? err.message : "Failed to load accounts");
      })
      .finally(() => setInstantlyAccountsLoading(false));
  }, [session?.user?.id, workspace?.domain]);

  useEffect(() => {
    if (!session?.user?.id || !playbookData.playbookApproved) return;
    fetch("/api/instantly/sent-campaigns")
      .then((res) => res.json())
      .then((data) => {
        setSentCampaigns(data.campaigns ?? []);
        if (data.campaigns?.length && !selectedSentCampaignId) setSelectedSentCampaignId(data.campaigns[0].id);
      })
      .catch(() => setSentCampaigns([]));
  }, [session?.user?.id, playbookData.playbookApproved]);

  useEffect(() => {
    if (!selectedSentCampaignId) {
      setCampaignAnalytics(null);
      setAbPartnerAnalytics(null);
      setCampaignReplies([]);
      setReplyError(null);
      setAnalyticsLoading(false);
      setMemoryLoading(true);
      fetch("/api/performance-memory")
        .then((res) => res.json())
        .then((data) => setPerformanceMemory(data.byPersona ? data : null))
        .catch(() => setPerformanceMemory(null))
        .finally(() => setMemoryLoading(false));
      return;
    }
    setAnalyticsLoading(true);
    setCampaignAnalytics(null);
    setAbPartnerAnalytics(null);
    const selected = sentCampaigns.find((c) => c.id === selectedSentCampaignId);
    const partner = selected?.abGroupId
      ? sentCampaigns.find((c) => c.id !== selectedSentCampaignId && c.abGroupId === selected.abGroupId)
      : null;

    fetch(`/api/instantly/sent-campaigns/${selectedSentCampaignId}/analytics`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (res.ok && !data.error) setCampaignAnalytics(data);
        else setCampaignAnalytics(null);
      })
      .catch(() => setCampaignAnalytics(null))
      .finally(() => setAnalyticsLoading(false));

    if (partner) {
      fetch(`/api/instantly/sent-campaigns/${partner.id}/analytics`)
        .then((res) => res.json().then((data) => ({ res, data })))
        .then(({ res, data }) => {
          if (res.ok && !data.error) setAbPartnerAnalytics(data);
          else setAbPartnerAnalytics(null);
        })
        .catch(() => setAbPartnerAnalytics(null));
    }

    setRepliesLoading(true);
    fetch(`/api/instantly/sent-campaigns/${selectedSentCampaignId}/replies`)
      .then((res) => res.json())
      .then((data) => setCampaignReplies(data.replies ?? []))
      .catch(() => setCampaignReplies([]))
      .finally(() => setRepliesLoading(false));

    setMemoryLoading(true);
    fetch("/api/performance-memory")
      .then((res) => res.json())
      .then((data) => setPerformanceMemory(data.byPersona ? data : null))
      .catch(() => setPerformanceMemory(null))
      .finally(() => setMemoryLoading(false));
  }, [selectedSentCampaignId, sentCampaigns]);

  const hasOnboarding = Boolean(workspace?.domain);

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlError("");

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        setCrawlError(data.error || "Failed to crawl website");
        setCrawling(false);
        return;
      }

      // Update workspace with new product summary
      setWorkspace((prev: any) => ({
        ...prev,
        productSummary: data.productSummary,
      }));

      setCrawling(false);
    } catch (err) {
      setCrawlError("Something went wrong. Please try again.");
      setCrawling(false);
    }
  };

  const handleGeneratePlaybook = async () => {
    if (!icpInput.trim()) return;
    setGeneratingPlaybook(true);
    setPlaybookError("");
    try {
      const proofPointsToSend = proofPointsInput.filter((p) => p.text.trim());
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp: icpInput.trim(),
          numSteps,
          proofPoints: proofPointsToSend.length ? proofPointsToSend : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlaybookError(data.error || "Failed to generate playbook");
        setGeneratingPlaybook(false);
        return;
      }
      setPlaybookData({
        icp: icpInput.trim(),
        proofPoints: proofPointsInput,
        playbook: data.playbook,
        playbookApproved: false,
      });
      setEditingSteps(data.playbook?.steps ?? []);
      setGeneratingPlaybook(false);
    } catch {
      setPlaybookError("Something went wrong.");
      setGeneratingPlaybook(false);
    }
  };

  const handleSaveProofPoints = async () => {
    const valid = proofPointsInput.filter((p) => p.text.trim());
    setSavingEdits(true);
    setPlaybookError("");
    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofPoints: valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlaybookError(data.error || "Failed to save proof points");
        setSavingEdits(false);
        return;
      }
      setPlaybookData((prev) => ({ ...prev, proofPoints: valid, playbookApproved: false }));
      setProofPointsInput(valid.map((p) => ({ ...p })));
      setSavingEdits(false);
    } catch {
      setPlaybookError("Something went wrong.");
      setSavingEdits(false);
    }
  };

  const addProofPoint = () => setProofPointsInput((prev) => [...prev, { text: "" }]);
  const removeProofPoint = (index: number) => setProofPointsInput((prev) => prev.filter((_, i) => i !== index));
  const updateProofPoint = (index: number, field: "title" | "text", value: string) =>
    setProofPointsInput((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const handleSavePlaybookEdits = async () => {
    if (!editingSteps.length) return;
    setSavingEdits(true);
    setPlaybookError("");
    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook: { steps: editingSteps } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlaybookError(data.error || "Failed to save");
        setSavingEdits(false);
        return;
      }
      setPlaybookData((prev) => ({ ...prev, playbook: data.playbook, playbookApproved: false }));
      setSavingEdits(false);
    } catch {
      setPlaybookError("Something went wrong.");
      setSavingEdits(false);
    }
  };

  const updateStep = (index: number, field: "subject" | "body", value: string) => {
    setEditingSteps((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleApprovePlaybook = async () => {
    setApproving(true);
    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true }),
      });
      const data = await res.json();
      if (res.ok) setPlaybookData((prev) => ({ ...prev, playbookApproved: true }));
      setApproving(false);
    } catch {
      setApproving(false);
    }
  };

  const handleUploadCsv = async () => {
    const csv = csvInput.trim();
    if (!csv) return;
    setUploading(true);
    setLeadsError("");
    try {
      const res = await fetch("/api/leads/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error || "Upload failed");
        setUploading(false);
        return;
      }
      setCsvInput("");
      setLeadPipelineMessage(data.message ?? null);
      const list = await fetch("/api/leads").then((r) => r.json());
      setBatches(list.batches ?? []);
      if (data.batchId) setSelectedBatchId(data.batchId);
      setUploading(false);
    } catch {
      setLeadsError("Upload failed.");
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvInput(String(reader.result ?? ""));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportSheet = async () => {
    if (!sheetUrl.trim()) return;
    setImportingSheet(true);
    setLeadsError("");
    try {
      const res = await fetch("/api/leads/import/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error || "Sheet import failed");
        setImportingSheet(false);
        return;
      }
      setSheetUrl("");
      setLeadPipelineMessage(data.message ?? null);
      const list = await fetch("/api/leads").then((r) => r.json());
      setBatches(list.batches ?? []);
      if (data.batchId) setSelectedBatchId(data.batchId);
      setImportingSheet(false);
    } catch {
      setLeadsError("Sheet import failed.");
      setImportingSheet(false);
    }
  };

  const handleImportApi = async () => {
    if (!apiImportUrl.trim()) return;
    setImportingApi(true);
    setLeadsError("");
    try {
      const res = await fetch("/api/leads/import/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: apiImportUrl.trim(), apiKey: apiImportKey.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error || "API import failed");
        setImportingApi(false);
        return;
      }
      setApiImportUrl("");
      setApiImportKey("");
      setLeadPipelineMessage(data.message ?? null);
      const list = await fetch("/api/leads").then((r) => r.json());
      setBatches(list.batches ?? []);
      if (data.batchId) setSelectedBatchId(data.batchId);
      setImportingApi(false);
    } catch {
      setLeadsError("API import failed.");
      setImportingApi(false);
    }
  };

  const handleVerifyLeads = async () => {
    if (!selectedBatchId) return;
    setVerifyingLeads(true);
    setLeadsError("");
    setLeadPipelineMessage(null);
    try {
      const res = await fetch("/api/leads/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selectedBatchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error || "Verify failed");
        setVerifyingLeads(false);
        return;
      }
      setLeadPipelineMessage(data.message ?? `Verified: ${data.verified} valid, ${data.invalid} invalid.`);
      const list = await fetch(`/api/leads?batchId=${selectedBatchId}`).then((r) => r.json());
      setLeads(list.leads ?? []);
      setVerifyingLeads(false);
    } catch {
      setLeadsError("Verify failed.");
      setVerifyingLeads(false);
    }
  };

  const handleClassifyLeads = async () => {
    if (!selectedBatchId) return;
    setClassifyingLeads(true);
    setLeadsError("");
    setLeadPipelineMessage(null);
    try {
      const res = await fetch("/api/leads/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selectedBatchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error || "Classify failed");
        setClassifyingLeads(false);
        return;
      }
      setLeadPipelineMessage(data.message ?? `Classified ${data.classified} leads.`);
      const list = await fetch(`/api/leads?batchId=${selectedBatchId}`).then((r) => r.json());
      setLeads(list.leads ?? []);
      setClassifyingLeads(false);
    } catch {
      setLeadsError("Classify failed.");
      setClassifyingLeads(false);
    }
  };

  const handleLogReply = async () => {
    if (!selectedSentCampaignId || !replyLogFrom.trim()) return;
    setLoggingReply(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/instantly/sent-campaigns/${selectedSentCampaignId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: replyLogFrom.trim(),
          subject: replyLogSubject.trim() || undefined,
          body: replyLogBody.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log reply");
      setReplyLogFrom("");
      setReplyLogSubject("");
      setReplyLogBody("");
      const list = await fetch(`/api/instantly/sent-campaigns/${selectedSentCampaignId}/replies`).then((r) => r.json());
      setCampaignReplies(list.replies ?? []);
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "Failed to log reply");
    } finally {
      setLoggingReply(false);
    }
  };

  const handleGenerateLeads = async () => {
    if (!selectedBatchId) return;
    setGeneratingLeads(true);
    setLeadsError("");
    try {
      const res = await fetch("/api/leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selectedBatchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error || "Generate failed");
        setGeneratingLeads(false);
        return;
      }
      const batchData = await fetch(`/api/leads?batchId=${selectedBatchId}`).then((r) => r.json());
      setLeads(batchData.leads ?? []);
      setGeneratingLeads(false);
    } catch {
      setLeadsError("Generate failed.");
      setGeneratingLeads(false);
    }
  };

  const handleSendToInstantly = async () => {
    if (!selectedBatchId) return;
    if (abTestEnabled && (!subjectLineA.trim() || !subjectLineB.trim())) {
      setLeadsError("A/B test requires both Subject A and Subject B.");
      return;
    }
    setSendingToInstantly(true);
    setLeadsError("");
    setSendToInstantlyResult(null);
    try {
      const body: { batchId: string; abTest?: boolean; subjectLineA?: string; subjectLineB?: string } = { batchId: selectedBatchId };
      if (abTestEnabled) {
        body.abTest = true;
        body.subjectLineA = subjectLineA.trim();
        body.subjectLineB = subjectLineB.trim();
      }
      const res = await fetch("/api/instantly/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error ?? "Send failed");
        setSendingToInstantly(false);
        return;
      }
      setSendToInstantlyResult({
        campaignName: data.campaignName,
        leads_uploaded: data.leads_uploaded,
        message: data.message,
      });
      fetch("/api/instantly/sent-campaigns")
        .then((res) => res.json())
        .then((listData) => {
          const list = listData.campaigns ?? [];
          setSentCampaigns(list);
          if (list.length > 0 && data.campaignId) {
            const newCampaign = list.find((c: { instantlyCampaignId: string }) => c.instantlyCampaignId === data.campaignId);
            if (newCampaign) setSelectedSentCampaignId(newCampaign.id);
            else setSelectedSentCampaignId(list[0].id);
          }
        })
        .catch(() => {});
    } catch {
      setLeadsError("Send to Instantly failed.");
    } finally {
      setSendingToInstantly(false);
    }
  };

  if (guardLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const fetchInstantlyAccounts = () => {
    if (!session?.user?.id) return;
    setInstantlyAccountsLoading(true);
    setInstantlyError("");
    fetch("/api/instantly/accounts")
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (data.accounts) setInstantlyAccounts(data.accounts);
        else setInstantlyAccounts([]);
        setInstantlyAccountsShown(INSTANTLY_ACCOUNTS_PAGE_SIZE);
        if (!res.ok) setInstantlyError(data.error ?? "Failed to load accounts");
      })
      .catch((err) => {
        setInstantlyAccounts([]);
        setInstantlyError(err instanceof Error ? err.message : "Failed to load accounts");
      })
      .finally(() => setInstantlyAccountsLoading(false));
  };

  const handleWarmupEnable = async (email: string) => {
    setWarmupLoading(email);
    try {
      const res = await fetch("/api/instantly/warmup/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [email] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchInstantlyAccounts();
    } catch (e) {
      setInstantlyError(e instanceof Error ? e.message : "Failed to enable warmup");
    } finally {
      setWarmupLoading(null);
    }
  };

  const handleWarmupDisable = async (email: string) => {
    setWarmupLoading(email);
    try {
      const res = await fetch("/api/instantly/warmup/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [email] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchInstantlyAccounts();
    } catch (e) {
      setInstantlyError(e instanceof Error ? e.message : "Failed to disable warmup");
    } finally {
      setWarmupLoading(null);
    }
  };

  const handleDfyCheck = async () => {
    const domains = dfyCheckInput.split(/[\s,]+/).map((d) => d.trim()).filter(Boolean);
    if (!domains.length) return;
    setDfyCheckLoading(true);
    setDfyCheckResult(null);
    try {
      const res = await fetch("/api/instantly/dfy/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setDfyCheckResult(data);
    } catch (e) {
      setInstantlyError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setDfyCheckLoading(false);
    }
  };

  const handlePreWarmedList = async () => {
    setPreWarmedLoading(true);
    setPreWarmedList([]);
    try {
      const res = await fetch("/api/instantly/dfy/pre-warmed-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPreWarmedList(Array.isArray(data.domains) ? data.domains : []);
    } catch (e) {
      setInstantlyError(e instanceof Error ? e.message : "Failed to load list");
    } finally {
      setPreWarmedLoading(false);
    }
  };

  const handleDfyOrder = async () => {
    if (dfyOrderType === "dfy" && (!dfyOrderDomain.trim() || !dfyOrderAccounts.some((a) => a.email_address_prefix.trim()))) {
      setInstantlyError("Domain and at least one account (email prefix) required for DFY order.");
      return;
    }
    setDfyOrderLoading(true);
    setDfyOrderResult(null);
    setInstantlyError("");
    try {
      const items =
        dfyOrderType === "pre_warmed_up"
          ? (selectedPreWarmedDomain ? [{ domain: selectedPreWarmedDomain }] : [])
          : [
              {
                domain: dfyOrderDomain.trim(),
                accounts: dfyOrderAccounts
                  .filter((a) => a.email_address_prefix.trim())
                  .map((a) => ({
                    first_name: a.first_name.trim() || "User",
                    last_name: a.last_name.trim() || "Account",
                    email_address_prefix: a.email_address_prefix.trim(),
                  })),
              },
            ];
      const firstItem = items[0] as { domain: string; accounts?: { first_name: string; last_name: string; email_address_prefix: string }[] };
      if (!items.length || (dfyOrderType === "dfy" && !firstItem.accounts?.length)) {
        setInstantlyError(dfyOrderType === "pre_warmed_up" ? "Load and select a pre-warmed domain." : "Add at least one domain and for DFY at least one account.");
        setDfyOrderLoading(false);
        return;
      }
      const res = await fetch("/api/instantly/dfy/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          order_type: dfyOrderType,
          simulation: dfyOrderSimulation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      setDfyOrderResult(data);
      if (data.order_placed) fetchInstantlyAccounts();
    } catch (e) {
      setInstantlyError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setDfyOrderLoading(false);
    }
  };

  const handleChatEdits = (edits: { icp?: string | null; steps?: Array<{ stepNumber: number; subject: string; body: string; delayDays: number }> | null }) => {
    if (edits.icp != null) setIcpInput(edits.icp ?? "");
    if (edits.steps != null && edits.steps.length) {
      setEditingSteps(edits.steps);
      setPlaybookData((prev) => ({ ...prev, playbook: { steps: edits.steps! }, playbookApproved: false }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex min-h-0">
        <div className="flex flex-col flex-1 min-w-0">
          <header className="border-b border-zinc-800/80 bg-zinc-950/95 flex-shrink-0">
            <div className="max-w-6xl px-6 py-4 flex items-center justify-between">
              <Link href="/dashboard" className="text-lg font-semibold text-zinc-100 tracking-tight">
                {APP_DISPLAY_NAME}
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/dashboard" className="font-medium text-zinc-200">
                  Dashboard
                </Link>
                <Link href="/onboarding" className="text-zinc-500 hover:text-zinc-200">
                  Settings
                </Link>
                <span className="text-zinc-500">{session.user?.email}</span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-zinc-500 hover:text-zinc-200"
                >
                  Log out
                </button>
              </nav>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto min-w-0">
            <div className="max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome, {session.user?.name || session.user?.email}
        </p>

        {hasOnboarding && playbookData.playbookApproved && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <p className="card-label">Campaigns sent</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">{sentCampaigns.length}</p>
            </div>
            <div className="card p-5">
              <p className="card-label">Total leads</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
                {batches.reduce((s, b) => s + b.leadCount, 0)}
              </p>
            </div>
            <div className="card p-5">
              <p className="card-label">Open rate</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
                {campaignAnalytics?.open_rate_pct != null ? `${campaignAnalytics.open_rate_pct}%` : "—"}
              </p>
            </div>
            <div className="card-accent p-5">
              <p className="card-label text-zinc-400">Status</p>
              <p className="mt-2 text-lg font-medium text-zinc-100">
                {sentCampaigns.length > 0 ? "Campaigns active" : "Ready to send"}
              </p>
            </div>
          </div>
        )}

        {!hasOnboarding ? (
          <div className="card mt-8 p-6">
            <h2 className="text-lg font-medium text-zinc-200">Get Started</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Complete setup to start using Outbound Growth Engine. Add your domain and API keys in Settings.
            </p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
            >
              Go to Settings -&gt;
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="card p-6">
              <h2 className="text-lg font-medium text-zinc-200">Workspace</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className="text-zinc-400">Domain:</span>{" "}
                  <span className="text-zinc-200">{workspace.domain}</span>
                </div>
                {workspace.productSummary ? (
                  <div className="mt-4">
                    <span className="text-zinc-400">Product Summary:</span>
                    <p className="mt-2 text-zinc-200">{workspace.productSummary}</p>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-zinc-500 text-sm">No product summary yet.</p>
                    {crawlError && (
                      <div className="mt-2 rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">
                        {crawlError}
                      </div>
                    )}
                    <button
                      onClick={handleCrawl}
                      disabled={crawling}
                      className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {crawling ? "Crawling website..." : "Crawl website & generate summary"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {workspace.productSummary && (
              <div className="card p-6">
                <h2 className="text-lg font-medium text-zinc-200">ICP & Playbook</h2>
                {!playbookData.playbook ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-zinc-400">Describe your Ideal Customer Profile (e.g. company size, industry, role, pain points).</p>
                    <textarea
                      value={icpInput}
                      onChange={(e) => setIcpInput(e.target.value)}
                      placeholder="e.g. VP Sales at B2B SaaS companies, 50-500 employees, struggling with pipeline visibility..."
                      rows={4}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-400">Emails in sequence:</span>
                      <select
                        value={numSteps}
                        onChange={(e) => setNumSteps(Number(e.target.value))}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-zinc-400">Proof points (optional) - case studies, metrics, testimonials used in the playbook and personalized emails.</p>
                      {proofPointsInput.map((p, idx) => (
                        <div key={idx} className="flex flex-wrap gap-2 items-center rounded border border-zinc-700 bg-zinc-900/50 p-2">
                          <input
                            placeholder="Label (e.g. NPS)"
                            value={p.title ?? ""}
                            onChange={(e) => updateProofPoint(idx, "title", e.target.value)}
                            className="w-28 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-500"
                          />
                          <input
                            placeholder="e.g. 9.2 or Used by 500+ teams"
                            value={p.text}
                            onChange={(e) => updateProofPoint(idx, "text", e.target.value)}
                            className="flex-1 min-w-[180px] rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-500"
                          />
                          <button type="button" onClick={() => removeProofPoint(idx)} className="text-zinc-500 hover:text-red-400 text-sm">Remove</button>
                        </div>
                      ))}
                      <button type="button" onClick={addProofPoint} className="text-sm text-emerald-400 hover:text-emerald-300">+ Add proof point</button>
                    </div>
                    {playbookError && (
                      <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">{playbookError}</div>
                    )}
                    <button
                      onClick={handleGeneratePlaybook}
                      disabled={generatingPlaybook}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {generatingPlaybook ? "Generating playbook..." : "Generate playbook"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {playbookData.playbookApproved ? (
                      <div className="rounded-md bg-emerald-900/20 border border-emerald-800 px-4 py-3 text-sm text-emerald-300">
                        Playbook approved. Next: upload leads and personalize emails.
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-zinc-400">
                          <span className="text-zinc-500">ICP:</span> {playbookData.icp}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-zinc-500">Proof points (used in playbook and personalized emails)</p>
                          {proofPointsInput.map((p, idx) => (
                            <div key={idx} className="flex flex-wrap gap-2 items-center rounded border border-zinc-700 bg-zinc-900/50 p-2">
                              <input
                                placeholder="Label"
                                value={p.title ?? ""}
                                onChange={(e) => updateProofPoint(idx, "title", e.target.value)}
                                className="w-28 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200"
                              />
                              <input
                                placeholder="e.g. NPS 9.2, Used by 500+ teams"
                                value={p.text}
                                onChange={(e) => updateProofPoint(idx, "text", e.target.value)}
                                className="flex-1 min-w-[180px] rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200"
                              />
                              <button type="button" onClick={() => removeProofPoint(idx)} className="text-zinc-500 hover:text-red-400 text-sm">Remove</button>
                            </div>
                          ))}
                          <button type="button" onClick={addProofPoint} className="text-sm text-emerald-400 hover:text-emerald-300">+ Add proof point</button>
                          <button
                            type="button"
                            onClick={handleSaveProofPoints}
                            disabled={savingEdits}
                            className="ml-2 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                          >
                            {savingEdits ? "Saving..." : "Save proof points"}
                          </button>
                        </div>
                        <div className="space-y-4">
                          {editingSteps.map((step, index) => (
                            <div key={step.stepNumber} className="rounded-md border border-zinc-700 bg-zinc-900/50 p-4">
                              <div className="text-xs text-zinc-500 mb-2">Step {step.stepNumber} {step.delayDays > 0 && `(after ${step.delayDays} days)`}</div>
                              <label className="block text-xs text-zinc-500 mt-2">Subject</label>
                              <input
                                value={step.subject}
                                onChange={(e) => updateStep(index, "subject", e.target.value)}
                                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <label className="block text-xs text-zinc-500 mt-2">Body</label>
                              <textarea
                                value={step.body}
                                onChange={(e) => updateStep(index, "body", e.target.value)}
                                rows={6}
                                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          ))}
                        </div>
                        {playbookError && (
                          <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">{playbookError}</div>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={handleSavePlaybookEdits}
                            disabled={savingEdits}
                            className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                          >
                            {savingEdits ? "Saving..." : "Save edits"}
                          </button>
                          <button
                            onClick={handleApprovePlaybook}
                            disabled={approving}
                            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {approving ? "Saving..." : "Approve playbook"}
                          </button>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-sm text-zinc-500">Regenerate with</span>
                            <select
                              value={numSteps}
                              onChange={(e) => setNumSteps(Number(e.target.value))}
                              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-300"
                            >
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={5}>5</option>
                            </select>
                            <span className="text-sm text-zinc-500">emails</span>
                            <button
                              onClick={handleGeneratePlaybook}
                              disabled={generatingPlaybook}
                              className="rounded-md border border-zinc-600 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                            >
                              {generatingPlaybook ? "Generating..." : "Regenerate"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {playbookData.playbookApproved && (
              <div className="card p-6">
                <h2 className="text-lg font-medium text-zinc-200">Leads & personalized emails</h2>
                <p className="mt-1 text-sm text-zinc-500">Upload CSV, or import from Google Sheet or API. Columns: email, name, company, job title, industry (email required).</p>
                <div className="mt-4 flex flex-wrap gap-3 items-end">
                  <label className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-300 cursor-pointer hover:bg-zinc-800">
                    Choose CSV
                    <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
                  </label>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder="Or paste CSV here (header row first)"
                    rows={3}
                    className="flex-1 min-w-[200px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleUploadCsv}
                    disabled={uploading || !csvInput.trim()}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
                  <p className="text-sm text-zinc-500">Or import from:</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="Google Sheet URL (share as Anyone can view)"
                      className="flex-1 min-w-[240px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleImportSheet}
                      disabled={importingSheet || !sheetUrl.trim()}
                      className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {importingSheet ? "Importing..." : "Import from Sheet"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      type="url"
                      value={apiImportUrl}
                      onChange={(e) => setApiImportUrl(e.target.value)}
                      placeholder="API URL (returns { leads: [...] } or array)"
                      className="flex-1 min-w-[200px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      type="password"
                      value={apiImportKey}
                      onChange={(e) => setApiImportKey(e.target.value)}
                      placeholder="API key (optional)"
                      className="w-36 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleImportApi}
                      disabled={importingApi || !apiImportUrl.trim()}
                      className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {importingApi ? "Fetching..." : "Fetch from API"}
                    </button>
                  </div>
                </div>
                {batches.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-4 items-center">
                    <span className="text-sm text-zinc-400">Batch:</span>
                    <select
                      value={selectedBatchId ?? ""}
                      onChange={(e) => setSelectedBatchId(e.target.value || null)}
                      className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name ?? b.id} ({b.leadCount} leads)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenerateLeads}
                      disabled={generatingLeads || !selectedBatchId}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {generatingLeads ? "Generating emails..." : "Generate personalized emails"}
                    </button>
                    <button
                      onClick={handleVerifyLeads}
                      disabled={verifyingLeads || !selectedBatchId || leads.length === 0}
                      className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                      title="Check email syntax and MX records"
                    >
                      {verifyingLeads ? "Verifying..." : "Verify emails"}
                    </button>
                    <button
                      onClick={handleClassifyLeads}
                      disabled={classifyingLeads || !selectedBatchId || leads.length === 0}
                      className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                      title="Assign persona and vertical from ICP (uses Claude)"
                    >
                      {classifyingLeads ? "Classifying..." : "Classify (persona + vertical)"}
                    </button>
                    <button
                      onClick={handleSendToInstantly}
                      disabled={sendingToInstantly || !selectedBatchId || leads.length === 0}
                      className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                      title="Create Instantly campaign, add leads, apply slow ramp for unwarmed mailboxes, and activate"
                    >
                      {sendingToInstantly ? "Sending..." : "Send to Instantly"}
                    </button>
                  </div>
                )}
                {batches.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={abTestEnabled}
                        onChange={(e) => setAbTestEnabled(e.target.checked)}
                        className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                      />
                      A/B test subject line (splits leads 50/50, creates two campaigns)
                    </label>
                    {abTestEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-zinc-500 block mb-1">Subject A</span>
                          <input
                            type="text"
                            value={subjectLineA}
                            onChange={(e) => setSubjectLineA(e.target.value)}
                            placeholder="e.g. Quick question about {{company}}"
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500 block mb-1">Subject B</span>
                          <input
                            type="text"
                            value={subjectLineB}
                            onChange={(e) => setSubjectLineB(e.target.value)}
                            placeholder="e.g. {{first_name}}, thought you might like this"
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {leadPipelineMessage && (
                  <div className="mt-3 rounded-md bg-zinc-800/80 border border-zinc-700 px-3 py-2 text-sm text-zinc-300">
                    {leadPipelineMessage}
                  </div>
                )}
                {sendToInstantlyResult && (
                  <div className="mt-3 rounded-md bg-emerald-900/20 border border-emerald-800 px-3 py-2 text-sm text-emerald-300">
                    {sendToInstantlyResult.message}
                    {sendToInstantlyResult.leads_uploaded != null && (
                      <span className="block mt-1 text-emerald-400/90">Leads uploaded: {sendToInstantlyResult.leads_uploaded}</span>
                    )}
                  </div>
                )}
                {leadsError && (
                  <div className="mt-3 rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">{leadsError}</div>
                )}
                {leads.length > 0 && (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700 text-left text-zinc-400">
                          <th className="pb-2 pr-4">Email</th>
                          <th className="pb-2 pr-4">Name</th>
                          <th className="pb-2 pr-4">Company</th>
                          <th className="pb-2 pr-2">Verified</th>
                          <th className="pb-2 pr-2">Persona</th>
                          <th className="pb-2 pr-2">Vertical</th>
                          <th className="pb-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => (
                          <React.Fragment key={lead.id}>
                            <tr className="border-b border-zinc-800 hover:bg-zinc-800/30">
                              <td className="py-2 pr-4 text-zinc-200">{lead.email}</td>
                              <td className="py-2 pr-4 text-zinc-400">{lead.name ?? "-"}</td>
                              <td className="py-2 pr-4 text-zinc-400">{lead.company ?? "-"}</td>
                              <td className="py-2 pr-2 text-zinc-500 text-xs">
                                {lead.emailVerified === true ? "Yes" : lead.emailVerified === false ? "No" : "-"}
                              </td>
                              <td className="py-2 pr-2 text-zinc-500 text-xs">{lead.persona ?? "-"}</td>
                              <td className="py-2 pr-2 text-zinc-500 text-xs">{lead.vertical ?? "-"}</td>
                              <td className="py-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                                  className="text-emerald-500 hover:text-emerald-400 text-xs"
                                >
                                  {expandedLeadId === lead.id ? "Hide" : "Preview"}
                                </button>
                              </td>
                            </tr>
                            {expandedLeadId === lead.id && (lead.step1Subject != null || lead.step1Body != null) && (
                              <tr key={`${lead.id}-preview`} className="bg-zinc-900/50">
                                <td colSpan={7} className="py-3 px-4">
                                  <div className="text-xs text-zinc-500 mb-1">Subject:</div>
                                  <div className="text-zinc-200 mb-3">{lead.step1Subject ?? "-"}</div>
                                  <div className="text-xs text-zinc-500 mb-1">Body:</div>
                                  <div className="text-zinc-400 whitespace-pre-wrap text-sm">{lead.step1Body ?? "-"}</div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {playbookData.playbookApproved && (
              <div className="card p-6">
                <h2 className="text-lg font-medium text-zinc-200">Campaign performance</h2>
                <p className="mt-1 text-sm text-zinc-500">Opens, clicks, and suggestions for campaigns you sent to Instantly.</p>
                {sentCampaigns.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-500">No campaigns sent yet. Send a batch to Instantly to see performance here.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-sm text-zinc-400">Campaign:</label>
                      <select
                        value={selectedSentCampaignId ?? ""}
                        onChange={(e) => setSelectedSentCampaignId(e.target.value || null)}
                        className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 min-w-[200px]"
                      >
                        {sentCampaigns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - {new Date(c.createdAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    {analyticsLoading ? (
                      <p className="text-sm text-zinc-500">Loading analytics...</p>
                    ) : campaignAnalytics && abPartnerAnalytics ? (() => {
                      const selected = sentCampaigns.find((c) => c.id === selectedSentCampaignId);
                      const isSelectedA = selected?.variant === "A";
                      const analyticsA = isSelectedA ? campaignAnalytics : abPartnerAnalytics;
                      const analyticsB = isSelectedA ? abPartnerAnalytics : campaignAnalytics;
                      const openA = analyticsA.open_rate_pct ?? 0;
                      const openB = analyticsB.open_rate_pct ?? 0;
                      return (
                        <div className="space-y-3">
                          <p className="card-label">A/B comparison</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="card-accent p-4 text-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-zinc-200">Variant A</span>
                                {openA >= openB && openA > 0 && <span className="text-xs font-medium text-amber-400">Leading</span>}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-zinc-400">
                                <span>Sent</span><span className="text-zinc-200">{analyticsA.emails_sent_count ?? 0}</span>
                                <span>Opens</span><span className="text-zinc-200">{analyticsA.open_count ?? 0}</span>
                                <span>Open rate</span><span className="text-zinc-200">{analyticsA.open_rate_pct != null ? `${analyticsA.open_rate_pct}%` : "—"}</span>
                                <span>Replies</span><span className="text-zinc-200">{analyticsA.reply_count ?? 0}</span>
                              </div>
                            </div>
                            <div className="card-accent p-4 text-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-zinc-200">Variant B</span>
                                {openB > openA && <span className="text-xs font-medium text-amber-400">Leading</span>}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-zinc-400">
                                <span>Sent</span><span className="text-zinc-200">{analyticsB.emails_sent_count ?? 0}</span>
                                <span>Opens</span><span className="text-zinc-200">{analyticsB.open_count ?? 0}</span>
                                <span>Open rate</span><span className="text-zinc-200">{analyticsB.open_rate_pct != null ? `${analyticsB.open_rate_pct}%` : "—"}</span>
                                <span>Replies</span><span className="text-zinc-200">{analyticsB.reply_count ?? 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })() : campaignAnalytics ? (
                      <div className="rounded border border-zinc-700 bg-zinc-900/50 p-4 text-sm">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-zinc-500">Sent</span>
                            <p className="text-zinc-200 font-medium">{campaignAnalytics.emails_sent_count ?? 0}</p>
                          </div>
                          <div>
                            <span className="text-zinc-500">Opens</span>
                            <p className="text-zinc-200 font-medium">{campaignAnalytics.open_count ?? 0}</p>
                            {campaignAnalytics.open_rate_pct != null && (
                              <p className="text-zinc-400 text-xs">{campaignAnalytics.open_rate_pct}% open rate</p>
                            )}
                          </div>
                          <div>
                            <span className="text-zinc-500">Clicks</span>
                            <p className="text-zinc-200 font-medium">{campaignAnalytics.link_click_count ?? 0}</p>
                            {campaignAnalytics.click_rate_pct != null && (
                              <p className="text-zinc-400 text-xs">{campaignAnalytics.click_rate_pct}% click rate</p>
                            )}
                          </div>
                          <div>
                            <span className="text-zinc-500">Replies</span>
                            <p className="text-zinc-200 font-medium">{campaignAnalytics.reply_count ?? 0}</p>
                          </div>
                        </div>
                        {campaignAnalytics.suggestion && (
                          <p className="mt-3 text-amber-400/90 text-xs">{campaignAnalytics.suggestion}</p>
                        )}
                      </div>
                    ) : selectedSentCampaignId ? (
                      <p className="text-sm text-zinc-500">No analytics yet or campaign not found in Instantly.</p>
                    ) : null}
                    {selectedSentCampaignId && (
                      <div className="pt-4 border-t border-zinc-700">
                        <h3 className="text-sm font-medium text-zinc-300">Replies (classified for learning)</h3>
                        <p className="text-xs text-zinc-500 mt-1">Log replies you get so we can classify them (positive, objection, OOO, etc.).</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <input
                            type="email"
                            value={replyLogFrom}
                            onChange={(e) => setReplyLogFrom(e.target.value)}
                            placeholder="From email"
                            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500"
                          />
                          <input
                            type="text"
                            value={replyLogSubject}
                            onChange={(e) => setReplyLogSubject(e.target.value)}
                            placeholder="Subject"
                            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500"
                          />
                        </div>
                        <textarea
                          value={replyLogBody}
                          onChange={(e) => setReplyLogBody(e.target.value)}
                          placeholder="Reply body (paste from inbox)"
                          rows={3}
                          className="mt-2 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={handleLogReply}
                          disabled={loggingReply || !replyLogFrom.trim()}
                          className="mt-2 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                        >
                          {loggingReply ? "Logging..." : "Log reply (classify)"}
                        </button>
                        {replyError && (
                          <p className="mt-2 text-sm text-red-400">{replyError}</p>
                        )}
                        {repliesLoading ? (
                          <p className="mt-3 text-sm text-zinc-500">Loading replies...</p>
                        ) : campaignReplies.length > 0 ? (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-zinc-700 text-left text-zinc-500">
                                  <th className="pb-1 pr-2">From</th>
                                  <th className="pb-1 pr-2">Subject</th>
                                  <th className="pb-1 pr-2">Classification</th>
                                </tr>
                              </thead>
                              <tbody>
                                {campaignReplies.map((r) => (
                                  <tr key={r.id} className="border-b border-zinc-800">
                                    <td className="py-1.5 pr-2 text-zinc-400">{r.fromEmail}</td>
                                    <td className="py-1.5 pr-2 text-zinc-400 max-w-[180px] truncate">{r.subject ?? "-"}</td>
                                    <td className="py-1.5 text-zinc-500">{r.classification ?? "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {playbookData.playbookApproved && (
              <div className="card p-6">
                <h2 className="text-lg font-medium text-zinc-200">Performance memory</h2>
                <p className="mt-1 text-sm text-zinc-500">What works by persona and vertical (from campaign analytics and reply classifications). Used by the strategy engine.</p>
                {memoryLoading ? (
                  <p className="mt-4 text-sm text-zinc-500">Loading...</p>
                ) : performanceMemory && (Object.keys(performanceMemory.byPersona).length > 0 || Object.keys(performanceMemory.byVertical).length > 0) ? (
                  <div className="mt-4 space-y-4">
                    {performanceMemory.suggestion && (
                      <div className="rounded border border-amber-800/50 bg-amber-900/20 px-3 py-2 text-sm text-amber-200">
                        <span className="font-medium">Strategy suggestion: </span>
                        {performanceMemory.suggestion}
                      </div>
                    )}
                    {Object.keys(performanceMemory.byPersona).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400">By persona</h3>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-700 text-left text-zinc-500">
                                <th className="pb-1 pr-2">Persona</th>
                                <th className="pb-1 pr-2">Open rate avg %</th>
                                <th className="pb-1 pr-2">Click rate avg %</th>
                                <th className="pb-1 pr-2">Replies</th>
                                <th className="pb-1 pr-2">Positive</th>
                                <th className="pb-1 pr-2">Objection</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(performanceMemory.byPersona).map(([name, m]) => (
                                <tr key={name} className="border-b border-zinc-800">
                                  <td className="py-1.5 pr-2 text-zinc-300">{name}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.open_rate_pct_avg ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.click_rate_pct_avg ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.reply_count_total ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.positive_reply_count ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.objection_count ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {Object.keys(performanceMemory.byVertical).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400">By vertical</h3>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-700 text-left text-zinc-500">
                                <th className="pb-1 pr-2">Vertical</th>
                                <th className="pb-1 pr-2">Open rate avg %</th>
                                <th className="pb-1 pr-2">Click rate avg %</th>
                                <th className="pb-1 pr-2">Replies</th>
                                <th className="pb-1 pr-2">Positive</th>
                                <th className="pb-1 pr-2">Objection</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(performanceMemory.byVertical).map(([name, m]) => (
                                <tr key={name} className="border-b border-zinc-800">
                                  <td className="py-1.5 pr-2 text-zinc-300">{name}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.open_rate_pct_avg ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.click_rate_pct_avg ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.reply_count_total ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.positive_reply_count ?? "-"}</td>
                                  <td className="py-1.5 pr-2 text-zinc-400">{m.objection_count ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">No data yet. Send campaigns (with classified leads) and log replies to build performance memory.</p>
                )}
              </div>
            )}

            <div className="card p-6">
              <button
                type="button"
                onClick={() => setInstantlyAdvancedOpen((open) => !open)}
                className="w-full text-left flex items-start justify-between gap-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <div>
                  <h2 className="text-lg font-medium text-zinc-200">Advanced - Domains & inboxes</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Used automatically by the agent when sending. Expand to override or manage accounts, warmup, and DFY orders.
                  </p>
                </div>
                <span className="text-zinc-400 text-sm flex-shrink-0 mt-0.5" aria-hidden>
                  {instantlyAdvancedOpen ? "v" : ">"}
                </span>
              </button>
              {instantlyAdvancedOpen && (
              <>
              {instantlyError && (
                <div className="mt-3 rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">{instantlyError}</div>
              )}
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">Your Instantly accounts</h3>
                  {instantlyAccountsLoading ? (
                    <p className="mt-2 text-sm text-zinc-500">Loading...</p>
                  ) : instantlyAccounts.length === 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-zinc-500">No accounts yet. Order domains & inboxes below or add them in Instantly.</p>
                      <p className="text-xs text-zinc-600">Use an Instantly <strong>API v2</strong> key (Settings -&gt; API in Instantly). V1 keys will not return accounts.</p>
                    </div>
                  ) : (
                    <>
                      <ul className="mt-2 space-y-2">
                        {instantlyAccounts.slice(0, instantlyAccountsShown).map((acc) => (
                          <li key={acc.email} className="flex flex-wrap items-center gap-2 rounded border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm">
                            <span className="text-zinc-200">{acc.email}</span>
                            <span className="text-zinc-500">
                              ({acc.warmup_status === 1 ? "Warmup on" : acc.warmup_status === 0 ? "Warmup off" : "Status " + acc.warmup_status})
                            </span>
                            {acc.warmup_status === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleWarmupEnable(acc.email)}
                                disabled={warmupLoading === acc.email}
                                className="text-emerald-500 hover:text-emerald-400 text-xs disabled:opacity-50"
                              >
                                {warmupLoading === acc.email ? "..." : "Enable warmup"}
                              </button>
                            ) : acc.warmup_status === 1 ? (
                              <button
                                type="button"
                                onClick={() => handleWarmupDisable(acc.email)}
                                disabled={warmupLoading === acc.email}
                                className="text-amber-500 hover:text-amber-400 text-xs disabled:opacity-50"
                              >
                                {warmupLoading === acc.email ? "..." : "Disable warmup"}
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {instantlyAccounts.length > INSTANTLY_ACCOUNTS_PAGE_SIZE && (
                        <div className="mt-2 flex items-center gap-3">
                          {instantlyAccountsShown < instantlyAccounts.length ? (
                            <>
                              <span className="text-xs text-zinc-500">
                                Showing {instantlyAccountsShown} of {instantlyAccounts.length}
                              </span>
                              <button
                                type="button"
                                onClick={() => setInstantlyAccountsShown((n) => Math.min(n + INSTANTLY_ACCOUNTS_PAGE_SIZE, instantlyAccounts.length))}
                                className="text-xs text-emerald-500 hover:text-emerald-400"
                              >
                                View {Math.min(INSTANTLY_ACCOUNTS_PAGE_SIZE, instantlyAccounts.length - instantlyAccountsShown)} more
                              </button>
                              {instantlyAccountsShown < instantlyAccounts.length && (
                                <button
                                  type="button"
                                  onClick={() => setInstantlyAccountsShown(instantlyAccounts.length)}
                                  className="text-xs text-zinc-500 hover:text-zinc-400"
                                >
                                  Show all
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-zinc-500">Showing all {instantlyAccounts.length}</span>
                              <button
                                type="button"
                                onClick={() => setInstantlyAccountsShown(INSTANTLY_ACCOUNTS_PAGE_SIZE)}
                                className="text-xs text-zinc-500 hover:text-zinc-400"
                              >
                                Show less
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {hasOnboarding && (
                    <button
                      type="button"
                      onClick={fetchInstantlyAccounts}
                      disabled={instantlyAccountsLoading}
                      className="mt-2 text-xs text-zinc-500 hover:text-zinc-400 disabled:opacity-50"
                    >
                      Refresh list
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">Check domain availability</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Comma-separated domains (e.g. example.com, acme.org).</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={dfyCheckInput}
                      onChange={(e) => setDfyCheckInput(e.target.value)}
                      placeholder="example.com, acme.org"
                      className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleDfyCheck}
                      disabled={dfyCheckLoading || !dfyCheckInput.trim()}
                      className="rounded-md border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {dfyCheckLoading ? "Checking..." : "Check"}
                    </button>
                  </div>
                  {dfyCheckResult?.domains && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {dfyCheckResult.domains.map((d: { domain: string; available: boolean }) => (
                        <li key={d.domain} className="text-zinc-400">
                          {d.domain}: {d.available ? <span className="text-emerald-400">Available</span> : <span className="text-red-400">Unavailable</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">Pre-warmed domains</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Domains already warmed up by Instantly; ready to use sooner.</p>
                  <div className="mt-2 flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={handlePreWarmedList}
                      disabled={preWarmedLoading}
                      className="rounded-md border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {preWarmedLoading ? "Loading..." : "Load pre-warmed list"}
                    </button>
                    {preWarmedList.length > 0 && (
                      <select
                        value={selectedPreWarmedDomain}
                        onChange={(e) => setSelectedPreWarmedDomain(e.target.value)}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Select domain</option>
                        {preWarmedList.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {preWarmedList.length === 0 && !preWarmedLoading && (
                    <p className="mt-1 text-xs text-zinc-500">Click &quot;Load pre-warmed list&quot; - list may be empty if none available.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">Order new domains & inboxes</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">DFY: Instantly buys the domain and creates inboxes. Requires Instantly Outreach plan.</p>
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm text-zinc-400">
                        <input
                          type="radio"
                          name="dfyOrderType"
                          checked={dfyOrderType === "dfy"}
                          onChange={() => setDfyOrderType("dfy")}
                          className="rounded border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                        />
                        New DFY (domain + inboxes)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-zinc-400">
                        <input
                          type="radio"
                          name="dfyOrderType"
                          checked={dfyOrderType === "pre_warmed_up"}
                          onChange={() => setDfyOrderType("pre_warmed_up")}
                          className="rounded border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                        />
                        Pre-warmed domain
                      </label>
                    </div>
                    {dfyOrderType === "dfy" && (
                      <>
                        <div>
                          <label className="block text-xs text-zinc-500">Domain (e.g. example.com)</label>
                          <input
                            type="text"
                            value={dfyOrderDomain}
                            onChange={(e) => setDfyOrderDomain(e.target.value)}
                            placeholder="example.com"
                            className="mt-1 w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500">Inboxes (1-5 per domain). Prefix = part before @ (e.g. john -&gt; john@domain.com)</label>
                          {dfyOrderAccounts.map((acc, i) => (
                            <div key={i} className="mt-2 flex flex-wrap gap-2 items-center">
                              <input
                                type="text"
                                value={acc.first_name}
                                onChange={(e) => {
                                  const next = [...dfyOrderAccounts];
                                  next[i] = { ...next[i], first_name: e.target.value };
                                  setDfyOrderAccounts(next);
                                }}
                                placeholder="First name"
                                className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
                              />
                              <input
                                type="text"
                                value={acc.last_name}
                                onChange={(e) => {
                                  const next = [...dfyOrderAccounts];
                                  next[i] = { ...next[i], last_name: e.target.value };
                                  setDfyOrderAccounts(next);
                                }}
                                placeholder="Last name"
                                className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
                              />
                              <input
                                type="text"
                                value={acc.email_address_prefix}
                                onChange={(e) => {
                                  const next = [...dfyOrderAccounts];
                                  next[i] = { ...next[i], email_address_prefix: e.target.value };
                                  setDfyOrderAccounts(next);
                                }}
                                placeholder="Prefix (e.g. john)"
                                className="w-28 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
                              />
                              {dfyOrderAccounts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setDfyOrderAccounts(dfyOrderAccounts.filter((_, j) => j !== i))}
                                  className="text-red-400 text-xs hover:text-red-300"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          {dfyOrderAccounts.length < 5 && (
                            <button
                              type="button"
                              onClick={() => setDfyOrderAccounts([...dfyOrderAccounts, { first_name: "", last_name: "", email_address_prefix: "" }])}
                              className="mt-2 text-xs text-emerald-500 hover:text-emerald-400"
                            >
                              + Add inbox
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={dfyOrderSimulation}
                        onChange={(e) => setDfyOrderSimulation(e.target.checked)}
                        className="rounded border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                      />
                      Simulation only (get quote, no charge)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDfyOrder}
                        disabled={dfyOrderLoading}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {dfyOrderLoading ? "Processing..." : dfyOrderSimulation ? "Get quote" : "Place order"}
                      </button>
                    </div>
                    {dfyOrderResult && (
                      <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-3 text-sm">
                        {dfyOrderResult.order_placed ? (
                          <p className="text-emerald-400">Order placed successfully.</p>
                        ) : dfyOrderResult.order_is_valid ? (
                          <p className="text-zinc-400">Simulation: order would be valid. Total: {typeof dfyOrderResult.total_price === "number" ? `$${dfyOrderResult.total_price}` : "-"}.</p>
                        ) : (
                          <p className="text-amber-400">Order invalid. Check unavailable/invalid domains or account details.</p>
                        )}
                        {((dfyOrderResult as { unavailable_domains?: string[] })?.unavailable_domains?.length ?? 0) > 0 && (
                          <p className="mt-1 text-zinc-500">Unavailable: {((dfyOrderResult as { unavailable_domains?: string[] })?.unavailable_domains ?? []).join(", ")}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-medium text-zinc-200">Quick Actions</h2>
              <div className="mt-4 flex gap-4">
                <Link
                  href="/onboarding"
                  className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                >
                  Update onboarding
                </Link>
                {workspace.productSummary && (
                  <button
                    onClick={handleCrawl}
                    disabled={crawling}
                    className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-50"
                  >
                    {crawling ? "Crawling..." : "Re-crawl website"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
            </div>
          </main>
        </div>

        <aside className="w-[380px] flex-shrink-0 flex flex-col h-[calc(100vh-4rem)] border-l border-zinc-800">
        <ChatPanel
          context={{
            productSummary: workspace?.productSummary ?? "",
            icp: (icpInput || playbookData.icp) ?? "",
            steps: editingSteps.length ? editingSteps : undefined,
          }}
          onEdits={handleChatEdits}
        />
      </aside>
      </div>
    </div>
  );
}
