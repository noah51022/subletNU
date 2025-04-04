
import { Home, PlusCircle, MessageSquare, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  
  return (
    <div className="bottom-nav">
      <button 
        className={`nav-item ${pathname === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <Home size={24} />
        <span className="text-xs mt-1">Home</span>
      </button>
      
      <button 
        className={`nav-item ${pathname === '/create' ? 'active' : ''}`}
        onClick={() => navigate('/create')}
      >
        <PlusCircle size={24} />
        <span className="text-xs mt-1">Post</span>
      </button>
      
      <button 
        className={`nav-item ${pathname.startsWith('/messages') ? 'active' : ''}`}
        onClick={() => navigate('/messages')}
      >
        <MessageSquare size={24} />
        <span className="text-xs mt-1">Messages</span>
      </button>

      <button 
        className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <User size={24} />
        <span className="text-xs mt-1">Profile</span>
      </button>
    </div>
  );
};

export default BottomNav;
