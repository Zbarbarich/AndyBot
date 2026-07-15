import { Link } from 'react-router-dom';
import andyHead from '../assets/andy-head.svg';

type AndyLogoSize = 'icon' | 'sm' | 'md' | 'lg';

const sizeMap: Record<AndyLogoSize, { img: string; wordmark: string; tagline: string }> = {
  icon: { img: 'h-6 w-6', wordmark: 'text-xs', tagline: 'text-[10px] leading-tight max-w-[9.5rem]' },
  sm: { img: 'h-7 w-7', wordmark: 'text-sm', tagline: 'text-[10px] leading-tight max-w-[9.5rem]' },
  md: { img: 'h-12 w-12', wordmark: 'text-lg', tagline: 'text-xs leading-snug max-w-[14rem]' },
  lg: { img: 'h-20 w-20 sm:h-24 sm:w-24', wordmark: 'text-3xl sm:text-4xl', tagline: 'text-sm sm:text-base leading-snug max-w-[20rem]' },
};

interface AndyLogoProps {
  size?: AndyLogoSize;
  showWordmark?: boolean;
  showTagline?: boolean;
  collapsed?: boolean;
  /** stack (default) or horizontal row for slim chrome */
  layout?: 'stack' | 'row';
  className?: string;
  linkToHome?: boolean;
}

const AndyLogo = ({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  collapsed = false,
  layout = 'stack',
  className = '',
  linkToHome = false,
}: AndyLogoProps) => {
  const sizes = sizeMap[size];

  const content = (
    <div
      className={`flex items-center justify-center text-center ${
        layout === 'row' ? 'flex-row gap-2' : 'flex-col gap-1.5'
      } ${className}`}
    >
      <img
        src={andyHead}
        alt="Andy Bot"
        className={`${sizes.img} shrink-0 object-contain object-center drop-shadow-sm`}
      />
      {showWordmark && !collapsed && (
        <span className={`${sizes.wordmark} font-display font-bold gradient-text leading-none tracking-tight`}>
          Andy Bot
        </span>
      )}
      {showTagline && !collapsed && layout === 'stack' && (
        <p className={`${sizes.tagline} text-text-muted`}>
          Field Service &amp; Asset Management ERP
        </p>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link
        to="/"
        className="inline-flex rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Andy Bot home"
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default AndyLogo;
