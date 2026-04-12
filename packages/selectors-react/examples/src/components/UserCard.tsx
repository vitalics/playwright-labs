export interface User {
  name: string;
  role: string;
}

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div className="user-card">
      <strong>{user.name}</strong>
      <span>{user.role}</span>
    </div>
  );
}
