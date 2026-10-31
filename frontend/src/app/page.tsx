export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Quản Lý Điểm Danh
            </span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="/" className="hover:text-blue-600 transition-colors">Trang chủ</a>
            <a href="/classes" className="hover:text-blue-600 transition-colors">Lớp học</a>
            <a href="/attendance" className="hover:text-blue-600 transition-colors">Điểm danh</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-100 dark:border-blue-900/30">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hệ Thống Quản Lý Điểm Danh Lớp Học
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">
            Quản lý danh sách lớp học, sinh viên, tạo ca điểm danh nhanh chóng bằng mã QR động hoặc ma trận điểm danh trực quan.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="/attendance"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition"
            >
              Điểm danh ngay
            </a>
            <a
              href="http://localhost:8080/api/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition"
            >
              OpenAPI / Swagger API Docs
            </a>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Lớp học phụ trách</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">--</div>
            <div className="mt-1 text-xs text-slate-500">Đang đồng bộ từ máy chủ</div>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Ca điểm danh hôm nay</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">--</div>
            <div className="mt-1 text-xs text-slate-500">Chưa bắt đầu ca mới</div>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Tỷ lệ đi học trung bình</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">--%</div>
            <div className="mt-1 text-xs text-slate-500">Toàn bộ học kỳ</div>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Cảnh báo vắng &gt; 20%</div>
            <div className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">--</div>
            <div className="mt-1 text-xs text-slate-500">Cần liên hệ sinh viên</div>
          </div>
        </div>
      </main>
    </div>
  );
}
