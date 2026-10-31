"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Classroom, Student, AttendanceSession } from "@/types";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar, NavItem } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { DashboardSection } from "@/components/DashboardSection";
import { ClassroomsSection } from "@/components/ClassroomsSection";
import { AttendanceSection } from "@/components/AttendanceSection";
import { StudentsSection } from "@/components/StudentsSection";
import { OrganizationSection } from "@/components/OrganizationSection";
import { ApiConsole } from "@/components/ApiConsole";

function AppContent() {
  const router = useRouter();
  const { currentUser, logout, isAuthenticated } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<NavItem>("dashboard");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string | undefined>(undefined);

  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);

  // Load classrooms & students when authenticated
  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // Fetch classrooms & students for dashboard counters
      const [clsData, stData] = await Promise.allSettled([
        fetchApi<Classroom[]>("/classrooms"),
        fetchApi<Student[]>("/students"),
      ]);

      if (clsData.status === "fulfilled" && clsData.value) {
        const fetchedClassrooms = clsData.value;
        setClassrooms(fetchedClassrooms);
        let currentTarget: Classroom | null = null;
        setSelectedClassroom((prev) => {
          if (prev && fetchedClassrooms.some((c) => c.id === prev.id)) {
            currentTarget = fetchedClassrooms.find((c) => c.id === prev.id) || prev;
            return currentTarget;
          }
          currentTarget = fetchedClassrooms.length > 0 ? fetchedClassrooms[0] : null;
          return currentTarget;
        });

        // Fetch sessions across all classrooms for a complete timetable
        if (fetchedClassrooms.length > 0) {
          try {
            const sessionPromises = fetchedClassrooms.map((c) =>
              fetchApi<AttendanceSession[]>(`/classrooms/${c.id}/sessions`)
            );
            const results = await Promise.allSettled(sessionPromises);
            const allSessions: AttendanceSession[] = [];
            for (const res of results) {
              if (res.status === "fulfilled" && Array.isArray(res.value)) {
                allSessions.push(...res.value);
              }
            }
            setSessions(allSessions);
          } catch {
            setSessions([]);
          }
        } else {
          setSessions([]);
        }
      } else {
        setClassrooms([]);
        setSelectedClassroom(null);
        setSessions([]);
      }

      if (stData.status === "fulfilled" && stData.value) {
        setStudents(stData.value);
      } else {
        setStudents([]);
      }
    } catch {
      // Ignored
    }
  }, [isAuthenticated, currentUser?.activeOrganizationId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated, loadInitialData]);

  const handleLogout = () => {
    logout();
  };

  const handleSelectClassroom = useCallback((cls: Classroom) => {
    setSelectedClassroom((prev) => (prev?.id === cls?.id ? prev : cls));
  }, []);

  const handleTabChange = (tab: NavItem) => {
    startTransition(() => {
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
    });
  };

  const getTabTitle = (tab: NavItem): string => {
    switch (tab) {
      case "dashboard":
        return "Tổng Quan";
      case "classrooms":
        return "Lớp Học & Khóa Học";
      case "attendance":
        return "Điểm Danh QR";
      case "students":
        return "Hồ Sơ Sinh Viên";
      case "org":
        return "Tổ Chức & Giảng Viên";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenLoginModal={() => router.push("/login")}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          stats={{
            classroomsCount: classrooms.length,
            studentsCount: students.length,
            sessionsCount: sessions.length,
          }}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs"
        >
          <div className="w-72 bg-card text-card-foreground h-full flex flex-col shadow-2xl border-r border-border">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={handleTabChange}
              currentUser={currentUser}
              onLogout={handleLogout}
              onOpenLoginModal={() => {
                setIsMobileMenuOpen(false);
                router.push("/login");
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
              stats={{
                classroomsCount: classrooms.length,
                studentsCount: students.length,
                sessionsCount: sessions.length,
              }}
            />
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopBar
          currentTabName={getTabTitle(activeTab)}
          selectedClassName={selectedClassroom ? `${selectedClassroom.code} - ${selectedClassroom.name}` : undefined}
          onOpenNewSession={() => {
            handleTabChange("attendance");
          }}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Work Area */}
        <main
          className={`flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto transition-opacity duration-200 ${
            isPending ? "opacity-75" : "opacity-100"
          }`}
        >
          {activeTab === "dashboard" && (
            <DashboardSection
              currentUser={currentUser}
              classrooms={classrooms}
              students={students}
              sessions={sessions}
              onNavigateTab={handleTabChange}
              onSelectClassroom={handleSelectClassroom}
              onOpenNewClassModal={() => {
                setShowCreateClassModal(true);
                handleTabChange("classrooms");
              }}
              onOpenNewStudentModal={() => {
                setShowCreateStudentModal(true);
                handleTabChange("students");
              }}
            />
          )}

          {activeTab === "classrooms" && (
            <ClassroomsSection
              selectedClassroomId={selectedClassroom?.id}
              onSelectClassroom={handleSelectClassroom}
              onNavigateToAttendance={(clsId, sessId) => {
                const found = classrooms.find((c) => c.id === clsId);
                if (found) setSelectedClassroom(found);
                setTargetSessionId(sessId);
                handleTabChange("attendance");
              }}
              showCreateModalDirectly={showCreateClassModal}
              onCloseCreateModal={() => setShowCreateClassModal(false)}
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceSection
              initialClassroomId={selectedClassroom?.id}
              initialSessionId={targetSessionId}
              onOpenClassroom={(clsId) => {
                const found = classrooms.find((c) => c.id === clsId);
                if (found) setSelectedClassroom(found);
                handleTabChange("classrooms");
              }}
            />
          )}

          {activeTab === "students" && (
            <StudentsSection
              showAddModalDirectly={showCreateStudentModal}
              onCloseAddModal={() => setShowCreateStudentModal(false)}
            />
          )}

          {activeTab === "org" && <OrganizationSection />}
        </main>
      </div>

      {/* Dockable Developer API Inspector */}
      <ApiConsole />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <AppContent />
    </AuthGuard>
  );
}
