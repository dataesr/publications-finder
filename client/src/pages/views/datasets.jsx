/* eslint-disable max-len */
import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col,
  SegmentedControl, SegmentedElement,
  Title,
} from '@dataesr/dsfr-plus';
import ActionsDatasets from '../actions/actionsDatasets';
import DatasetsTab from '../datasetsTab';
import DatasetsYearlyDistribution from '../datasetsYearlyDistribution';
import AffiliationsTab from '../affiliationsTab';

export default function Datasets({
  allAffiliations,
  allDatasets,
  data,
  selectedAffiliations,
  selectedDatasets,
  setSelectedAffiliations,
  setSelectedDatasets,
  tagAffiliations,
  tagDatasets,
}) {
  const [Tab, setTab] = useState('listOfDatasets');
  return (
    <>
      <Row>
        <Col>
          <Title as="h2" look="h6" className="fr-mt-1w">
            🗃 Find the datasets affiliated to your institution
          </Title>
        </Col>
        <Col>
          <SegmentedControl
            className="fr-mb-1w"
            name="tabSelector"
            onChange={(e) => setTab(e.target.value)}
          >
            <SegmentedElement
              checked={Tab === 'selectAffiliations'}
              label="Select the raw affiliations for your institution"
              value="selectAffiliations"
            />
            <SegmentedElement
              checked={Tab === 'listOfDatasets'}
              label="🗃 List of datasets"
              value="listOfDatasets"
            />
            <SegmentedElement
              checked={Tab === 'insights'}
              label="📊 Insights"
              value="insights"
            />
          </SegmentedControl>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          {
            (Tab === 'selectAffiliations') && (
              <AffiliationsTab
                affiliations={allAffiliations}
                selectedAffiliations={selectedAffiliations}
                setSelectedAffiliations={setSelectedAffiliations}
                tagAffiliations={tagAffiliations}
              />
            )
          }
          {
            (Tab === 'listOfDatasets') && (
              <>
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
              </>
            )
          }
          {
            (Tab === 'insights') && (
              (allDatasets.filter((dataset) => dataset.status === 'validated').length > 0) ? (
                <Row>
                  <Col xs="6">
                    <DatasetsYearlyDistribution allDatasets={allDatasets} field="publisher" />
                  </Col>
                  <Col xs="6">
                    <DatasetsYearlyDistribution allDatasets={allDatasets} field="type" />
                  </Col>
                  <Col xs="6">
                    <DatasetsYearlyDistribution allDatasets={allDatasets} field="format" />
                  </Col>
                  <Col xs="6">
                    <DatasetsYearlyDistribution allDatasets={allDatasets} field="client_id" />
                  </Col>
                  <Col xs="6">
                    <DatasetsYearlyDistribution allDatasets={allDatasets} field="affiliations" subfield="rawAffiliation" />
                  </Col>
                </Row>
              ) : (
                <div className="fr-callout fr-icon-information-line">
                  <h3 className="fr-callout__title">
                    You did not validate any datasets
                  </h3>
                  <p className="fr-callout__text">
                    Please validate affiliations or datasets to see insights about it.
                  </p>
                </div>
              )
            )
          }
        </Col>
      </Row>
    </>

  );
}

Datasets.propTypes = {
  allAffiliations: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    nameHtml: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    works: PropTypes.arrayOf(PropTypes.string).isRequired,
    worksNumber: PropTypes.number.isRequired,
  })).isRequired,
  setSelectedAffiliations: PropTypes.func.isRequired,
  selectedAffiliations: PropTypes.arrayOf(PropTypes.object).isRequired,
  tagAffiliations: PropTypes.func.isRequired,
  allDatasets: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    format: PropTypes.string.isRequired,
    client_id: PropTypes.string.isRequired,
    rawAffiliation: PropTypes.string.isRequired,
    validatedAffiliation: PropTypes.string.isRequired,
    validated: PropTypes.bool.isRequired,
  })).isRequired,
  data: PropTypes.shape({
    datasets: PropTypes.shape({
      publishers: PropTypes.arrayOf(PropTypes.string),
      types: PropTypes.arrayOf(PropTypes.string),
      years: PropTypes.arrayOf(PropTypes.number),
    }),
  }).isRequired,
  selectedDatasets: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedDatasets: PropTypes.func.isRequired,
  tagDatasets: PropTypes.func.isRequired,
};
