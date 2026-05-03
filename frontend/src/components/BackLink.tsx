import { useNavigate } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label?: string;
}

export default function BackLink({ to, label = 'Back to Security' }: BackLinkProps) {
  const navigate = useNavigate();
  return (
    <div className="pt-8 text-center">
      <button
        onClick={() => navigate(to)}
        className="eyebrow-label underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </button>
    </div>
  );
}
