import NavigationBar from '../components/NavigationBar';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-dark-bg">
      <NavigationBar />
      <div className="max-w-container mx-auto px-md py-xl flex items-center justify-center min-h-[calc(100vh-80px)]">
        <h1 className="text-6xl font-bold text-center text-dark-text">
          HELLO WORLD
        </h1>
      </div>
    </div>
  );
};

export default LandingPage;
