export const runtime = 'nodejs';

import mammoth from 'mammoth';

/**
 * Extract GitHub usernames and repo paths from a block of text.
 * Returns an array of { type: 'user'|'repo', owner, repo?, url, confidence }
 */


function extractGithubEntities(text) {
  if (!text || typeof text !== 'string') return [];

  const results = [];
  const seen = new Set();

  // 1) Match full URLs like https://github.com/owner or https://github.com/owner/repo
  const urlRe = /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})(?:\/(?!issues|pulls|pull|blob|tree|releases|actions)([^\s\n\r]+))?/gi;
  let m;
  while ((m = urlRe.exec(text))) {
    const owner = m[1];
    const repo = m[2] ? m[2].replace(/[\/)\]\.,;]+$/, '') : undefined;
    const key = repo ? `${owner}/${repo}` : owner;
    if (seen.has(key)) continue;
    seen.add(key);
    const url = `https://github.com/${owner}${repo ? '/' + repo : ''}`;
    // Give higher confidence to user profiles (0.99) than repositories (0.95)
    results.push({ type: repo ? 'repo' : 'user', owner, repo, url, confidence: repo ? 0.95 : 0.99 });
  }

  // 2) Match plain github.com/owner or github.com/owner/repo without protocol
  const plainRe = /(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})(?:\/([^\s\n\r]+))?/gi;
  while ((m = plainRe.exec(text))) {
    const owner = m[1];
    const repo = m[2] ? m[2].replace(/[\/)\]\.,;]+$/, '') : undefined;
    const key = repo ? `${owner}/${repo}` : owner;
    if (seen.has(key)) continue;
    seen.add(key);
    const url = `https://github.com/${owner}${repo ? '/' + repo : ''}`;
    // Give higher confidence to user profiles (0.99) than repositories (0.95) for URLs without protocol
    results.push({ type: repo ? 'repo' : 'user', owner, repo, url, confidence: repo ? 0.95 : 0.99 });
  }

  // 3) Look for explicit labels like "GitHub: username" or "github - username"
  const labelRe = /github\s*[:\-–]?\s*@?([A-Za-z0-9](?:[A-Za-z0-9\-]{0,37}[A-Za-z0-9])?)/gi;
  while ((m = labelRe.exec(text))) {
    const owner = m[1];
    const key = owner;
    if (seen.has(key)) continue;
    seen.add(key);
    const url = `https://github.com/${owner}`;
    results.push({ type: 'user', owner, url, confidence: 0.9 });
  }

  // 4) Lines mentioning GitHub that contain an @username mention (e.g. "GitHub: @owner")
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!/github/i.test(line)) continue;
    const atRe = /@([A-Za-z0-9](?:[A-Za-z0-9\-]{0,37}[A-Za-z0-9])?)/g;
    while ((m = atRe.exec(line))) {
      const owner = m[1];
      if (seen.has(owner)) continue;
      seen.add(owner);
      const url = `https://github.com/${owner}`;
      results.push({ type: 'user', owner, url, confidence: 0.85 });
    }
  }

  // 5) As a last resort, look for likely usernames in parentheses next to the word GitHub
  const nearRe = /github[^\n\r]{0,30}\(?\s*([A-Za-z0-9](?:[A-Za-z0-9\-]{0,37}[A-Za-z0-9])?)\s*\)?/gi;
  while ((m = nearRe.exec(text))) {
    const owner = m[1];
    if (!owner) continue;
    if (seen.has(owner)) continue;
    seen.add(owner);
    results.push({ type: 'user', owner, url: `https://github.com/${owner}`, confidence: 0.6 });
  }

  return results;
}

