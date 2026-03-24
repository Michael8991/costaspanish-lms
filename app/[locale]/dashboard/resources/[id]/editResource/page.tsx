export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="text-black">
      <h1>Hola</h1>
      <h1>{locale}</h1>
    </div>
  );
}
