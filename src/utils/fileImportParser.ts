/**
 * DudeX Student Roster & Email File Import Parser
 * Supports: .csv, .xlsx, .xls, .tsv, .txt, .json
 * Handles smart header detection, row-level fallback, and in-file deduplication.
 */

export interface ParsedStudentEmailRow {
  email: string;
  studentName?: string;
  studentId?: string;
  department?: string;
}

export interface ParseResult {
  items: ParsedStudentEmailRow[];
  totalExtracted: number;
  duplicateCountInFile: number;
  invalidCount: number;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Decompresses a raw DEFLATE byte array in modern browsers
 */
async function decompressDeflateRaw(data: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(data as any);
      writer.close();
      const response = new Response(ds.readable);
      return await response.text();
    } catch {
      // fallback if stream fails
    }
  }
  return '';
}

/**
 * Extracts student rows from an .xlsx ArrayBuffer
 */
export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<ParseResult> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let offset = 0;
  let sharedStringsXml = '';
  let sheetXml = '';
  const relsMailtos: string[] = [];

  // Parse ZIP entries
  while (offset < bytes.length - 30) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x03 &&
      bytes[offset + 3] === 0x04
    ) {
      const compMethod = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
      const fileName = new TextDecoder().decode(fileNameBytes);
      const dataStart = offset + 30 + nameLen + extraLen;
      const compData = bytes.subarray(dataStart, dataStart + compSize);

      let text = '';
      if (compMethod === 0) {
        text = new TextDecoder().decode(compData);
      } else if (compMethod === 8) {
        text = await decompressDeflateRaw(compData);
      }

      if (text) {
        if (fileName.includes('sharedStrings.xml')) {
          sharedStringsXml = text;
        } else if (fileName.includes('sheet1.xml') && !fileName.includes('rels')) {
          sheetXml = text;
        } else if (fileName.includes('.rels')) {
          const relMatches = [...text.matchAll(/Target="mailto:([^"]+)"/g)];
          for (const m of relMatches) {
            if (m[1]) relsMailtos.push(m[1].trim());
          }
        }
      }

      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }

  // Extract shared strings list
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siMatches = [...sharedStringsXml.matchAll(/<si>(?:(?!<\/si>).)*?<t[^>]*>(.*?)<\/t>/gs)];
    for (const match of siMatches) {
      // Decode basic xml entities
      const str = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      sharedStrings.push(str);
    }
  }

  const rows: string[][] = [];
  if (sheetXml) {
    const rowMatches = [...sheetXml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)];
    for (const rMatch of rowMatches) {
      const rowContent = rMatch[1];
      const cells: string[] = [];
      const cellMatches = [
        ...rowContent.matchAll(
          /<c\s+r="([A-Z]+)[0-9]+"(?:\s+t="([^"]+)")?[^>]*>(?:<v>(.*?)<\/v>)?(?:<is><t>(.*?)<\/t><\/is>)?<\/c>/gs
        ),
      ];

      for (const c of cellMatches) {
        const type = c[2];
        const val = c[3];
        const inlineVal = c[4];
        let cellText = '';
        if (type === 's' && val !== undefined) {
          cellText = sharedStrings[parseInt(val, 10)] || '';
        } else if (inlineVal !== undefined) {
          cellText = inlineVal;
        } else if (val !== undefined) {
          cellText = val;
        }
        cells.push(cellText.trim());
      }

      if (cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
  }

  // If structured rows found in sheet, process with smart column detection
  if (rows.length > 0) {
    return processGridRows(rows);
  }

  // Fallback: extract any email from sharedStrings or relsMailtos
  const allCandidateEmails = new Set<string>();
  relsMailtos.forEach((m) => allCandidateEmails.add(m));

  sharedStrings.forEach((s) => {
    const match = s.match(EMAIL_REGEX);
    if (match) {
      allCandidateEmails.add(match[0]);
    }
  });

  const seenInFile = new Set<string>();
  const items: ParsedStudentEmailRow[] = [];
  let duplicateCountInFile = 0;
  let invalidCount = 0;

  for (const rawEmail of allCandidateEmails) {
    const clean = rawEmail.toLowerCase().trim();
    if (!STRICT_EMAIL_REGEX.test(clean)) {
      invalidCount++;
      continue;
    }
    if (seenInFile.has(clean)) {
      duplicateCountInFile++;
      continue;
    }
    seenInFile.add(clean);
    items.push({ email: clean });
  }

  return {
    items,
    totalExtracted: items.length,
    duplicateCountInFile,
    invalidCount,
  };
}

/**
 * Processes 2D array of grid cells (from CSV or Excel)
 */
