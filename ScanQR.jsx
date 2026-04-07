import { useEffect, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCamera, FiCheck, FiX } from 'react-icons/fi';
import * as faceapi from 'face-api.js';

const MODELS_URL = '/models';
const emptyForm = { name: '', email: '', password: '', studentId: '', department: '', semester: 1, section: '', phone: '', address: '' };

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const load = () => api.get('/admin/students').then((r) => setStudents(r.data));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL)
      .then(() => faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL))
      .then(() => faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL))
      .then(() => setModelsLoaded(true))
      .catch(() => console.warn('Face models failed to load'));
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCapturing(false);
  };

  const startCapture = async () => {
    if (!modelsLoaded) return toast.error('Face models still loading...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCapturing(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      toast.error('Camera access denied');
    }
  };

  const captureDescriptor = async () => {
    if (!videoRef.current) return;
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return toast.error('No face detected. Look directly at the camera.');
    setFaceDescriptor(Array.from(detection.descriptor));
    stopCamera();
    toast.success('Face captured!');
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setFaceDescriptor(null);
    setModal('form');
  };

  const openEdit = (s) => {
    setForm({
      name: s.user?.name || '', email: s.user?.email || '', password: '',
      studentId: s.studentId, department: s.department, semester: s.semester,
      section: s.section, phone: s.phone || '', address: s.address || '',
      isActive: s.user?.isActive,
    });
    setEditId(s._id);
    setFaceDescriptor(s.faceDescriptor?.length ? s.faceDescriptor : null);
    setModal('form');
  };

  const closeModal = () => { stopCamera(); setModal(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (faceDescriptor) payload.faceDescriptor = faceDescriptor;
      if (editId) {
        await api.put(`/admin/students/${editId}`, payload);
        toast.success('Student updated');
      } else {
        await api.post('/admin/students', payload);
        toast.success('Student added');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      await api.delete(`/admin/students/${id}`);
      toast.success('Student deleted');
      load();
    } catch { toast.error('Error deleting student'); }
  };

  const filtered = students.filter((s) =>
    s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    s.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Students</h2>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Student
        </button>
      </div>

      <div className="card mb-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Search by name, ID, department..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Student ID</th>
              <th className="pb-3 pr-4">Department</th>
              <th className="pb-3 pr-4">Semester</th>
              <th className="pb-3 pr-4">Face</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s) => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="py-3 pr-4">
                  <p className="font-medium">{s.user?.name}</p>
                  <p className="text-xs text-gray-400">{s.user?.email}</p>
                </td>
                <td className="py-3 pr-4">{s.studentId}</td>
                <td className="py-3 pr-4">{s.department}</td>
                <td className="py-3 pr-4">{s.semester}</td>
                <td className="py-3 pr-4">
                  {s.faceDescriptor?.length
                    ? <span className="badge-green flex items-center gap-1 w-fit"><FiCheck size={10} /> Registered</span>
                    : <span className="badge-red flex items-center gap-1 w-fit"><FiX size={10} /> Not set</span>}
                </td>
                <td className="py-3 pr-4">
                  <span className={s.user?.isActive ? 'badge-green' : 'badge-red'}>
                    {s.user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(s._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'form' && (
        <Modal title={editId ? 'Edit Student' : 'Add Student'} onClose={closeModal}>
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
              {!editId && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Student ID</label>
                <input className="input" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
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
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            {/* Face Registration */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Face Registration</p>
                {faceDescriptor
                  ? <span className="badge-green flex items-center gap-1"><FiCheck size={10} /> Captured</span>
                  : <span className="badge-red">Not captured</span>}
              </div>
              {capturing ? (
                <div className="space-y-2">
                  <video ref={videoRef} autoPlay muted className="w-full rounded-lg" style={{ maxHeight: 200 }} />
                  <div className="flex gap-2">
                    <button type="button" onClick={captureDescriptor} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <FiCamera /> Capture Face
                    </button>
                    <button type="button" onClick={stopCamera} className="btn-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={startCapture} className="btn-secondary w-full flex items-center justify-center gap-2">
                  <FiCamera /> {faceDescriptor ? 'Recapture Face' : 'Open Camera & Capture Face'}
                </button>
              )}
            </div>

            {editId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active Account
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">{editId ? 'Save Changes' : 'Add Student'}</button>
              <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
