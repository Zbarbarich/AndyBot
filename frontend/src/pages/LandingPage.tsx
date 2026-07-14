import AndyLogo from '../components/AndyLogo';

const LandingPage = () => {
  return (
    <div className="page-container min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center ambient-bg">
      <div className="glass-panel p-8 sm:p-12 max-w-lg w-full flex flex-col items-center text-center">
        <AndyLogo size="lg" showWordmark showTagline />
        <p className="mt-6 text-text-muted text-sm sm:text-base leading-relaxed">
          Built for IT, construction, electrical, security, and other field installers —
          tickets, assets, customers, orders, and invoices in one place.
        </p>
        <div className="mt-6 h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-primary-light to-secondary" aria-hidden />
      </div>
    </div>
  );
};

export default LandingPage;
