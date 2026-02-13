import NavigationBar from '../components/NavigationBar';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <NavigationBar />
      <main className="flex-1 flex items-center justify-center page-container min-h-[calc(100vh-60px)] sm:min-h-[calc(100vh-64px)]">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center text-dark-text px-4">
          HELLO WORLD
        </h1>
      </main>
    </div>
  );
};

export default LandingPage;
