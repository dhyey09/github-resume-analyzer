"use client";

import { useState } from 'react';
// Icons
import { Eye, Sparkles, UploadCloud, FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  /**
   * Handles the file input 'onChange' event.
   * validates the file type.
   */
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      setSelectedFile(null);
      setError(null);
      return;
    }

    const allowedExtensions = ['.pdf', '.docx'];
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
      setSelectedFile(file);
      setError(null); 
    } else {
      setSelectedFile(null);
      setError('Invalid file type. Please upload a .pdf or .docx file.');
      event.target.value = null;
    }
  };

  /**
   * Handles the form submission.
   * Validates the file type and submits.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please place your resume in the inbox to analyze.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setError('Server error: response was not JSON. See console for details.');
        setResults(null);
        return;
      }
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to parse resume.');
        setResults(null);
      } else {
        setResults(data);
        setError(null);
      }
    } catch (err) {
      setError('Network or server error.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (event) => {
    event.preventDefault(); // Stop event propagation
    setSelectedFile(null);
    setError(null);
    setResults(null);
    const fileInput = document.getElementById('resume-file');
    if (fileInput) {
      fileInput.value = null;
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMeta, setModalMeta] = useState(null);

  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-900 p-4 font-sans">
      <div className="max-w-3xl w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* === Header Section === */}
        <div className="p-6 md:p-8 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-600/20 rounded-xl border border-purple-800">
              <Eye className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Blink Analytics</h1>
              <p className="text-slate-400 text-sm">Welcome. Please submit your resume to the inbox below.</p>
            </div>
          </div>
        </div>
        {/* === Form Section === */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <label htmlFor="resume-file" className="block text-sm font-medium text-slate-300 mb-2">
            Place Resume in Inbox
          </label>
          <div className="w-full h-48 relative bg-slate-900 rounded-lg border-2 border-slate-700 transition-all duration-300 overflow-hidden">
            <label 
              htmlFor="resume-file" 
              className={`absolute inset-0 flex flex-col items-center justify-center w-full h-full p-6 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer 
                         hover:bg-slate-800/50 hover:border-purple-500
                         transition-all duration-300 ease-in-out
                         ${selectedFile ? 'opacity-0 translate-y-5 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'} z-20`}
            >
              <UploadCloud className="w-10 h-10 text-slate-500 mb-3" />
              <span className="font-semibold text-purple-400">Click to upload resume</span>
              <span className="text-slate-500 text-sm mt-1">.PDF or .DOCX</span>
            </label>
            <div 
              className={`absolute inset-0 flex items-center justify-center p-6
                          transition-all duration-300 ease-in-out
                          ${selectedFile ? 'opacity-100 translate-y-0 pointer-events-auto z-10' : 'opacity-0 -translate-y-5 pointer-events-none z-0'}`}
            >
              <div className="relative flex items-center w-full max-w-sm p-4 bg-white/95 rounded-md shadow-lg">
                <FileText className="w-8 h-8 text-indigo-700 mr-3 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-sm font-semibold text-gray-800 truncate block" title={selectedFile?.name}>
                    {selectedFile?.name}
                  </span>
                  <span className="text-xs text-gray-600">Ready to submit</span>
                </div>
                <button 
                  type="button" 
                  onClick={removeFile} 
                  className="absolute -top-2 -right-2 ml-2 p-1 text-gray-500 bg-white rounded-full hover:text-red-500 hover:bg-gray-100 shadow-md"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <input
              id="resume-file"
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
          </div>
          {error && (
            <div className="mt-4 flex items-center p-3 bg-red-900/30 border border-red-700 rounded-lg animate-fade-in-up">
              <X className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading || !selectedFile} 
              className="w-full cursor-pointer flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-semibold shadow-lg 
                         hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 
                         transition-all duration-300 transform hover:-translate-y-0.5
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {isLoading ? 'Analyzing...' : 'Submit Resume'}
            </button>
          </div>
        </form>
        {/* === Results Section === */}
        {results && (
          <div className="p-6 mt-4 pt-0 md:p-8 md:pt-0 border-t border-slate-700 bg-slate-900 animate-fade-in-up">
            <h2 className="text-lg mt-4 font-bold text-purple-300 mb-4 flex items-center"><Sparkles className="w-5 h-5 mr-2" />GitHub Profiles & Repos Found</h2>
            {results.github.length === 0 ? (
              <div className="text-slate-400">No GitHub profiles or repositories detected in your resume.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-1">
                {results.github.map((item, idx) => (
                  <div key={item.url + idx} className="bg-slate-800 rounded-lg border border-purple-700 shadow p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 text-purple-400 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-300 hover:underline text-sm">
                            {item.type === 'user' ? `@${item.owner}` : `${item.owner}/${item.repo}`}
                          </a>
                          <span className="ml-auto text-xs text-slate-400">Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {item.profile && (
                          <div className="mt-2 text-xs text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{item.profile.name || item.owner}</span>
                              <span className="text-slate-400">• @{item.owner}</span>
                              <span className="ml-auto text-xs text-slate-400">Active days (30d): {item.activity?.daysActive ?? 0} ({item.activity?.percentActive ?? 0}%)</span>
                            </div>
                            {item.profile.bio && <div className="mt-1 text-xs text-slate-400">{item.profile.bio}</div>}
                          </div>
                        )}
                        {item.repoInfo && (
                          <div className="mt-2 text-xs text-slate-300">
                            <div className="font-semibold">{item.repoInfo.full_name}</div>
                            {item.repoInfo.description && <div className="text-slate-400">{item.repoInfo.description}</div>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* If this is a user with repos, list them */}
                    {item.repos && item.repos.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-semibold text-purple-200 mb-2">Public repositories</div>
                        <div className="space-y-3">
                          {item.repos.map((r) => (
                            <div key={r.full_name} className="bg-slate-900 border border-slate-700 rounded p-3">
                              <div className="flex items-center justify-between">
                                <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-purple-300 hover:underline">
                                  {r.name}
                                </a>
                                <div className="text-xs text-slate-400">⭐ {r.stargazers_count} • Forks: {r.forks_count}</div>
                              </div>
                              {r.description && <div className="text-xs text-slate-400 mt-1">{r.description}</div>}
                              <div className="mt-1 text-xs text-slate-500">
                                {r.firstCommitDate && <span>First: {new Date(r.firstCommitDate).toLocaleDateString()}</span>}
                                {r.lastCommitDate && <span className="mx-2">•</span>}
                                {r.lastCommitDate && <span>Last: {new Date(r.lastCommitDate).toLocaleDateString()}</span>}
                                {r.durationDays != null && <span className="mx-2">•</span>}
                                {r.durationDays != null && <span>Duration: {r.durationDays} days</span>}
                              </div>
                              {r.techStack && r.techStack.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {r.techStack.slice(0,5).map((t) => (
                                    <span key={t} className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">{t}</span>
                                  ))}
                                </div>
                              )}
                              {/* View README button (opens modal) */}
                              {r.readme && (
                                <div className="mt-3">
                                  <button onClick={() => { setModalContent(r.readme); setModalTitle(r.full_name); setModalMeta({ firstCommitDate: r.firstCommitDate, lastCommitDate: r.lastCommitDate, durationDays: r.durationDays }); setShowModal(true); }} className="text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white">
                                    View README
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* If this is a single repo entity, show extracted readme/tech */}
                    {item.repoInfo && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-500 mb-2">
                          {item.firstCommitDate && <span>First commit: {new Date(item.firstCommitDate).toLocaleDateString()}</span>}
                          {item.lastCommitDate && <span className="mx-2">•</span>}
                          {item.lastCommitDate && <span>Last commit: {new Date(item.lastCommitDate).toLocaleDateString()}</span>}
                          {item.durationDays != null && <span className="mx-2">•</span>}
                          {item.durationDays != null && <span>Duration: {item.durationDays} days</span>}
                        </div>
                        {item.techStack && item.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.techStack.slice(0,5).map((t) => (
                              <span key={t} className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">{t}</span>
                            ))}
                          </div>
                        )}
                        {item.readmeSnippet && (
                          <div className="text-xs text-slate-400">{item.readmeSnippet}</div>
                        )}
                        {item.readme && (
                          <div className="mt-2">
                            <button onClick={() => { setModalContent(item.readme); setModalTitle(item.repoInfo?.full_name || item.url); setModalMeta({ firstCommitDate: item.firstCommitDate, lastCommitDate: item.lastCommitDate, durationDays: item.durationDays }); setShowModal(true); }} className="text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white">
                              View README
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* README modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-3xl max-h-[80vh] overflow-auto bg-white rounded-lg shadow-2xl border border-slate-700 p-4 z-60">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-extrabold text-purple-700">{modalTitle}</h3>
                    <div className="text-xs text-slate-500 mt-1">
                      {modalMeta?.firstCommitDate && <span>First commit: {new Date(modalMeta.firstCommitDate).toLocaleDateString()}</span>}
                      {modalMeta?.lastCommitDate && <span className="mx-2">•</span>}
                      {modalMeta?.lastCommitDate && <span>Last commit: {new Date(modalMeta.lastCommitDate).toLocaleDateString()}</span>}
                      {modalMeta?.durationDays != null && <span className="mx-2">•</span>}
                      {modalMeta?.durationDays != null && <span>Duration: {modalMeta.durationDays} days</span>}
                    </div>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-slate-100">
                    <X className="w-5 h-5 text-slate-700" />
                  </button>
                </div>
                <div className="prose max-w-none text-slate-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{modalContent}</ReactMarkdown>
                </div>
            </div>
          </div>
        )}
      </div>
  </main>
  );
}
