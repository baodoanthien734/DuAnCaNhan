export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="protected-container">
      {children}
    </div>
  );
}