"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Organization, OrganizationMember, OrganizationInvitation, OrganizationRole } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export function OrganizationSection() {
  const toast = useToast();

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("TEACHER");

  const loadData = useCallback(async () => {
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
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            🏢 Quản Lý Tổ Chức &amp; Giảng Viên (Center Admin)
          </h2>
          <p className="text-xs text-slate-500">
            Quản trị trung tâm đào tạo, phân quyền trợ giảng, và gửi lời mời tài khoản giảng viên
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Mời Giảng Viên Mới
        </button>
      </div>

      {/* Organization Info Card */}
      {org && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-blue-500/20">
                {org.code.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {org.code}
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Hoạt động
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {org.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              {org.contactEmail && (
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-slate-400">Email</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{org.contactEmail}</span>
                </div>
              )}
              {org.contactPhone && (
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-slate-400">Điện thoại</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{org.contactPhone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members & Staff Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Danh Sách Giảng Viên &amp; Trợ Giảng ({members.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
              <tr>
                <th className="p-3">Họ và Tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Vai Trò</th>
                <th className="p-3">Trạng Thái</th>
                <th className="p-3">Ngày Tham Gia</th>
                <th className="p-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Chưa có thành viên nào trong danh sách.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                          {m.fullName ? m.fullName.charAt(0) : "U"}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {m.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      {m.email}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id, m.fullName)}
                        className="px-2.5 py-1 text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg font-semibold text-[11px]"
                      >
                        Gỡ bỏ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Lời Mời Đang Chờ Giảng Viên Xác Nhận ({invitations.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
              <tr>
                <th className="p-3">Email Được Mời</th>
                <th className="p-3">Vai Trò Đề Cử</th>
                <th className="p-3">Mã Token Lời Mời</th>
                <th className="p-3">Hạn Kích Hoạt</th>
                <th className="p-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                    Không có lời mời nào đang chờ kích hoạt.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {inv.email}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {inv.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{inv.token}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(inv.token);
                            toast.success("Đã chép token kích hoạt!", "Sao chép");
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokeInvitation(inv.id)}
                        className="px-2.5 py-1 text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg font-semibold text-[11px]"
                      >
                        Thu hồi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Mời Giảng Viên / Trợ Giảng Vào Tổ Chức
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Giảng Viên *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vai Trò Trong Tổ Chức *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="TEACHER">TEACHER - Giảng Viên Giảng Dạy</option>
                  <option value="TA">TA - Trợ Giảng Học Phần</option>
                  <option value="ADMIN">ADMIN - Quản Trị Viên Trung Tâm</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {isLoading ? "Đang gửi..." : "Gửi Lời Mời"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
