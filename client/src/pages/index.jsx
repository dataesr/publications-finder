import {
  Accordion,
  AccordionItem,
  Callout,
  CalloutText,
  CalloutTitle,
  Col,
  Container,
  Row,
  Tab,
  Tabs,
} from '@dataesr/react-dsfr';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import ActionsAffiliations from './actions/actionsAffiliations';
import ActionsDatasets from './actions/actionsDatasets';
import ActionsOpenalex from './actions/actionsOpenalex';
import ActionsOpenalexFeedback from './actions/actionsOpenalexFeedback';
import ActionsPublications from './actions/actionsPublications';
import AffiliationsTab from './affiliationsTab';
import { PageSpinner } from '../components/spinner';
import { status } from '../config';
import DatasetsYearlyDistribution from './datasetsYearlyDistribution';
import DatasetsTab from './datasetsTab';
import Filters from './filters';
import OpenalexTab from './openalexTab';
import PublicationsTab from './publicationsTab';
import { getData } from '../utils/works';

import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';

export default function Home() {
  const [allAffiliations, setAllAffiliations] = useState([]);
  const [allDatasets, setAllDatasets] = useState([]);
  const [allPublications, setAllPublications] = useState([]);
  const [allOpenalexCorrections, setAllOpenalexCorrections] = useState([]);
  const [options, setOptions] = useState({});
  const [selectedAffiliations, setSelectedAffiliations] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [selectedPublications, setSelectedPublications] = useState([]);

  const { data, isFetched, isFetching, refetch } = useQuery({
    queryKey: ['data'],
    queryFn: () => getData(options),
    enabled: false,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const sendQuery = async (_options) => {
    setAllAffiliations([]);
    setAllDatasets([]);
    setAllPublications([]);
    setAllOpenalexCorrections([]);
    await setOptions(_options);
    refetch();
  };

  useEffect(() => {
    if (data) {
      setAllAffiliations(data?.affiliations ?? []);
      setAllDatasets(data?.datasets?.results ?? []);
      setAllPublications(data?.publications?.results ?? []);
    }
  }, [data]);

  const tagPublications = (publications, action) => {
    const allPublicationsTmp = [...allPublications];
    const publicationsIds = publications.map((publication) => publication.id);
    // eslint-disable-next-line no-return-assign, no-param-reassign
    allPublicationsTmp.filter((publication) => publicationsIds.includes(publication.id)).map((publication) => publication.status = action);
    setAllPublications(allPublicationsTmp);
    setSelectedPublications([]);
  };

  const tagDatasets = (datasets, action) => {
    const allDatasetsTmp = [...allDatasets];
    const datasetsIds = datasets.map((dataset) => dataset.id);
    // eslint-disable-next-line no-return-assign, no-param-reassign
    allDatasetsTmp.filter((dataset) => datasetsIds.includes(dataset.id)).map((dataset) => dataset.status = action);
    setAllDatasets(allDatasetsTmp);
    setSelectedDatasets([]);
  };

  const tagAffiliations = (affiliations, action) => {
    if (action !== status.excluded.id) {
      const worksIds = affiliations.map((affiliation) => affiliation.works).flat();
      const allPublicationsTmp = [...allPublications];
      // eslint-disable-next-line no-return-assign, no-param-reassign
      allPublicationsTmp.filter((publication) => worksIds.includes(publication.id)).map((publication) => publication.status = action);
      setAllPublications(allPublicationsTmp);
      const allDatasetsTmp = [...allDatasets];
      // eslint-disable-next-line no-return-assign, no-param-reassign
      allDatasetsTmp.filter((dataset) => worksIds.includes(dataset.id)).map((dataset) => dataset.status = action);
      setAllDatasets(allDatasetsTmp);
    }
    const allAffiliationsTmp = [...allAffiliations];
    const affiliationIds = affiliations.map((affiliation) => affiliation.id);
    // eslint-disable-next-line no-return-assign, no-param-reassign
    allAffiliationsTmp.filter((affiliation) => affiliationIds.includes(affiliation.id)).map((affiliation) => affiliation.status = action);
    setAllAffiliations(allAffiliationsTmp);
    setSelectedAffiliations([]);
  };

  const affiliationsChoiceTab = (
    <Tab label="✅ Select the raw affiliations for your institution">
      <Row className="fr-pb-3w">
        <Col n="8">
          <Callout colorFamily="beige-gris-galet">
            <CalloutTitle size="md">
              Select the raw affiliations corresponding to your institution
            </CalloutTitle>
            <CalloutText size="sm">
              🔎 The array below summarizes the most frequent raw affiliation strings retrieved in the French Open Science Monitor data and in OpenAlex for your query.
              <br />
              🤔 You can validate ✅ or exclude ❌ each of them, whether it actually corresponds to your institution or not. If an affiliation is validated, it will also validate all the works with that affiliation string.
              <br />
              🤖 The second column indicates the RoR automatically computed by OpenAlex. Sometimes, they can be inaccurate or missing. If any errors, please use the first tab to send feedback.
              <br />
              💾 You can save (export to a file) those decisions, and restore them later on.
            </CalloutText>
          </Callout>
        </Col>
        <Col>
          <ActionsAffiliations
            allAffiliations={allAffiliations}
            setAllAffiliations={setAllAffiliations}
            tagAffiliations={tagAffiliations}
          />
        </Col>
      </Row>
      <AffiliationsTab
        affiliations={allAffiliations}
        selectedAffiliations={selectedAffiliations}
        setSelectedAffiliations={setSelectedAffiliations}
        tagAffiliations={tagAffiliations}
      />
    </Tab>
  );

  return (
    <>
      <Container fluid as="section" className="filters">
        <Filters sendQuery={sendQuery} />
      </Container>
      <Container fluid as="section">
        {(isFetching || (isFetched && (allAffiliations?.length ?? 0) === 0)) && (
          <PageSpinner />
        )}
        {!isFetching && (allAffiliations?.length > 0 || allDatasets?.length > 0 || allPublications?.length > 0) && (
          <Accordion>
            <AccordionItem title="✏️ Improve OpenAlex for your institution">
              <Tabs defaultActiveTab={0}>
                <Tab label="🆔 Improve RoRs in OpenAlex">
                  <Row className="fr-pb-3w">
                    <Col n="7">
                      <Callout colorFamily="beige-gris-galet">
                        <CalloutTitle size="md">
                          Improve RoR matching in OpenAlex - Provide your feedback!
                        </CalloutTitle>
                        <CalloutText size="sm">
                          🔎 The array below summarizes the most frequent raw affiliation strings retrieved in OpenAlex for your query.
                          <br />
                          🤖 The second column indicates the RoR automatically computed by OpenAlex. Sometimes, they can be inaccurate or missing.
                          <br />
                          ✏️  Click the third column to edit and input the right RoRs for this raw affiliation string. Use a ';' to input multiple RoRs.
                          <br />
                          🗣 Once finished, you can use the Export button on the right to send this feedback to OpenAlex.
                        </CalloutText>
                      </Callout>
                    </Col>
                    <Col n="2">
                      <ActionsOpenalex
                        allOpenalexCorrections={allOpenalexCorrections}
                        options={options}
                      />
                    </Col>
                    <Col n="2" offset="1">
                      <ActionsOpenalexFeedback
                        allOpenalexCorrections={allOpenalexCorrections}
                        options={options}
                      />
                    </Col>
                  </Row>
                  <OpenalexTab
                    affiliations={allAffiliations.filter((aff) => aff.source === 'OpenAlex')}
                    setAllOpenalexCorrections={setAllOpenalexCorrections}
                  />
                </Tab>
              </Tabs>
            </AccordionItem>
            <AccordionItem title="📑 Find the publications affiliated to your institution">
              {(options.datasets) ? (
                <Callout colorFamily="beige-gris-galet">
                  <CalloutTitle size="md">
                    You did not search for publications
                  </CalloutTitle>
                  <CalloutText size="sm">
                    To search for publications, please disable the "Search for datasets only" option
                  </CalloutText>
                </Callout>
              ) : (
                <Tabs>
                  {affiliationsChoiceTab}
                  <Tab label="📑 List of publications">
                    <ActionsPublications
                      allPublications={allPublications}
                    />
                    <PublicationsTab
                      publishers={data.publications?.publishers || []}
                      publications={allPublications}
                      selectedPublications={selectedPublications}
                      setSelectedPublications={setSelectedPublications}
                      tagPublications={tagPublications}
                      types={data.publications?.types || []}
                      years={data.publications?.years || []}
                    />
                  </Tab>
                </Tabs>
              )}
            </AccordionItem>
            <AccordionItem title="🗃 Find the datasets affiliated to your institution">
              <Tabs>
                {affiliationsChoiceTab}
                <Tab label="🗃 List of datasets">
                  <ActionsDatasets
                    allDatasets={allDatasets}
                  />
                  <DatasetsTab
                    datasets={allDatasets}
                    publishers={data.datasets?.publishers}
                    selectedDatasets={selectedDatasets}
                    setSelectedDatasets={setSelectedDatasets}
                    tagDatasets={tagDatasets}
                    types={data.datasets.types}
                    years={data.datasets.years}
                  />
                </Tab>
                <Tab label="📊 Insights">
                  {(allDatasets.filter((dataset) => dataset.status === 'validated').length > 0) ? (
                    <>
                      <DatasetsYearlyDistribution allDatasets={allDatasets} field="publisher" />
                      <DatasetsYearlyDistribution allDatasets={allDatasets} field="type" />
                      <DatasetsYearlyDistribution allDatasets={allDatasets} field="format" />
                      <DatasetsYearlyDistribution allDatasets={allDatasets} field="client_id" />
                      <DatasetsYearlyDistribution allDatasets={allDatasets} field="affiliations" subfield="rawAffiliation" />
                    </>
                  ) : (
                    <Callout colorFamily="beige-gris-galet">
                      <CalloutTitle size="md">
                        You did not validate any datasets
                      </CalloutTitle>
                      <CalloutText size="sm">
                        Please validate affiliations or datasets to see insights about it.
                      </CalloutText>
                    </Callout>
                  )}
                </Tab>
              </Tabs>
            </AccordionItem>
          </Accordion>
        )}
      </Container>
    </>
  );
}
