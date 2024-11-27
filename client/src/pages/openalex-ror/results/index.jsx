import {
  Badge,
  Button,
  ButtonGroup,
  Col,
  Container,
  Link,
  Modal,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
  Spinner,
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
import getFlagEmoji from '../../../utils/flags';
import { getRorData, isRor } from '../../../utils/ror';
import { normalize, removeDiacritics } from '../../../utils/strings';
import { getTagColor } from '../../../utils/tags';
import { getWorks } from '../../../utils/works';
import ExportErrorsButton from '../components/export-errors-button';
import SendFeedbackButton from '../components/send-feedback-button';
import ViewsSelector from './views-selector';

import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';

const { VITE_APP_TAG_LIMIT } = import.meta.env;

export default function Affiliations() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [addList, setAddList] = useState([]);
  const [affiliations, setAffiliations] = useState([]);
  const [allOpenalexCorrections, setAllOpenalexCorrections] = useState([]);
  const [body, setBody] = useState({});
  const [filteredAffiliationName, setFilteredAffiliationName] = useState('');
  const [filteredAffiliations, setFilteredAffiliations] = useState([]);
  const [filteredStatus] = useState([
    status.tobedecided.id,
    status.validated.id,
    status.excluded.id,
  ]);
  const [isLoadingRorData, setIsLoadingRorData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [removeList, setRemoveList] = useState([]);
  const [ror, setRor] = useState('');
  const [cleanRor, setCleanRor] = useState('');
  const [rorMessage, setRorMessage] = useState('');
  const [rorMessageType, setRorMessageType] = useState('');
  const [selectedOpenAlex, setSelectedOpenAlex] = useState([]);
  const [uniqueRors, setUniqueRors] = useState({});

  const { data, error, isFetched, isFetching, refetch } = useQuery({
    queryKey: ['openalex-ror', JSON.stringify(body)],
    // Search for works from affiliations for each affiliation strictly longer than 2 letters
    queryFn: () => getWorks(
      {
        ...body,
        affiliationStrings: body.affiliations
          .filter((affiliation) => !affiliation.isDisabled)
          .map((affiliation) => affiliation.label),
        rors: body.affiliations
          .filter((affiliation) => affiliation.isRor)
          .map((affiliation) => affiliation.label),
      },
      toast,
    ),
    enabled: false,
  });

  const undo = (id) => {
    const newAffiliations = affiliations.map((affiliation) => {
      if (affiliation.id === id) {
        // eslint-disable-next-line no-param-reassign
        affiliation.hasCorrection = false;
        // eslint-disable-next-line no-param-reassign
        affiliation.rorsToCorrect = [...affiliation.rors];
      }
      return affiliation;
    });
    setAffiliations(newAffiliations);
    setAllOpenalexCorrections([...allOpenalexCorrections, ...getAffiliationsCorrections(newAffiliations)]);
  };

  const applyCorrections = async () => {
    let rorsToAdd = await Promise.all(
      addList.map((add) => getRorData(add)),
    );
    rorsToAdd = rorsToAdd.flat().map((rorToAdd) => ({
      ...rorToAdd,
      action: 'add',
    }));
    const selectedOpenAlexTmp = selectedOpenAlex.map((item) => {
      const rorsToCorrect = [...item.rorsToCorrect, ...rorsToAdd].map((rorToCorrect) => ({
        ...rorToCorrect,
        action: removeList.includes(rorToCorrect.rorId) ? 'remove' : rorToCorrect?.action,
      }));
      const hasCorrection = rorsToCorrect.filter((rorToCorrect) => rorToCorrect?.action).length > 0;
      return { ...item, hasCorrection, rorsToCorrect };
    });
    setAllOpenalexCorrections([...allOpenalexCorrections, ...getAffiliationsCorrections(selectedOpenAlexTmp)]);
    // Duplicate affiliations array
    const affiliationsTmp = [...affiliations];
    selectedOpenAlex.forEach((selected) => {
      const affiliation = affiliationsTmp.find((aff) => selected.id === aff.id);
      const rorsToCorrect = [...affiliation.rorsToCorrect, ...rorsToAdd].map((rorToCorrect) => ({
        ...rorToCorrect,
        action: removeList.includes(rorToCorrect.rorId) ? 'remove' : rorToCorrect?.action,
      }));
      affiliation.rorsToCorrect = rorsToCorrect;
      affiliation.hasCorrection = rorsToCorrect.filter((rorToCorrect) => rorToCorrect?.action).length > 0;
      // TODO: should be replaced
      affiliation.correctedRors = rorsToCorrect;
      affiliation.rawAffiliationString = affiliation.name;
      affiliation.rorsInOpenAlex = affiliation.rors;
    });
    setAffiliations(affiliationsTmp);
    setAddList([]);
    setRemoveList([]);
  };

  useEffect(() => {
    const uniqueRorsTmp = {};
    selectedOpenAlex.forEach((affiliation) => {
      affiliation.rorsToCorrect.forEach((_ror) => {
        if (!Object.keys(uniqueRorsTmp).includes(_ror.rorId)) {
          uniqueRorsTmp[_ror.rorId] = { ..._ror, addedBy: 0, countAffiliations: 0, removedBy: 0 };
        }
        uniqueRorsTmp[_ror.rorId].countAffiliations += 1;
        if (_ror?.action === 'add') uniqueRorsTmp[_ror.rorId].addedBy += 1;
        if (_ror?.action === 'remove') uniqueRorsTmp[_ror.rorId].removedBy += 1;
      });
    });
    setUniqueRors(uniqueRorsTmp);
  }, [selectedOpenAlex]);

  useEffect(() => {
    const get = async () => {
      setIsLoadingRorData(true);
      const addedRors = await Promise.all(
        addList.map((add) => getRorData(add)),
      );
      const uniqueRorsTmp = {};
      addedRors.flat().forEach((addedRor) => {
        if (!Object.keys(uniqueRors).includes(addedRor.rorId)) {
          uniqueRorsTmp[addedRor.rorId] = { ...addedRor, countAffiliations: selectedOpenAlex.length };
        }
      });
      setUniqueRors({ ...uniqueRors, ...uniqueRorsTmp });
      setIsLoadingRorData(false);
    };

    get();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addList]);

  useEffect(() => {
    const getData = async () => {
      const queryParams = {
        endYear: searchParams.get('endYear') ?? '2023',
        getRorChildren: searchParams.get('getRorChildren') ?? '0',
        startYear: searchParams.get('startYear') ?? '2023',
      };
      queryParams.deletedAffiliations = [];
      queryParams.rorExclusions = [];
      queryParams.affiliations = await Promise.all(
        searchParams.getAll('affiliations').map(async (affiliation) => {
          const label = normalize(affiliation);
          const children = [];
          // Compute rorNames
          if (isRor(label)) {
            const rors = await getRorData(label, queryParams.getRorChildren === '1');
            rors
              .forEach((item) => {
                children.push({
                  isDisabled: false,
                  label: item.rorId,
                  source: 'ror',
                  type: 'rorId',
                });
                item.names.forEach((name) => {
                  children.push({
                    isDisabled: name.length < VITE_APP_TAG_LIMIT,
                    label: name,
                    source: 'ror',
                    type: 'affiliationString',
                  });
                });
              });
          }
          return {
            children,
            isDisabled: label.length < VITE_APP_TAG_LIMIT,
            isRor: isRor(label),
            label,
            source: 'user',
          };
        }),
      );

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
    setAffiliations(data?.affiliations?.filter(
      (affiliation) => affiliation.source === 'OpenAlex',
    ).map((affiliation) => ({
      ...affiliation,
      addList: [],
      removeList: [],
      selected: false,
    })) ?? []);
  }, [data]);

  useEffect(() => {
    const regex = new RegExp(removeDiacritics(filteredAffiliationName));
    const filteredAffiliationsTmp = affiliations.filter(
      (affiliation) => regex.test(
        `${affiliation.key.replace('[ source: ', '').replace(' ]', '')} ${affiliation.rors.map((_ror) => _ror.rorId).join(' ')}`,
      ),
    );
    // Recompute corrections only when the array has changed
    if (filteredAffiliationsTmp.length !== filteredAffiliations.length) {
      setAllOpenalexCorrections([
        ...allOpenalexCorrections,
        ...getAffiliationsCorrections(filteredAffiliationsTmp),
      ]);
    }
    setFilteredAffiliations(filteredAffiliationsTmp);
  }, [affiliations, allOpenalexCorrections, filteredAffiliationName, filteredAffiliations.length, filteredStatus]);

  useEffect(() => {
    if (ror === '') {
      setRorMessage('');
      setRorMessageType('');
    } else if (!isRor(ror)) {
      setRorMessage('Invalid ROR');
      setRorMessageType('error');
    } else if (Object.keys(uniqueRors).includes(ror)) {
      setRorMessage('Already listed ROR');
      setRorMessageType('error');
    } else {
      setRorMessage('Valid ROR');
      setRorMessageType('valid');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ror]);

  const toggleRemovedRor = (affiliationId, rorId) => {
    const updatedAffiliations = affiliations.map((affiliation) => {
      if (affiliation.id === affiliationId) {
        return { ...affiliation, removeList: affiliation.removeList.includes(rorId) ? affiliation.removeList.filter((item) => item !== rorId) : [...affiliation.removeList, rorId] };
      }
      return affiliation;
    });
    setAffiliations(updatedAffiliations);
  };

  const removeRorFromAddList = (affiliationId, rorId) => {
    const updatedAffiliations = affiliations.map((affiliation) => {
      if (affiliation.id === affiliationId) {
        if (affiliation.addList.find((item) => item.rorId === rorId)) {
          return { ...affiliation, addList: affiliation.addList.filter((item) => item.rorId !== rorId) };
        }
      }
      return affiliation;
    });

    setAffiliations(updatedAffiliations);
  };

  useEffect(() => {
    if (rorMessageType !== 'valid') {
      setCleanRor({});
    }
  }, [rorMessageType]);

  const addRor = () => {
    const updatedAffiliations = affiliations.map((affiliation) => {
      if (affiliation.selected && !affiliation.addList.some((item) => item.rorId === cleanRor.rorId)) {
        return {
          ...affiliation,
          addList: [...affiliation.addList, cleanRor],
        };
      }
      return affiliation;
    });
    setAffiliations(updatedAffiliations);
    setRor('');
    setCleanRor({});
    setIsAddModalOpen(false);
  };

  const getCleanRor = async () => {
    const cleanRorData = await getRorData(ror);
    setCleanRor(cleanRorData[0]);
  };

  const setSelectAffiliations = (affiliationIds) => {
    const updatedAffiliations = affiliations.map((affiliation) => {
      if (affiliationIds.includes(affiliation.id)) {
        return { ...affiliation, selected: !affiliation.selected };
      }
      return affiliation;
    });
    setAffiliations(updatedAffiliations);
  };

  return (
    <>
      <Header id="openalex-tile-title" />
      <Container fluid as="main" className="wm-bg">
        {isFetching && (
          <Container
            style={{ textAlign: 'center', minHeight: '600px' }}
            className="fr-pt-5w wm-font"
          >
            <div className="fr-mb-5w wm-message fr-pt-10w">
              Loading data from OpenAlex, please wait...
              <br />
              <br />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/OpenAlex_logo_2021.svg/320px-OpenAlex_logo_2021.svg.png"
                alt="OpenAlex"
              />
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
            <Col
              className="wm-menu"
              md={2}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1000,
                }}
              >

                <Row>
                  <Button
                    aria-label="Back to search page"
                    className="fr-mt-1w"
                    color="blue-ecume"
                    icon="arrow-left-line"
                    onClick={() => navigate(`/${pathname.split('/')[1]}/search${search}`)}
                    size="sm"
                    title="Back to search page"
                  >
                    Back to search page
                  </Button>
                </Row>
                <Row>
                  <Col>
                    <div className="wm-title">
                      <span
                        className="fr-icon-calendar-line fr-mr-1w"
                        aria-hidden="true"
                      />
                      Selected years
                    </div>
                    <div className="wm-content">
                      <Tag
                        className="fr-mr-1w"
                        color="blue-cumulus"
                        key="openalex-ror-tag-year-start"
                      >
                        {`Start: ${body.startYear}`}
                      </Tag>
                      <Tag color="blue-cumulus" key="openalex-ror-tag-year-end">
                        {`End: ${body.endYear}`}
                      </Tag>
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <div className="wm-title">
                      <span
                        className="fr-icon-hotel-line fr-mr-1w"
                        aria-hidden="true"
                      />
                      Searched affiliations
                    </div>
                    <div className="wm-content">
                      {body.affiliations.map((affiliation) => (
                        <Row key={`openalex-ror-search-${affiliation.label}`}>
                          <Tag
                            className={`fr-mr-1w ${affiliation.isDisabled ? 'scratched' : ''
                            }`}
                            color={getTagColor(affiliation)}
                            key={`openalex-ror-tag-${affiliation.label}`}
                          >
                            {affiliation.label}
                          </Tag>
                          {affiliation.children.map((child) => (
                            <Tag
                              className={`fr-mr-1w fr-mt-1w ${child.isDisabled ? 'scratched' : ''
                              }`}
                              color={getTagColor(child)}
                              key={`openalex-ror-tag-${child.label}`}
                            >
                              {child.label}
                            </Tag>
                          ))}
                        </Row>
                      ))}
                    </div>
                  </Col>
                </Row>
              </div>

            </Col>
            <Col md={10}>
              <div
                className="wm-bg wm-content"
                style={{ overflow: `${isModalOpen ? 'hidden' : 'unset'}` }}
              >
                <Modal
                  isOpen={isModalOpen}
                  hide={() => setIsModalOpen((prev) => !prev)}
                  size="xl"
                >
                  <ModalTitle>
                    {`Modify ROR in ${selectedOpenAlex.length} OpenAlex selected affiliation${selectedOpenAlex.length > 1 ? 's' : ''}`}
                  </ModalTitle>
                  <ModalContent>
                    <Row>
                      <Col>
                        <div
                          className="fr-table fr-table--bordered"
                          id="table-bordered-component"
                        >
                          <div className="fr-table__wrapper">
                            <div className="fr-table__container">
                              <div className="fr-table__content">
                                <table id="table-bordered">
                                  <thead>
                                    <tr>
                                      <th>ROR</th>
                                      {/* <th>Name</th> */}
                                      <th>Number of affiliations</th>
                                      <th>Added by</th>
                                      <th>Removed by</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.values(uniqueRors).map(
                                      (uniqueRor) => (
                                        <tr key={`openalex-ror-modale-${uniqueRor.rorId}`}>
                                          <td>
                                            <Link
                                              className="fr-mr-1w"
                                              href={`https://ror.org/${uniqueRor.rorId}`}
                                              target="_blank"
                                            >
                                              <img
                                                alt="ROR logo"
                                                className="vertical-middle"
                                                src="https://raw.githubusercontent.com/ror-community/ror-logos/main/ror-icon-rgb.svg"
                                                height="16"
                                              />
                                              {removeList.includes(
                                                uniqueRor.rorId,
                                              ) ? (<strike>{` https://ror.org/${uniqueRor.rorId}`}</strike>) : (` https://ror.org/${uniqueRor.rorId}`)}
                                            </Link>
                                            {/* </td>
                                          <td> */}
                                            <br />
                                            <span className="fr-icon-arrow-right-s-fill" aria-hidden="true" />
                                            <span className="fr-mx-1w">
                                              {removeList.includes(
                                                uniqueRor.rorId,
                                              ) ? (<strike>{uniqueRor.rorName}</strike>) : (uniqueRor.rorName)}
                                            </span>
                                            {getFlagEmoji(uniqueRor.rorCountry)}
                                          </td>
                                          <td>
                                            {uniqueRor.countAffiliations}
                                            {' '}
                                            /
                                            {' '}
                                            {selectedOpenAlex.length}
                                          </td>
                                          <td>{uniqueRor.addedBy}</td>
                                          <td>{uniqueRor.removedBy}</td>
                                          <td style={{ minWidth: '160px' }}>
                                            <ButtonGroup>
                                              {removeList.includes(
                                                uniqueRor.rorId,
                                              )
                                                ? (
                                                  <Button
                                                    aria-label="Undo remove"
                                                    color="blue-ecume"
                                                    icon="arrow-go-back-line"
                                                    onClick={() => setRemoveList((prevList) => prevList.filter(
                                                      (item) => item !== uniqueRor.rorId,
                                                    ))}
                                                    size="sm"
                                                    title="Undo remove"
                                                    variant="secondary"
                                                  >
                                                    Undo remove
                                                  </Button>
                                                ) : (
                                                  <Button
                                                    aria-label="Remove ROR"
                                                    color="pink-tuile"
                                                    disabled={removeList.includes(
                                                      uniqueRor.rorId,
                                                    )}
                                                    icon="delete-line"
                                                    onClick={() => setRemoveList((prevList) => [
                                                      ...prevList,
                                                      uniqueRor.rorId,
                                                    ])}
                                                    size="sm"
                                                    title="Remove ROR"
                                                    variant="secondary"
                                                  >
                                                    Remove this ROR
                                                  </Button>
                                                )}
                                              {(uniqueRor.countAffiliations < selectedOpenAlex.length) && (
                                                <Button
                                                  aria-label="Propagate ROR to all affiliations"
                                                  className="fr-ml-1w"
                                                  color="green-emeraude"
                                                  disabled={
                                                    uniqueRor.countAffiliations
                                                    === selectedOpenAlex.length
                                                  }
                                                  icon="chat-check-line"
                                                  onClick={() => setAddList((prevList) => [
                                                    ...prevList,
                                                    uniqueRor.rorId,
                                                  ])}
                                                  size="sm"
                                                  title={`Propagate ROR to ${selectedOpenAlex?.length ?? 0 - uniqueRor.countAffiliations} affiliations`}
                                                  variant="secondary"
                                                >
                                                  Propagate this ROR
                                                </Button>
                                              )}
                                              {/* {(addList.includes(uniqueRor.rorId)) && (
                                              <Badge
                                                color="green-emeraude"
                                                className="fr-mr-1w"
                                              >
                                                Added
                                              </Badge>
                                            )} */}
                                            </ButtonGroup>
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                    {isLoadingRorData && (
                                      <tr>
                                        <td colSpan={4}>
                                          <Spinner size={24} />
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                    <Row verticalAlign="bottom">
                      <Col>
                        <TextInput
                          messageType={rorMessageType}
                          message={rorMessage}
                          onChange={(e) => setRor(e.target.value)}
                          value={ror}
                        />
                      </Col>
                      <Col md="2">
                        <Button
                          aria-label="Add ROR"
                          color="blue-ecume"
                          disabled={['', 'error'].includes(rorMessageType)}
                          // onClick={() => {
                          //   setAddList([...addList, ror]);
                          //   setRor('');
                          // }}
                          onClick={() => getCleanRor()}
                          title="Add ROR"
                        >
                          + Add
                        </Button>
                      </Col>
                    </Row>
                  </ModalContent>
                  <ModalFooter>
                    Once you have made your changes (add or remove ROR id), you
                    can apply the changes using the "Apply corrections" button,
                    continue with your corrections and submit them to openAlex
                    using the "Send feedback to OpenAlex" button.
                    <Button
                      aria-label="Apply corrections"
                      className="fr-ml-1w"
                      color="blue-ecume"
                      disabled={removeList.length === 0 && addList.length === 0}
                      onClick={() => {
                        applyCorrections();
                        setSelectedOpenAlex([]);
                        setIsModalOpen((prev) => !prev);
                      }}
                      title="Apply corrections"
                    >
                      Apply corrections
                    </Button>
                  </ModalFooter>
                </Modal>
                <div
                  className="wm-external-actions"
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                  }}
                >
                  <div className="left-content">
                    {/* <Button
                      aria-label="Modify selected ROR"
                      className="fr-ml-5w fr-mr-1w"
                      color="blue-ecume"
                      disabled={!selectedOpenAlex.length}
                      icon="add-circle-line"
                      key="add-ror"
                      onClick={() => setIsModalOpen((prev) => !prev)}
                      size="sm"
                      title="Modify selected ROR"
                    >
                      Modify selected ROR
                    </Button> */}
                    <Button
                      aria-label="Add ROR to selected affiliations"
                      className="fr-ml-5w fr-mr-1w"
                      color="blue-ecume"
                      disabled={filteredAffiliations.filter((affiliation) => affiliation.selected).length === 0}
                      icon="add-circle-line"
                      key="add-ror"
                      onClick={() => setIsAddModalOpen((prev) => !prev)}
                      size="sm"
                      title="Add ROR to selected affiliations"
                    >
                      Add ROR to selected affiliations
                    </Button>
                    <Modal
                      isOpen={isAddModalOpen}
                      hide={() => setIsAddModalOpen((prev) => !prev)}
                      // size="xl"
                    >
                      <ModalTitle>
                        {`Add ROR to ${filteredAffiliations.filter((affiliation) => affiliation.selected).length} OpenAlex selected affiliation${filteredAffiliations.filter((affiliation) => affiliation.selected).length > 1 ? 's' : ''}`}
                      </ModalTitle>
                      <ModalContent>
                        <Container fluid>
                          <Row verticalAlign="bottom">
                            <Col>
                              <TextInput
                                messageType={rorMessageType}
                                message={rorMessage}
                                onChange={(e) => setRor(e.target.value)}
                                value={ror}
                                label="ROR"
                                hint="Enter a valid ROR id and 'check' it with ROR API"
                              />
                            </Col>
                            <Col md="3">
                              <Button
                                aria-label="Check ROR"
                                color="blue-ecume"
                                disabled={['', 'error'].includes(rorMessageType)}
                                onClick={() => getCleanRor()}
                                size="sm"
                                variant="secondary"
                              >
                                Check it
                              </Button>
                            </Col>
                          </Row>
                          <Row>
                            <Col>
                              {
                                rorMessageType === 'valid' && cleanRor.rorName && cleanRor.rorCountry
                                  && (
                                    <>
                                      <div>
                                        <span className="fr-icon-arrow-right-s-fill" aria-hidden="true" />
                                        <span className="fr-mx-1w">
                                          {cleanRor.rorName}
                                        </span>
                                        {getFlagEmoji(cleanRor.rorCountry)}
                                      </div>
                                      <Button
                                        aria-label="Add ROR"
                                        className="fr-mt-3w"
                                        color="blue-ecume"
                                        disabled={['', 'error'].includes(rorMessageType) || !cleanRor.rorName || !cleanRor.rorCountry}
                                        onClick={() => { addRor(); }}
                                        size="sm"
                                        title="Add ROR"
                                      >
                                        Add this ROR to selected affiliations
                                      </Button>
                                    </>
                                  )
                              }
                            </Col>
                          </Row>
                        </Container>
                      </ModalContent>
                    </Modal>

                  </div>
                  <div className="right-content fr-mr-1w">
                    <ExportErrorsButton
                      allOpenalexCorrections={affiliations.filter((affiliation) => affiliation.hasCorrection)}
                      options={body}
                    />
                    <SendFeedbackButton
                      allOpenalexCorrections={allOpenalexCorrections}
                      setAllOpenalexCorrections={setAllOpenalexCorrections}
                    />
                  </div>
                </div>
                <ViewsSelector
                  affiliations={affiliations}
                  allOpenalexCorrections={allOpenalexCorrections}
                  filteredAffiliationName={filteredAffiliationName}
                  filteredAffiliations={filteredAffiliations}
                  selectedOpenAlex={selectedOpenAlex}
                  setAffiliations={setAffiliations}
                  setAllOpenalexCorrections={setAllOpenalexCorrections}
                  setFilteredAffiliationName={setFilteredAffiliationName}
                  setSelectedOpenAlex={setSelectedOpenAlex}
                  undo={undo}
                  toggleRemovedRor={toggleRemovedRor}
                  setSelectAffiliations={setSelectAffiliations}
                  removeRorFromAddList={removeRorFromAddList}
                />
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
}
