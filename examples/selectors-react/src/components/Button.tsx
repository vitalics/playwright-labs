interface ButtonProps {
  label: string;
  disabled?: boolean;
  variant?: string;
  onClick?: () => void;
}

export function Button({
  label,
  disabled = false,
  variant = "primary",
  onClick,
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
