import {
  Checkbox,
  CheckboxGroup,
  Col,
  Row,
  TextInput,
} from '@dataesr/react-dsfr';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import WorksView from './worksView';
import Gauge from '../components/gauge';
import { datasources, status } from '../config';
import { renderButtons } from '../utils/works';

export default function PublicationsTab({ publications, publishers, selectedPublications, setSelectedPublications, tagPublications, types, years }) {
  const [filteredAffiliationName, setFilteredAffiliationName] = useState('');
  const [filteredDatasources, setFilteredDatasources] = useState(datasources.map((datasource) => datasource.key));
  const [filteredPublications, setFilteredPublications] = useState([]);
  const [filteredPublishers, setFilteredPublishers] = useState([]);
  const [filteredStatus, setFilteredStatus] = useState([status.tobedecided.id]);
  const [filteredTypes, setFilteredTypes] = useState([]);
  const [filteredYears, setFilteredYears] = useState([]);
  const [timer, setTimer] = useState();

  useEffect(() => {
    setFilteredPublications(publications);
    setFilteredPublishers(Object.keys(publishers));
    setFilteredYears(Object.keys(years));
    setFilteredTypes(Object.keys(types));
  }, [publications, publishers, types, years]);

  useEffect(() => {
    if (timer) {
      clearTimeout(timer);
    }
    const timerTmp = setTimeout(() => {
      const filteredPublicationsTmp = publications.filter((publication) => publication.affiliationsTooltip.includes(filteredAffiliationName)
        && filteredDatasources.filter((filteredDatasource) => publication.datasource.includes(filteredDatasource)).length
        && filteredPublishers.includes(publication.publisher)
        && filteredStatus.includes(publication.status)
        && filteredTypes.includes(publication.type)
        && filteredYears.includes(publication.year));
      setFilteredPublications(filteredPublicationsTmp);
    }, 500);
    setTimer(timerTmp);
    // The timer should not be tracked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publications, filteredAffiliationName, filteredDatasources, filteredPublishers, filteredStatus, filteredTypes, filteredYears]);

  const onDatasourcesChange = (datasource) => {
    if (filteredDatasources.includes(datasource.key)) {
      setFilteredDatasources(filteredDatasources.filter((filteredDatasource) => filteredDatasource !== datasource.key));
    } else {
      setFilteredDatasources(filteredDatasources.concat([datasource.key]));
    }
  };

  const onPublishersChange = (publisher) => {
    if (filteredPublishers.includes(publisher)) {
      setFilteredPublishers(filteredPublishers.filter((filteredPublisher) => filteredPublisher !== publisher));
    } else {
      setFilteredPublishers(filteredPublishers.concat([publisher]));
    }
  };

  const onStatusChange = (st) => {
    if (filteredStatus.includes(st)) {
      setFilteredStatus(filteredStatus.filter((filteredSt) => filteredSt !== st));
    } else {
      setFilteredStatus(filteredStatus.concat([st]));
    }
  };

  const onTypesChange = (type) => {
    if (filteredTypes.includes(type)) {
      setFilteredTypes(filteredTypes.filter((filteredType) => filteredType !== type));
    } else {
      setFilteredTypes(filteredTypes.concat([type]));
    }
  };

  const onYearsChange = (year) => {
    if (filteredYears.includes(year)) {
      setFilteredYears(filteredYears.filter((filteredYear) => filteredYear !== year));
    } else {
      setFilteredYears(filteredYears.concat([year]));
    }
  };

  return (
    <>
      <Row>
        <Col n="9">
          {renderButtons(selectedPublications, tagPublications, 'publications')}
        </Col>
        <Col n="3">
          <Gauge
            data={Object.values(status).map((st) => ({
              ...st,
              value: publications.filter((publication) => publication.status === st.id).length,
            }))}
          />
        </Col>
      </Row>
      <Row gutters>
        <Col n="9" offset="2">
          <TextInput
            label="Search in affiliations name"
            onChange={(e) => setFilteredAffiliationName(e.target.value)}
            value={filteredAffiliationName}
          />
        </Col>
      </Row>
      <Row gutters>
        <Col n="2">
          <CheckboxGroup
            hint="Filter publications according to the choices made on affiliations"
            legend="Filter on decision status"
          >
            {Object.values(status).map((st) => (
              <Checkbox
                checked={filteredStatus.includes(st.id)}
                key={st.id}
                label={st.label}
                onChange={() => onStatusChange(st.id)}
                size="sm"
              />
            ))}
          </CheckboxGroup>
          <CheckboxGroup
            hint="Filter publications on selected datasources"
            legend="Source"
          >
            {datasources.map((datasource) => (
              <Checkbox
                checked={filteredDatasources.includes(datasource.key)}
                key={datasource.key}
                label={datasource.label}
                onChange={() => onDatasourcesChange(datasource)}
                size="sm"
              />
            ))}
          </CheckboxGroup>
          <CheckboxGroup
            hint="Filter publications on selected years"
            legend="Years"
          >
            {Object.keys(years).sort().reverse().map((year) => (
              <Checkbox
                checked={filteredYears.includes(year)}
                key={year}
                label={`${year} (${years[year]})`}
                onChange={() => onYearsChange(year)}
                size="sm"
              />
            ))}
          </CheckboxGroup>
          <CheckboxGroup
            hint="Filter publications on selected types"
            legend="Types"
          >
            {Object.keys(types).map((type) => (
              <Checkbox
                checked={filteredTypes.includes(type)}
                key={type}
                label={`${type} (${types[type]})`}
                onChange={() => onTypesChange(type)}
                size="sm"
              />
            ))}
          </CheckboxGroup>
          <CheckboxGroup
            hint="Filter publications on selected publishers"
            legend="Publishers"
          >
            {Object.keys(publishers).map((publisher) => (
              <Checkbox
                checked={filteredPublishers.includes(publisher)}
                key={publisher}
                label={`${publisher} (${publishers[publisher]})`}
                onChange={() => onPublishersChange(publisher)}
                size="sm"
              />
            ))}
          </CheckboxGroup>
        </Col>
        <Col n="10">
          <WorksView
            selectedWorks={selectedPublications}
            setSelectedWorks={setSelectedPublications}
            works={filteredPublications}
          />
        </Col>
      </Row>
    </>
  );
}

PublicationsTab.propTypes = {
  publications: PropTypes.arrayOf(PropTypes.shape({
    affiliations: PropTypes.arrayOf(PropTypes.string).isRequired,
    allIds: PropTypes.arrayOf(PropTypes.object).isRequired,
    authors: PropTypes.arrayOf(PropTypes.string).isRequired,
    datasource: PropTypes.arrayOf(PropTypes.string).isRequired,
    id: PropTypes.string.isRequired,
    publisher: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  })).isRequired,
  publishers: PropTypes.object.isRequired,
  selectedPublications: PropTypes.arrayOf(PropTypes.shape({
    affiliations: PropTypes.arrayOf(PropTypes.string).isRequired,
    allIds: PropTypes.arrayOf(PropTypes.object).isRequired,
    authors: PropTypes.arrayOf(PropTypes.string).isRequired,
    datasource: PropTypes.arrayOf(PropTypes.string).isRequired,
    id: PropTypes.string.isRequired,
    publisher: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  })).isRequired,
  setSelectedPublications: PropTypes.func.isRequired,
  tagPublications: PropTypes.func.isRequired,
  types: PropTypes.object.isRequired,
  years: PropTypes.object.isRequired,
};