export function processGridRows(rows: string[][]): ParseResult {
  if (rows.length === 0) {
    return { items: [], totalExtracted: 0, duplicateCountInFile: 0, invalidCount: 0 };
  }

  // Inspect first row for headers
  const headerRow = rows[0].map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));

  let emailColIdx = -1;
  let nameColIdx = -1;
  let idColIdx = -1;
  let deptColIdx = -1;

  headerRow.forEach((col, idx) => {
    // 1. Email check first (avoids "mail id" getting caught by ID checks)
    if (
      col === 'mail id' ||
      col === 'mail_id' ||
      col === 'mailid' ||
      col === 'email id' ||
      col === 'email_id' ||
      col === 'emailid' ||
      col === 'email' ||
      col === 'mail' ||
      col === 'student email' ||
      col === 'student_email' ||
      col === 'e-mail' ||
      col.includes('email') ||
      (col.includes('mail') && !col.includes('college'))
    ) {
      emailColIdx = idx;
      return;
    }

    // 2. Name check (avoid "college name")
    if (
      (col === 'name' ||
        col === 'student name' ||
        col === 'student_name' ||
        col === 'full name' ||
        col === 'fullname') &&
      !col.includes('college')
    ) {
      nameColIdx = idx;
      return;
    }

    // 3. ID / Roll number check
    if (
      col === 'id no.' ||
      col === 'id no' ||
      col === 'id_no' ||
      col === 'id' ||
      col === 'student id' ||
      col === 'student_id' ||
      col === 'roll no' ||
      col === 'roll no.' ||
      col === 'roll_no' ||
      col === 'roll' ||
      col === 'reg no' ||
      col === 'reg_no' ||
      col === 'usn'
    ) {
      idColIdx = idx;
      return;
    }

    // 4. Department / Specialization check
    if (
      col.includes('dept') ||
      col.includes('department') ||
      col.includes('branch') ||
      col.includes('course')
    ) {
      deptColIdx = idx;
    }
  });

  const startIndex = emailColIdx !== -1 || nameColIdx !== -1 ? 1 : 0;
  const items: ParsedStudentEmailRow[] = [];
  const seenInFile = new Set<string>();
  let duplicateCountInFile = 0;
  let invalidCount = 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row.some((cell) => cell.trim().length > 0)) {
      continue;
    }

    let foundEmail = '';
    let foundName = nameColIdx !== -1 ? row[nameColIdx] : '';
    let foundId = idColIdx !== -1 ? row[idColIdx] : '';
    let foundDept = deptColIdx !== -1 ? row[deptColIdx] : '';

    if (emailColIdx !== -1 && row[emailColIdx]) {
      const match = row[emailColIdx].match(EMAIL_REGEX);
      if (match) {
        foundEmail = match[0];
      }
    }

    // Fallback: If no email found in designated column, search all cells in the row
    if (!foundEmail) {
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        const match = cell.match(EMAIL_REGEX);
        if (match) {
          foundEmail = match[0];
          // If name or ID wasn't found, use adjacent cells
          if (!foundName) {
            const possibleName = row.find((val, idx) => idx !== c && /[a-zA-Z]{3,}/.test(val) && !val.includes('@') && !val.toLowerCase().includes('college'));
            if (possibleName) foundName = possibleName;
          }
          if (!foundId) {
            const possibleId = row.find((val, idx) => idx !== c && /^[0-9A-Za-z-]{1,12}$/.test(val) && val !== foundName && val !== foundEmail);
            if (possibleId) foundId = possibleId;
          }
          break;
        }
      }
    }

    if (!foundEmail) {
      continue;
    }

    const cleanEmail = foundEmail.toLowerCase().trim();

    if (!STRICT_EMAIL_REGEX.test(cleanEmail)) {
      invalidCount++;
      continue;
    }

    // Deduplication check: skip if already seen in this file
    if (seenInFile.has(cleanEmail)) {
      duplicateCountInFile++;
      continue;
    }

    seenInFile.add(cleanEmail);

    items.push({
      email: cleanEmail,
      studentName: foundName ? foundName.trim() : undefined,
      studentId: foundId ? foundId.trim() : undefined,
      department: foundDept ? foundDept.trim() : undefined,
    });
  }

  return {
    items,
    totalExtracted: items.length,
    duplicateCountInFile,
    invalidCount,
  };
}

/**
 * Parses raw text content (CSV, TSV, or plaintext email lists)
 */
export function parseRawTextFile(text: string): ParseResult {
  if (!text || !text.trim()) {
    return { items: [], totalExtracted: 0, duplicateCountInFile: 0, invalidCount: 0 };
  }

  // Strip Byte Order Mark (BOM) if present from Windows CSV/Excel exports
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Detect delimiter
  let delimiter = ',';
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
    else if (firstLine.includes('|')) delimiter = '|';
  }

  const rows = lines.map((line) => {
    // Simple CSV parser supporting quotes
    const cells: string[] = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuote = !inQuote;
      } else if (char === delimiter && !inQuote) {
        cells.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim().replace(/^["']|["']$/g, ''));
    return cells;
  });

  const gridResult = processGridRows(rows);
  if (gridResult.items.length > 0) {
    return gridResult;
  }

  // Fallback: global regex search across whole text
  const emailMatches = cleanText.match(new RegExp(EMAIL_REGEX.source, 'gi')) || [];
  const items: ParsedStudentEmailRow[] = [];
  const seenInFile = new Set<string>();
  let duplicateCountInFile = 0;
  let invalidCount = 0;

  (emailMatches as string[]).forEach((m: string) => {
    const clean = m.toLowerCase().trim();
    if (!STRICT_EMAIL_REGEX.test(clean)) {
      invalidCount++;
      return;
    }
    if (seenInFile.has(clean)) {
      duplicateCountInFile++;
      return;
    }
    seenInFile.add(clean);
    items.push({ email: clean });
  });

  return {
    items,
    totalExtracted: items.length,
    duplicateCountInFile,
    invalidCount,
  };
}
