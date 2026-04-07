import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiUsers, FiBook, FiBarChart2, FiLogOut,
  FiCamera, FiFileText, FiCheckSquare, FiUser
} from 'react-icons/fi';

const navLinks = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: <FiHome /> },
    { to: '/admin/students', label: 'Students', icon: <FiUsers /> },
    { to: '/admin/teachers', label: 'Teachers', icon: <FiUser /> },
    { to: '/admin/courses', label: 'Courses', icon: <FiBook /> },
    { to: '/admin/reports', label: 'Reports', icon: <FiBarChart2 /> },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: <FiHome /> },
    { to: '/teacher/attendance', label: 'Take Attendance', icon: <FiCheckSquare /> },
    { to: '/teacher/reports', label: 'Reports', icon: <FiBarChart2 /> },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: <FiHome /> },
    { to: '/student/scan', label: 'Scan QR', icon: <FiCamera /> },
    { to: '/student/report', label: 'My Report', icon: <FiFileText /> },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = navLinks[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-6 border-b border-indigo-800">
          <h1 className="text-xl font-bold">AttendanceMS</h1>
          <p className="text-indigo-300 text-sm mt-1 capitalize">{user?.role} Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-indigo-300 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
