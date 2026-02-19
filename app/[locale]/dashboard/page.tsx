export default function DashboardPage({ params }: { params: { locale: string } }) {
  return <div>Dashboard ({params.locale})</div>;
}
