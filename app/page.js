"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Eye,
  Sparkles,
  UploadCloud,
  FileText,
  X,
  Star,
  GitBranch,
  Copy,
  ExternalLink,
  Moon,
  Sun,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // README modal
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMeta, setModalMeta] = useState(null);
  const [modalTab, setModalTab] = useState("readme"); // 'readme' | 'commands' | 'overview'

  // Initialize dark mode from localStorage
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    const html = document.documentElement;
    if (shouldBeDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const html = document.documentElement;
    const currentlyDark = html.classList.contains('dark');
    const newMode = !currentlyDark;
    
    if (newMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    setIsDarkMode(newMode);
  };


  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setError(null);
      return;
    }
    const allowedExtensions = [".pdf", ".docx"];
    const fileExtension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      setSelectedFile(file);
      setError(null);
    } else {
      setSelectedFile(null);
      setError("Invalid file type — please upload .pdf or .docx");
      event.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please upload your resume first.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setResults(null);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const data = await res.json();
      if (!data.success) setError(data.error || "Failed to parse resume.");
      else setResults(data);
    } catch (err) {
      console.error(err);
      setError("Network or server error.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (e) => {
    e?.preventDefault();
    setSelectedFile(null);
    setError(null);
    setResults(null);
    const fi = document.getElementById("resume-file");
    if (fi) fi.value = null;
  };

  // utilities to extract code blocks from markdown (for Commands tab)
  const extractCodeBlocks = (md) => {
    if (!md) return [];
    const re = /```([\w+-]*)\n([\s\S]*?)```/g;
    const res = [];
    let m;
    while ((m = re.exec(md))) {
      res.push({ lang: m[1] || "", code: m[2].trim() });
    }
    return res;
  };

  // custom code renderer for ReactMarkdown — adds copy button + language label
  const CodeRenderer = ({ inline, className, children }) => {
    const code = String(children).replace(/\n$/, "");
    if (inline) {
      return <code className="inline-code">{code}</code>;
    }
    const lang = (className || "").replace("language-", "");
    const copyCode = async () => {
      try {
        await navigator.clipboard.writeText(code);
      } catch (e) {
        console.error("copy failed", e);
      }
    };
    return (
      <div className="md-code my-4">
        <div className="code-header">
          {lang && <div className="code-lang">{lang}</div>}
          <button className="copy-btn" onClick={copyCode} title="Copy code">
            <Copy className="inline-block" style={{ width: 14, height: 14 }} /> Copy
          </button>
        </div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  // Small UI component: icon+stat in horizontal row
  const Stat = ({ children, label }) => (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {children}
      <span>{label}</span>
    </div>
  );

  // Derived: if results present, prepare profile and repos arrays for nicer layout
  // Handles three cases:
  // 1) API returned a user profile entity (with `profile` and `repos`) -> show profile + its repos
  // 2) API returned a single repo entity (repoInfo) -> show that as one repo
  // 3) API returned multiple repo-only entities (when resume contained several repo links) -> treat results.github as list of repos
  const items = results?.github ?? [];
  let profile = null;
  let entity = null;
  let repos = [];

  if (items.length > 0) {
    // Prefer an item that has a profile (user case)
    const profileItem = items.find((it) => it && it.profile);
    if (profileItem) {
      profile = profileItem.profile;
      entity = profileItem;
      repos = entity.repos ?? (entity.repoInfo ? [entity.repoInfo] : []);
    } else if (items.length === 1) {
      // Single item (likely a single repo link)
      entity = items[0];
      // If repoInfo present, use that, otherwise try to normalize the item into a repo-like object
      if (entity.repoInfo) {
        repos = [entity.repoInfo].map((ri) => ({
          ...ri,
          readme: entity.readme || ri.readme || null,
          readmeSnippet: entity.readmeSnippet || ri.readmeSnippet || null,
          techStack: entity.techStack || ri.techStack || [],
          firstCommitDate: entity.firstCommitDate || ri.created_at || null,
          lastCommitDate: entity.lastCommitDate || ri.pushed_at || null,
          durationDays: entity.durationDays ?? (ri.created_at && ri.pushed_at ? Math.max(0, Math.round((Date.parse(ri.pushed_at) - Date.parse(ri.created_at)) / (1000*60*60*24))) : null),
        }));
      } else {
        // item may already contain repo-like fields (from mapWithConcurrency when fetching many repos)
        repos = [entity].map((it) => ({
          full_name: it.full_name || (it.owner && it.repo ? `${it.owner}/${it.repo}` : undefined),
          name: it.name || it.repo || (it.full_name && it.full_name.split('/').pop()),
          html_url: it.html_url || it.url,
          description: it.description || it.repoInfo?.description || '',
          stargazers_count: it.stargazers_count || it.repoInfo?.stargazers_count || 0,
          forks_count: it.forks_count || it.repoInfo?.forks_count || 0,
          techStack: it.techStack || it.repoInfo?.techStack || [],
          readme: it.readme || null,
          readmeSnippet: it.readmeSnippet || null,
          firstCommitDate: it.firstCommitDate || it.repoInfo?.created_at || null,
          lastCommitDate: it.lastCommitDate || it.repoInfo?.pushed_at || null,
          durationDays: it.durationDays ?? (it.firstCommitDate && it.lastCommitDate ? Math.max(0, Math.round((Date.parse(it.lastCommitDate) - Date.parse(it.firstCommitDate)) / (1000*60*60*24))) : null),
        }));
      }
    } else {
      // Multiple items and none have a profile -> treat each item as a repo entry
      repos = items.map((it) => ({
        full_name: it.full_name || (it.owner && it.repo ? `${it.owner}/${it.repo}` : undefined),
        name: it.name || it.repo || (it.full_name && it.full_name.split('/').pop()),
        html_url: it.html_url || it.url,
        description: it.description || it.repoInfo?.description || '',
        stargazers_count: it.stargazers_count || it.repoInfo?.stargazers_count || 0,
        forks_count: it.forks_count || it.repoInfo?.forks_count || 0,
        techStack: it.techStack || it.repoInfo?.techStack || [],
        readme: it.readme || null,
        readmeSnippet: it.readmeSnippet || null,
        firstCommitDate: it.firstCommitDate || it.repoInfo?.created_at || null,
        lastCommitDate: it.lastCommitDate || it.repoInfo?.pushed_at || null,
        durationDays: it.durationDays ?? ( (it.firstCommitDate && it.lastCommitDate) ? Math.max(0, Math.round((Date.parse(it.lastCommitDate) - Date.parse(it.firstCommitDate)) / (1000*60*60*24))) : null),
      }));
      // set a generic entity for summary to show the first repo link
      entity = items[0];
    }
  }

  // Precompute bash blocks for modal when content changes
  const modalCodeBlocks = useMemo(() => extractCodeBlocks(modalContent), [modalContent]);

  return (
    <main className="flex items-start justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8 relative overflow-x-hidden transition-colors duration-300">
      {/* decorative blobs */}
      <div className="absolute w-72 h-72 bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl opacity-25 dark:opacity-10 -z-10 left-16 top-16"></div>
      <div className="absolute w-96 h-96 bg-indigo-200 dark:bg-indigo-900 rounded-full blur-3xl opacity-20 dark:opacity-10 -z-10 right-8 bottom-8"></div>

      <div className="w-full max-w-6xl">
        {/* header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-gray-800 shadow flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-gray-100">Blink Analytics</h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Bright, actionable GitHub insights from your resume ✨</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left sm:text-right hidden sm:block">
              <div className="text-sm text-gray-500 dark:text-gray-400">Change Mode</div>
            </div>
            <button
              onClick={toggleDarkMode}
              type="button"
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mounted ? (
                isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        </header>

        {/* main container: upload controls + results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left column: uploader + summary */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm hover-lift">
              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resume Inbox</label>
                <div
                  className="relative text-center border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition p-6 cursor-pointer"
                  title="Click to upload"
                >
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">Click or drop a file to upload</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF / DOCX</div>
                </div>

                {selectedFile && (
                  <div className="mt-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Ready to analyze</div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1"
                      title="Remove"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !selectedFile}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  {isLoading ? "Analyzing..." : "Analyze Resume"}
                </button>
              </form>

              {/* Quick summary if results exist */}
              {results && entity && (
                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Detected entity</div>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={entity.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
                        >
                          {entity.type === "user" ? `@${entity.owner}` : `${entity.owner}/${entity.repo}`}
                        </a>
                      </div>
                      {profile?.bio && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{profile.bio}</div>}
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Activity (30d)</div>
                        <div className="mt-1 progress-track">
                          <div className="progress-fill" style={{ width: `${entity.activity?.percentActive ?? 0}%` }}></div>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{entity.activity?.daysActive ?? 0} days active • {entity.activity?.percentActive ?? 0}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="mb-2">How it works</div>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Upload your resume</li>
                <li>We extract GitHub links and fetch repo metadata</li>
                <li>Explore repos and READMEs here</li>
              </ol>
            </div>
          </aside>

          {/* Right: profile + repos */}
          <section className="lg:col-span-2 space-y-6">
            {/* Profile card (if user) */}
            {profile && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 hover-lift">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-indigo-600 dark:text-indigo-400"><Eye /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{profile.name || profile.login || entity.owner}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{profile.login || entity.owner}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <div className="pill bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 whitespace-nowrap">Followers: {profile.followers ?? 0}</div>
                      <div className="pill bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 whitespace-nowrap">Repos: {profile.public_repos ?? 0}</div>
                    </div>
                  </div>
                  {profile.bio && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{profile.bio}</p>}
                </div>
              </div>
            )}

            {/* Repo grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repos && repos.length > 0 ? repos.map((r, idx) => {
                const key = r.full_name || r.name || `${entity.owner}/${r.name || idx}`;
                return (
                  <article key={key} className="relative flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover-lift">
                    {/* left accent */}
                    <div className="card-accent hidden sm:block" aria-hidden />
                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mb-2">
                            <a 
                              href={r.html_url || r.html_url || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline truncate text-sm sm:text-base min-w-0 flex-1"
                              title={r.full_name || r.name || (entity.owner + '/' + (r.name || 'repo'))}
                            >
                              {r.full_name || r.name || (entity.owner + '/' + (r.name || 'repo'))}
                            </a>
                            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <Star className="w-3 h-3 sm:w-4 sm:h-4" /> 
                                <span>{r.stargazers_count ?? r.stargazers_count ?? 0}</span>
                              </div>
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <GitBranch className="w-3 h-3 sm:w-4 sm:h-4" /> 
                                <span>{r.forks_count ?? 0}</span>
                              </div>
                            </div>
                          </div>

                          {r.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 sm:line-clamp-3">{r.description}</p>}

                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {r.techStack && r.techStack.slice(0, 6).map(t => (
                              <span key={t} className="pill bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 whitespace-nowrap">{t}</span>
                            ))}

                            {r.durationDays != null && (
                              <span className="pill bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-600 whitespace-nowrap">Duration: {r.durationDays}d</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* short meta row */}
                      <div className="mt-3 flex items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        {r.firstCommitDate && <div className="whitespace-nowrap">Created: {new Date(r.firstCommitDate).toLocaleDateString()}</div>}
                        {r.lastCommitDate && <div className="hidden sm:inline">•</div>}
                        {r.lastCommitDate && <div className="whitespace-nowrap">Updated: {new Date(r.lastCommitDate).toLocaleDateString()}</div>}
                      </div>

                      {/* actions */}
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {r.readme && (
                          <button
                            onClick={() => {
                              setModalContent(r.readme);
                              setModalTitle(r.full_name || r.name);
                              setModalMeta({ firstCommitDate: r.firstCommitDate, lastCommitDate: r.lastCommitDate, durationDays: r.durationDays });
                              setModalTab("readme");
                              setShowModal(true);
                            }}
                            className="text-xs bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md whitespace-nowrap"
                          >
                            View README
                          </button>
                        )}

                        <a 
                          className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 sm:gap-2 whitespace-nowrap" 
                          href={r.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Open on GitHub <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              }) : (
                <div className="text-gray-500 dark:text-gray-400">No repositories or profiles found.</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* README Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[86vh] overflow-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6">
            <div className="flex items-start gap-4 mb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400">{modalTitle}</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {modalMeta?.firstCommitDate && <span>First: {new Date(modalMeta.firstCommitDate).toLocaleDateString()}</span>}
                  {modalMeta?.lastCommitDate && <span className="mx-2">•</span>}
                  {modalMeta?.lastCommitDate && <span>Last: {new Date(modalMeta.lastCommitDate).toLocaleDateString()}</span>}
                  {modalMeta?.durationDays != null && <span className="mx-2">•</span>}
                  {modalMeta?.durationDays != null && <span>Duration: {modalMeta.durationDays} days</span>}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">View</div>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                  <button
                    onClick={() => setModalTab("readme")}
                    className={`px-3 py-1 text-sm rounded ${modalTab === "readme" ? "bg-white dark:bg-gray-600 shadow text-indigo-700 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    README
                  </button>
                  <button
                    onClick={() => setModalTab("commands")}
                    className={`px-3 py-1 text-sm rounded ${modalTab === "commands" ? "bg-white dark:bg-gray-600 shadow text-indigo-700 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    Commands
                  </button>
                  <button
                    onClick={() => setModalTab("overview")}
                    className={`px-3 py-1 text-sm rounded ${modalTab === "overview" ? "bg-white dark:bg-gray-600 shadow text-indigo-700 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    Overview
                  </button>
                </div>

                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {modalTab === "overview" && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <div className="mb-3 font-semibold">Repository Overview</div>
                  {/* We attempt to extract basic metadata from modalMeta if present; fallback to showing raw link */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {modalMeta ? (
                      <>
                        {modalMeta.firstCommitDate && <div>First commit: {new Date(modalMeta.firstCommitDate).toLocaleDateString()}</div>}
                        {modalMeta.lastCommitDate && <div>Last commit: {new Date(modalMeta.lastCommitDate).toLocaleDateString()}</div>}
                        {modalMeta.durationDays != null && <div>Duration: {modalMeta.durationDays} days</div>}
                      </>
                    ) : (
                      <div>No structured overview available.</div>
                    )}
                  </div>
                </div>
              )}

              {modalTab === "readme" && (
                <div className="prose text-gray-800 dark:text-gray-200">
                  <ReactMarkdown components={{ code: CodeRenderer }} remarkPlugins={[remarkGfm]}>
                    {modalContent || "*No README content available.*"}
                  </ReactMarkdown>
                </div>
              )}

              {modalTab === "commands" && (
                <div>
                  <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Extracted code blocks</div>
                  {modalCodeBlocks.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No fenced code blocks found in README.</div>
                  ) : (
                    <div className="space-y-3">
                      {modalCodeBlocks.map((b, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Language: <span className="font-medium text-gray-700 dark:text-gray-300">{b.lang || "text"}</span></div>
                            <button
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                              onClick={async () => { await navigator.clipboard.writeText(b.code); }}
                            >
                              Copy block
                            </button>
                          </div>
                          <div className="md-code">
                            <pre><code>{b.code}</code></pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

