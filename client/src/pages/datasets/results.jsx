import {
  Badge,
  Col,
  Container,
  Row,
  Spinner,
  Tag,
  TagGroup,
  Title,
} from '@dataesr/dsfr-plus';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Ribbon from '../../components/ribbon';
import { status } from '../../config';
import useToast from '../../hooks/useToast';
import { isRor } from '../../utils/ror';
import { normalize } from '../../utils/strings';
import { getWorks } from '../../utils/works';
import Datasets from '../views/datasets';

import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import Header from '../../layout/header';

const {
  VITE_APP_NAME,
  VITE_APP_TAG_LIMIT,
  VITE_HEADER_TAG,
  VITE_HEADER_TAG_COLOR,
} = import.meta.env;

export default function Affiliations() {
  const [searchParams] = useSearchParams();

  const [affiliations, setAffiliations] = useState([]);
  const [options, setOptions] = useState({});
  const [selectedAffiliations, setSelectedAffiliations] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const { toast } = useToast();

  const { data, error, isFetched, isFetching, refetch } = useQuery({
    queryKey: ['datasets', JSON.stringify(options)],
    queryFn: () => getWorks(options, toast),
    enabled: false,
  });

  const tagDatasets = (datasets, action) => {
    const datasetsIds = datasets.map((dataset) => dataset.id);
    data?.datasets?.results
      ?.filter((dataset) => datasetsIds.includes(dataset.id))
      .map((dataset) => (dataset.status = action));
    setSelectedDatasets([]);
  };

  const tagAffiliations = (_affiliations, action) => {
    if (action !== status.excluded.id) {
      const worksIds = _affiliations
        .map((affiliation) => affiliation.works)
        .flat();
      data?.publications?.results
        ?.filter((publication) => worksIds.includes(publication.id))
        .map((publication) => (publication.status = action));
      data?.datasets?.results
        ?.filter((dataset) => worksIds.includes(dataset.id))
        .map((dataset) => (dataset.status = action));
    }
    const affiliationIds = _affiliations.map((affiliation) => affiliation.id);
    setAffiliations(
      _affiliations
        ?.filter((affiliation) => affiliationIds.includes(affiliation.id))
        .map((affiliation) => (affiliation.status = action)),
    );
    setSelectedAffiliations([]);
  };

  useEffect(() => {
    const queryParams = {
      endYear: searchParams.get('endYear') ?? '2023',
      startYear: searchParams.get('startYear') ?? '2023',
    };
    queryParams.affiliationStrings = [];
    queryParams.deletedAffiliations = [];
    queryParams.rors = [];
    queryParams.rorExclusions = [];
    searchParams.getAll('affiliations').forEach((item) => {
      if (isRor(item)) {
        queryParams.rors.push(item);
      } else {
        queryParams.affiliationStrings.push(normalize(item));
      }
    });
    searchParams.getAll('deletedAffiliations').forEach((item) => {
      if (isRor(item)) {
        queryParams.rorExclusions.push(item);
      } else {
        queryParams.deletedAffiliations.push(normalize(item));
      }
    });
    if (
      queryParams.affiliationStrings.length === 0
      && queryParams.rors.length === 0
    ) {
      console.error(
        `You must provide at least one affiliation longer than ${VITE_APP_TAG_LIMIT} letters.`,
      );
      return;
    }
    setOptions(queryParams);
  }, [searchParams]);

  useEffect(() => {
    if (Object.keys(options).length > 0) refetch();
  }, [options, refetch]);

  useEffect(() => {
    setAffiliations(data?.affiliations ?? []);
  }, [data]);

  return (
    <>
      <Header isSticky />
      <Container fluid as="section" className="filters sticky">
        <Row verticalAlign="top" className="fr-p-1w">
          <Ribbon />
          <Col xs="2" className="cursor-pointer" offsetXs="1">
            <Title as="h1" look="h6" className="fr-m-0">
              {VITE_APP_NAME}
              {VITE_HEADER_TAG && (
                <Badge
                  className="fr-ml-1w"
                  color={VITE_HEADER_TAG_COLOR}
                  size="sm"
                >
                  {VITE_HEADER_TAG}
                </Badge>
              )}
            </Title>
          </Col>
          <Col>
            <Row>
              <Col
                className="cursor-pointer"
                onClick={(e) => {
                  // setIsOpen(true);
                  e.preventDefault();
                }}
              >
                <TagGroup>
                  <Tag color="blue-ecume" key="tag-sticky-years" size="sm">
                    {`${options.startYear} - ${options.endYear}`}
                  </Tag>
                  {/* {tagsDisplayed.map((tag) => (
                    <Tag
                      color="blue-ecume"
                      key={`tag-sticky-${tag.label}`}
                      size="sm"
                    >
                      {tag.label}
                    </Tag>
                  ))} */}
                </TagGroup>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
      <Container as="section" className="fr-mt-4w">
        {isFetching && (
          <Row>
            <Col xs="2" offsetXs="6">
              <Spinner size={48} />
            </Col>
          </Row>
        )}

        {error && (
          <Row gutters className="fr-mb-16w">
            <Col xs="12">
              <div>
                Error while fetching data, please try again later or contact the
                team (see footer).
              </div>
            </Col>
          </Row>
        )}

        {!isFetching && isFetched && (
          <Datasets
            allAffiliations={affiliations}
            allDatasets={data?.datasets?.results ?? []}
            data={data}
            options={options}
            selectedAffiliations={selectedAffiliations}
            selectedDatasets={selectedDatasets}
            setSelectedAffiliations={setSelectedAffiliations}
            setSelectedDatasets={setSelectedDatasets}
            tagAffiliations={tagAffiliations}
            tagDatasets={tagDatasets}
          />
        )}
      </Container>
    </>
  );
}
