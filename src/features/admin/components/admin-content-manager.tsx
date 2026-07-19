"use client";

import {
  Archive,
  CheckCircle2,
  ClipboardCopy,
  FileJson2,
  History,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, AdminApiError, loadAllPages } from "@/features/admin/api";
import { contentTemplates, resourceLabels } from "@/features/admin/templates";
import {
  adminResources,
  type AdminResource,
  type AdminSection,
  type AuditLogDto,
  type ContentEntryDto,
  type ContentVersionDto,
  type PageDto,
  type RulesDto,
} from "@/features/admin/types";

const sectionLabels: Record<AdminSection, string> = {
  rules: "Game Rules",
  audit: "Audit Logs",
  ...resourceLabels,
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function errorMessage(error: unknown): string {
  if (error instanceof AdminApiError) return `${error.code ? `${error.code}: ` : ""}${error.message}`;
  if (error instanceof Error) return error.message;
  return "Đã xảy ra lỗi không xác định";
}

export function AdminContentManager({ username }: { username: string }) {
  const [versions, setVersions] = useState<ContentVersionDto[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [section, setSection] = useState<AdminSection>("items");
  const [entries, setEntries] = useState<ContentEntryDto[]>([]);
  const [rules, setRules] = useState<RulesDto | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ContentEntryDto | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [editorKey, setEditorKey] = useState("");
  const [editorEnabled, setEditorEnabled] = useState(true);
  const [editorJson, setEditorJson] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [newChangelog, setNewChangelog] = useState("");
  const [cloneSourceId, setCloneSourceId] = useState("");

  const currentVersion = useMemo(
    () => versions.find(({ id }) => id === selectedVersionId) ?? null,
    [selectedVersionId, versions],
  );
  const isDraft = currentVersion?.status === "draft";
  const activeResource = adminResources.includes(section as AdminResource)
    ? (section as AdminResource)
    : null;

  const refreshVersions = useCallback(async () => {
    const data = await adminApi<ContentVersionDto[]>("/api/admin/content/versions");
    setVersions(data);
    setSelectedVersionId((current) => {
      if (current && data.some(({ id }) => id === current)) return current;
      return data.find(({ status }) => status === "draft")?.id ?? data[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshVersions().catch((error) => toast.error(errorMessage(error)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshVersions]);

  const loadSection = useCallback(async () => {
    if (!selectedVersionId) return;
    setLoading(true);
    setSelectedEntry(null);
    setSelectedKeys([]);
    try {
      if (activeResource) {
        const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
        const page = await adminApi<PageDto<ContentEntryDto>>(
          `/api/admin/content/versions/${selectedVersionId}/${activeResource}${search}`,
        );
        setEntries(page.items);
      } else if (section === "rules") {
        const data = await adminApi<RulesDto>(
          `/api/admin/content/versions/${selectedVersionId}/rules`,
        );
        setRules(data);
        setEditorJson(formatJson(data.content));
      } else {
        const logs = await loadAllPages<AuditLogDto>(
          `/api/admin/audit-logs?contentVersionId=${selectedVersionId}&limit=100`,
        );
        setAuditLogs(logs);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [activeResource, query, section, selectedVersionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadSection(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSection]);

  function startNewEntry() {
    if (!activeResource) return;
    setSelectedEntry(null);
    setEditorKey("");
    setEditorEnabled(true);
    setEditorJson(formatJson(contentTemplates[activeResource]));
  }

  async function selectEntry(entry: ContentEntryDto) {
    if (!activeResource || !selectedVersionId) return;
    setLoading(true);
    try {
      const detail = await adminApi<ContentEntryDto>(
        `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${entry.key}`,
      );
      setSelectedEntry(detail);
      setEditorKey(detail.key);
      setEditorEnabled(detail.enabled);
      setEditorJson(formatJson(detail.content));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!activeResource || !selectedVersionId) return;
    let content: unknown;
    try {
      content = JSON.parse(editorJson);
    } catch {
      toast.error("JSON không hợp lệ");
      return;
    }
    setSaving(true);
    try {
      if (selectedEntry) {
        const updated = await adminApi<ContentEntryDto>(
          `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${selectedEntry.key}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              enabled: editorEnabled,
              content,
              expectedVersion: selectedEntry.version,
            }),
          },
        );
        setSelectedEntry(updated);
        setEditorJson(formatJson(updated.content));
      } else {
        const created = await adminApi<ContentEntryDto>(
          `/api/admin/content/versions/${selectedVersionId}/${activeResource}`,
          {
            method: "POST",
            body: JSON.stringify({ key: editorKey, enabled: editorEnabled, content }),
          },
        );
        setSelectedEntry(created);
      }
      toast.success("Đã lưu content và ghi audit");
      await Promise.all([loadSection(), refreshVersions()]);
    } catch (error) {
      toast.error(errorMessage(error), { duration: 7000 });
    } finally {
      setSaving(false);
    }
  }

  function formatEditorJson() {
    try {
      setEditorJson(formatJson(JSON.parse(editorJson)));
    } catch {
      toast.error("JSON không hợp lệ");
    }
  }

  async function validateEditor() {
    if (!activeResource || !selectedVersionId) return;
    try {
      const content = JSON.parse(editorJson);
      const result = await adminApi<{
        valid: boolean;
        issues?: Array<{ path: Array<string | number>; message: string }>;
      }>(`/api/admin/content/versions/${selectedVersionId}/validate-entity`, {
        method: "POST",
        body: JSON.stringify({ resource: activeResource, content }),
      });
      if (result.valid) {
        toast.success("Entity hợp lệ theo schema");
      } else {
        toast.error("Entity chưa hợp lệ", {
          description: result.issues
            ?.slice(0, 5)
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(" · "),
          duration: 8000,
        });
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function deleteEntry() {
    if (!activeResource || !selectedVersionId || !selectedEntry) return;
    if (!window.confirm(`Xoá draft ${selectedEntry.key}?`)) return;
    try {
      await adminApi<void>(
        `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${selectedEntry.key}`,
        { method: "DELETE", body: "{}" },
      );
      toast.success("Đã xoá content draft");
      setSelectedEntry(null);
      setEditorJson("");
      await Promise.all([loadSection(), refreshVersions()]);
    } catch (error) {
      toast.error(errorMessage(error), { duration: 8000 });
    }
  }

  async function duplicateEntry() {
    if (!activeResource || !selectedVersionId || !selectedEntry) return;
    const key = window.prompt("Key mới cho bản sao:");
    if (!key) return;
    try {
      const copy = await adminApi<ContentEntryDto>(
        `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${selectedEntry.key}/duplicate`,
        { method: "POST", body: JSON.stringify({ key, enabled: false }) },
      );
      toast.success("Đã tạo bản sao ở trạng thái disabled");
      await loadSection();
      await selectEntry(copy);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function bulkSetEnabled(enabled: boolean) {
    if (!activeResource || !selectedVersionId || selectedKeys.length === 0) return;
    try {
      await adminApi(
        `/api/admin/content/versions/${selectedVersionId}/${activeResource}/bulk-action`,
        {
          method: "POST",
          body: JSON.stringify({
            keys: selectedKeys,
            action: enabled ? "enable" : "disable",
          }),
        },
      );
      toast.success(`Đã ${enabled ? "bật" : "tắt"} các content được chọn`);
      await loadSection();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function saveRules() {
    if (!rules || !selectedVersionId) return;
    try {
      const content = JSON.parse(editorJson);
      const updated = await adminApi<RulesDto>(
        `/api/admin/content/versions/${selectedVersionId}/rules`,
        {
          method: "PUT",
          body: JSON.stringify({ content, expectedVersion: rules.revision }),
        },
      );
      setRules(updated);
      setEditorJson(formatJson(updated.content));
      toast.success("Đã cập nhật game rules");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function createVersion() {
    try {
      const created = await adminApi<ContentVersionDto>(
        "/api/admin/content/versions",
        {
          method: "POST",
          body: JSON.stringify({
            version: newVersion,
            changelog: newChangelog,
            ...(cloneSourceId ? { cloneFromVersionId: cloneSourceId } : {}),
          }),
        },
      );
      setShowVersionForm(false);
      setNewVersion("");
      setNewChangelog("");
      setCloneSourceId("");
      await refreshVersions();
      setSelectedVersionId(created.id);
      toast.success("Đã tạo content version");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function validateVersion() {
    if (!selectedVersionId) return;
    try {
      const result = await adminApi<{ valid: boolean; issues: Array<{ severity: string; message: string }> }>(
        `/api/admin/content/versions/${selectedVersionId}/validate`,
        { method: "POST", body: "{}" },
      );
      const errors = result.issues.filter(({ severity }) => severity === "error").length;
      const warnings = result.issues.length - errors;
      toast[result.valid ? "success" : "error"](
        result.valid ? `Hợp lệ (${warnings} cảnh báo)` : `${errors} lỗi, ${warnings} cảnh báo`,
        { description: result.issues.slice(0, 4).map(({ message }) => message).join(" · "), duration: 9000 },
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function publishVersion() {
    if (!selectedVersionId || !window.confirm("Publish version này và archive version hiện tại?")) return;
    try {
      await adminApi(`/api/admin/content/versions/${selectedVersionId}/publish`, {
        method: "POST",
        body: "{}",
      });
      await refreshVersions();
      toast.success("Content version đã được publish");
    } catch (error) {
      toast.error(errorMessage(error), { duration: 9000 });
    }
  }

  async function archiveVersion() {
    if (!selectedVersionId || !window.confirm("Archive version đang publish?")) return;
    try {
      await adminApi(`/api/admin/content/versions/${selectedVersionId}/archive`, {
        method: "POST",
        body: "{}",
      });
      await refreshVersions();
      toast.success("Đã archive version");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function deleteVersion() {
    if (!selectedVersionId || !currentVersion || !window.confirm(`Xoá toàn bộ draft ${currentVersion.version}?`)) return;
    try {
      await adminApi<void>(`/api/admin/content/versions/${selectedVersionId}`, {
        method: "DELETE",
        body: "{}",
      });
      await refreshVersions();
      toast.success("Đã xoá draft version");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold">APOC Content Studio</h1>
            <p className="truncate text-xs text-zinc-500">Đăng nhập: {username}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
            <LogOut /> Đăng xuất
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1800px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="bg-zinc-900/60">
            <CardHeader>
              <CardTitle>Content version</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedVersionId}
                onChange={(event) => setSelectedVersionId(event.target.value)}
                className="h-9 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 text-sm"
              >
                <option value="">Chưa có version</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.version} · {version.status}
                  </option>
                ))}
              </select>
              {currentVersion && (
                <div className="flex items-center justify-between text-xs">
                  <Badge variant={isDraft ? "secondary" : "outline"}>{currentVersion.status}</Badge>
                  <span className="text-zinc-500">rev {currentVersion.revision}</span>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setShowVersionForm((value) => !value)}>
                <Plus /> Version mới
              </Button>
              {showVersionForm && (
                <div className="space-y-2 border-t border-white/8 pt-3">
                  <Input placeholder="0.2.0" value={newVersion} onChange={(event) => setNewVersion(event.target.value)} />
                  <Textarea placeholder="Changelog" value={newChangelog} onChange={(event) => setNewChangelog(event.target.value)} />
                  <select
                    value={cloneSourceId}
                    onChange={(event) => setCloneSourceId(event.target.value)}
                    className="h-8 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 text-xs"
                  >
                    <option value="">Tạo trống với rules mặc định</option>
                    {versions.map((version) => (
                      <option key={version.id} value={version.id}>Clone {version.version}</option>
                    ))}
                  </select>
                  <Button className="w-full" onClick={createVersion} disabled={!newVersion}>Tạo version</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <nav className="space-y-1" aria-label="Content sections">
            {(["rules", ...adminResources, "audit"] as AdminSection[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSection(item)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${section === item ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}
              >
                <span>{sectionLabels[item]}</span>
                {adminResources.includes(item as AdminResource) && currentVersion && (
                  <span className="font-mono text-xs text-zinc-600">{currentVersion.counts[item as AdminResource] ?? 0}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold">{sectionLabels[section]}</h2>
              <p className="text-sm text-zinc-500">{currentVersion ? `Version ${currentVersion.version}` : "Tạo version để bắt đầu"}</p>
            </div>
            <Button variant="outline" onClick={validateVersion} disabled={!selectedVersionId}><CheckCircle2 /> Validate</Button>
            {isDraft && <Button onClick={publishVersion}><Send /> Publish</Button>}
            {currentVersion?.status === "published" && <Button variant="outline" onClick={archiveVersion}><Archive /> Archive</Button>}
            {isDraft && <Button variant="destructive" onClick={deleteVersion}><Trash2 /> Xoá version</Button>}
          </div>

          {activeResource && selectedVersionId && (
            <div className="grid items-start gap-4 2xl:grid-cols-[minmax(320px,0.75fr)_minmax(520px,1.25fr)]">
              <Card className="bg-zinc-900/60">
                <CardHeader>
                  <CardTitle>Danh sách</CardTitle>
                  <CardDescription>{entries.length} record trên trang hiện tại</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); loadSection(); }}>
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm key hoặc tên…" />
                    <Button type="submit" variant="outline" size="icon"><Search /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={loadSection}><RefreshCw /></Button>
                  </form>
                  {isDraft && <Button className="w-full" onClick={startNewEntry}><Plus /> Tạo {resourceLabels[activeResource]}</Button>}
                  {isDraft && selectedKeys.length > 0 && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => bulkSetEnabled(true)}>Enable ({selectedKeys.length})</Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => bulkSetEnabled(false)}>Disable</Button>
                    </div>
                  )}
                  <div className="max-h-[65vh] space-y-1 overflow-y-auto pr-1">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-2 rounded-lg border p-2 ${selectedEntry?.id === entry.id ? "border-zinc-500 bg-zinc-800" : "border-white/6 bg-zinc-950/40 hover:bg-zinc-900"}`}
                      >
                        {isDraft && (
                          <Checkbox
                            checked={selectedKeys.includes(entry.key)}
                            onCheckedChange={(checked) =>
                              setSelectedKeys((current) =>
                                checked === true
                                  ? Array.from(new Set([...current, entry.key]))
                                  : current.filter((key) => key !== entry.key),
                              )
                            }
                            aria-label={`Chọn ${entry.key}`}
                          />
                        )}
                        <button type="button" onClick={() => selectEntry(entry)} className="min-w-0 flex-1 px-1 text-left">
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate font-medium">{String(entry.content.name ?? entry.content.timeLabel ?? entry.key)}</span>
                            {!entry.enabled && <Badge variant="outline">disabled</Badge>}
                          </span>
                          <span className="mt-1 block truncate font-mono text-xs text-zinc-500">{entry.key}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileJson2 /> {selectedEntry ? selectedEntry.key : "Content editor"}</CardTitle>
                  <CardDescription>Payload được server allowlist và validate bằng schema riêng của resource.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">Stable key</label>
                      <Input value={editorKey} onChange={(event) => setEditorKey(event.target.value)} disabled={Boolean(selectedEntry)} placeholder="snake_case_key" />
                    </div>
                    <label className="flex items-end gap-2 pb-2 text-sm">
                      <Checkbox checked={editorEnabled} onCheckedChange={(checked) => setEditorEnabled(checked === true)} disabled={!isDraft} /> Enabled
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Content JSON</label>
                    <Textarea
                      value={editorJson}
                      onChange={(event) => setEditorJson(event.target.value)}
                      disabled={!isDraft}
                      spellCheck={false}
                      className="min-h-[460px] resize-y font-mono text-xs leading-5"
                    />
                  </div>
                  {selectedEntry?.dependencies && selectedEntry.dependencies.length > 0 && (
                    <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">
                      <p className="font-medium">Đang được tham chiếu {selectedEntry.dependencies.length} nơi</p>
                      {selectedEntry.dependencies.slice(0, 8).map((dependency) => (
                        <p key={`${dependency.resource}:${dependency.key}:${dependency.path}`} className="mt-1 font-mono text-amber-200/70">
                          {dependency.resource}/{dependency.key} · {dependency.path}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={formatEditorJson}>Format JSON</Button>
                    <Button variant="outline" onClick={validateEditor}>Validate entity</Button>
                    {selectedEntry && isDraft && <Button variant="outline" onClick={duplicateEntry}><ClipboardCopy /> Duplicate</Button>}
                    {selectedEntry && isDraft && <Button variant="destructive" onClick={deleteEntry}><Trash2 /> Xoá</Button>}
                    {isDraft && <Button onClick={saveEntry} disabled={saving || !editorKey || !editorJson}><Save /> {saving ? "Đang lưu…" : "Lưu"}</Button>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {section === "rules" && selectedVersionId && (
            <Card className="bg-zinc-900/60">
              <CardHeader><CardTitle>Game rules singleton</CardTitle><CardDescription>Giới hạn và default được kiểm tra ở server.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={editorJson} onChange={(event) => setEditorJson(event.target.value)} disabled={!isDraft} spellCheck={false} className="min-h-[520px] font-mono text-xs leading-5" />
                {isDraft && <div className="flex justify-end"><Button onClick={saveRules}><Save /> Lưu rules</Button></div>}
              </CardContent>
            </Card>
          )}

          {section === "audit" && (
            <Card className="bg-zinc-900/60">
              <CardHeader><CardTitle className="flex items-center gap-2"><History /> Audit append-only</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/7 bg-zinc-950/40 p-3">
                    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{log.action}</Badge><span className="font-medium">{log.entityType}/{log.entityKey}</span><time className="ml-auto text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString("vi-VN")}</time></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {loading && <p className="text-sm text-zinc-500">Đang tải dữ liệu…</p>}
        </section>
      </main>
    </div>
  );
}
