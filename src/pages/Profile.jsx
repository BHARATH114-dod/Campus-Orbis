import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateProfile } from '../services/authService';
import ProfileCard from '../components/ProfileCard';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  if (!user) return null;

  const handleSave = async (name) => {
    try {
      const updated = await updateProfile({ name });
      setUser(updated);
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not update your profile.', 'error');
      throw err; // ProfileCard catches this to stay in edit mode instead of closing
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-5 text-xl font-bold text-ink">Profile</h1>
      <ProfileCard user={user} editable onSave={handleSave} />
      <p className="mt-4 text-xs text-ink-light">
        Need to change your password instead? Head to{' '}
        <Link to="/settings" className="text-teal hover:underline">Settings</Link>.
      </p>
    </div>
  );
}
