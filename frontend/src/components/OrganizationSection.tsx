"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Organization, OrganizationMember, OrganizationInvitation, OrganizationRole } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  UserPlus,
  Users,
  Copy,
  Trash2,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OrganizationSection() {
  const toast = useToast();
  const { currentUser } = useAuth();
  const hasActiveCenter = Boolean(currentUser?.activeOrganizationId || currentUser?.activeOrganizationName);
  const isCenterAdmin = hasActiveCenter && currentUser?.role === "CENTER_ADMIN";

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("TEACHER");

  const loadData = useCallback(async () => {
    if (!isCenterAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [orgRes, memRes, invRes] = await Promise.allSettled([
        fetchApi<Organization>("/organization"),
        fetchApi<OrganizationMember[]>("/organization/members"),
        fetchApi<OrganizationInvitation[]>("/organization/invitations"),
      ]);

      if (orgRes.status === "fulfilled") setOrg(orgRes.value);
      if (memRes.status === "fulfilled") setMembers(memRes.value || []);
      if (invRes.status === "fulfilled") setInvitations(invRes.value || []);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [isCenterAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Send Invitation
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const inv = await fetchApi<OrganizationInvitation>("/organization/invitations", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      toast.success(`Đã gửi lời mời tới giảng viên ${inv.email}!`, "Mời thành công");
      setShowInviteModal(false);
      setInviteEmail("");
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể gửi lời mời", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (id: string) => {
    if (!confirm("Bạn có chắc muốn thu hồi lời mời này?")) return;
    try {
      await fetchApi(`/organization/invitations/${id}`, { method: "DELETE" });
      toast.info("Đã thu hồi lời mời", "Thu hồi thành công");
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi thu hồi lời mời", "Lỗi");
    }
  };

  // Remove Member
  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`Xóa giảng viên / nhân sự "${name}" khỏi tổ chức?`)) return;
    try {
      await fetchApi(`/organization/members/${id}`, { method: "DELETE" });
      toast.info(`Đã gỡ quyền thành viên của ${name}`, "Đã gỡ");
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi xóa thành viên", "Lỗi");
    }
  };

  if (!isCenterAdmin) {
    return (
      <Card className="p-8 max-w-xl mx-auto text-center shadow-2xs mt-8 flex flex-col items-center gap-3">
        <div className="size-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
          <Building2 className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-bold text-foreground">
            Tài Khoản Cá Nhân / Giảng Viên Độc Lập
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bạn đang sử dụng tài khoản độc lập không thuộc trung tâm hay cơ sở đào tạo nào. Bạn có toàn quyền quản lý lớp học, quản lý danh sách sinh viên và tạo mã điểm danh Dynamic QR trực tiếp mà không cần cấu hình trung tâm.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card className="p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="size-5 text-foreground" />
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Quản Lý Tổ Chức &amp; Giảng Viên
            </h2>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="text-xs"
          >
            <UserPlus className="size-3.5" data-icon="inline-start" />
            Mời Giảng Viên Mới
          </Button>
        </div>
      </Card>

      {/* Organization Info Card */}
      {org && (
        <Card className="p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
                {org.code.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {org.code}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Hoạt động
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-0.5">
                  {org.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {org.contactEmail && (
                <div>
                  <span className="block text-[10px] font-medium uppercase text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground">{org.contactEmail}</span>
                </div>
              )}
              {org.contactPhone && (
                <div>
                  <span className="block text-[10px] font-medium uppercase text-muted-foreground">Điện thoại</span>
                  <span className="font-medium text-foreground">{org.contactPhone}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Members & Staff Table */}
      <Card className="shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Danh Sách Giảng Viên &amp; Trợ Giảng ({members.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border font-medium">
              <tr>
                <th className="p-3 font-medium">Họ và Tên</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Vai Trò</th>
                <th className="p-3 font-medium">Trạng Thái</th>
                <th className="p-3 font-medium">Ngày Tham Gia</th>
                <th className="p-3 text-right font-medium">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                    Chưa có thành viên nào trong danh sách.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-[10px] border border-border">
                          {m.fullName ? m.fullName.charAt(0) : "U"}
                        </div>
                        <span className="font-medium text-foreground">
                          {m.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {m.email}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">
                        {m.role}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {m.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.id, m.fullName)}
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        Gỡ bỏ
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending Invitations Table */}
      <Card className="shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Lời Mời Đang Chờ Giảng Viên Xác Nhận ({invitations.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border font-medium">
              <tr>
                <th className="p-3 font-medium">Email Được Mời</th>
                <th className="p-3 font-medium">Vai Trò Đề Cử</th>
                <th className="p-3 font-medium">Mã Token Lời Mời</th>
                <th className="p-3 font-medium">Hạn Kích Hoạt</th>
                <th className="p-3 text-right font-medium">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                    Không có lời mời nào đang chờ kích hoạt.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">
                      {inv.email}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">
                        {inv.role}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{inv.token}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const inviteUrl = `${window.location.origin}/accept-invite?token=${inv.token}`;
                            navigator.clipboard.writeText(inviteUrl);
                            toast.success("Đã sao chép liên kết mời giảng viên!", "Sao chép thành công");
                          }}
                          className="h-5 text-[10px] px-1.5"
                          title="Sao chép link kích hoạt tài khoản"
                        >
                          <Copy className="size-3" data-icon="inline-start" />
                          Link
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(inv.id)}
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        Thu hồi
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-md shadow-xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                Mời Giảng Viên / Trợ Giảng Vào Tổ Chức
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowInviteModal(false)}
                className="size-7"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Email Giảng Viên *
                </label>
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Vai Trò Trong Tổ Chức *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs"
                >
                  <option value="TEACHER">TEACHER - Giảng Viên Giảng Dạy</option>
                  <option value="TA">TA - Trợ Giảng Học Phần</option>
                  <option value="ADMIN">ADMIN - Quản Trị Viên Trung Tâm</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                >
                  Hủy Bỏ
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang gửi..." : "Gửi Lời Mời"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
