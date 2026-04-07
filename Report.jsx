import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function AdminReports() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    api.get('/admin/courses').then((r) => setCourses(r.data));
  }, []);

  const loadReport = async () => {
    const params = {};
    if (selectedCourse) params.courseId = selectedCourse;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const { data } = await api.get('/admin/reports', { params });
    setReport(data);
  };

  const downloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Attendance Report', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);
    const rows = report.flatMap((session) =>
      session.records.map((r) => [
        new Date(session.date).toLocaleDateString(),
        session.course?.name || '—',
        r.student?.user?.name || '—',
        r.status,
        r.method || 'manual',
      ])
    );
    autoTable(doc, {
      head: [['Date', 'Course', 'Student', 'Status', 'Method']],
      body: rows,
      startY: 28,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save('attendance-report.pdf');
  };

  // Build chart data from report
  const chartData = report
    ? (() => {
        const courseMap = {};
        report.forEach((session) => {
          const name = session.course?.name || 'Unknown';
          if (!courseMap[name]) courseMap[name] = { present: 0, absent: 0 };
          session.records.forEach((r) => {
            if (r.status === 'present') courseMap[name].present++;
            else courseMap[name].absent++;
          });
        });
        return {
          labels: Object.keys(courseMap),
          datasets: [
            { label: 'Present', data: Object.values(courseMap).map((v) => v.present), backgroundColor: '#4F46E5' },
            { label: 'Absent', data: Object.values(courseMap).map((v) => v.absent), backgroundColor: '#EF4444' },
          ],
        };
      })()
    : null;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Attendance Reports</h2>
        <button onClick={downloadPDF} className="btn-secondary flex items-center gap-2"><FiDownload /> Export PDF</button>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <select className="input" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={loadReport} className="btn-primary">Generate Report</button>
        </div>
      </div>

      {chartData && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Attendance by Course</h3>
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
        </div>
      )}

      {report && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Course</th>
                <th className="pb-3 pr-4">Total</th>
                <th className="pb-3 pr-4">Present</th>
                <th className="pb-3 pr-4">Absent</th>
                <th className="pb-3">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.map((session) => {
                const present = session.records.filter((r) => r.status === 'present').length;
                const total = session.records.length;
                const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                return (
                  <tr key={session._id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">{new Date(session.date).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{session.course?.name}</td>
                    <td className="py-3 pr-4">{total}</td>
                    <td className="py-3 pr-4 text-green-600">{present}</td>
                    <td className="py-3 pr-4 text-red-500">{total - present}</td>
                    <td className="py-3">
                      <span className={pct >= 75 ? 'badge-green' : 'badge-red'}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
