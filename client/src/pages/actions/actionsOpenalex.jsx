import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';

import ButtonDropdown from '../../components/button-dropdown';

export default function ActionsOpenalex({
  allOpenalexCorrections,
}) {
  const [searchParams] = useSearchParams();

  return (
    <ButtonDropdown
      data={allOpenalexCorrections}
      label="OpenAlex errors"
      searchParams={searchParams}
    />
  );
}

ActionsOpenalex.propTypes = {
  allOpenalexCorrections: PropTypes.arrayOf(PropTypes.shape({
    correctedRors: PropTypes.string.isRequired,
    rawAffiliationString: PropTypes.string.isRequired,
    rorsInOpenAlex: PropTypes.arrayOf(PropTypes.shape({
      rorCountry: PropTypes.string.isRequired,
      rorId: PropTypes.string.isRequired,
      rorName: PropTypes.string.isRequired,
    })).isRequired,
    worksExample: PropTypes.arrayOf(PropTypes.shape({
      id_type: PropTypes.string.isRequired,
      id_value: PropTypes.string.isRequired,
    })).isRequired,
    worksOpenAlex: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
};
