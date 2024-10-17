import { Container, TextInput } from '@dataesr/dsfr-plus';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getMentions } from '../utils/works';

export default function Mentions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [mentions, setMentions] = useState([]);
  const [search, setSearch] = useState();
  const [timer, setTimer] = useState();
  const [totalRecords, setTotalRecords] = useState(0);

  const usedTemplate = (rowData) => (rowData.mention_context.used ? 'True' : 'False');
  const createdTemplate = (rowData) => (rowData.mention_context.created ? 'True' : 'False');
  const sharedTemplate = (rowData) => (rowData.mention_context.shared ? 'True' : 'False');

  const doiTemplate = (rowData) => (
    <a href={`https://doi.org/${rowData.doi}`}>{rowData.doi}</a>
  );

  useEffect(() => {
    if (timer) {
      clearTimeout(timer);
    }
    const timerTmp = setTimeout(() => {
      setSearchParams((params) => {
        params.set('search', search);
        return params;
      });
    }, 500);
    setTimer(timerTmp);
    // The timer should not be tracked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      if (
        searchParams.get('search')
        && searchParams.get('search')?.length > 0
      ) {
        const m = await getMentions({ search: searchParams.get('search') });
        setMentions(m);
      }
      setTotalRecords(mentions?.length ?? 0);
      setLoading(false);
    };
    getData();
  }, [searchParams]);

  return (
    <Container as="section" className="fr-mt-4w mentions">
      <TextInput
        disableAutoValidation
        hint="Example: Coq"
        label="Search"
        onChange={(e) => setSearch(e.target.value)}
        value={search}
      />
      <DataTable
        dataKey="id"
        loading={loading}
        scrollable
        size="small"
        stripedRows
        style={{ fontSize: '14px', lineHeight: '13px' }}
        tableStyle={{ minWidth: '50rem' }}
        totalRecords={totalRecords}
        value={mentions}
      >
        <Column body={doiTemplate} field="doi" header="DOI" />
        <Column field="type" header="Type" />
        <Column field="rawForm" header="rawForm" />
        <Column field="context" header="context" />
        <Column
          body={usedTemplate}
          field="mention.mention_context.used"
          header="Used"
        />
        <Column
          body={createdTemplate}
          field="mention.mention_context.created"
          header="Created"
        />
        <Column
          body={sharedTemplate}
          field="mention.mention_context.shared"
          header="Shared"
        />
      </DataTable>
    </Container>
  );
}
