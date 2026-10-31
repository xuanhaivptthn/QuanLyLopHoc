import { CreateStudentRequest } from "@/types";

export interface ParsedStudentRow {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  isValid: boolean;
  errors: string[];
  isExisting?: boolean;
}

/**
 * Split a single delimited line into tokens, respecting quotes.
 */
function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Detect delimiter: tab (\t), comma (,), or semicolon (;)
 */
function detectDelimiter(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(";") && !line.includes(",")) return ";";
  return ",";
}

/**
 * Parse student CSV or pasted text from Excel/Google Sheets
 */
export function parseStudentCsv(
  rawText: string,
  existingStudentCodes?: Set<string>
): ParsedStudentRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const parsedRows: ParsedStudentRow[] = [];
  const seenCodes = new Set<string>();

  // Detect if line 0 is a header
  const firstTokens = splitLine(lines[0], delimiter).map((t) =>
    t.toLowerCase().replace(/["']/g, "")
  );

  const isHeader =
    firstTokens.some((t) => t.includes("mã") || t.includes("mssv") || t.includes("code")) ||
    firstTokens.some((t) => t.includes("tên") || t.includes("name")) ||
    firstTokens.some((t) => t.includes("email"));

  const startIndex = isHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rowNumber = i + 1;
    const tokens = splitLine(lines[i], delimiter);

    // Expected format: studentCode, fullName, email, phone (optional)
    const rawCode = (tokens[0] || "").replace(/["']/g, "").trim().toUpperCase();
    const rawName = (tokens[1] || "").replace(/["']/g, "").trim();
    const rawEmail = (tokens[2] || "").replace(/["']/g, "").trim().toLowerCase();
    const rawPhone = (tokens[3] || "").replace(/["']/g, "").trim();

    const errors: string[] = [];

    if (!rawCode) {
      errors.push("Thiếu mã sinh viên");
    } else if (seenCodes.has(rawCode)) {
      errors.push("Mã sinh viên trùng lặp trong tệp");
    }

    if (!rawName) {
      errors.push("Thiếu họ và tên");
    }

    if (!rawEmail) {
      errors.push("Thiếu email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      errors.push("Định dạng email không hợp lệ");
    }

    if (rawCode) {
      seenCodes.add(rawCode);
    }

    const isExisting = rawCode ? existingStudentCodes?.has(rawCode) : false;

    parsedRows.push({
      rowNumber,
      studentCode: rawCode,
      fullName: rawName,
      email: rawEmail,
      phone: rawPhone || undefined,
      isValid: errors.length === 0,
      errors,
      isExisting,
    });
  }

  return parsedRows;
}

/**
 * Generate and download a sample CSV file with UTF-8 BOM for Excel compatibility
 */
export function downloadSampleStudentCsv(filename = "mau_nhap_sinh_vien.csv"): void {
  const content =
    "\uFEFFMã Sinh Viên,Họ và Tên,Email,Số Điện Thoại\n" +
    "20020001,Nguyễn Văn An,an.nv@school.edu.vn,0901234567\n" +
    "20020002,Trần Thị Bình,binh.tt@school.edu.vn,0912345678\n" +
    "20020003,Lê Hoàng Nam,nam.lh@school.edu.vn,0987654321\n" +
    "20020004,Phạm Minh Đức,duc.pm@school.edu.vn,0934567890\n";

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert valid parsed rows to CreateStudentRequest array
 */
export function toCreateStudentRequests(rows: ParsedStudentRow[]): CreateStudentRequest[] {
  return rows
    .filter((r) => r.isValid)
    .map((r) => ({
      studentCode: r.studentCode,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
    }));
}
