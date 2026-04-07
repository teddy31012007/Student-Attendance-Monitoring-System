import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import api from '../../api/axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { FiUsers, FiUser, FiBook, FiCalendar, FiAlertTriangle } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data));
  }, []);

  if (!data) return <Layout><div className="text-center py-20 text-gray-400">Loading dashboard...</div></Layout>;

  const doughnutData = {
    labels: ['Students', 'Teachers', 'Courses'],
    datasets: [{
      data: [data.totalStudents, data.totalTeachers, data.totalCourses],
      backgroundColor: ['#4F46E5', '#7C3AED', '#06B6D4'],
      borderWidth: 0,
    }],
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Students" value={data.totalStudents} icon={<FiUsers />} color="indigo" />
        <StatCard title="Total Teachers" value={data.totalTeachers} icon={<FiUser />} color="purple" />
        <StatCard title="Total Courses" value={data.totalCourses} icon={<FiBook />} color="green" />
        <StatCard title="Attendance Sessions" value={data.totalAttendance} icon={<FiCalendar />} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Overview</h3>
          <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FiAlertTriangle className="text-red-500" /> Low Attendance Alerts (&lt;75%)
          </h3>
          {data.lowAttendanceStudents.length === 0 ? (
            <p className="text-gray-400 text-sm">No low attendance students</p>
          ) : (
            <div className="space-y-3">
              {data.lowAttendanceStudents.map(({ student, percentage }) => (
                <div key={student._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{student.user?.name}</p>
                    <p className="text-xs text-gray-500">{student.studentId} • {student.department}</p>
                  </div>
                  <span className="badge-red">{percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
