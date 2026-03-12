import { useAuthContext } from '../components/AuthProvider.jsx';

export default function useAuth() {
  return useAuthContext();
}
