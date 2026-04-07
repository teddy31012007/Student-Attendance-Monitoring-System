import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';

const emptyForm = { name: '', email: '', password: '', teacherId: '', department: '', designation: '', phone: '' };

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => api.get('/admin/teachers').then((r) => setTeachers(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setModal('add'); };
  const openEdit = (t) => {
    setForm({
      name: t.user?.name || '', email: t.user?.email || '', password: '',
      teacherId: t.teacherId, department: t.department,
      designation: t.designation || '', phone: t.phone || '',
      isActive: t.user?.isActive,
    });
    setEditId(t._id);
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'add') {
        await api.post('/admin/teachers', form);
        toast.success('Teacher added');
      } else {
        await api.put(`/admin/teachers/${editId}`, form);
        toast.success('Teacher updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher?')) return;
    try {
      await api.delete(`/admin/teachers/${id}`);
      toast.success('Teacher deleted');
      load();
    } catch (err) {
      toast.error('Error deleting teacher');
    }
  };

  const filtered = teachers.filter((t) =>
    t.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.teacherId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Teachers</h2>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Teacher
        </button>
      </div>

      <div className="card mb-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Teacher ID</th>
              <th className="pb-3 pr-4">Department</th>
              <th className="pb-3 pr-4">Designation</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="py-3 pr-4">
                  <p className="font-medium">{t.user?.name}</p>
                  <p className="text-xs text-gray-400">{t.user?.email}</p>
                </td>
                <td className="py-3 pr-4">{t.teacherId}</td>
                <td className="py-3 pr-4">{t.department}</td>
                <td className="py-3 pr-4">{t.designation || '—'}</td>
                <td className="py-3 pr-4">
                  <span className={t.user?.isActive ? 'badge-green' : 'badge-red'}>
                    {t.user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(t._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Teacher' : 'Edit Teacher'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              {modal === 'add' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Teacher ID</label>
                <input className="input" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Designation</label>
                <input className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            {modal === 'edit' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active Account
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">{modal === 'add' ? 'Add Teacher' : 'Save Changes'}</button>
              <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
