import type { Metadata } from 'next';
import DBDiagramWrapper from '@/components/db-diagram/DBDiagramWrapper';

export const metadata: Metadata = {
  title: 'DB Diagram Drawer — arch.design',
  description: 'Interactive relational database schema designer and code-as-diagram drawer.',
};

export default function DBDiagramPage() {
  return <DBDiagramWrapper />;
}
