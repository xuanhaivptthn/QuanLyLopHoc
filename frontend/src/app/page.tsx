"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { Classroom, Student, AttendanceSession, User } from "@/types";
import { fetchApi, getStoredToken, setStoredToken, subscribeToAuth } from "@/lib/api-client";
import { ToastProvider, useToast } from "@/lib/toast";
import { ThemeProvider } from "@/lib/theme";
import { Sidebar, NavItem } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { DashboardSection } from "@/components/DashboardSection";
import { ClassroomsSection } from "@/components/ClassroomsSection";
import { AttendanceSection } from "@/components/AttendanceSection";
import { StudentsSection } from "@/components/StudentsSection";
import { OrganizationSection } from "@/components/OrganizationSection";
import { AuthSection } from "@/components/AuthSection";
import { ApiConsole } from "@/components/ApiConsole";

function AppContent() {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<NavItem>("dashboard");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);

  // Load user profile & core data
  const loadInitialData = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (token) {
        try {
          const user = await fetchApi<User>("/auth/me");
          setCurrentUser(user);
        } catch {
          setCurrentUser(null);
        }
      }

      // Fetch classrooms & students for dashboard counters
      const [clsData, stData] = await Promise.allSettled([
        fetchApi<Classroom[]>("/classrooms"),
        fetchApi<Student[]>("/students"),
      ]);

      if (clsData.status === "fulfilled" && clsData.value) {
        setClassrooms(clsData.value);
        if (clsData.value.length > 0 && !selectedClassroom) {
          setSelectedClassroom(clsData.value[0]);
        }

        // Fetch sessions for first classroom
        if (clsData.value.length > 0) {
          try {
            const sess = await fetchApi<AttendanceSession[]>(`/classrooms/${clsData.value[0].id}/sessions`);
            setSessions(sess || []);
          } catch {
            // Ignored
          }
        }
      }

      if (stData.status === "fulfilled" && stData.value) {
        setStudents(stData.value);
      }
    } catch {
      // Ignored
    }
  }, [selectedClassroom]);

  useEffect(() => {
    loadInitialData();

    const unsubscribe = subscribeToAuth((token) => {
      if (!token) {
        setCurrentUser(null);
      } else {
        fetchApi<User>("/auth/me")
          .then((u) => setCurrentUser(u))
          .catch(() => setCurrentUser(null));
      }
    });

    return () => unsubscribe();
  }, [loadInitialData]);

  const handleLogout = () => {
    setStoredToken(null);
    setCurrentUser(null);
    toast.info("Đã đăng xuất khỏi phiên làm việc", "Đăng xuất");
  };

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
        return "Tổ Chức";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenLoginModal={() => setShowLoginModal(true)}
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
          <div className="w-72 bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={handleTabChange}
              currentUser={currentUser}
              onLogout={handleLogout}
              onOpenLoginModal={() => {
                setShowLoginModal(true);
                setIsMobileMenuOpen(false);
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
              onSelectClassroom={(cls) => setSelectedClassroom(cls)}
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
              onSelectClassroom={(cls) => setSelectedClassroom(cls)}
              onNavigateToAttendance={(clsId) => {
                const found = classrooms.find((c) => c.id === clsId);
                if (found) setSelectedClassroom(found);
                handleTabChange("attendance");
              }}
              showCreateModalDirectly={showCreateClassModal}
              onCloseCreateModal={() => setShowCreateClassModal(false)}
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceSection initialClassroomId={selectedClassroom?.id} />
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

      {/* Auth Modal Overlay */}
      {showLoginModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <AuthSection
            currentUser={currentUser}
            onUserChange={(u) => {
              setCurrentUser(u);
              setShowLoginModal(false);
              loadInitialData();
            }}
            onClose={() => setShowLoginModal(false)}
          />
        </div>
      )}

      {/* Dockable Developer API Inspector */}
      <ApiConsole />
    </div>
  );
}

export default function HomePage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