async function parsePdf(buffer) {
  // First attempt: use pdf-parse (wrap in try/catch)
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    if (data && typeof data.text === 'string' && data.text.trim()) {
      return data.text;
    }
    // continue to fallback if empty
  } catch (err) {
    // Silently fall back to pdfjs
  }

  // Fallback: use pdfjs-dist directly to extract text per page
  try {
    // attempt to require pdfjs at runtime to avoid bundler resolving native deps like 'canvas'
    let pdfjs;
    try {
      // eslint-disable-next-line no-eval
      pdfjs = eval('require')('pdfjs-dist/legacy/build/pdf.js');
    } catch (e) {
      throw e;
    }
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data: uint8 });
    const doc = await loadingTask.promise;
    let fullText = '';
    let linkUrls = [];
    for (let i = 1; i <= doc.numPages; i++) {
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
  const pageText = (content.items || []).map(item => item.str || '').join(' ');
        // try to extract link annotations (URIs) from the page and include them close to page text
        let annUrlsForPage = [];
        try {
          const ann = await page.getAnnotations();
          if (Array.isArray(ann)) {
            for (const a of ann) {
              if (!a) continue;
              if (a.url && typeof a.url === 'string') annUrlsForPage.push(a.url);
              else if (a?.action?.uri && typeof a.action.uri === 'string') annUrlsForPage.push(a.action.uri);
              else if (a?.A?.URI && typeof a.A.URI === 'string') annUrlsForPage.push(a.A.URI);
            }
          }
        } catch (annErr) {
          // annotation extraction not critical
        }
        // Prepend annotation URLs for this page so top-most links appear before the page text
        if (annUrlsForPage.length) {
          fullText += annUrlsForPage.join('\n') + '\n';
          linkUrls.push(...annUrlsForPage);
        }
        fullText += pageText + '\n';
      } catch (pageErr) {
        // Skip failed page
      }
    }
    try { if (doc && typeof doc.destroy === 'function') await doc.destroy(); } catch (e) {}
    // combine found link URLs with text for extraction
    const combined = (fullText + '\n' + (linkUrls.join('\n') || '')).trim();
    if (combined) return combined;
    return '';
  } catch (err) {
    return '';
  }
}

async function parseDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err) {
    return '';
  }
}

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let text = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') || formData.get('resume') || formData.get('resume-file');

      if (!file) {
        const txt = formData.get('text');
        if (txt) {
          text = String(txt);
        }
      } else {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const filename = (file.name || '').toLowerCase();
          const mime = file.type || '';

          if (mime === 'application/pdf' || filename.endsWith('.pdf')) {
            text = await parsePdf(buffer);
          } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx')) {
            text = await parseDocx(buffer);
          } else if (mime.startsWith('text/') || filename.endsWith('.txt')) {
            text = buffer.toString('utf8');
          } else {
            text = (await parsePdf(buffer)) || (await parseDocx(buffer)) || buffer.toString('utf8');
          }
        } catch (fileErr) {
          throw fileErr;
        }
      }
    } else {
      const body = await req.json().catch(() => null);
      if (body && body.text) text = String(body.text);
      else if (typeof body === 'string') text = body;
    }

  text = (text || '').replace(/\r\n/g, '\n').trim();
  // Remove zero-width/invisible characters that can break URL matching
  text = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  // Normalize 'github . com' or line-break-split URLs into 'github.com/' form
  text = text.replace(/github[ \t\r\n]*\.?[ \t\r\n]*com[ \t\r\n]*\/[ \t\r\n]*/gi, 'github.com/');
  text = text.replace(/github[ \t\r\n]*\.?[ \t\r\n]*com/gi, 'github.com');
  // Remove spaces around slashes and dots which may split owner/repo
  text = text.replace(/\/[ \t]+/g, '/').replace(/[ \t]+\//g, '/');
  text = text.replace(/\.[ \t]+/g, '.').replace(/[ \t]+\./g, '.');
  // Collapse multiple spaces/tabs into single space
  text = text.replace(/[ \t]+/g, ' ').trim();
    const entities = extractGithubEntities(text || '');
    let fallback = [];
    if (entities.length === 0 && text) {
      fallback = extractGithubEntities(text);
    }
  const all = entities.concat(fallback || []);

  // Apply confidence threshold: only return candidates with confidence >= 0.9
  const CONFIDENCE_THRESHOLD = 0.9;
  const filtered = (all || []).filter((it) => (typeof it.confidence === 'number' ? it.confidence : 0) >= CONFIDENCE_THRESHOLD);
    try {
      const payload = { success: true, github: filtered };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (jsonErr) {
      return new Response('Internal Server Error: JSON serialization failed', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    }
  } catch (err) {
    return new Response('Internal Server Error: ' + String(err), { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
