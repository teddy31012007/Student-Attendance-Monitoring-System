import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiRefreshCw } from 'react-icons/fi';

const emptyForm = { name: '', code: '', department: '', semester: 1, section: '', teacher: '' };

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'enroll'
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [enrollCourse, setEnrollCourse] = useState(null);
  const [enrolledIds, setEnrolledIds] = useState([]);

  const load = async () => {
    const [c, t, s] = await Promise.all([
      api.get('/admin/courses'),
      api.get('/admin/teachers'),
      api.get('/admin/students'),
    ]);
    setCourses(c.data);
    setTeachers(t.data);
    setStudents(s.data);
  };
  useEffect(() => { load(); }, []);

  const syncCourses = async () => {
    try {
      const { data } = await api.post('/admin/sync-courses');
      toast.success(data.message);
    } catch (err) {
      toast.error('Sync failed');
    }
  };

  const openAdd = () => { setForm(emptyForm); setModal('add'); };
  const openEdit = (c) => {
    setForm({
      name: c.name, code: c.code, department: c.department,
      semester: c.semester, section: c.section,
      teacher: c.teacher?._id || '',
    });
    setEditId(c._id);
    setModal('edit');
  };

  const openEnroll = (course) => {
    setEnrollCourse(course);
    // Pre-select students already enrolled
    const enrolled = students
      .filter((s) => s.enrolledCourses?.some((ec) => (ec._id || ec).toString() === course._id.toString()))
      .map((s) => s._id);
    setEnrolledIds(enrolled);
    setModal('enroll');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'add') {
        await api.post('/admin/courses', form);
        toast.success('Course created');
      } else {
        await api.put(`/admin/courses/${editId}`, form);
        toast.success('Course updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    await api.delete(`/admin/courses/${id}`);
    toast.success('Course deleted');
    load();
  };

  const toggleEnroll = (studentId) => {
    setEnrolledIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const saveEnrollment = async () => {
    try {
      await Promise.all(
        students.map((s) => {
          const wasEnrolled = s.enrolledCourses?.some((ec) => (ec._id || ec).toString() === enrollCourse._id.toString());
          const isEnrolled = enrolledIds.includes(s._id);
          if (wasEnrolled === isEnrolled) return Promise.resolve();
          const updatedCourses = isEnrolled
            ? [...(s.enrolledCourses || []).map((ec) => (ec._id || ec).toString()), enrollCourse._id]
            : (s.enrolledCourses || []).map((ec) => (ec._id || ec).toString()).filter((id) => id !== enrollCourse._id.toString());
          return api.put(`/admin/students/${s._id}`, {
            name: s.user?.name, email: s.user?.email,
            studentId: s.studentId, department: s.department,
            semester: s.semester, section: s.section,
            enrolledCourses: updatedCourses,
          });
        })
      );
      toast.success('Enrollment updated');
      setModal(null);
      load();
    } catch (err) {
      toast.error('Error updating enrollment');
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Courses</h2>
        <div className="flex gap-2">
          <button onClick={syncCourses} className="btn-secondary flex items-center gap-2" title="Sync teacher assignments for existing courses">
            <FiRefreshCw /> Sync Teachers
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Course
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Course Name</th>
              <th className="pb-3 pr-4">Code</th>
              <th className="pb-3 pr-4">Department</th>
              <th className="pb-3 pr-4">Sem / Section</th>
              <th className="pb-3 pr-4">Teacher</th>
              <th className="pb-3 pr-4">Students</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {courses.map((c) => {
              const enrolledCount = students.filter((s) =>
                s.enrolledCourses?.some((ec) => (ec._id || ec).toString() === c._id.toString())
              ).length;
              return (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">{c.name}</td>
                  <td className="py-3 pr-4">{c.code}</td>
                  <td className="py-3 pr-4">{c.department}</td>
                  <td className="py-3 pr-4">{c.semester} / {c.section}</td>
                  <td className="py-3 pr-4">
                    {c.teacher?.user?.name
                      ? <span className="badge-green">{c.teacher.user.name}</span>
                      : <span className="text-gray-400 text-xs">Unassigned</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="badge-yellow">{enrolledCount} students</span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEnroll(c)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Enroll Students"><FiUsers /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit"><FiEdit2 /></button>
                      <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {courses.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No courses yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Course Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Course' : 'Edit Course'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Course Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course Code</label>
                <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Semester</label>
                <input type="number" min="1" max="8" className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <input className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign Teacher</label>
                <select className="input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.user?.name} ({t.teacherId})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">{modal === 'add' ? 'Create Course' : 'Save Changes'}</button>
              <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Enroll Students Modal */}
      {modal === 'enroll' && enrollCourse && (
        <Modal title={`Enroll Students — ${enrollCourse.name}`} onClose={() => setModal(null)}>
          <p className="text-sm text-gray-500 mb-4">Select students to enroll in this course.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
            {students.map((s) => (
              <label key={s._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={enrolledIds.includes(s._id)}
                  onChange={() => toggleEnroll(s._id)}
                />
                <div>
                  <p className="text-sm font-medium">{s.user?.name}</p>
                  <p className="text-xs text-gray-400">{s.studentId} • {s.department} Sem {s.semester}</p>
                </div>
              </label>
            ))}
            {students.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No students found</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={saveEnrollment} className="btn-primary flex-1">Save Enrollment</button>
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
