import {
  Checkbox,
  CheckboxGroup,
  Col,
  Row,
  TextInput,
} from '@dataesr/react-dsfr';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import OpenalexView from './openalexView';
import Gauge from '../components/gauge';
import { status } from '../config';
import { normalizeName, renderButtons } from '../utils/works';

export default function OpenalexTab({ affiliations, selectedAffiliations, setSelectedAffiliations, tagAffiliations }) {
  const [filteredAffiliations, setFilteredAffiliations] = useState([]);
  const [filteredAffiliationName, setFilteredAffiliationName] = useState('');
  const [filteredStatus, setFilteredStatus] = useState([status.tobedecided.id, status.validated.id, status.excluded.id]);
  const [timer, setTimer] = useState();

  useEffect(() => {
    setFilteredAffiliations(affiliations);
  }, [affiliations]);

  useEffect(() => {
    if (timer) {
      clearTimeout(timer);
    }
    const timerTmp = setTimeout(() => {
      const filteredAffiliationsTmp = affiliations.filter((affiliation) => affiliation.key.includes(normalizeName(filteredAffiliationName))
        && filteredStatus.includes(affiliation.status));
      setFilteredAffiliations(filteredAffiliationsTmp);
    }, 500);
    setTimer(timerTmp);
    // The timer should not be tracked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliations, filteredAffiliationName, filteredStatus]);

  const onStatusChange = (st) => {
    if (filteredStatus.includes(st)) {
      setFilteredStatus(filteredStatus.filter((filteredSt) => filteredSt !== st));
    } else {
      setFilteredStatus(filteredStatus.concat([st]));
    }
  };
  return (
    <>
      <Row gutters>
        <Col n="12" offset="0">
          <TextInput
            label="Search in affiliations name"
            onChange={(e) => setFilteredAffiliationName(e.target.value)}
            value={filteredAffiliationName}
          />
        </Col>
      </Row>
      <Row gutters>
        { /*
        <Col n="1">
          <CheckboxGroup
            hint="Filter affilitions on the decisions already made"
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
        </Col>
      */ }
        <Col n="12">
          <OpenalexView
            allAffiliations={filteredAffiliations}
            selectedAffiliations={selectedAffiliations}
            setSelectedAffiliations={setSelectedAffiliations}
          />
        </Col>
      </Row>
    </>
  );
}

OpenalexTab.propTypes = {
  affiliations: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    nameHtml: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    works: PropTypes.arrayOf(PropTypes.string).isRequired,
    worksNumber: PropTypes.number.isRequired,
  })).isRequired,
  selectedAffiliations: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    nameHtml: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    works: PropTypes.arrayOf(PropTypes.string).isRequired,
    worksNumber: PropTypes.number.isRequired,
  })).isRequired,
  setSelectedAffiliations: PropTypes.func.isRequired,
  tagAffiliations: PropTypes.func.isRequired,
};