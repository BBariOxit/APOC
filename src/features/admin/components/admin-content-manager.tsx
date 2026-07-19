"use client";

import {
  Archive,
  Check,
  ChevronDown,
  CirclePlus,
  ClipboardCopy,
  History,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, AdminApiError, loadAllPages } from "@/features/admin/api";
import { ResourceEditor } from "@/features/admin/components/resource-editor";
import { RulesEditor } from "@/features/admin/components/rules-editor";
import { contentTemplates, resourceLabels } from "@/features/admin/templates";
import {
  adminResources,
  type AdminResource,
  type AdminSection,
  type AuditLogDto,
  type ContentCatalogDto,
  type ContentEntryDto,
  type ContentValue,
  type ContentVersionDto,
  type RulesDto,
} from "@/features/admin/types";

const sectionLabels: Record<AdminSection, string> = {
  rules: "Game rules",
  audit: "Audit",
  ...resourceLabels,
};

const emptyCatalog = Object.fromEntries(
  adminResources.map((resource) => [resource, []]),
) as unknown as ContentCatalogDto;

function errorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    return `${error.code ? `${error.code}: ` : ""}${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return "Đã xảy ra lỗi không xác định";
}

function sameContent(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function AdminContentManager({ username }: { username: string }) {
  const [versions, setVersions] = useState<ContentVersionDto[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [section, setSection] = useState<AdminSection>("items");
  const [entries, setEntries] = useState<ContentEntryDto[]>([]);
  const [rules, setRules] = useState<RulesDto | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [catalog, setCatalog] = useState<ContentCatalogDto>(emptyCatalog);
  const [selectedEntry, setSelectedEntry] = useState<ContentEntryDto | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [editorKey, setEditorKey] = useState("");
  const [editorEnabled, setEditorEnabled] = useState(true);
  const [editorContent, setEditorContent] = useState<ContentValue>({});
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState(false);
  const [versionValue, setVersionValue] = useState("");
  const [changelogValue, setChangelogValue] = useState("");
  const [cloneSourceId, setCloneSourceId] = useState("");

  const currentVersion = useMemo(
    () => versions.find(({ id }) => id === selectedVersionId) ?? null,
    [selectedVersionId, versions],
  );
  const isDraft = currentVersion?.status === "draft";
  const activeResource = adminResources.includes(section as AdminResource)
    ? (section as AdminResource)
    : null;
  const editorIsOpen = Boolean(
    selectedEntry || editorKey || Object.keys(editorContent).length,
  );
  const dirty = activeResource
    ? selectedEntry
      ? editorEnabled !== selectedEntry.enabled ||
        !sameContent(editorContent, selectedEntry.content)
      : editorIsOpen
    : section === "rules" && rules
      ? !sameContent(editorContent, rules.content)
      : false;

  const resetEditor = useCallback(() => {
    setSelectedEntry(null);
    setEditorKey("");
    setEditorEnabled(true);
    setEditorContent({});
  }, []);

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

  const loadCatalog = useCallback(async () => {
    if (!selectedVersionId) {
      setCatalog(emptyCatalog);
      return;
    }
    try {
      setCatalog(
        await adminApi<ContentCatalogDto>(
          `/api/admin/content/versions/${selectedVersionId}/catalog`,
        ),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [selectedVersionId]);

  const loadSection = useCallback(async () => {
    if (!selectedVersionId) return;
    setLoading(true);
    setSelectedKeys([]);
    try {
      if (activeResource) {
        const search = searchTerm
          ? `?q=${encodeURIComponent(searchTerm)}`
          : "";
        setEntries(
          await loadAllPages<ContentEntryDto>(
            `/api/admin/content/versions/${selectedVersionId}/${activeResource}${search}`,
          ),
        );
      } else if (section === "rules") {
        const data = await adminApi<RulesDto>(
          `/api/admin/content/versions/${selectedVersionId}/rules`,
        );
        setRules(data);
        setEditorContent(data.content);
      } else {
        setAuditLogs(
          await loadAllPages<AuditLogDto>(
            `/api/admin/audit-logs?contentVersionId=${selectedVersionId}&limit=100`,
          ),
        );
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [activeResource, searchTerm, section, selectedVersionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resetEditor();
      void Promise.all([loadSection(), loadCatalog()]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog, loadSection, resetEditor]);

  function allowDiscard(): boolean {
    return !dirty || window.confirm("Bỏ thay đổi chưa lưu?");
  }

  function changeSection(next: AdminSection) {
    if (next === section || !allowDiscard()) return;
    setSection(next);
    setQuery("");
    setSearchTerm("");
  }

  function changeVersion(next: string) {
    if (next === selectedVersionId || !allowDiscard()) return;
    setSelectedVersionId(next);
  }

  function startNewEntry() {
    if (!activeResource || !allowDiscard()) return;
    resetEditor();
    setEditorContent(structuredClone(contentTemplates[activeResource]));
  }

  async function selectEntry(entry: ContentEntryDto) {
    if (!activeResource || !selectedVersionId || !allowDiscard()) return;
    setLoading(true);
    try {
      const detail = await adminApi<ContentEntryDto>(
        `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${entry.key}`,
      );
      setSelectedEntry(detail);
      setEditorKey(detail.key);
      setEditorEnabled(detail.enabled);
      setEditorContent(detail.content);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!activeResource || !selectedVersionId || !editorKey) return;
    setSaving(true);
    try {
      const saved = selectedEntry
        ? await adminApi<ContentEntryDto>(
            `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${selectedEntry.key}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                enabled: editorEnabled,
                content: editorContent,
                expectedVersion: selectedEntry.version,
              }),
            },
          )
        : await adminApi<ContentEntryDto>(
            `/api/admin/content/versions/${selectedVersionId}/${activeResource}`,
            {
              method: "POST",
              body: JSON.stringify({
                key: editorKey,
                enabled: editorEnabled,
                content: editorContent,
              }),
            },
          );
      setSelectedEntry(saved);
      setEditorKey(saved.key);
      setEditorEnabled(saved.enabled);
      setEditorContent(saved.content);
      setEntries((current) => {
        const exists = current.some(({ key }) => key === saved.key);
        return exists
          ? current.map((entry) => (entry.key === saved.key ? saved : entry))
          : [saved, ...current];
      });
      toast.success("Đã lưu");
      await Promise.all([refreshVersions(), loadCatalog()]);
    } catch (error) {
      toast.error(errorMessage(error), { duration: 8000 });
    } finally {
      setSaving(false);
    }
  }

  async function validateEditor() {
    if (!activeResource || !selectedVersionId) return;
    try {
      const result = await adminApi<{
        valid: boolean;
        issues?: Array<{ path: Array<string | number>; message: string }>;
      }>(`/api/admin/content/versions/${selectedVersionId}/validate-entity`, {
        method: "POST",
        body: JSON.stringify({ resource: activeResource, content: editorContent }),
      });
      if (result.valid) {
        toast.success("Dữ liệu hợp lệ");
      } else {
        toast.error("Dữ liệu chưa hợp lệ", {
          description: result.issues
            ?.slice(0, 6)
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(" · "),
          duration: 9000,
        });
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function deleteEntry() {
    if (!activeResource || !selectedVersionId || !selectedEntry) return;
    if (!window.confirm(`Xoá ${selectedEntry.key}?`)) return;
    try {
      await adminApi<void>(
        `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${selectedEntry.key}`,
        { method: "DELETE", body: "{}" },
      );
      setEntries((current) => current.filter(({ key }) => key !== selectedEntry.key));
      resetEditor();
      toast.success("Đã xoá");
      await Promise.all([refreshVersions(), loadCatalog()]);
    } catch (error) {
      toast.error(errorMessage(error), { duration: 8000 });
    }
  }

  async function duplicateEntry() {
    if (!activeResource || !selectedVersionId || !selectedEntry) return;
    const key = window.prompt("Key cho bản sao:");
    if (!key) return;
    try {
      const copy = await adminApi<ContentEntryDto>(
        `/api/admin/content/versions/${selectedVersionId}/${activeResource}/${selectedEntry.key}/duplicate`,
        { method: "POST", body: JSON.stringify({ key, enabled: false }) },
      );
      setEntries((current) => [copy, ...current]);
      setSelectedEntry(copy);
      setEditorKey(copy.key);
      setEditorEnabled(copy.enabled);
      setEditorContent(copy.content);
      toast.success("Đã nhân bản");
      await Promise.all([refreshVersions(), loadCatalog()]);
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
      setEntries((current) =>
        current.map((entry) =>
          selectedKeys.includes(entry.key) ? { ...entry, enabled } : entry,
        ),
      );
      if (selectedEntry && selectedKeys.includes(selectedEntry.key)) resetEditor();
      setSelectedKeys([]);
      toast.success(enabled ? "Đã bật" : "Đã tắt");
      await loadCatalog();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function saveRules() {
    if (!rules || !selectedVersionId) return;
    setSaving(true);
    try {
      const updated = await adminApi<RulesDto>(
        `/api/admin/content/versions/${selectedVersionId}/rules`,
        {
          method: "PUT",
          body: JSON.stringify({
            content: editorContent,
            expectedVersion: rules.revision,
          }),
        },
      );
      setRules(updated);
      setEditorContent(updated.content);
      toast.success("Đã lưu rules");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function openCreateVersion() {
    setEditingVersion(false);
    setVersionValue("");
    setChangelogValue("");
    setCloneSourceId(selectedVersionId);
    setVersionDialogOpen(true);
  }

  function openEditVersion() {
    if (!currentVersion) return;
    setEditingVersion(true);
    setVersionValue(currentVersion.version);
    setChangelogValue(currentVersion.changelog);
    setCloneSourceId("");
    setVersionDialogOpen(true);
  }

  async function saveVersion() {
    try {
      if (editingVersion && currentVersion) {
        await adminApi<ContentVersionDto>(
          `/api/admin/content/versions/${currentVersion.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              version: versionValue,
              changelog: changelogValue,
              expectedVersion: currentVersion.revision,
            }),
          },
        );
        await refreshVersions();
      } else {
        const created = await adminApi<ContentVersionDto>(
          "/api/admin/content/versions",
          {
            method: "POST",
            body: JSON.stringify({
              version: versionValue,
              changelog: changelogValue,
              ...(cloneSourceId ? { cloneFromVersionId: cloneSourceId } : {}),
            }),
          },
        );
        await refreshVersions();
        setSelectedVersionId(created.id);
      }
      setVersionDialogOpen(false);
      toast.success(editingVersion ? "Đã cập nhật version" : "Đã tạo version");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function validateVersion() {
    if (!selectedVersionId) return;
    try {
      const result = await adminApi<{
        valid: boolean;
        issues: Array<{ severity: string; message: string }>;
      }>(`/api/admin/content/versions/${selectedVersionId}/validate`, {
        method: "POST",
        body: "{}",
      });
      const errors = result.issues.filter(({ severity }) => severity === "error").length;
      const warnings = result.issues.length - errors;
      toast[result.valid ? "success" : "error"](
        result.valid ? `Hợp lệ · ${warnings} cảnh báo` : `${errors} lỗi · ${warnings} cảnh báo`,
        {
          description: result.issues.slice(0, 5).map(({ message }) => message).join(" · "),
          duration: 10000,
        },
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function publishVersion() {
    if (!selectedVersionId || !window.confirm("Publish version này?")) return;
    try {
      await adminApi(`/api/admin/content/versions/${selectedVersionId}/publish`, {
        method: "POST",
        body: "{}",
      });
      await refreshVersions();
      toast.success("Đã publish");
    } catch (error) {
      toast.error(errorMessage(error), { duration: 9000 });
    }
  }

  async function archiveVersion() {
    if (!selectedVersionId || !window.confirm("Archive version này?")) return;
    try {
      await adminApi(`/api/admin/content/versions/${selectedVersionId}/archive`, {
        method: "POST",
        body: "{}",
      });
      await refreshVersions();
      toast.success("Đã archive");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function deleteVersion() {
    if (!selectedVersionId || !currentVersion || !window.confirm(`Xoá draft ${currentVersion.version}?`)) return;
    try {
      await adminApi<void>(`/api/admin/content/versions/${selectedVersionId}`, {
        method: "DELETE",
        body: "{}",
      });
      setSelectedVersionId("");
      await refreshVersions();
      toast.success("Đã xoá version");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <div className="mr-2 flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-zinc-100 text-xs font-black text-zinc-950">A</span>
            <span className="hidden sm:inline">APOC Admin</span>
          </div>
          <select
            value={selectedVersionId}
            onChange={(event) => changeVersion(event.target.value)}
            className="h-8 min-w-0 max-w-52 rounded-md border border-white/10 bg-zinc-900 px-2 text-sm outline-none"
            aria-label="Content version"
          >
            <option value="">Chưa có version</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.version} · {version.status}
              </option>
            ))}
          </select>
          <Button size="icon-sm" variant="outline" onClick={openCreateVersion} aria-label="Tạo version"><Plus /></Button>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={validateVersion} disabled={!selectedVersionId}><Check /><span className="hidden sm:inline">Validate</span></Button>
            {isDraft && <Button size="sm" onClick={publishVersion} disabled={dirty}><Send /><span className="hidden sm:inline">Publish</span></Button>}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Thao tác version" />}><MoreHorizontal /></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isDraft && <DropdownMenuItem onClick={openEditVersion}><Settings2 />Sửa version</DropdownMenuItem>}
                {currentVersion?.status === "published" && <DropdownMenuItem onClick={archiveVersion}><Archive />Archive</DropdownMenuItem>}
                {isDraft && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={deleteVersion}><Trash2 />Xoá version</DropdownMenuItem></>}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" variant="ghost" className="max-w-32" />}>
                <span className="truncate">{username}</span><ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => signOut({ callbackUrl: "/admin/login" })}><LogOut />Đăng xuất</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1920px] flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-white/8 p-2 lg:w-48 lg:border-r lg:border-b-0 lg:p-3">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Content sections">
            {(["rules", ...adminResources, "audit"] as AdminSection[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeSection(item)}
                className={`flex shrink-0 items-center justify-between gap-4 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${section === item ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}
              >
                <span>{sectionLabels[item]}</span>
                {adminResources.includes(item as AdminResource) && currentVersion && (
                  <span className="font-mono text-[11px] text-zinc-600">{currentVersion.counts[item as AdminResource] ?? 0}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {!selectedVersionId ? (
          <section className="grid min-h-96 flex-1 place-items-center p-6 text-center">
            <div><CirclePlus className="mx-auto mb-3 size-8 text-zinc-700" /><p className="text-sm text-zinc-500">Tạo content version để bắt đầu</p><Button className="mt-4" onClick={openCreateVersion}><Plus />Version mới</Button></div>
          </section>
        ) : activeResource ? (
          <div className="grid min-w-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
            <section className="min-w-0 border-b border-white/8 lg:border-r lg:border-b-0">
              <div className="sticky top-14 z-20 border-b border-white/8 bg-zinc-950 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h1 className="font-medium">{resourceLabels[activeResource]}</h1>
                  {isDraft && <Button size="xs" onClick={startNewEntry}><Plus />Tạo</Button>}
                </div>
                <form className="flex gap-1.5" onSubmit={(event) => { event.preventDefault(); if (!allowDiscard()) return; resetEditor(); setSearchTerm(query.trim()); }}>
                  <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-zinc-600" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm key hoặc tên" className="pl-8" /></div>
                  <Button type="button" size="icon" variant="outline" onClick={() => { if (!allowDiscard()) return; resetEditor(); void loadSection(); }} aria-label="Tải lại"><RefreshCw /></Button>
                </form>
                {isDraft && selectedKeys.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5"><span className="mr-auto text-xs text-zinc-500">{selectedKeys.length} đã chọn</span><Button size="xs" variant="outline" onClick={() => bulkSetEnabled(true)}>Bật</Button><Button size="xs" variant="outline" onClick={() => bulkSetEnabled(false)}>Tắt</Button></div>
                )}
              </div>
              <div className="inventory-scroll max-h-[calc(100vh-10.5rem)] overflow-y-auto p-2">
                {entries.map((entry) => (
                  <div key={entry.id} className={`group mb-1 flex items-center gap-2 rounded-md border px-2 py-2 ${selectedEntry?.id === entry.id ? "border-zinc-600 bg-zinc-800/80" : "border-transparent hover:bg-zinc-900"}`}>
                    {isDraft && <Checkbox checked={selectedKeys.includes(entry.key)} onCheckedChange={(checked) => setSelectedKeys((current) => checked === true ? Array.from(new Set([...current, entry.key])) : current.filter((key) => key !== entry.key))} aria-label={`Chọn ${entry.key}`} />}
                    <button type="button" onClick={() => selectEntry(entry)} className="min-w-0 flex-1 text-left">
                      <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{String(entry.content.name ?? entry.content.timeLabel ?? entry.key)}</span>{!entry.enabled && <span className="size-1.5 rounded-full bg-zinc-600" title="Disabled" />}</span>
                      <span className="block truncate font-mono text-[11px] text-zinc-600">{entry.key}</span>
                    </button>
                  </div>
                ))}
                {!loading && entries.length === 0 && <p className="px-2 py-12 text-center text-sm text-zinc-600">Không có dữ liệu</p>}
              </div>
            </section>

            <section className="min-w-0">
              {editorIsOpen ? (
                <div className="mx-auto max-w-5xl">
                  <div className="sticky top-14 z-20 flex flex-wrap items-end gap-3 border-b border-white/8 bg-zinc-950/95 px-4 py-3 backdrop-blur">
                    <label className="min-w-52 flex-1 space-y-1"><span className="text-[11px] font-medium text-zinc-500">Stable key</span><Input value={editorKey} onChange={(event) => setEditorKey(event.target.value.toLowerCase())} disabled={Boolean(selectedEntry) || !isDraft} placeholder="snake_case_key" className="font-mono" /></label>
                    <label className="flex h-9 items-center gap-2 text-sm text-zinc-400"><Checkbox checked={editorEnabled} onCheckedChange={(checked) => setEditorEnabled(checked === true)} disabled={!isDraft} />Enabled</label>
                    {dirty && <span className="hidden text-xs text-amber-400 sm:block">Chưa lưu</span>}
                    <Button size="sm" variant="outline" onClick={validateEditor}>Validate</Button>
                    {isDraft && <Button size="sm" onClick={saveEntry} disabled={saving || !editorKey}><Save />{saving ? "Đang lưu" : "Lưu"}</Button>}
                    {selectedEntry && isDraft && (
                      <DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Thao tác content" />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={duplicateEntry}><ClipboardCopy />Nhân bản</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={deleteEntry}><Trash2 />Xoá</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    )}
                  </div>
                  <div className="space-y-5 p-4 sm:p-6">
                    {selectedEntry?.dependencies && selectedEntry.dependencies.length > 0 && <details className="rounded-md border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-xs text-amber-200"><summary className="cursor-pointer">Được tham chiếu tại {selectedEntry.dependencies.length} nơi</summary><div className="mt-2 space-y-1 text-amber-200/60">{selectedEntry.dependencies.map((dependency) => <p key={`${dependency.resource}:${dependency.key}:${dependency.path}`} className="font-mono">{dependency.resource}/{dependency.key} · {dependency.path}</p>)}</div></details>}
                    <ResourceEditor resource={activeResource} value={editorContent} onChange={setEditorContent} catalog={catalog} disabled={!isDraft} />
                  </div>
                </div>
              ) : (
                <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center text-sm text-zinc-600">Chọn hoặc tạo một mục</div>
              )}
            </section>
          </div>
        ) : section === "rules" ? (
          <section className="min-w-0 flex-1">
            <div className="mx-auto max-w-5xl">
              <div className="sticky top-14 z-20 flex items-center gap-3 border-b border-white/8 bg-zinc-950/95 px-4 py-3 backdrop-blur"><h1 className="mr-auto font-medium">Game rules</h1>{dirty && <span className="text-xs text-amber-400">Chưa lưu</span>}{isDraft && <Button size="sm" onClick={saveRules} disabled={saving}><Save />Lưu</Button>}</div>
              <div className="p-4 sm:p-6"><RulesEditor value={editorContent} onChange={setEditorContent} disabled={!isDraft} /></div>
            </div>
          </section>
        ) : (
          <section className="min-w-0 flex-1">
            <div className="sticky top-14 z-20 flex items-center border-b border-white/8 bg-zinc-950 px-4 py-3"><History className="mr-2 size-4 text-zinc-500" /><h1 className="font-medium">Audit</h1><Button className="ml-auto" size="icon-sm" variant="outline" onClick={loadSection}><RefreshCw /></Button></div>
            <div className="mx-auto max-w-5xl space-y-2 p-4 sm:p-6">{auditLogs.map((log) => <details key={log.id} className="rounded-md border border-white/8 bg-zinc-900/30 px-3 py-2"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm"><Badge variant="outline">{log.action}</Badge><span className="font-medium">{log.entityType}/{log.entityKey}</span><time className="ml-auto text-xs text-zinc-600">{new Date(log.createdAt).toLocaleString("vi-VN")}</time></summary>{(log.before !== undefined || log.after !== undefined) && <div className="mt-3 grid gap-3 border-t border-white/8 pt-3 lg:grid-cols-2"><div><p className="mb-1 text-[11px] uppercase text-zinc-600">Before</p><pre className="max-h-72 overflow-auto rounded bg-zinc-950 p-2 text-[11px] text-zinc-400">{JSON.stringify(log.before, null, 2)}</pre></div><div><p className="mb-1 text-[11px] uppercase text-zinc-600">After</p><pre className="max-h-72 overflow-auto rounded bg-zinc-950 p-2 text-[11px] text-zinc-400">{JSON.stringify(log.after, null, 2)}</pre></div></div>}</details>)}{!loading && auditLogs.length === 0 && <p className="py-16 text-center text-sm text-zinc-600">Chưa có audit log</p>}</div>
          </section>
        )}
      </main>

      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingVersion ? "Sửa version" : "Version mới"}</DialogTitle></DialogHeader>
          <div className="space-y-3"><label className="block space-y-1.5"><span className="text-xs text-zinc-500">Version</span><Input value={versionValue} onChange={(event) => setVersionValue(event.target.value)} placeholder="1.0.0" /></label><label className="block space-y-1.5"><span className="text-xs text-zinc-500">Changelog</span><Textarea value={changelogValue} onChange={(event) => setChangelogValue(event.target.value)} /></label>{!editingVersion && <label className="block space-y-1.5"><span className="text-xs text-zinc-500">Clone từ</span><select value={cloneSourceId} onChange={(event) => setCloneSourceId(event.target.value)} className="h-9 w-full rounded-md border border-white/10 bg-zinc-950 px-2 text-sm"><option value="">Tạo trống</option>{versions.map((version) => <option key={version.id} value={version.id}>{version.version}</option>)}</select></label>}</div>
          <DialogFooter><Button onClick={saveVersion} disabled={!versionValue}><Save />Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
