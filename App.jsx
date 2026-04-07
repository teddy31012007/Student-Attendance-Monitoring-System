import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import api from '../../api/axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FiBook, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudentDashboard() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get('/attendance/student-report').then((r) => setReport(r.data));
  }, []);

  if (!report) return <Layout><div className="text-center py-20 text-gray-400">Loading...</div></Layout>;

  const totalPresent = report.report.reduce((a, c) => a + c.present, 0);
  const totalClasses = report.report.reduce((a, c) => a + c.total, 0);
  const overallPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

  const doughnutData = {
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [totalPresent, totalClasses - totalPresent],
      backgroundColor: ['#4F46E5', '#EF4444'],
      borderWidth: 0,
    }],
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Enrolled Courses" value={report.report.length} icon={<FiBook />} color="indigo" />
        <StatCard title="Classes Attended" value={totalPresent} icon={<FiCheckCircle />} color="green" />
        <StatCard title="Overall Attendance" value={`${overallPct}%`} icon={overallPct < 75 ? <FiAlertTriangle /> : <FiCheckCircle />} color={overallPct < 75 ? 'red' : 'green'} />
      </div>

      {overallPct < 75 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <FiAlertTriangle className="text-red-500 text-xl flex-shrink-0" />
          <p className="text-red-700 text-sm">
            Your overall attendance is below 75%. You may be barred from exams. Please attend classes regularly.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Overall Attendance</h3>
          {totalClasses > 0 ? (
            <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No attendance data yet</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Course-wise Attendance</h3>
          <div className="space-y-3">
            {report.report.map((r) => (
              <div key={r.course._id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{r.course.name}</p>
                  <span className={r.percentage >= 75 ? 'badge-green' : 'badge-red'}>{r.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${r.percentage >= 75 ? 'bg-indigo-600' : 'bg-red-500'}`}
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{r.present}/{r.total} classes</p>
              </div>
            ))}
            {report.report.length === 0 && <p className="text-gray-400 text-sm">No courses enrolled</p>}
          </div>
          <Link to="/student/scan" className="btn-primary w-full text-center block mt-4">Scan QR to Mark Attendance</Link>
        </div>
      </div>
    </Layout>
  );
}
