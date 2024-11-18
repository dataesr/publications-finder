import {
  Badge,
  Button,
  Container, Row, Col,
  Modal, ModalContent, ModalFooter, ModalTitle,
  Tag,
  Text,
  TextInput,
} from '@dataesr/dsfr-plus';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { status } from '../../../config';
import useToast from '../../../hooks/useToast';
import Header from '../../../layout/header';
import { getAffiliationsCorrections } from '../../../utils/curations';
import { getRorData, isRor } from '../../../utils/ror';
import { capitalize, normalize, removeDiacritics } from '../../../utils/strings';
import { getWorks } from '../../../utils/works';
import { getTagColor } from '../../../utils/tags';
import ExportErrorsButton from '../components/export-errors-button';
import ViewsSelector from './views-selector';
import SendFeedbackButton from '../components/send-feedback-button';

import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';

const { VITE_APP_TAG_LIMIT } = import.meta.env;

export default function Affiliations() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [affiliations, setAffiliations] = useState([]);
  const [allOpenalexCorrections, setAllOpenalexCorrections] = useState([]);
  const [body, setBody] = useState({});
  const { toast } = useToast();

  const [action, setAction] = useState();
  const [filteredAffiliations, setFilteredAffiliations] = useState([]);
  const [filteredAffiliationName, setFilteredAffiliationName] = useState('');
  const [filteredStatus] = useState([
    status.tobedecided.id,
    status.validated.id,
    status.excluded.id,
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ror, setRor] = useState('');
  const [selectedOpenAlex, setSelectedOpenAlex] = useState([]);
  const [timer, setTimer] = useState();

  const { data, error, isFetched, isFetching, refetch } = useQuery({
    queryKey: ['openalex-ror', JSON.stringify(body)],
    // Search for works from affiliations for each affiliation strictly longer than 2 letters
    queryFn: () => getWorks({
      ...body,
      affiliationStrings: body.affiliations.filter((affiliation) => !affiliation.isDisabled).map((affiliation) => affiliation.label),
      rors: body.affiliations.filter((affiliation) => affiliation.isRor).map((affiliation) => affiliation.label),
    }, toast),
    enabled: false,
  });

  const undo = (id) => {
    const newAffiliations = affiliations.map((affiliation) => {
      if (affiliation.id === id) {
        // eslint-disable-next-line no-param-reassign
        affiliation.hasCorrection = false;
        // eslint-disable-next-line no-param-reassign
        affiliation.rorsToCorrect = affiliation.rors
          .map((r) => r.rorId)
          .join(';');
      }
      return affiliation;
    });
    setAffiliations(newAffiliations);
    setAllOpenalexCorrections(getAffiliationsCorrections(newAffiliations));
  };

  useEffect(() => {
    const getData = async () => {
      const queryParams = {
        endYear: searchParams.get('endYear') ?? '2023',
        startYear: searchParams.get('startYear') ?? '2023',
      };
      queryParams.deletedAffiliations = [];
      queryParams.rorExclusions = [];
      queryParams.affiliations = await Promise.all(searchParams.getAll('affiliations').map(async (affiliation) => {
        const label = normalize(affiliation);
        let children = [];
        // Compute rorNames
        if (isRor(label)) {
          const rorNames = await getRorData(label);
          children = rorNames.map((item) => item.names).flat().map((name) => ({
            isDisabled: name.length < VITE_APP_TAG_LIMIT,
            isRor: false,
            label: name,
            source: 'ror',
          }));
        }
        return {
          children,
          isDisabled: label.length < VITE_APP_TAG_LIMIT,
          isRor: isRor(label),
          label,
          source: 'user',
        };
      }));

      searchParams.getAll('deletedAffiliations').forEach((item) => {
        if (isRor(item)) {
          queryParams.rorExclusions.push(item);
        } else {
          queryParams.deletedAffiliations.push(normalize(item));
        }
      });
      setBody(queryParams);
    };
    getData();
  }, [searchParams]);

  useEffect(() => {
    if (Object.keys(body).length > 0) refetch();
  }, [body, refetch]);

  useEffect(() => {
    setAffiliations(data?.affiliations ?? []);
  }, [data]);

  const actionToOpenAlex = (_action, _selectedOpenAlex, _ror) => {
    _selectedOpenAlex.map((item) => {
      let rorsToCorrect = item.rorsToCorrect.trim().split(';');
      if (action === 'add') {
        rorsToCorrect.push(_ror);
      } else if (action === 'remove') {
        rorsToCorrect = rorsToCorrect.filter((item2) => item2 !== _ror);
      }
      // eslint-disable-next-line no-param-reassign
      item.rorsToCorrect = [...new Set(rorsToCorrect)].join(';');
      // eslint-disable-next-line no-param-reassign
      item.hasCorrection = item.rors.map((r) => r.rorId).join(';') !== item.rorsToCorrect;
      return item;
    });
    setAllOpenalexCorrections(getAffiliationsCorrections(_selectedOpenAlex));
  };

  useEffect(() => {
    if (timer) {
      clearTimeout(timer);
    }
    const timerTmp = setTimeout(() => {
      const openAlexAffiliations = affiliations.filter((affiliation) => affiliation.source === 'OpenAlex');
      const filteredAffiliationsTmp = openAlexAffiliations.filter((affiliation) => {
        const regex = new RegExp(removeDiacritics(filteredAffiliationName));
        return regex.test(
          affiliation.key.replace('[ source: ', '').replace(' ]', ''),
        );
      });
      // Recompute corrections only when the array has changed
      if (filteredAffiliationsTmp.length !== filteredAffiliations.length) {
        setAllOpenalexCorrections(
          getAffiliationsCorrections(filteredAffiliationsTmp),
        );
      }
      setFilteredAffiliations(filteredAffiliationsTmp);
    }, 500);
    setTimer(timerTmp);
    // The timer should not be tracked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliations, filteredAffiliationName, filteredStatus]);

  return (
    <>
      <Header />
      <Container fluid as="main" className="wm-bg">
        {isFetching && (
          <Container style={{ textAlign: 'center', minHeight: '600px' }} className="fr-pt-5w wm-font">
            <div className="fr-mb-5w wm-message fr-pt-10w">
              Loading data from OpenAlex, please wait...
              <br />
              <br />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/OpenAlex_logo_2021.svg/320px-OpenAlex_logo_2021.svg.png" alt="OpenAlex" />
              <br />
              <span className="loader fr-my-5w">Loading</span>
            </div>
          </Container>
        )}

        {error && (
          <Row gutters className="fr-mb-16w">
            <Col xs="12">
              <Text>
                Error while fetching data, please try again later or contact the
                team (see footer).
              </Text>
            </Col>
          </Row>
        )}

        {!isFetching && isFetched && (
          <Row>
            <Col md={2}>
              <Row>
                <Col>
                  Start year:
                  <Tag color="blue-ecume" key="tag-year-start" size="sm">
                    {body.startYear}
                  </Tag>
                </Col>
              </Row>
              <Row>
                <Col>
                  End year:
                  <Tag color="blue-ecume" key="tag-year-end" size="sm">
                    {body.endYear}
                  </Tag>
                </Col>
              </Row>
              <Row>
                <Col>
                  Affiliations:
                  {body.affiliations.map((affiliation) => (
                    <Row key={`row-${affiliation.label}`}>
                      <Tag
                        className={`fr-mr-1w fr-mt-1w ${affiliation.isDisabled ? 'scratched' : ''}`}
                        color={getTagColor(affiliation)}
                        key={`tag-${affiliation.label}`}
                        size="sm"
                      >
                        {affiliation.label}
                      </Tag>
                      {affiliation.children.map((child) => (
                        <Tag
                          className={`fr-mr-1w fr-mt-1w ${child.isDisabled ? 'scratched' : ''}`}
                          color={getTagColor(child)}
                          key={`tag-${child.label}`}
                          size="sm"
                        >
                          {child.label}
                        </Tag>
                      ))}
                    </Row>
                  ))}
                </Col>
              </Row>
              <Row>
                <Button
                  className="fr-mt-1w"
                  onClick={() => navigate(`/${pathname.split('/')[1]}/search${search}`)}
                >
                  Modify search
                </Button>
              </Row>
            </Col>
            <Col md={10}>
              <div className="wm-bg wm-content">
                <Modal isOpen={isModalOpen} hide={() => setIsModalOpen((prev) => !prev)}>
                  <ModalTitle>
                    {`${capitalize(action)} ROR to ${
                      selectedOpenAlex.length
                    } OpenAlex affiliation${selectedOpenAlex.length > 1 ? 's' : ''}`}
                  </ModalTitle>
                  <ModalContent>
                    <TextInput
                      label={`Which ROR do you want to ${action} ?`}
                      message={isRor(ror) ? 'ROR valid' : 'ROR invalid'}
                      messageType={isRor(ror) ? 'valid' : 'error'}
                      onChange={(e) => setRor(e.target.value)}
                      required
                    />
                  </ModalContent>
                  <ModalFooter>
                    <Button
                      disabled={!isRor(ror)}
                      onClick={() => {
                        actionToOpenAlex(action, selectedOpenAlex, ror);
                        setRor('');
                        setIsModalOpen((prev) => !prev);
                      }}
                      title="Send feedback to OpenAlex"
                    >
                      {capitalize(action)}
                    </Button>
                  </ModalFooter>
                </Modal>
                <div className="wm-external-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="left-content">
                    <span className="wm-text fr-mb-3w fr-ml-1w">
                      <Badge color="brown-opera">{selectedOpenAlex.length}</Badge>
                      <i>
                        {` selected affiliation${selectedOpenAlex.length === 1 ? '' : 's'}`}
                      </i>
                    </span>

                    <Button
                      className="fr-ml-5w fr-mr-1w"
                      color="blue-ecume"
                      disabled={!selectedOpenAlex.length}
                      icon="add-circle-line"
                      key="add-ror"
                      onClick={() => {
                        setAction('add');
                        setIsModalOpen((prev) => !prev);
                      }}
                      size="sm"
                      title="Add ROR"
                    >
                      Modify selected ROR
                    </Button>
                  </div>

                  <div className="right-content fr-mr-1w">
                    <ExportErrorsButton
                      allOpenalexCorrections={allOpenalexCorrections}
                      options={body}
                    />
                    <SendFeedbackButton
                      allOpenalexCorrections={allOpenalexCorrections}
                    />
                  </div>
                </div>
                <ViewsSelector
                  allAffiliations={filteredAffiliations}
                  filteredAffiliationName={filteredAffiliationName}
                  selectedOpenAlex={selectedOpenAlex}
                  setAllOpenalexCorrections={setAllOpenalexCorrections}
                  setFilteredAffiliationName={setFilteredAffiliationName}
                  setSelectedOpenAlex={setSelectedOpenAlex}
                  undo={undo}
                />
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
}