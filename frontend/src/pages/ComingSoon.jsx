import { Clock3 } from 'lucide-react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { buildRoutePath } from '../routes/paths.js';

export default function ComingSoon({ route }) {
  const title = route?.nav?.label || route?.title || 'Modulo';
  const breadcrumbs = [
    { label: 'Inicio', href: buildRoutePath('dashboard') },
    { label: title }
  ];

  return (
    <Page>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        subtitle="Este modulo estara disponible pronto."
      />
      <PageContent>
        <EmptyState
          eyebrow="Próximamente"
          title={`Estamos preparando ${title.toLowerCase()}`}
          description="Estamos cerrando flujos operativos, permisos y trazabilidad para esta sección antes de habilitarla."
          icon={Clock3}
        />
      </PageContent>
    </Page>
  );
}
