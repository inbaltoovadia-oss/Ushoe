import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import Layout from './components/Layout';
import Home from './pages/Home';
import Discover from './pages/Discover';
import SearchResults from './pages/SearchResults';
import Trending from './pages/Trending';
import Wishlist from './pages/Wishlist';
import ShoeDetail from './pages/ShoeDetail';
import PriceDrops from './pages/PriceDrops';
import Deals from './pages/Deals';
import StyleQuiz from './pages/StyleQuiz';
import FitPredictor from './pages/FitPredictor';
import OutfitMatcher from './pages/OutfitMatcher';
import Settings from './pages/Settings';
import ShoeSurvey from './pages/ShoeSurvey';
import NearbyStoresPage from './pages/NearbyStoresPage';
import Compare from './pages/Compare';
import AdminDashboard from './pages/AdminDashboard';
import Subscription from './pages/Subscription';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/shoe/:id" element={<ShoeDetail />} />
        <Route path="/price-drops" element={<PriceDrops />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/style-quiz" element={<StyleQuiz />} />
        <Route path="/fit-predictor" element={<FitPredictor />} />
        <Route path="/outfit-matcher" element={<OutfitMatcher />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/survey" element={<ShoeSurvey />} />
        <Route path="/nearby-stores" element={<NearbyStoresPage />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App