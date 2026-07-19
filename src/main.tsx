
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeDatabase } from './services/database'

// Initialize database with default categories for current month
initializeDatabase().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
