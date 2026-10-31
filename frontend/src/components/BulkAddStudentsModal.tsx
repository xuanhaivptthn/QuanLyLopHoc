"use client";

import React, { useState, useId } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/toast";
import { fetchApi } from "@/lib/api-client";
import {
  parseStudentCsv,
  downloadSampleStudentCsv,
  toCreateStudentRequests,
  ParsedStudentRow,
} from "@/lib/csv-parser";
import {
  BulkCreateStudentResponse,
  BulkImportToClassroomResponse,
} from "@/types";
import {
  UploadCloud,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Users,
} from "lucide-react";

interface BulkAddStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classroomId?: string;
  classroomCode?: string;
  existingStudentCodes?: Set<string>;
}

export function BulkAddStudentsModal({
  isOpen,
  onClose,
  onSuccess,
  classroomId,
  classroomCode,
  existingStudentCodes,
}: BulkAddStudentsModalProps) {
  const toast = useToast();
  const fileInputId = useId();

  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Parse rows whenever rawText changes
  const parsedRows: ParsedStudentRow[] = React.useMemo(() => {
    if (!rawText.trim()) return [];
    return parseStudentCsv(rawText, existingStudentCodes);
  }, [rawText, existingStudentCodes]);

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      setRawText(content);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      toast.error("Vui lòng tải lên hoặc dán danh sách có ít nhất 1 sinh viên hợp lệ", "Thiếu dữ liệu");
      return;
    }

    const payload = {
      students: toCreateStudentRequests(validRows),
    };

    setIsSubmitting(true);
    try {
      if (classroomId) {
        // Direct classroom import
        const res = await fetchApi<BulkImportToClassroomResponse>(
          `/classrooms/${classroomId}/students/bulk-import`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        toast.success(
          `Đã ghi danh ${res.enrolledCount} sinh viên vào lớp (${res.createdStudentsCount} hồ sơ mới, bỏ qua ${res.skippedCount})`,
          "Nhập danh sách thành công"
        );
      } else {
        // Directory bulk create
        const res = await fetchApi<BulkCreateStudentResponse>("/students/bulk", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        toast.success(
          `Đã thêm thành công ${res.successCount} sinh viên vào danh bạ (bỏ qua ${res.skippedCount})`,
          "Thêm hàng loạt thành công"
        );
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi thực hiện thêm hàng loạt",
        "Lỗi thao tác"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col p-5 sm:p-6 animate-in fade-in zoom-in-95 bg-card">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Users className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {classroomId
                  ? `Nhập Danh Sách Sinh Viên: ${classroomCode || ""}`
                  : "Thêm Sinh Viên Hàng Loạt"}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {classroomId
                  ? "Tự động tạo hồ sơ mới và ghi danh trực tiếp vào lớp học này"
                  : "Thêm nhiều sinh viên cùng lúc vào danh bạ hệ thống"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mode Switcher & Download Sample */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border w-fit">
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                inputMode === "file"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tải file CSV
            </button>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                inputMode === "paste"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dán văn bản trực tiếp
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadSampleStudentCsv()}
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground self-start sm:self-auto"
          >
            <Download className="size-3.5" />
            Tải file mẫu CSV
          </Button>
        </div>

        {/* Input Area */}
        <div className="mt-3">
          {inputMode === "file" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer ${
                dragOver
                  ? "border-sky-500 bg-sky-500/5"
                  : "border-border hover:border-sky-500/50 hover:bg-muted/30"
              }`}
              onClick={() => document.getElementById(fileInputId)?.click()}
            >
              <input
                id={fileInputId}
                type="file"
                accept=".csv,text/csv,text/plain,.tsv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="size-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <UploadCloud className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  {fileName ? (
                    <span className="font-mono text-sky-600 dark:text-sky-400">{fileName}</span>
                  ) : (
                    "Kéo thả tệp CSV vào đây hoặc click để chọn tệp"
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Hỗ trợ định dạng .csv, .tsv hoặc .txt (UTF-8)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Dán danh sách từ Excel, Sheets hoặc văn bản (cách nhau bởi dấu phẩy hoặc Tab):</span>
                <span className="font-mono text-[10px]">MSSV, Họ tên, Email, SĐT</span>
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`20020001, Nguyễn Văn An, an.nv@school.edu.vn, 0901234567\n20020002, Trần Thị Bình, binh.tt@school.edu.vn, 0912345678\n20020003, Lê Hoàng Nam, nam.lh@school.edu.vn, 0987654321`}
                className="w-full text-xs font-mono p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Live Preview & Validation Status */}
        {parsedRows.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Xem trước dữ liệu:</span>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Tổng {parsedRows.length} dòng
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                >
                  {validRows.length} hợp lệ
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[11px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                  >
                    {invalidRows.length} lỗi
                  </Badge>
                )}
              </div>

              {invalidRows.length > 0 && (
                <span className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="size-3.5" />
                  Dòng lỗi sẽ được tự động bỏ qua khi thêm
                </span>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto border border-border rounded-lg bg-background">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 font-semibold text-muted-foreground sticky top-0 backdrop-blur-sm">
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3 font-mono">Mã SV</th>
                    <th className="py-2 px-3">Họ và tên</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">SĐT</th>
                    <th className="py-2 px-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={`hover:bg-muted/30 transition-colors ${
                        !row.isValid ? "bg-rose-500/[0.04]" : ""
                      }`}
                    >
                      <td className="py-1.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
                        {row.rowNumber}
                      </td>
                      <td className="py-1.5 px-3 font-mono font-semibold text-foreground">
                        {row.studentCode || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-foreground">
                        {row.fullName || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-muted-foreground text-[11px]">
                        {row.email || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-muted-foreground text-[11px]">
                        {row.phone || "—"}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        {row.isValid ? (
                          row.isExisting ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                              <CheckCircle2 className="size-3" />
                              {classroomId ? "Sẵn có (ghi danh)" : "Đã có trong DB"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="size-3" />
                              Hợp lệ
                            </span>
                          )
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium"
                            title={row.errors.join(", ")}
                          >
                            <AlertCircle className="size-3 shrink-0" />
                            {row.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
          <div className="text-[11px] text-muted-foreground">
            {parsedRows.length > 0 ? (
              <span>
                Sẵn sàng xử lý <strong className="text-foreground">{validRows.length}</strong> sinh viên
              </span>
            ) : (
              <span>Chưa có dữ liệu nào được tải</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={validRows.length === 0 || isSubmitting}
              onClick={handleSubmit}
              className="text-xs gap-1.5"
            >
              {isSubmitting ? (
                "Đang xử lý..."
              ) : (
                <>
                  <FileText className="size-3.5" />
                  {classroomId
                    ? `Ghi danh (${validRows.length}) sinh viên`
                    : `Xác nhận thêm (${validRows.length}) sinh viên`}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
