/* eslint-disable jsx-a11y/control-has-associated-label */
import './index.scss';
import { useState } from 'react';
import { Button, Container } from '@dataesr/react-dsfr';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

import Filters from './filters';
import getBsoData from '../../utils/bso';
import getOpenAlexData from '../../utils/openalex';
import { PageSpinner } from '../../components/spinner';

import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';

const getData = async (options) => {
  const promises = options?.datasources.map((datasource) => {
    switch (datasource) {
    case 'bso':
      return getBsoData(options);
    case 'openalex':
      return getOpenAlexData(options);
    default:
      console.error(`Datasoure : ${datasource} is badly formated and shoud be on of bso or openalex`);
      return Promise.resolve();
    }
  });
  const results = await Promise.all(promises);
  const data = results.filter((item) => !!item).map((item) => (item?.hits?.hits ? item.hits.hits : item)).flat();
  // const nbResultsBso = results[0].hits.total.value;
  return data;
};

export default function Home() {
  const [options, setOptions] = useState({});
  const [actions, setActions] = useState([{ doi: '10.1007/s13595-016-0554-5', action: 'keep' }]);

  const getAffiliationsField = (item) => {
    if (item.highlight && item.highlight['affiliations.name']) {
      const highlight = item.highlight['affiliations.name'];
      const desc = highlight.join('<br />');
      return desc;
    }
    if (item._source.affiliations === undefined) {
      return '';
    }
    const { affiliations } = item._source;
    const nbAffiliations = affiliations?.length || 0;
    if (nbAffiliations === 0) return '';
    const affiliationsName = [];
    affiliations.forEach((aff) => {
      affiliationsName.push(aff.name);
    });
    return affiliationsName.join('<br />');
  };

  const getAuthorsField = (item) => {
    if (item.highlight && item.highlight['authors.full_name']) {
      const highlight = item.highlight['authors.full_name'];
      const desc = highlight.join(';');
      return desc;
    }
    if (item._source.authors === undefined) {
      return '';
    }
    const { authors } = item._source;
    const nbAuthors = authors?.length || 0;
    if (nbAuthors === 0) return '';
    if (nbAuthors === 1) return authors[0].full_name;
    return `${authors[0].full_name} et al. (${nbAuthors - 1})`;
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['data'],
    queryFn: () => getData(options),
    enabled: false,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const sendQuery = async (filters) => {
    await setOptions({
      identifiers: filters.identifiers,
      datasources: filters.datasources,
      filters: {
        affiliations: filters.affiliations,
        affiliationsToExclude: filters.affiliationsToExclude,
        authors: filters.authors,
        authorsToExclude: filters.authorsToExclude,
        startYear: filters.startYear,
        endYear: filters.endYear,
        dataidentifiers: filters.dataidentifiers,
      },
    });
    refetch();
  };

  let publicationsDataTable = [];
  const affiliationsDataTable = [];
  if (data) {
    publicationsDataTable = data.map((item, index) => ({
      affiliations: getAffiliationsField(item),
      authors: getAuthorsField(item),
      doi: item._source.doi,
      hal_id: item._source.hal_id,
      id: index,
      title: item._source.title,
      genre: item._source.genre_raw || item._source.genre,
      year: item._source.year,
      action: actions.find((action) => action.doi === item._source.doi)?.action,
    }));
  }
  const paginatorLeft = <Button icon="ri-refresh-fill" text>Refresh</Button>;
  const paginatorRight = <Button icon="ri-download-fill" text>Download</Button>;

  // regroupement par affiliation
  const normalizedName = (name) => name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  const dataGroupedByAffiliation = [];
  if (data) {
    data.forEach((publication) => {
      // if (publication._source.affiliations) {
      if (publication.highlight['affiliations.name']) {
        // publication._source.affiliations.forEach((affiliation) => {
        publication.highlight['affiliations.name'].forEach((affiliation) => {
          // if (dataGroupedByAffiliation.find((item) => normalizedName(item.name) === normalizedName(affiliation.name))) {
          if (dataGroupedByAffiliation.find((item) => normalizedName(item.name) === normalizedName(affiliation))) {
            // dataGroupedByAffiliation.find((item) => normalizedName(item.name) === normalizedName(affiliation.name)).publications.push(publication._source.id);
            dataGroupedByAffiliation.find((item) => normalizedName(item.name) === normalizedName(affiliation)).publications.push(publication._source.id);
          } else {
            dataGroupedByAffiliation.push({ name: affiliation, publications: [publication._source.id] });
          }
        });
      }
    });
    dataGroupedByAffiliation.sort((a, b) => b.publications.length - a.publications.length);
    dataGroupedByAffiliation.forEach((elt) => {
      affiliationsDataTable.push({ affiliations: elt.name, publicationsNumber: elt.publications.length });
    });
  }

  const affiliationsTemplate = (rowData) => <span dangerouslySetInnerHTML={{ __html: rowData.affiliations }} />;

  const authorsTemplate = (rowData) => <span dangerouslySetInnerHTML={{ __html: rowData.authors }} />;

  return (
    <Container className="fr-my-5w" as="section">
      <Filters
        sendQuery={sendQuery}
      />
      {isFetching && (<Container><PageSpinner /></Container>)}
      <div>
        {`${data?.length || 0} results`}
      </div>
      {
        affiliationsDataTable && (
          <DataTable
            style={{ fontSize: '11px', lineHeight: '15px' }}
            size="small"
            value={affiliationsDataTable}
            paginator
            rows={25}
            rowsPerPageOptions={[25, 50, 100, 200]}
            tableStyle={{ minWidth: '50rem' }}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorLeft={paginatorLeft}
            paginatorRight={paginatorRight}
            filterDisplay="row"
            scrollable
            stripedRows
          >
            <Column filter filterMatchMode="contains" body={affiliationsTemplate} field="affiliation" header="affiliations" style={{ minWidth: '10px' }} />
            <Column showFilterMenu={false} field="publicationsNumber" header="publicationsNumber" style={{ minWidth: '10px' }} />
          </DataTable>
        )
      }
      {
        publicationsDataTable && (
          <DataTable
            style={{ fontSize: '11px', lineHeight: '15px' }}
            size="small"
            value={publicationsDataTable}
            paginator
            rows={25}
            rowsPerPageOptions={[25, 50, 100, 200]}
            tableStyle={{ minWidth: '50rem' }}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorLeft={paginatorLeft}
            paginatorRight={paginatorRight}
            filterDisplay="row"
            scrollable
            stripedRows
          >
            <Column field="verified" header="Verified" dataType="boolean" style={{ minWidth: '6rem' }} />
            <Column filter filterMatchMode="contains" showFilterMenu={false} field="doi" header="doi" style={{ minWidth: '10px' }} />
            <Column filter filterMatchMode="contains" showFilterMenu={false} field="hal_id" header="hal_id" style={{ minWidth: '10px' }} />
            <Column filter filterMatchMode="contains" body={affiliationsTemplate} field="affiliations" header="affiliations" style={{ minWidth: '10px' }} />
            <Column filter filterMatchMode="contains" body={authorsTemplate} field="authors" header="authors" style={{ minWidth: '10px' }} />
            <Column filter filterMatchMode="contains" showFilterMenu={false} field="title" header="title" style={{ minWidth: '10px' }} />
          </DataTable>
        )
      }
    </Container>
  );
}
