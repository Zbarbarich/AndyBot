import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
}

export const PageHeader = ({ title, backTo, backLabel = 'Back' }: PageHeaderProps) => (
  <header className="page-header">
    <h1 className="page-header-title">{title}</h1>
    {backTo && (
      <Link to={backTo} className="page-header-back">
        ← {backLabel}
      </Link>
    )}
  </header>
);
