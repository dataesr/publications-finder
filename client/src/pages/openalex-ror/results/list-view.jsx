import { Badge, Button, Col, Link, Row, Text } from '@dataesr/dsfr-plus';
import PropTypes from 'prop-types';

import WorksList from '../components/works-list';
import RorBadge from '../components/ror-badge';
import RorName from '../components/ror-name';

export default function ListView({
  allAffiliations,
  selectedOpenAlex,
  setFilteredAffiliationName,
  setSelectedOpenAlex,
}) {
  const defineRorColor = [];
  // const dsColors = ['ror-1', 'ror-2', 'ror-3', 'ror-4', 'ror-5'];
  const dsColors = ['green-archipel', 'purple-glycine', 'pink-tuile', 'green-menthe', 'brown-cafe-creme'];
  const rorCount = {};
  allAffiliations.forEach((affiliation) => {
    affiliation.rors.forEach((ror) => {
      if (rorCount[ror.rorId]) {
        rorCount[ror.rorId] += 1;
      } else {
        rorCount[ror.rorId] = 1;
      }
    });
  });
  const sortedRor = Object.keys(rorCount).sort((a, b) => rorCount[b] - rorCount[a]);
  defineRorColor.push(...sortedRor.slice(0, 5).map((ror, index) => ({ ror, color: dsColors[index % dsColors.length] })));

  return (
    <ul className="wm-list">
      {
        allAffiliations.map((affiliation) => (
          <li key={affiliation.key}>
            <Row>
              <Col md={1}>
                <input
                  id={`affiliation-${affiliation.key}`}
                  type="checkbox"
                  checked={selectedOpenAlex.includes(affiliation)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOpenAlex([...selectedOpenAlex, affiliation]);
                    } else {
                      setSelectedOpenAlex(selectedOpenAlex.filter((a) => a.key !== affiliation.key));
                    }
                  }}
                />
              </Col>
              <Col md={5}>
                <Text as="label" htmlFor={`affiliation-${affiliation.key}`}>
                  <div dangerouslySetInnerHTML={{ __html: affiliation.nameHtml }} />
                </Text>
                <WorksList works={affiliation.works} />
              </Col>
              <Col md={6}>
                <table className="wm-table">
                  {affiliation.rors.map((ror) => (
                    <tr>
                      <td>
                        <RorBadge
                          // isRemoved
                          ror={ror}
                          rorColor={defineRorColor.find((item) => item.ror === ror.rorId)?.color || 'beige-gris-galet'}
                          // rorColor={defineRorColor.find((item) => item.ror === ror.rorId)?.color || 'ror-x'}
                          setFilteredAffiliationName={setFilteredAffiliationName}
                        />
                      </td>
                      <td>
                        <RorName
                          // isRemoved
                          ror={ror}
                        />
                      </td>
                    </tr>
                  ))}
                </table>
              </Col>
            </Row>
          </li>
        ))
      }
    </ul>
  );
}

ListView.propTypes = {
  setSelectedOpenAlex: PropTypes.func.isRequired,
  selectedOpenAlex: PropTypes.array.isRequired,
  allAffiliations: PropTypes.array.isRequired,
  setFilteredAffiliationName: PropTypes.func.isRequired,
};
